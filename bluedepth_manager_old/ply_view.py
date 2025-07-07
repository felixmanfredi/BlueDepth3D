import multiprocessing as mp
import numpy as np
import cv2
import pyzed.sl as sl
import pyrender
import queue
import trimesh
import time
import logging

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
            print(f"Vista sconosciuta: {view_name}")

    def render_from_numpy_pc(self, pc_np):
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
        scene = pyrender.Scene(bg_color=[0, 0, 0, 0], ambient_light=[0.3, 0.3, 0.3])
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


def zed_capture_process(pointcloud_queue, width, height):
    zed = sl.Camera()
    init_params = sl.InitParameters()
    init_params.set_from_stream("192.168.0.50", 34000)

    if zed.open(init_params) != sl.ERROR_CODE.SUCCESS:
        print("Errore apertura ZED")
        return

    runtime_params = sl.RuntimeParameters()

    buffers = [sl.Mat(), sl.Mat()]
    buffer_index = 0

    try:
        while True:
            if zed.grab(runtime_params) == sl.ERROR_CODE.SUCCESS:
                buf = buffers[buffer_index]
                zed.retrieve_measure(buf, sl.MEASURE.XYZRGBA)
                pc_np = buf.get_data()  # numpy (H, W, 4) float32

                try:
                    if pointcloud_queue.full():
                        try:
                            pointcloud_queue.get_nowait()
                        except queue.Empty:
                            pass
                    pointcloud_queue.put_nowait(pc_np)
                except queue.Full:
                    print("Coda piena, frame scartato")

                buffer_index = (buffer_index + 1) % 2
            else:
                time.sleep(0.01)
    except KeyboardInterrupt:
        pass
    finally:
        zed.close()


def rendering_process(pointcloud_queue, width, height):
    renderer = Renderer(width, height)
    cv2.namedWindow("ZED Point Cloud", cv2.WINDOW_NORMAL)

    try:
        while True:
            try:
                pc_np = pointcloud_queue.get(timeout=0.1)
                img = renderer.render_from_numpy_pc(pc_np)

                if img is not None:
                    cv2.imshow("ZED Point Cloud", img)

                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('f'):
                    renderer.set_view('front')
                elif key == ord('t'):
                    renderer.set_view('top')
                elif key == ord('i'):
                    renderer.set_view('iso')

            except queue.Empty:
                pass
    except KeyboardInterrupt:
        pass
    finally:
        cv2.destroyAllWindows()


def main():
    width, height = 1280, 720

    pointcloud_queue = mp.Queue(maxsize=2)

    p_capture = mp.Process(target=zed_capture_process, args=(pointcloud_queue, width, height))
    p_render = mp.Process(target=rendering_process, args=(pointcloud_queue, width, height))

    p_capture.start()
    p_render.start()

    while True:
        try:
            pass
                #p_capture.join()
                #p_render.join()
                #print("ok")
        except KeyboardInterrupt:
         print("Terminazione...")


if __name__ == '__main__':
    mp.set_start_method('spawn')  # importante su Linux/Windows per multiprocessing
    main()