from abc import ABC, abstractmethod

class IDepthCapture(ABC):
    @abstractmethod
    def capture_left_depth_image(self):
        pass

    @abstractmethod
    def capture_right_depth_image(self):
        pass