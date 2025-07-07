import cv2 as cv
import numpy as np
from PIL import ImageFont, ImageDraw, Image
import logging

def Convert2RGB(image):
    if image.shape[2] == 4:
        return image[:, :, 3]
    elif image.shape[2]== 3:
        return image
    else:
        raise ValueError("Unsupported channels number!")

class ImageOverlayer:
    def __init__(self, transparency=0.4):
        # Imposta il livello di trasparenza
        self.transparency = transparency

    def OverlayDepthImage(self, image, depth_image):
        # Verify Image is RGBA (4 channles)
        image_ocv = Convert2RGB(image=image)
        depth_image_ocv = Convert2RGB(image=depth_image)

        normalized_depth_image = cv.normalize(depth_image_ocv, None, 0, 255, cv.NORM_MINMAX)
        depth_colored = cv.applyColorMap(normalized_depth_image.astype(np.uint8), cv.COLORMAP_JET)
        overlay_image = cv.addWeighted(image_ocv, 1 - self.transparency, depth_colored, self.transparency, 0)

        # Convert now to BGR
        overlay_image_RGB = cv.cvtColor(overlay_image, cv.COLOR_RGBA2RGB)
        
        return overlay_image_RGB
    
    
    def OverlayContourDepth(self, image, depth_image):
        pass


    # ----- SETTINGS ----- #

    def GetTransparency(self):
        return self.transparency
    
    def SetTransparency(self, param):
        if 0 <= param <= 1:
            self.transparency = param
            return True
        else:
            logging.error(f"Errore: il valore {param} non è tra 0 e 1")
            return False


class ColorbarOverlayer:
    def __init__(self,
                 max_scale=5.0,
                 font_path="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 bar_font_size=14,
                 top_font_size=22,
                 bar_text_color=(255, 255, 255),
                 top_text_color=(255, 255, 255),
                 bar_width=20,
                 bar_fraction=0.75,
                 colormap=cv.COLORMAP_JET,
                 num_ticks=10,
                 tick_length=6,
                 tick_thickness=1):
        self.max_scale = max_scale
        self.font_path = font_path
        self.bar_font_size = bar_font_size
        self.top_font_size = top_font_size
        self.bar_text_color = bar_text_color
        self.top_text_color = top_text_color
        self.bar_width = bar_width
        self.bar_fraction = bar_fraction
        self.colormap = colormap
        self.num_ticks = num_ticks
        self.tick_length = tick_length
        self.tick_thickness = tick_thickness

    def set_max_scale(self, max_scale):
        self.max_scale = max_scale

    def _draw_text_with_font(self, img, text, position, font_size, color):
        pil_img = Image.fromarray(cv.cvtColor(img, cv.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(pil_img)
        font = ImageFont.truetype(self.font_path, font_size)
        draw.text(position, text, font=font, fill=color)
        return cv.cvtColor(np.array(pil_img), cv.COLOR_RGB2BGR)

    def _add_colorbar(self, image):
        img_h, img_w = image.shape[:2]
        bar_h = int(img_h * self.bar_fraction)
        y_offset = (img_h - bar_h) // 2

        # Gradiente verticale da 0 a max_scale (dal basso verso l'alto)
        gradient = np.linspace(0, self.max_scale, bar_h).reshape(bar_h, 1)
        normalized = (gradient / self.max_scale * 255).astype(np.uint8)
        colorbar = cv.applyColorMap(normalized, self.colormap)
        colorbar = cv.resize(colorbar, (self.bar_width, bar_h))

        x_offset = 10 # Distanza dal bordo sinistro
        # Copia immagine per non modificarla direttamente
        overlay = image.copy()
        overlay[y_offset:y_offset + bar_h, x_offset:x_offset + self.bar_width] = colorbar
        # Tick + etichette
        tick_positions = np.linspace(y_offset, y_offset + bar_h - 1, self.num_ticks + 1)
        for i, y_tick in enumerate(tick_positions):
            y_tick = int(round(y_tick))
            pt1 = (x_offset + self.bar_width, y_tick)
            pt2 = (x_offset + self.bar_width + self.tick_length, y_tick)
            cv.line(overlay, pt1, pt2, self.bar_text_color, thickness=self.tick_thickness)

            depth_value = self.max_scale * (1 - i / self.num_ticks)
            label = f"{depth_value:.1f} m"
            text_position = (x_offset + self.bar_width + 10, y_tick - self.bar_font_size // 2)
            overlay = self._draw_text_with_font(overlay, label, text_position, self.bar_font_size, self.bar_text_color)

        return overlay

        ### SE VOGLIO CREARE UN RIQUADRO A PARTE USA QUESTO
        """# Immagine estesa per il colorbar con spazio per etichette
        total_width = self.bar_width + 50
        full_bar = np.zeros((img_h, total_width, 3), dtype=np.uint8)
        full_bar[y_offset:y_offset + bar_h, :self.bar_width] = colorbar

        # Tick interni alla barra (linee e etichette)
        tick_positions = np.linspace(y_offset, y_offset + bar_h - 1, self.num_ticks + 1)

        for i, y_tick in enumerate(tick_positions):
            y_tick = int(round(y_tick))
            pt1 = (self.bar_width, y_tick)
            pt2 = (self.bar_width + self.tick_length, y_tick)
            cv.line(full_bar, pt1, pt2, self.bar_text_color, thickness=self.tick_thickness)

            depth_value = self.max_scale * (1 - i / self.num_ticks)
            label = f"{depth_value:.1f} m"
            text_position = (self.bar_width + 10, y_tick - self.bar_font_size // 2)
            full_bar = self._draw_text_with_font(full_bar, label, text_position, self.bar_font_size, self.bar_text_color)

        # Combino la barra e l'immagine originale
        combined = np.hstack((full_bar, image))
        return combined"""

    def _add_text_top_right(self, image, text):
        img_h, img_w = image.shape[:2]
        font = ImageFont.truetype(self.font_path, self.top_font_size)
        left, top, right, bottom = font.getbbox(text)
        text_width = right - left
        text_height = bottom - top
        position = (img_w - text_width - 10, 10)
        return self._draw_text_with_font(image, text, position, self.top_font_size, self.top_text_color)

    def overlay(self, image, range_value):
        img_with_bar = self._add_colorbar(image)
        final_img = self._add_text_top_right(img_with_bar, f"Range: {range_value:.1f} m")
        return final_img