from ZEDManager import ZEDXOneStereoManager
import time
import os
from json_manager import load_json

# Used for testing camea

if __name__ == "__main__":
    params = load_json(os.path.join(os.path.dirname(__file__), "manifest.json"))
    camera = ZEDXOneStereoManager(**params)
    camera.start_service()
    time.sleep(10)
    camera.stop_service()


