from ..core.INetwork import INetwork
import socket

class UDPLink (INetwork):
    def __init__(self, host:str, port: int):
        self.host = host
        self.port = port
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind((self.host, self.port))

    def receive(self):
        data, address = self.socket.recvfrom(1024)
        return data.decode(), address
    
    def send(self, resp:str , address= None):
        self.socket.sendto(resp.encode(), address)
    
    def close(self):
        self.socket.close()
