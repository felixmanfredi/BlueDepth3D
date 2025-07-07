from abc import ABC, abstractmethod

class IStreamer(ABC):
    @abstractmethod
    def start_stream(self):
        pass

    @abstractmethod
    def stop_stream(self):
        pass
