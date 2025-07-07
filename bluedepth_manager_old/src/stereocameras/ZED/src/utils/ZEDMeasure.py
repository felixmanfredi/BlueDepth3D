import pyzed.sl as sl
import logging

def get_center_distance(image: sl.Mat, depth: sl.Mat):
    """
    Ottiene la distanza dal centro dell'immagine utilizzando la depth map.

    :param image: Matrice dell'immagine (per ottenere larghezza e altezza).
    :param depth: Matrice della depth map da cui estrarre la distanza.
    :return: Distanza in millimetri, oppure None se il valore non è valido.
    """
    # Valid Matrices
    if image.is_init() == False or depth.is_init() == False:
        logging.error("Errore: le immagini non sono inizializzate correttamente.")
        return 0.0

    # Calcola il centro dell'immagine
    x = image.get_width() // 2
    y = image.get_height() // 2

    # Ottiene il valore della profondità nel punto centrale
    err, depth_value = depth.get_value(x, y)

    # Controllo se l'operazione è andata a buon fine
    if err != sl.ERROR_CODE.SUCCESS or depth_value <= 0 or depth_value != depth_value:  # Controlla NaN
        logging.debug(f"Errore nel recupero della distanza alla posizione ({x}, {y})")
        return 0.0

    # Stampa il risultato e lo ritorna
    return depth_value
