import cv2 as cv
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import time

def EncodeImage(image: np.ndarray, format: str = "jpg", quality: int = 90) -> tuple:
    """
    Codifica un'immagine in un formato specifico (JPG, PNG, BMP, ecc.), generando un nome file progressivo.

    :param image: L'immagine OpenCV (NumPy array)
    :param format: Formato desiderato ("jpg", "png", "bmp")
    :param quality: Qualità dell'immagine (solo per JPG, default=90)
    :return: (nome_file, byte array dell'immagine codificata)
    """
    # Mappa i formati con le estensioni di OpenCV
    valid_formats = {"jpg": ".jpg", "jpeg": ".jpg", "png": ".png", "bmp": ".bmp"}
    
    if format not in valid_formats:
        raise ValueError(f"Formato non supportato: {format}. Scegli tra {list(valid_formats.keys())}")

    # Genera il nome del file basato sul timestamp (millisecondi)
    timestamp = round(time.time() * 1000)  # Tempo in millisecondi
    image_name = f"img_{timestamp}{valid_formats[format]}"

    # Parametri di compressione (solo JPG ha qualità regolabile)
    params = [cv.IMWRITE_JPEG_QUALITY, quality] if format in ["jpg", "jpeg"] else []

    # Codifica l'immagine
    success, encoded_image = cv.imencode(valid_formats[format], image, params)
    if not success:
        raise RuntimeError("Errore nella codifica dell'immagine")

    return image_name, encoded_image.tobytes()


def OverlayTextOnImage(image: np.ndarray, text: str, ratio = 0.02):
    height, width, _ = image.shape

    image_pil = Image.fromarray(cv.cvtColor(image, cv.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(image_pil)

    # Dynamic font based on image resolution
    margin = int(min(width, height) * ratio)  # ratio è proporzionale alle dimensioni dell'immagine
    font_size = int(min(width, height) * 0.05)  # Il font sarà il 5% della dimensione minore
    font = ImageFont.truetype("arial.ttf", font_size)

    # Draw text on image
    draw.text((margin, margin), text, font=font, fill=(255, 255, 255))  # Bianco

    return np.array(image_pil)
