import multiprocessing as mp
import numpy as np
import cv2
import pyzed.sl as sl
import pyrender
import queue
import trimesh
import time
import logging

import os
os.environ["PYOPENGL_PLATFORM"] = "egl"

class Renderer:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.renderer = pyrender.OffscreenRenderer(viewport_width=width, viewport_height=height)
        self.current_view = 'front'  # vista di default
        

    def set_view(self, view_name):
        if view_name in ['front', 'top', 'iso']:
            self.current_view = view_name
            logging.debug(f"Vista impostata su: {view_name}")
        else:
            logging.warning(f"Vista sconosciuta: {view_name}")

    def render_from_numpy_pc(self, pc_np):
        try:
            view=self.current_view
            # pc_np shape: (H, W, 4) con XYZRGBA
            valid_mask = np.isfinite(pc_np).all(axis=2)  # mask shape (H, W)
            if not np.any(valid_mask):
                return np.zeros((self.height, self.width, 3), dtype=np.uint8)

            # Estrai punti xyz validi
            xyz = pc_np[:, :, :3][valid_mask]  # shape (N_valid, 3)

            # Estrai canale rgba e convertilo in uint32
            rgba_f32 = pc_np[:, :, 3]
            rgba_uint32 = rgba_f32.view(np.uint32)

            # Decodifica colori RGB
            r = ((rgba_uint32 >> 0) & 0xFF).astype(np.float32) / 255.0
            g = ((rgba_uint32 >> 8) & 0xFF).astype(np.float32) / 255.0
            b = ((rgba_uint32 >> 16) & 0xFF).astype(np.float32) / 255.0

            # Appiattisci maschera e colori e applica la maschera per filtrare solo i validi
            valid_mask_flat = valid_mask.flatten()
            r_valid = r.flatten()[valid_mask_flat]
            g_valid = g.flatten()[valid_mask_flat]
            b_valid = b.flatten()[valid_mask_flat]

            colors = np.stack((r_valid, g_valid, b_valid), axis=1)

            # Crea scena pyrender
            scene = pyrender.Scene(bg_color=[0.9, 0.9, 0.9, 1.0], ambient_light=[0.5, 0.5, 0.5])
            cloud = trimesh.points.PointCloud(vertices=xyz, colors=(colors * 255).astype(np.uint8))
            mesh = pyrender.Mesh.from_points(cloud.vertices, colors=cloud.colors)
            scene.add(mesh)

            # Centro e dimensione nuvola
            center = xyz.mean(axis=0)
            bounds_min = xyz.min(axis=0)
            bounds_max = xyz.max(axis=0)
            extent = np.linalg.norm(bounds_max - bounds_min)

            # Direzioni predefinite camera
            directions = {
                'front': np.array([0, 0, 1]),
                'top':   np.array([0, -1, 0]),
                'iso':   np.array([1, -1, 1]) / np.linalg.norm([1, -1, 1]),
            }
            direction = directions.get(view, directions['front'])

            # Posizionamento camera
            cam_pose = np.eye(4)
            cam_pose[:3, 3] = center + direction * extent * 1.5

            # Rotazione camera verso centro
            forward = cam_pose[:3, 3] - center
            forward /= np.linalg.norm(forward)
            right = np.cross(np.array([0, 1, 0]), forward)
            if np.linalg.norm(right) < 1e-6:
                right = np.cross(np.array([1, 0, 0]), forward)
            right /= np.linalg.norm(right)
            up = np.cross(forward, right)
            cam_pose[:3, :3] = np.vstack([right, up, forward]).T

            # Aggiungi camera e luce
            cam = pyrender.PerspectiveCamera(yfov=np.pi / 4.0)
            scene.add(cam, pose=cam_pose)
            scene.add(pyrender.DirectionalLight(color=np.ones(3), intensity=3.0), pose=cam_pose)

            # Render immagine
            color, _ = self.renderer.render(scene)
            return cv2.cvtColor(color, cv2.COLOR_RGB2BGR)
        except Exception as e:
            return None


def rendering_process(pointcloud_queue, width, height, setpoint_view, image_queue, stop_event):
    renderer = Renderer(width, height)
    time.sleep(2.0)
    while not stop_event.is_set():
        try:
            set_point = setpoint_view.get_nowait()
            if set_point == 0:
                renderer.set_view('front')
            elif set_point==1:
                renderer.set_view('top')
            elif set_point==2:
                renderer.set_view('iso')
            else:
                renderer.set_view('front')

        except queue.Empty:
            pass

        try:
            pc_np = pointcloud_queue.get_nowait()
            img = renderer.render_from_numpy_pc(pc_np)
            if img is not None:
                try:
                    image_queue.put_nowait(img)
                except Exception as e:
                    logging.error(e)
        except queue.Empty:
            pass