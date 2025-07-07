import threading
from threading import Lock
import time
import datetime
import numpy as np
import pyzed.sl as sl
from typing import Any, Callable, Optional
import multiprocessing as mp
import queue
from queue import Queue
import os
import logging
#os.environ["PYOPENGL_PLATFORM"] = "egl"

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

#from src.PLYRender import rendering_process
# Import ZED Library
from src.stereocameras.ZED import ZEDImageCapture, ZEDDepthCapture, ZEDPointCloudAcquisition
from src.stereocameras.ZED import EncodeImage, get_center_distance, DEPTH_MODE, ZEDStatus, AppLogger
#from src.streaming.RTSPStreamer import RTSPStreamer
from src.image_processing.OverlayProcessor import ImageOverlayer, ColorbarOverlayer
from src.image_processing.OverlayProcessorThread import OverlayThread, ColorbarThread
from common_interfaces.devices.stereocamera import StereoCameraInterface
from common_interfaces.events import EventManager, EventType, SubjectType

import subprocess

class ZEDXOneStereoManager(StereoCameraInterface):
    """
    Manages the ZED X One stereo camera, acquiring RGB images, depth maps,
    and point clouds, providing streaming and synchronized data access.
    """

    #TODO: Optimize variable usage

    def __init__(self, zed_init_params, zed_runtime_params, streamer_params, overlay_runtime_params) -> None:
        # Initialize Camera
        super().__init__()
        ### Inizialize variables ###
        # Initialize Images
        self._left_image = None
        self._right_image = None
        self._depth_image_left = None
        self._depth_image_right = None
        self._left_image_overlayed = None
        self._point_cloud = None

        # Initialize GPS Position Values
        self.latitude = 0.0
        self.latitude_ref = "N"
        self.longitude = 0.0
        self.longitude_ref = "E"
        self.altitude = 0.0
        self.altitude_ref = "U"

        logging.info("Initializing ZED X One Stereo Camera...")

        # Triggers
        self._is_running = False
        self._is_recording = False
        
        # Initialize settings
        self.settings = {
            "zed_init_params": zed_init_params,
            "zed_runtime_params": zed_runtime_params,
            "streamer_params": streamer_params,
            "overlay_runtime_params": overlay_runtime_params
        }

        # Initialize Camera
        self.camera = sl.Camera()

        # Initialize Init Params
        self.init_params = sl.InitParameters()
        
        # Initialize Runtime Params
        self.runtime_params = sl.RuntimeParameters()

        # Initialize ZED Capturer Objects
        self.image_capturer = ZEDImageCapture(self.camera)
        self.depth_capturer = ZEDDepthCapture(self.camera)
        self.point_cloud_capturer = ZEDPointCloudAcquisition(self.camera)

        # Initialize Processing Tools
        self.image_overlay_processor = ImageOverlayer()
        self.colour_bar_processor = ColorbarOverlayer()

        # Initialize overlay threads
        self._overlay_input_queue = Queue(maxsize=3)    # list [image, depth_map]
        self._colorbar_input_queue = Queue(maxsize=3)   # list [overlay_image]
        self._final_overlay_output = Queue(maxsize=3)   # list [overlay_with_colourbar]

        self.image_overlay_thread = OverlayThread(self._overlay_input_queue, self._colorbar_input_queue)
        self.colourbar_overaly_thread = ColorbarThread(self._colorbar_input_queue, self._final_overlay_output)

        # Initialize non ZED parameters
        self.ply_stream_view = None
        self.max_full_scale = None
        self.transparency = 0.4
        '''
        # StreamerObject ### FOR NOW URL IS FIXED
        self.imageStreamer = RTSPStreamer("/zed-image", 8001, "VGA", 15)
        self.depthStreamer = RTSPStreamer("/zed-overlay", 8101, "VGA", 15)
        self.pointCloudStreamer = RTSPStreamer("/zed-ply", 8201, "VGA", 15)
        '''
        # Center Range
        self.center_range = -1.0

        # Event Callback to retrieve position information
        EventManager.get_instance().register_listener(
            self.get_last_position, 
            EventType.STATUS_CHANGE, 
            SubjectType.LOCATION_SYSTEM)
        
        # Lock for image copying and writing
        self._image_lock = Lock()

        # Initialize Status Thread at 1 Hz
        self._status_thread = threading.Thread(target=self._status_loop, daemon=True)

        # Main Loop Executor Threads
        self._running_thread = threading.Thread(target=self.execute_frame_capture, daemon=True)

        # Handle Trigger Management
        self.__capture_event = None
        self.__recording_thread = None

        self.ctx = mp.get_context("spawn")

        self.pointcloud_queue = self.ctx.Queue(maxsize=2)
        self.setview_queue = self.ctx.Queue(maxsize=2)
        self.putimage = self.ctx.Queue(maxsize=2)
        self.stop_event = self.ctx.Event()

        ### UPDATING PARAMS BASED ON DEFAULT PARAMS
        self.update_settings()

    """ Errore di permessi:
    @staticmethod
    def _restart_system_service():
        try:
            service_name = "zed_media_server_cli.service"
            logging.info(f"Try restarting {service_name} ...")
            subprocess.run(["sudo", "systemctl", "restart", service_name], check=True)
            logging.info(f"{service_name} restarted successfully.")
        except subprocess.CalledProcessError as e:
            logging.warning(f"Error during {service_name} restarting: {e}")
    """

    def start_service(self):
        """
        Starts the service: updates settings, opens the camera,
        and begins data acquisition in a dedicated thread.
        """
        # Load Settings
        try: 
            self.open_camera()
            self._is_running = True
            self.stop_event.clear()
            width, height = 960, 600
            '''
            p_render = self.ctx.Process(
                target=rendering_process,
                args=(self.pointcloud_queue, width, height, self.setview_queue, self.putimage, self.stop_event)
            )
            p_render.start()
            '''
            self._running_thread.start()
            self.image_overlay_thread.start()
            self.colourbar_overaly_thread.start()
            self._status_thread.start()
        except Exception as e:
            logging.error(f"Error during updating settings or starting frame capture thread: {e}")
            self._is_running = False
            #self._restart_system_service()
        finally:
            return self.is_running

    def stop_service(self, to_finalise=False):
        """
        Stops the service, closes the camera, and terminates data acquisition.
        """
        self._is_running = False
        self.stop_event.set()
        if to_finalise:
            try:
                self.close_camera()
            except Exception as e:
                logging.error(f"Error during closing camera. {e}")

    def _status(self, add_settings: bool = False):
        status = ZEDStatus(
            name=self.name,
            is_running=self._is_running,
            is_recording=self.is_recording,
            center_distance=self.get_distance(),
            ply_stream_view=self.get_ply_stream_view(),
            full_scale=self.get_max_full_scale(),
            transparency=self.get_transparency()
        )
        return status


    def _status_loop(self):
        """
        Continuous loop updating the camera status via events.
        """
        while self._is_running:
            self.notify_status(False)
            time.sleep(1.0)

    def get_max_full_scale(self):
        """Returns the maximum full scale value."""
        return self.max_full_scale
    
    def get_ply_stream_view(self):
        """Returns the point cloud stream view parameter."""
        return self.ply_stream_view
    
    def get_transparency(self):
        """Returns the depth overlay transparency parameter."""
        return self.transparency
    
    def set_ply_stream_view(self, view:int):
        """Set the point cloud stream view parameter."""
        self.ply_stream_view = view
        self.setview_queue.put_nowait(view)
        self.settings["streamer_params"]["ply_stream_view"] = view

    def get_last_position(self, event):
        """
        Updates internal GPS coordinates based on the received event.
        """
        self.latitude = event.event_data.latitude[0]
        self.latitude_ref = event.event_data.latitude[1]
        self.longitude = event.event_data.longitude[0]
        self.longitude_ref = event.event_data.longitude[1]
        self.altitude = event.event_data.altitude[0]
        self.altitude_ref = event.event_data.altitude[1]

    def print_camera_information(self, cam):
        """
        Prints detailed information about the opened ZED camera.
        """
        cam_info = cam.get_camera_information()
        logging.info("ZED Model                 : {0}".format(cam_info.camera_model))
        logging.info("ZED Serial Number         : {0}".format(cam_info.serial_number))
        logging.info("ZED Camera Firmware       : {0}/{1}".format(cam_info.camera_configuration.firmware_version,cam_info.sensors_configuration.firmware_version))
        logging.info("ZED Camera Resolution     : {0}x{1}".format(round(cam_info.camera_configuration.resolution.width, 2), cam.get_camera_information().camera_configuration.resolution.height))
        logging.info("ZED Camera FPS            : {0}".format(int(cam_info.camera_configuration.fps)))
        return cam_info
    
    def execute_frame_capture(self):

        buffers = [sl.Mat(), sl.Mat()]
        buffer_index = 0

        while self._is_running:
            start_frame_time = time.time()

            if self.camera.grab(self.runtime_params) == sl.ERROR_CODE.SUCCESS:
                try:
                    t0 = time.time()
                    # Capture from camera
                    _image_left, _image_right = self.image_capturer.capture_all()
                    t1 = time.time()

                    _depth_image_left, _depth_image_right, _depth_measure = self.depth_capturer.capture_all()
                    t2 = time.time()

                    _point_cloud = self.point_cloud_capturer.capture_point_cloud()
                    t3 = time.time()

                    """# Send point cloud to renderer
                    buf = buffers[buffer_index]
                    buf = _point_cloud
                    pc_np = buf.get_data()
                    if self.pointcloud_queue.full():
                        try:
                            self.pointcloud_queue.get_nowait()
                        except queue.Empty:
                            pass
                    self.pointcloud_queue.put_nowait(pc_np)
                    buffer_index = (buffer_index + 1) % 2"""
                    t4 = time.time()

                    # Lock and update internal buffers
                    with self._image_lock:
                        self._left_image = _image_left.get_data()[:, :, :3]
                        self._right_image = _image_right.get_data()[:, :, :3]
                        self._depth_image_left = _depth_image_left.get_data()[:, :, :3]
                        self._depth_image_right = _depth_image_right.get_data()[:, :, :3]
                        self._point_cloud = _point_cloud
                    t5 = time.time()

                    # Compute center range
                    self.center_range = get_center_distance(_image_left, _depth_measure)
                    t6 = time.time()

                    # Send to OverlayWorker
                    try:
                        self._overlay_input_queue.put_nowait((
                            self._left_image,
                            self._depth_image_left,
                            self.center_range
                        ))
                    except queue.Full:
                        pass  # oppure log a debug livello
                    t7 = time.time()

                    # Get overlayed image from OverlayWorker
                    try:
                        overlayed_image = self._colorbar_input_queue.get_nowait()
                    except queue.Empty:
                        overlayed_image = None
                    t8 = time.time()

                    # Get final augmented image from ColorbarWorker
                    try:
                        augmented_image = self._final_overlay_output.get_nowait()
                    except queue.Empty:
                        augmented_image = None
                    t9 = time.time()

                    # Stream original and augmented
                    self.imageStreamer.push_frame(self._left_image)
                    if augmented_image is not None:
                        self.depthStreamer.push_frame(augmented_image)
                    t10 = time.time()

                    """# Get rendered point cloud image from render process
                    try:
                        img = self.putimage.get_nowait()
                        self.pointCloudStreamer.push_frame(img)
                    except queue.Empty:
                        pass"""
                    t11 = time.time()

                    # SVO recording
                    if self._is_recording:
                        self.camera.ingest_data_into_svo(self.get_svo_data())
                    t12 = time.time()

                    logging.debug(f"Timings for frame (in seconds):")
                    logging.debug(f"  Image capture: {t1 - t0:.4f}")
                    logging.debug(f"  Depth capture: {t2 - t1:.4f}")
                    logging.debug(f"  Point cloud capture: {t3 - t2:.4f}")
                    logging.debug(f"  Point cloud queue update: {t4 - t3:.4f}")
                    logging.debug(f"  Buffer locking & update: {t5 - t4:.4f}")
                    logging.debug(f"  Center range calculation: {t6 - t5:.4f}")
                    logging.debug(f"  Overlay queue put: {t7 - t6:.4f}")
                    logging.debug(f"  Overlay get: {t8 - t7:.4f}")
                    logging.debug(f"  Final augmented get: {t9 - t8:.4f}")
                    logging.debug(f"  Streaming images: {t10 - t9:.4f}")
                    logging.debug(f"  Point cloud image get & stream: {t11 - t10:.4f}")
                    logging.debug(f"  SVO recording: {t12 - t11:.4f}")
                    logging.debug(f"  Total frame time: {t12 - start_frame_time:.4f}")

                except Exception as e:
                    logging.warning(f"Error during frame capture or processing: {str(e)}")

            else:
                logging.warning("Failed to retrieve new frame from ZEDXStereoCamera...")
                raise RuntimeWarning("Failed to retrieve new frame from ZEDXStereoCamera...")

        self._is_running = False


    ###         --------          ###
    ###      CAPTURE IMAGES       ###
    ###         --------          ###
    def capture_images(self, callback: Callable[[str, bytes|np.ndarray, str], None], with_depth_map: bool = False, is_left: bool = True):
        if not self._is_running:
            raise RuntimeWarning("StereoCamera is not running!")

        side = "left" if is_left else "right"
        header = f"{side}_{'AR_' if with_depth_map else ''}image"
        image_name = f"{header}_{datetime.datetime.now():%Y-%m-%d_%H-%M-%S}"

        # Lock per leggere immagini
        with self._image_lock:
            image = self._left_image.copy() if is_left and self._left_image is not None else \
                    self._right_image.copy() if not is_left and self._right_image is not None else None

            depth_image = self._depth_image_left.copy() if is_left and self._depth_image_left is not None else \
                        self._depth_image_right.copy() if not is_left and self._depth_image_right is not None else None

        if image is None:
            logging.error("Requested image not available")
            raise RuntimeError("Requested image not available")

        if with_depth_map:
            try:
                image = self.image_overlay_processor.OverlayDepthImage(image, depth_image)
            except Exception as e:
                logging.error(f"OverlayDepthImage failed: {e}")
                raise RuntimeError("OverlayDepthImage failed") from e

        try:
            callback(image_name, image, "png")
        except Exception as e:
            logging.error(f"Callback execution failed: {e}")
            raise RuntimeError("Callback execution failed") from e


    def save_last_frame(self, callback:Callable[[str, Optional[bytes|np.ndarray], str], None], output_dir: str):
        """
        Saves all camera outputs: left, right, depth (left/right), overlays, and point cloud.

        :param callback: Function to call after saving, with saved files and success flag.
        :param output_dir: Directory where images and data will be saved.
        """
        img_format = "png"
        if not self._is_running:
            logging.warning("Cannot save data because camera is not running.")
            raise RuntimeWarning("StereoCamera is not running!")

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        saved_files = {}
        try:
            # Thread-safe image copies
            with self._image_lock:
                left_image = self._left_image.copy() if self._left_image is not None else None
                right_image = self._right_image.copy() if self._right_image is not None else None
                depth_left = self._depth_image_left.copy() if self._depth_image_left is not None else None
                depth_right = self._depth_image_right.copy() if self._depth_image_right is not None else None
                point_cloud = self._point_cloud if self._point_cloud is not None else None

            if left_image is None or right_image is None:
                raise RuntimeError("No image data available to save.")

            # Save raw images
            left_filename, left_bytes = EncodeImage(left_image, img_format)
            right_filename, right_bytes = EncodeImage(right_image, img_format)

            left_image_path = os.path.join(output_dir, f"left_{timestamp}.{img_format}")
            right_image_path = os.path.join(output_dir, f"right_{timestamp}.{img_format}")

            with open(left_image_path, "wb") as f:
                f.write(left_bytes)
            with open(right_image_path, "wb") as f:
                f.write(right_bytes)

            saved_files["left"] = str(left_image_path)
            saved_files["right"] = str(right_image_path)

            # Save depth maps
            if depth_left is not None and depth_right is not None:
                depth_left_filename, depth_left_bytes = EncodeImage(depth_left, img_format)
                depth_right_filename, depth_right_bytes = EncodeImage(depth_right, img_format)

                depth_left_path = os.path.join(output_dir, f"depth_left_{timestamp}.{img_format}")
                depth_right_path = os.path.join(output_dir, f"depth_right_{timestamp}.{img_format}")

                with open(depth_left_path, "wb") as f:
                    f.write(depth_left_bytes)
                with open(depth_right_path, "wb") as f:
                    f.write(depth_right_bytes)

                saved_files["depth_left"] = str(depth_left_path)
                saved_files["depth_right"] = str(depth_right_path)

                # Save overlays
                overlay_left = self.image_overlay_processor.OverlayDepthImage(left_image, depth_left)
                overlay_right = self.image_overlay_processor.OverlayDepthImage(right_image, depth_right)

                overlay_left_filename, overlay_left_bytes = EncodeImage(overlay_left, img_format)
                overlay_right_filename, overlay_right_bytes = EncodeImage(overlay_right, img_format)

                overlay_left_path = os.path.join(output_dir, f"overlay_left_{timestamp}.{img_format}")
                overlay_right_path = os.path.join(output_dir, f"overlay_right_{timestamp}.{img_format}")

                with open(overlay_left_path, "wb") as f:
                    f.write(overlay_left_bytes)
                with open(overlay_right_path, "wb") as f:
                    f.write(overlay_right_bytes)

                saved_files["overlay_left"] = str(overlay_left_path)
                saved_files["overlay_right"] = str(overlay_right_path)

            # Save point cloud
            if not self.point_cloud_capturer.save_point_cloud(
                point_cloud=point_cloud,
                filename=f"point_cloud_{timestamp}",
                directory=output_dir
            ):
                raise RuntimeWarning("Failed to save pointcloud")

            logging.info(f"Saved all images and data to {output_dir}")
            callback(f"left_{timestamp}", None, img_format) # TODO: Inject Exif only to left Image
        except Exception as e:
            logging.error(f"Failed to save all images: {e}")
            raise RuntimeError("Failed to save all images.") from e
            
        
    def get_distance(self):
        return self.center_range
    

    ###         --------         ###
    ###      SVO RECORDING       ###
    ###         --------         ###
    def start_video_recording(self, storage_path: str, did:int, name: str, video_callback:Callable[[], None],
                              frame_callback:Callable[[str, Optional[bytes|np.ndarray], str], None],
                              interval: Optional[float] = None):
        try:
            svo_filename = datetime.datetime.now().strftime("record_%Y-%m-%d_%H-%M-%S.svo2")
            full_path = os.path.join(storage_path, svo_filename)
            recording_params = sl.RecordingParameters(full_path, sl.SVO_COMPRESSION_MODE.H264_LOSSLESS)
            err = self.camera.enable_recording(recording_params)
            if err != sl.ERROR_CODE.SUCCESS:
                logging.warning(f"Failed to record video: {err}")
                raise Exception(f"Failed to record video: {err}")
            logging.info(f"Start SVO Recording to: {full_path}")
            if interval is None:
                # Manual Mode
                self.__capture_event = threading.Event()
                def record():
                    logging.info("Manual Mode Thread started!")
                    while self._is_recording:
                        logging.info("Wait Capture Event!")
                        self.__capture_event.wait()
                        logging.info("Capture Image Triggered!")
                        try:
                            self.save_last_frame(frame_callback, storage_path)
                        except (Exception,) as ex:
                            logging.error(f"Exception during capture image: {ex}")
                        self.__capture_event.clear()

                self._is_recording = True
                self.__recording_thread = threading.Thread(target=record, daemon=True)
                self.__recording_thread.start()
                logging.info(f"Started manual data saving")
            else:
                def record():
                    last_time = time.time()
                    while self._is_recording:
                        current_time = time.time()
                        delay = current_time - last_time
                        if delay > interval:
                            logging.info(f"Trigger Capture after: {delay} ({interval})")
                            last_time = current_time
                            if self._is_recording:
                                self.save_last_frame(frame_callback, storage_path)

                self._is_recording = True
                self.__recording_thread = threading.Thread(target=record, daemon=True)
                self.__recording_thread.start()
                logging.info(f"Started automatic data saving")

            video_callback()
        except Exception as e:
            msg = f"Error to start stereocamera recording: {e}"
            logging.error(msg)
            self.camera.disable_recording() # TODO: Check if idempotent
            self.__recording_thread = None
            self.__capture_event = None
            raise Exception(msg)

    def stop_video_recording(self):
        if self._is_recording:
            self.camera.disable_recording()
            self._is_recording = False
            self.__recording_thread = None
            self.__capture_event = None
            logging.info("Stop SVO Recording.")
        logging.warning("No Recording to stop.")

    def handle_capture_command(self):
        if self._is_recording and self.__capture_event is not None:
            logging.info("Trigger Capture Event")
            self.__capture_event.set()

    def get_svo_data(self):
        try:
            timestamp = self.camera.get_timestamp(sl.TIME_REFERENCE.IMAGE)
            
            # CSV-Like
            gps_string = (
                f"Latitude: {self.latitude} {self.latitude_ref}, "
                f"Longitude: {self.longitude} {self.longitude_ref}, "
                f"Altitude: {self.altitude} {self.altitude_ref}"
            )
            data = sl.SVOData()
            data.key = "GPS"
            data.set_string_content(gps_string)
            data.timestamp_ns = timestamp
            return data
        
        except Exception as e:
            logging.warning(f"Failed to push gps string: {e}")

    
    ###     --------    ###
    ###     SETTINGS    ###
    ###     --------    ###
    def get_settings(self):
        return self.settings
    
    def set_settings(self, settings: dict[str, Any]):
        self.settings.update(settings)
        logging.info(str(settings))
        try:
            self.update_settings()
        except Exception as e:
            logging.error(f"Cannot update settings: {e}")
            raise RuntimeError(f"Cannot update settings.") from e

        logging.info(f"Settings updated: {self.settings}")

    def update_settings(self):
        # Init Settings
        self.init_params.depth_minimum_distance             = self.settings["zed_init_params"]["depth_minimum_distance"]
        self.init_params.depth_maximum_distance             = self.settings["zed_init_params"]["depth_maximum_distance"]
        self.init_params.camera_disable_self_calib          = self.settings["zed_init_params"]["camera_disable_self_calib"]
        self.init_params.enable_right_side_measure          = self.settings["zed_init_params"]["enable_right_side_measure"]
        self.init_params.depth_stabilization                = self.settings["zed_init_params"]["depth_stabilization"]
        self.input_stream_ip                                = self.settings["zed_init_params"]["input_stream_ip"]
        self.input_stream_port                              = self.settings["zed_init_params"]["input_stream_port"]
        self.depth_mode                                     = self.settings["zed_init_params"]["depth_mode"]

        # Runtime Settings
        self.runtime_params.enable_depth                    = self.settings["zed_runtime_params"]["enable_depth"]
        self.runtime_params.enable_fill_mode                = self.settings["zed_runtime_params"]["enable_fill_mode"]
        self.runtime_params.confidence_threshold            = self.settings["zed_runtime_params"]["confidence_threshold"]
        self.runtime_params.texture_confidence_threshold    = self.settings["zed_runtime_params"]["texture_confidence_threshold"]
        self.runtime_params.remove_saturated_areas          = self.settings["zed_runtime_params"]["remove_saturated_areas"]

        # Overlay Runtime Params
        self.transparency                                   = self.settings["overlay_runtime_params"]["transparency"]
        self.max_full_scale                                 = self.settings["overlay_runtime_params"]["depth_scale"]

        # Streamer Settings
        self.image_url                                      = self.settings["streamer_params"]["image_url"]
        self.image_port                                     = self.settings["streamer_params"]["image_port"]
        self.overlay_image_url                              = self.settings["streamer_params"]["image_overlay_url"]
        self.overlay_image_port                             = self.settings["streamer_params"]["image_overlay_port"]
        self.ply_image_url                                  = self.settings["streamer_params"]["ply_image_url"]
        self.ply_image_port                                 = self.settings["streamer_params"]["ply_image_port"]
        self.ply_stream_view                                = self.settings["streamer_params"]["ply_stream_view"]
        
        # Set For Streaming
        self.init_params.set_from_stream(self.input_stream_ip, self.input_stream_port)
        if self.depth_mode == DEPTH_MODE.PERFORMANCE:
            self.init_params.depth_mode = sl.DEPTH_MODE.PERFORMANCE
        elif self.depth_mode == DEPTH_MODE.QUALITY:
            self.init_params.depth_mode = sl.DEPTH_MODE.QUALITY
        elif self.depth_mode == DEPTH_MODE.ULTRA:
            self.init_params.depth_mode = sl.DEPTH_MODE.ULTRA
        
        '''
        # Streaming View
        self.set_ply_stream_view(self.ply_stream_view)
        
        # Set Overlay Runtime Params
        self.set_overlay_transparency(self.transparency)
        self.set_max_full_scale(self.max_full_scale)
        '''
        logging.info("Params changed. For Initial Parameters restart Camera!")

    def open_camera(self):
        self.update_settings()
        print(self.init_params)
        self.status = self.camera.open(self.init_params)
        
        if self.status != sl.ERROR_CODE.SUCCESS:
            logging.error(f"Failure opening ZEDX Stereo Camera: {self.status}")
            raise Exception(f"Error during Opening Stereocamera: {self.status}")
        self.print_camera_information(self.camera)
        logging.info("Camera successfully opened!")

    def close_camera(self):
        try:
            self.camera.close()
            logging.info("Camera successfully closed!")
        except Exception as e:
            raise RuntimeError("Unable to close camera correctly.") from e

    def set_max_full_scale(self, scale: float=3.0):
        self.colour_bar_processor.set_max_scale(scale)
        self.colourbar_overaly_thread.set_max_scale(scale)
        self.max_full_scale = scale
        self.settings["overlay_runtime_params"]["depth_scale"] = scale

    def set_overlay_transparency(self, transparency: float):
        self.image_overlay_processor.SetTransparency(transparency)
        self.image_overlay_thread.SetTransparency(transparency)
        self.transparency = transparency
        self.settings["overlay_runtime_params"]["transparency"] = transparency

    def exec(self, command, **params):
        raise NotImplementedError("No command supported!")
