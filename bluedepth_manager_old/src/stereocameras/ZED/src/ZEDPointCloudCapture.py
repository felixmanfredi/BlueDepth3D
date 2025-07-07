from src.core.IPointCloudCapture import IPointCloudCapture
import pyzed.sl as sl
import datetime
import os
import logging

valid_formats = {"ply", "bin", "xyz"}

class ZEDPointCloudAcquisition(IPointCloudCapture):
    def __init__(self, camera: sl.Camera) -> None:
        self.zed = camera

    def capture_point_cloud(self):
        point_cloud = sl.Mat()
        self.zed.retrieve_measure(point_cloud, sl.MEASURE.XYZRGBA, sl.MEM.CPU)
        return point_cloud
    
    def save_point_cloud(self, point_cloud: sl.Mat, filename: str, file_format: str = 'ply', directory: str = "PointClouds"):
        """
        Salva la point cloud acquisita dalla fotocamera ZED in un file all'interno di una cartella specificata.
        :param point_cloud: Nuvola di punti come sl.Mat
        :param directory: Cartella di destinazione (default: 'PointClouds').
        :param filename: Nome del file senza estensione (se None, viene generato un timestamp).
        :param file_format: Formato del file, es. "ply", "bin", "xyz".
        """

        # Check point cloud file format
        file_format = file_format.lower()
        if file_format not in valid_formats:
            logging.error(f"Errore: formato '{file_format}' non supportato. Usa uno tra {valid_formats}.")
            return False
    
        # Creazione della cartella se non esiste
        os.makedirs(directory, exist_ok = True)

        if not filename:
            timestamp = datetime.datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
            filename = f"PointCloud_{timestamp}"
        
        filename = os.path.join(directory, f"{filename}.{file_format.lower()}")
        err = point_cloud.write(filename)
        if err == sl.ERROR_CODE.SUCCESS:
            logging.debug(f"Salvataggio della point cloud in '{filename}' riuscito!")
        else:
            logging.error(f"Errore nel salvataggio della point cloud in '{filename}'")
            return False

        return True
