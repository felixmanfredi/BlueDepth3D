from abc import ABC, abstractmethod

class IPointCloudCapture(ABC):
    @abstractmethod
    def capture_point_cloud(self):
        pass

    @abstractmethod
    def save_point_cloud(self, filename: str, format: str, directory: str="PointClouds"):
        pass