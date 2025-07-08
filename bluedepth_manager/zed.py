
#SISTEMA per la registrazione ZED

import sys
import ogl_viewer.viewer as gl
import pyzed.sl as sl
import cv2
from datetime import datetime
import numpy as np


def record(cam, runtime, mat, out):
    vid = sl.ERROR_CODE.FAILURE
    print("out: " + str(out))
    if out == True:
        print("Recording finished.")
        cam.disable_recording()
        out = False
        return out
    if vid != sl.ERROR_CODE.SUCCESS and out == False:
        filepath=now.strftime("%d-%m-%Y_%H_%M_%S")+"_test_calibrazione_06_02_2025.svo"
        print(filepath)
        record_param = sl.RecordingParameters(filepath)
        vid = cam.enable_recording(record_param)
        print(repr(vid))
        if vid == sl.ERROR_CODE.SUCCESS:
            print("Recording started...")
            out = True
        return out

    
def initZed():
    out = False

    is_network_stream=True
    filepath=""
    
    print("---------------------")
    print("    RPS Player")
    print("---------------------")

    print("Include filepath to replay SVO")
    print("Push R to record the .svo file. A red dot will appears in 2D RGB image.")
    print("In 3D view, 1 - Frontal view; 2 - Top view; 3 - Side view.")

    if(len(sys.argv)>1):
        is_network_stream=False
        filepath=sys.argv[1]

    


    init = sl.InitParameters(camera_resolution=sl.RESOLUTION.HD2K,
                                 depth_mode=sl.DEPTH_MODE.ULTRA,
                                 coordinate_units=sl.UNIT.METER,
                                 coordinate_system=sl.COORDINATE_SYSTEM.RIGHT_HANDED_Y_UP,
                                 camera_disable_self_calib=False
                                 
                            )
    
    runtime = sl.RuntimeParameters(
        enable_fill_mode=True,
        confidence_threshold=95
    )
    
    #init.optional_opencv_calibration_file="calib_ZED2i_Materia_04012023.yaml"
    
    if(is_network_stream):
        init.set_from_stream("192.168.1.235", 34000)
    else:
        print("Load local file "+filepath)
        init.set_from_svo_file(filepath)

    
    
    zed = sl.Camera()
    
    status = zed.open(init)
    if status != sl.ERROR_CODE.SUCCESS:
        print(repr(status))
        exit()

    res = sl.Resolution()
    res.width = 720
    res.height = 404
    camera_model = zed.get_camera_information().camera_model
    # Create OpenGL viewer
    viewer = gl.GLViewer()
    viewer.init(1, [""], camera_model, res,800,800,400,450)

    #viewer.init(len(sys.argv), sys.argv, camera_model, res)

    point_cloud = sl.Mat(res.width, res.height, sl.MAT_TYPE.F32_C4, sl.MEM.CPU)
    matL = sl.Mat()
    matR = sl.Mat()
    matD = sl.Mat()
    now = datetime.now()



    cv2.namedWindow('Left Camera', cv2.WINDOW_NORMAL)
    #cv2.setWindowProperty('Left Camera',cv2.WND_PROP_TOPMOST,1)
    cv2.setWindowProperty('Left Camera', cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    cv2.resizeWindow('Left Camera', 800, 450)
    cv2.moveWindow('Left Camera',1200,0)
    
    cv2.namedWindow('DepthMap', cv2.WINDOW_NORMAL)
    #cv2.setWindowProperty('DepthMap',cv2.WND_PROP_TOPMOST,1)
    cv2.setWindowProperty('DepthMap', cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    cv2.resizeWindow('DepthMap', 800, 600)
    cv2.moveWindow('DepthMap',1200,450)
   
    x_coordinates = []
    y_coordinates = []
    z_coordinates = []

    while viewer.is_available():
        if zed.grab(runtime) == sl.ERROR_CODE.SUCCESS:
            zed.retrieve_measure(point_cloud, sl.MEASURE.XYZRGBA, sl.MEM.CPU, res)

            point_cloud_data = point_cloud.get_data()
            # Reshape the point cloud data to a 2D array for easier access
            point_cloud_data_2d = point_cloud_data.reshape(res.height * res.width, -1)
            
            try:
                # Extract x, y, and z coordinates from the 2D array
                x_values = point_cloud_data_2d[:, 0]
                y_values = point_cloud_data_2d[:, 1]
                z_values = point_cloud_data_2d[:, 2]

                ## Append the coordinates to the respective lists, excluding NaN values
                x_coordinates = np.concatenate([x_coordinates, x_values[~np.isnan(x_values) & np.isfinite(x_values)]])
                y_coordinates = np.concatenate([y_coordinates, y_values[~np.isnan(y_values) & np.isfinite(y_values)]])
                z_coordinates = np.concatenate([z_coordinates, z_values[~np.isnan(z_values) & np.isfinite(z_values)]])


                # Find the minimum and maximum values for each axis
                min_x = np.min(x_coordinates)
                max_x = np.max(x_coordinates)
                mean_x = (max_x + min_x)/2
                min_y = np.min(y_coordinates)
                max_y = np.max(y_coordinates)
                mean_y = (max_y + min_y)/2
                min_z = np.min(z_coordinates)
                max_z = np.max(z_coordinates)
                mean_z = (max_z + min_z)/2

                x_coordinates = []
                y_coordinates = []
                z_coordinates = []
                
                # print("X coords - min: " + str(min_x) + " - max: " + str(max_x))
                # print("Y coords - min: " + str(min_y) + " - max: " + str(max_y))
                # print("Z coords - min: " + str(min_z) + " - max: " + str(max_z))
                # print("Mean coords: " + str(mean_x) + "|" + str(mean_y) + "|" + str(mean_z))
                viewer.updateData(point_cloud, mean_x, mean_y, mean_z)
            
            except Exception as e:
                print("Go close to the seafloor.")
                print(str(e))

            key = cv2.waitKey(5)
            if key != -1:
                viewer.keyPressedCallback(key, 0, 0)
                if key == 82 or key == 114:  # for 'r/R' key
                    out = record(zed, runtime, matL,out)

                    
                    
                    

            zed.retrieve_image(matL, sl.VIEW.LEFT)
            zed.retrieve_image(matR, sl.VIEW.RIGHT)
            mat_resized = cv2.resize(matL.get_data(), (512, 512))
            mat_resized_R = cv2.resize(matR.get_data(), (512, 512))

            if out == True:
                # Define the color of the dot (in BGR format)
                color = (0, 0, 255)  # Red color
                # Draw the red dot on the image
                cv2.circle(mat_resized, (480, 20), 5, (0, 0, 255, 255) , -1)  # -1 for filled circle
                cv2.circle(mat_resized_depth, (480, 20), 5, (0, 0, 255, 255) , -1)  # -1 for filled circle
                
            cv2.imshow("Left Camera", mat_resized)
            #cv2.imshow("ZED R", mat_resized_R)
            

            zed.retrieve_image(matD, sl.VIEW.DEPTH)
            mat_resized_depth = cv2.resize(matD.get_data(), (512, 512))
            cv2.imshow("DepthMap", mat_resized_depth)

    viewer.exit()
    zed.disable_recording()
    zed.close()
