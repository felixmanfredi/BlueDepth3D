import threading
import queue
from .OverlayProcessor import ImageOverlayer, ColorbarOverlayer
import logging

class OverlayThread(ImageOverlayer):
    def __init__(self, image_queue, overlay_queue, transparency=0.4):
        super().__init__(transparency=transparency)
        self.image_queue = image_queue
        self.overlay_queue = overlay_queue
        self.running = False

    def start(self):
        self.running = True
        threading.Thread(target=self.run, daemon=True).start()

    def stop(self):
        self.running = False

    def run(self):
        while self.running:
            try:
                image, depth_image, range_val = self.image_queue.get(timeout=1)
                overlayed = self.OverlayDepthImage(image, depth_image)
                self.overlay_queue.put((overlayed, range_val))
            except queue.Empty:
                continue
            except Exception as e:
                logging.error(f"[OverlayThread] Errore: {e}")


class ColorbarThread(ColorbarOverlayer):
    def __init__(self, overlay_queue, output_queue, max_scale=5.0):
        super().__init__(max_scale=max_scale)
        self.overlay_queue = overlay_queue
        self.output_queue = output_queue
        self.running = False

    def start(self):
        self.running = True
        threading.Thread(target=self.run, daemon=True).start()

    def stop(self):
        self.running = False

    def run(self):
        while self.running:
            try:
                overlayed_img, range_val = self.overlay_queue.get(timeout=1)
                final = self.overlay(overlayed_img, range_val)
                self.output_queue.put(final)
            except queue.Empty:
                continue
            except Exception as e:
                logging.error(f"[ColorbarThread] Errore: {e}")

