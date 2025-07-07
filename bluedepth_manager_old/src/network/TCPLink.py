import socket
from ..core.INetwork import INetwork
import logging

class TCPLink(INetwork):
    def __init__(self, host: str, port: int, mode: str = "server"):
        self.host = host
        self.port = port
        self.mode = mode
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.connection = None

        if self.mode == "server":
            self.socket.bind((self.host, self.port))
            self.socket.listen(1)
            logging.debug(f"Server in ascolto su {self.host}:{self.port}")
        else:  # Modalità client
            self.socket.connect((self.host, self.port))
            logging.debug(f"Connesso al server {self.host}:{self.port}")

    def accept_connection(self):
        """Accetta una connessione in modalità server"""
        if self.mode == "server":
            self.connection, address = self.socket.accept()
            logging.debug(f"Connessione accettata da {address}")

    def send(self, message: str, address = None):
        """Invia un messaggio (sia in server che in client)"""
        if self.mode == "server":
            if hasattr(self, 'connection'):
                self.connection.sendall(message.encode())
        else:
            self.socket.sendall(message.encode())

    def receive(self):
        """Riceve un messaggio (sia in server che in client)"""
        if self.mode == "server":
            data = self.connection.recv(1024)
        else:
            data = self.socket.recv(1024)
        return data.decode() if data else None

    def close(self):
        if self.mode == "server":
            self.connection.close()
        self.socket.close()
