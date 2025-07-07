import logging
import os
from datetime import datetime
from pathlib import Path

class AppLogger:
    def __init__(self, log_dir: str = None, log_level: int = logging.DEBUG):

        if log_dir is None:
            home_dir = Path.home()  # Ottiene la home directory dell'utente
            log_dir = home_dir / "logs"

        os.makedirs(log_dir, exist_ok=True)

        log_filename = datetime.now().strftime("log_%Y-%m-%d_%H-%M-%S.log")
        self.log_path = os.path.join(log_dir, log_filename)

        self.logger = logging.getLogger("AppLogger")
        self.logger.setLevel(log_level)

        # Evita aggiunta di handler duplicati
        if not self.logger.handlers:
            file_handler = logging.FileHandler(self.log_path)
            stream_handler = logging.StreamHandler()

            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(formatter)
            stream_handler.setFormatter(formatter)

            self.logger.addHandler(file_handler)
            self.logger.addHandler(stream_handler)

    def info(self, message: str):
        self.logger.info(message)

    def warning(self, message: str):
        self.logger.warning(message)

    def error(self, message: str):
        self.logger.error(message)

    def debug(self, message: str):
        self.logger.debug(message)

    def get_log_path(self) -> str:
        return self.log_path
