### Retrieve Depth Images in BGRA ###

from src.core.IDepthCapture import IDepthCapture
import pyzed.sl as sl

class ZEDDepthCapture(IDepthCapture):
    def __init__(self, camera: sl.Camera) -> None:
        self.zed_camera = camera

    def capture_left_depth_image(self):
        image = sl.Mat()
        self.zed_camera.retrieve_image(image, sl.VIEW.DEPTH)
        return image
    
    def capture_right_depth_image(self):
        image = sl.Mat()
        self.zed_camera.retrieve_image(image, sl.VIEW.DEPTH_RIGHT)
        return image
    
    def capture_depth_measure(self):
        measure = sl.Mat()
        self.zed_camera.retrieve_measure(measure, sl.MEASURE.DEPTH)
        return measure
    
    def capture_all(self):
        depth_image_left = sl.Mat() 
        depth_image_right = sl.Mat()
        depth_measure = sl.Mat()
        self.zed_camera.retrieve_image(depth_image_left, sl.VIEW.DEPTH)
        self.zed_camera.retrieve_image(depth_image_right, sl.VIEW.DEPTH_RIGHT)
        self.zed_camera.retrieve_measure(depth_measure, sl.MEASURE.DEPTH)
        return depth_image_left, depth_image_right, depth_measure