### Retrieve Images in BGRA ###

import pyzed.sl as sl
from src.core.IImageCapture import IImageCapture

class ZEDImageCapture(IImageCapture):
    def __init__(self, camera: sl.Camera) -> None:
        self.zed_camera = camera

    def capture_left_image(self):
        image = sl.Mat()
        self.zed_camera.retrieve_image(image, sl.VIEW.LEFT)
        return image
    
    def capture_right_image(self):
        image = sl.Mat()
        self.zed_camera.retrieve_image(image, sl.VIEW.RIGHT)
        return image

    def capture_raw_left_image(self):
        image = sl.Mat()
        self.zed_camera.retrieve_image(image, sl.VIEW.LEFT_UNRECTIFIED)
        return image

    def capture_raw_right_image(self):
        image = sl.Mat()
        self.zed_camera.retrieve_image(image, sl.VIEW.RIGHT_UNRECTIFIED)
        return image
    
    def capture_all(self):
        image_left = sl.Mat() 
        image_right = sl.Mat()
        self.zed_camera.retrieve_image(image_left, sl.VIEW.LEFT)
        self.zed_camera.retrieve_image(image_right, sl.VIEW.RIGHT)
        return image_left, image_right