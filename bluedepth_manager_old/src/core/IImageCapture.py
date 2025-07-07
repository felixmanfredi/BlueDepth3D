from abc import ABC, abstractmethod

class IImageCapture(ABC):
    @abstractmethod
    def capture_left_image(self):
        pass

    @abstractmethod
    def capture_right_image(self):
        pass

    @abstractmethod
    def capture_raw_left_image(self):
        pass

    @abstractmethod
    def capture_raw_right_image(self):
        pass