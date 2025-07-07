import os
os.environ["PYOPENGL_PLATFORM"] = "egl"

import pyrender  # o la libreria che usi per il rendering

# crea il renderer con dimensioni a piacere
renderer = pyrender.OffscreenRenderer(viewport_width=640, viewport_height=480)

print("Renderer creato con successo con EGL!")
