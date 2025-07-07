from src.core.IStreamer import IStreamer
import cv2 as cv
import gi
import numpy as np
gi.require_version('Gst', '1.0')
gi.require_version('GstRtspServer', '1.0')
from gi.repository import Gst, GstRtspServer, GLib, GObject
import threading
from typing import Callable
# Test
import pyzed.sl as sl
import logging

# Dictionary with suggested parameters based on codec and resolution
# Return [Width, Height, Frames, Bitrate]. Source: ZED Local Video Streaming
STREAMING_PARAMS = {
    ("H264", "2K"): (2208, 1242, 15, 8500000),
    ("H264", "HD1080"): (1920, 1080, 30, 12500000),
    ("H264", "HD720"): (1280, 720, 30, 7000000),
    ("H264", "VGA"): (960, 600, 30, 5000000),
    ("H265", "2K"): (2208, 1242, 15, 7000000),
    ("H265", "HD1080"): (1920, 1080, 30, 11000000),
    ("H265", "HD720"): (1280, 720, 30, 6000000)
}

# Set RTSP Streaming
class RTSPMediaFactory(GstRtspServer.RTSPMediaFactory):
    def __init__(self, width: int, height: int, fps: int, bitrate:int, codec = "H264", format = "I420", **properties):
        super(RTSPMediaFactory, self).__init__(**properties)
        # Params
        self.width = width
        self.height = height
        self.bitrate = bitrate
        ### TODO: gli fps devono essere > di quelli della camera. A livello di risorse non risultano ulteriori sovraccarichi ma risolve il problema del lag
        ### Lag totale < 0.5 secondi
        self.fps = 60
        self.duration = 1 / self.fps * Gst.SECOND
        self.number_frames = 0
        self.codec = codec.upper()
        self.format = format.upper()
        self.encoder = "nvv4l2h264enc" if self.codec == "H264" else "nvv4l2h265enc"
        self.appsrc = None
        
        # Create Streaming Pipeline
        self.launch_string = self._generate_pipeline(self.encoder)
        
    def _get_video_params(self, codec, resolution):
        """ Restituisce framerate e bitrate in base a codec e risoluzione """
        return STREAMING_PARAMS.get((codec, resolution), (960, 600, 30, 5000000))  # Default: 60 FPS, 7000 kbps

    def _generate_pipeline(self, encoder):
        return (
            'appsrc name=source is-live=true block=true format=GST_FORMAT_TIME '
            'caps=video/x-raw,format={},width={},height={},framerate={}/1 '
            '! queue max-size-buffers=4 max-size-bytes=0 max-size-time=0 '
            '! nvvidconv '
            '! queue max-size-buffers=4 max-size-bytes=0 max-size-time=0 '
            '! {} bitrate={} insert-sps-pps=1 '
            '! video/x-h264,stream-format=byte-stream '
            '! queue max-size-buffers=4 max-size-bytes=0 max-size-time=0 '
            '! rtph264pay name=pay0 pt=96'
        ).format(self.format, self.width, self.height, self.fps, encoder, self.bitrate)


    # Stream last captured frame
    def _on_need_data(self, frame):
        ###TODO: C'è un po' più di latenza rispetto ad un classico codice. Bisogna investigare e risolvere
        ### dovrei creare una sorta di funzione set qua dentro senza che gli passo direttamente la funzione
        if self.appsrc is None:
            logging.error("[ERROR] AppSrc non inizializzato!")
            return
        
        # Resize to specified stream resolution
        frame_resized = cv.resize(frame, (self.width, self.height), interpolation=cv.INTER_LINEAR)
        frame_yuv = cv.cvtColor(frame_resized, cv.COLOR_BGRA2YUV_I420)
        data = frame_yuv.tostring()
        buf = Gst.Buffer.new_allocate(None, len(data), None)
        buf.fill(0, data)
        buf.duration = self.duration
        timestamp = self.number_frames * self.duration
        buf.pts = buf.dts = int(timestamp)
        buf.offset = timestamp
        self.number_frames += 1

        retval = self.appsrc.emit('push-buffer', buf)
        if retval != Gst.FlowReturn.OK and retval != Gst.FlowReturn.FLUSHING:
            logging.error("[ERROR] Problema nel flusso RTSP:", retval)

    def do_create_element(self, url):
        return Gst.parse_launch(self.launch_string)
    
    def do_configure(self, rtsp_media):
        self.number_frames = 0
        media_element = rtsp_media.get_element()
        self.appsrc = media_element.get_child_by_name('source')

        ### DEPRECATED ###
        #appsrc.connect('need-data', self._on_need_data)

### ---------------------------- ###

class RTSPStreamer(IStreamer):
    def __init__(self, url: str, port: int, resolution: str, fps: int, codec = "H264", format = "I420", **properties) -> None:
        #super(RTSPStreamer, self).__init__(**properties)
        # Get Image Callback
        
        # Input params
        self.url = url.lower()
        self.port = port
        self.res = resolution.upper()
        self.fps = fps
        self.codec = codec.upper()
        self.format = format.upper()

        if self.codec not in ["H264", "H265"]:
            raise ValueError("[ERROR] Codec '{self.codec}' not supported.")

        self.width, self.height, self.fps, self.bitrate = self._get_video_params(self.codec, self.res)

        # Server Objects
        self.factory = None
        self.loop = None
        self.server = GstRtspServer.RTSPServer()
        self.rtsp_thread = None
        self.rtsp_thread = threading.Thread(target=self.create_streamer, daemon=True)
        self.rtsp_thread.start()
        
    def _get_video_params(self, codec, resolution):
        """ Restituisce framerate e bitrate in base a codec e risoluzione """
        return STREAMING_PARAMS.get((codec, resolution), (1280, 720, 30, 7000))  # Default: 60 FPS, 7000 kbps

    def create_streamer(self):
        GObject.threads_init()
        Gst.init(None)
        self.server = GstRtspServer.RTSPServer()
        self.server.set_service(str(self.port))
        self.factory = RTSPMediaFactory(self.width, self.height, self.fps, self.bitrate, self.codec)
        self.factory.set_shared(True)
        self.server.get_mount_points().add_factory(self.url, self.factory)
        self.server.attach(None)
        self.loop = GLib.MainLoop()
        self.loop.run()
        
    def push_frame(self, frame):
        if self.factory and self.factory.appsrc:
            self.factory._on_need_data(frame)

    def start_stream(self):
        # Create in separate thread Server RTSP
        pass

    def stop_stream(self):
        if self.loop:
            self.loop.quit()
            self.rtsp_thread.join()


