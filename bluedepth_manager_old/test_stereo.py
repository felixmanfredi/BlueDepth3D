from ZEDManager import ZEDXOneStereoManager
import numpy as np
import time
import os
from pathlib import Path
from json_manager import load_json



def callback_test_capture_images(name: str, image: bytes | np.ndarray, image_type: str):
    print(f"[CALLBACK] Ricevuta immagine: {name}, tipo: {image_type}, shape: {image.shape if isinstance(image, np.ndarray) else 'N/A'}")

def test_save_callback(saved_files: dict, success: bool):
    print(f"[CALLBACK] Success: {success}")
    print("[CALLBACK] File salvati:")


def main():
    output_dir = Path("test_output")
    params = load_json(os.path.join(os.path.dirname(__file__), "manifest.json"))
    camera = ZEDXOneStereoManager(**params["init_params"])

    try:
        print("[TEST] Avvio servizio...")
        camera.start_service()
        time.sleep(15.0)  # Attendi acquisizione iniziale
        print("[TEST] Servizio avviato")
        
        print("[TEST] FRONT")
        camera.set_ply_stream_view(0)
        time.sleep(5.0)

        print("[TEST] TOP")
        camera.set_ply_stream_view(1)
        time.sleep(5.0)

        print("[TEST] ISO")
        camera.set_ply_stream_view(2)
        time.sleep(5.0)

        """print("[TEST] Capture Images Test started.")
        camera.capture_images(callback=callback_test_capture_images, with_depth_map=False)
        camera.capture_images(callback=callback_test_capture_images, with_depth_map=False, is_left=False)
        camera.capture_images(callback=callback_test_capture_images, with_depth_map=True)
        camera.capture_images(callback=callback_test_capture_images, with_depth_map=True, is_left = False)
        print("[TEST] Capture Images Test completed.")

        time.sleep(5.0)
        print("[TEST] Save last frame started.")
        camera.save_last_frame(callback=callback_test_capture_images, output_dir=output_dir)
        print("[TEST] Save last frame completed.")

        time.sleep(5.0)
        print("[TEST] Get distance started.")
        print(camera.get_distance())
        print("[TEST] Get distance completed.")

        time.sleep(5.0)
        print("[TEST] Set Max_Full_Scale.")
        camera.set_max_full_scale(2.0)

        time.sleep(5.0)
        print("[TEST] Set Transparency.")
        camera.set_overlay_transparency(0.5)

        print("[TEST] Recording SVO started.")
        camera.start_video_recording(output_dir, "prova", lambda: print("Start Video Ended"), callback_test_capture_images, None)
        time.sleep(10.0)
        camera.stop_video_recording()
        print("[TEST] Recording SVO completed.")"""
        
    except Exception as e:
        print(f"[ERRORE] {e}")
    finally:
        print("[TEST] Arresto servizio...")
        camera.stop_service()
        print("[OK] Test completato.")


if __name__ == "__main__":
    main()