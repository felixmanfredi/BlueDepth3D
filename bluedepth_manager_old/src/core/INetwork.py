from abc import ABC, abstractmethod

class INetwork(ABC):
    @abstractmethod
    def receive(self):
        pass
    
    @abstractmethod
    def send(self, resp: str, address = None):
        pass
    
    @abstractmethod
    def close(self):
        pass