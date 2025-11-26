import cv2
import camera
import threading
import configparser
import socket
import numpy as np
import time

# --- Importazioni GStreamer ---
# Potrebbe essere necessario installare: python-gi, python-gst-1.0, e gstreamer-rtsp-server
from gi.repository import Gst, GObject, GstRtp, GstRtspServer

global success, current_frame, selected_camera, process_streaming, cameras
current_frame = None
success = False
selected_camera = 0

cameras = []
rtsp_url = "" 
rtsp_port = 8554 # Porta di default per RTSP

# Variabili specifiche per GStreamer
rtsp_server = None
rtsp_factory = None
appsrc = None
mainloop = None
Gst.init(None) # Inizializza GStreamer

# Il resto delle funzioni (parseCommand, startServerSocket, getCurrentFrame, 
# addCamera, removeCamera, loadingCameras) rimane invariato. 
# Le riporto di seguito per completezza, ma senza modifiche sostanziali.

# =================================================================
# FUNZIONI STANDARD (Invariate)
# =================================================================

def parseCommand(data):
  global selected_camera,cameras
  [cmd,value]=data.split('|')
  if(cmd=="CAMERA"): #seleziona camera
    if(int(value)<len(cameras)):
      selected_camera=int(value)

  if(cmd=="STREAMING"): #abilita lo streaming
    if(int(value)==0):
      stopSendingRTSP()
    else:
      startSendingRTSP()

  if(cmd=="ADDCAMERA"): #imposta una camera
    [path,name]=value.split(';')
    addCamera(path,name)

  if(cmd=="REMOVECAMERA"): #imposta una camera
    removeCamera(value)

def startServerSocket():
    # get the hostname
    port = socket_port  # initiate port no above 1024

    print("Start socket server to port "+str(port))
    

    server_socket = socket.socket()  # get instance
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    # look closely. The bind() function takes tuple as argument
    server_socket.bind(("0.0.0.0", port))  # bind host address and port together

    # configure how many client the server can listen simultaneously
    server_socket.listen(2)
    conn, address = server_socket.accept()  # accept new connection
    print("Connection from: " + str(address))
    while True:
        # receive data stream. it won't accept data packet greater than 1024 bytes
        data = conn.recv(1024).decode()
        if not data:
            # if data is not received break
            break
        
        
        parseCommand(data)
        print("from connected user: " + str(data))

    conn.close()  # close the connection

def getCurrentFrame():
    global selected_camera,cameras
    if(selected_camera<len(cameras)):
      success=cameras[selected_camera].success
      if(success):
        frame=cameras[selected_camera].frame
        if(overlay!=""):
          img_overlay=cv2.imread(overlay)
          try:
            height, width = img_overlay.shape[:2]
            offset=[900,1520]
            frame[offset[0]:offset[0]+height, offset[1]: offset[1]+width] = img_overlay
          except Exception as e:
            print("ERROR GETFRAME:"+str(e))
            pass
    
        return [frame,success]
   
    return [None,False]

def addCamera(path,name):
  global cameras
  cam=camera.Camera()
  cam.name=name
  cam.init(path)
  if(cam.enable):
    cameras.append(cam)

def removeCamera(path):
  global cameras
  for c in cameras:
    if(c.url==path):
        cameras.remove(c)
        return True
  return False

def loadingCameras():
  global cameras
  print("Loading cameras")
  cameras=[]
  idx_camera=1
  for section in config.sections():
    if("CAMERA" in section):
      cam=camera.Camera()
      cam.name="camera"+str(idx_camera)
      cam.init(config.get(section,"url"))
      if(cam.enable):
        cameras.append(cam)
      idx_camera=idx_camera+1
  
  print(str(len(cameras))+" cameras configured!")


# =================================================================
# FUNZIONI DI STREAMING GStreamer (Nuova Logica)
# =================================================================

def need_data(src, length):
    """Callback di GStreamer, chiamata quando appsrc necessita di dati."""
    global current_frame, success
    
    if current_frame is None or not success:
        # Nessun dato disponibile o frame non valido
        return

    # 1. Creazione del Gst.Buffer
    try:
        data = current_frame.tobytes()
        buffer = Gst.Buffer.new_wrapped(data)
        
        # 2. Imposta i timestamp (opzionale ma consigliato per RTSP)
        # buffer.pts = Gst.util_get_timestamp()
        
        # 3. Spinge il buffer in GStreamer
        src.emit("push-buffer", buffer)
        
    except Exception as e:
        print(f"Errore nell'invio del buffer GStreamer: {e}")


def _startSendingRTSP_GStreamer():
    """Configura e avvia il server RTSP con GStreamer."""
    global rtsp_server, rtsp_factory, mainloop, appsrc, rtsp_url, rtsp_port

    if rtsp_server:
        print("Server RTSP già in esecuzione.")
        return

    # Estrai la porta dall'URL (es. rtsp://0.0.0.0:8554/mystream)
    try:
        # Usa il parser standard per l'URL per estrarre il path
        parsed_url = Gst.Uri.from_string(rtsp_url)
        path = parsed_url.get_path_string()
        rtsp_port = int(parsed_url.get_port())
    except:
        print("Impossibile parsare rtsp_url. Uso i valori di default: /stream e porta 8554.")
        path = "/stream"
        rtsp_port = 8554

    print(f"Avvio RTSP Server su porta {rtsp_port} con percorso: {path}")

    # 1. Pipeline Factory: Definisce la pipeline GStreamer da usare
    class MyMediaFactory(GstRtspServer.RTSPMediaFactory):
        def do_create_element(self, url):
            # Pipeline GStreamer (Video YUV420P H.264)
            # appsrc ! videorate ! capsfilter ! videoconvert ! x264enc ! rtph264pay ! fakesink
            
            # Nota: appsrc riceve i dati BGR24 di OpenCV.
            # Rete OpenCV (BGR24) -> appsrc -> videoconvert(BGR->I420) -> x264enc -> rtph264pay
            
            # Definisci le dimensioni del frame
            if not cameras:
                return None
            width = cameras[selected_camera].width
            height = cameras[selected_camera].height
            fps = 30 # Assumiamo 30 FPS
            
            # La pipeline che genera lo stream RTP
            pipeline_str = (
                f"appsrc name=mysource is-live=true format=3 caps=video/x-raw,format=BGR,width={width},height={height},framerate={fps}/1 ! "
                f"videoconvert ! video/x-raw,format=I420 ! "
                f"x264enc speed-preset=ultrafast tune=zerolatency ! "
                f"rtph264pay name=pay0 pt=96"
            )
            
            print(f"Pipeline GStreamer: {pipeline_str}")
            pipeline = Gst.parse_launch(pipeline_str)
            
            # Trova l'elemento appsrc per il push dei dati
            global appsrc
            appsrc = pipeline.get_by_name('mysource')
            
            # Collega la callback per quando GStreamer ha bisogno di dati
            appsrc.connect("need-data", need_data)
            
            return pipeline

    # 2. Configura e avvia il server RTSP
    rtsp_server = GstRtspServer.RTSPServer.new()
    rtsp_server.set_service(str(rtsp_port))

    rtsp_factory = MyMediaFactory()
    rtsp_factory.set_shared(True)
    rtsp_factory.set_launch(f"( appsrc name=mysource ! videoconvert ! x264enc ! rtph264pay name=pay0 pt=96 )")
    
    mount_points = rtsp_server.get_mount_points()
    mount_points.add_factory(path, rtsp_factory)

    rtsp_server.attach(None)
    
    # 3. Avvia il loop principale di GStreamer
    mainloop = GObject.MainLoop.new(None, False)
    threading.Thread(target=mainloop.run).start()
    
    print(f"Server RTSP avviato. URL: rtsp://<IP_TUO_PC>:{rtsp_port}{path}")


def startSendingRTSP():
  global rtsp_server
  if(rtsp_server is None):
    # La logica di GStreamer gestirà la parte di streaming in un thread separato (mainloop)
    _startSendingRTSP_GStreamer()

def stopSendingRTSP():
  global rtsp_server, mainloop
  if rtsp_server:
    print("Arresto del server RTSP...")
    
    # Ferma il loop principale di GObject
    if mainloop:
        mainloop.quit()
        mainloop = None
        
    # Sgancia il server RTSP
    # La gestione dell'arresto del server e dei mount point può essere complessa, 
    # ma fermare il mainloop è il passo più importante.
    rtsp_server = None
    print("Server RTSP arrestato.")


if __name__ == "__main__":
  
  print("Streaming Socket Start")
  print("---------------------")
  
  # Carica il file di configurazione
  config=configparser.ConfigParser()
  config.read("config.ini")
  
  # Legge l'URL e la porta per l'RTSP
  try:
      rtsp_url=config.get("SERVER_RTSP","url")
      overlay=config.get("SERVER_RTSP","overlay")
  except configparser.NoSectionError:
      print("ATTENZIONE: Sezione [SERVER_RTSP] non trovata. Uso [SERVER_RTMP] come fallback.")
      rtsp_url=config.get("SERVER_RTMP","url")
      overlay=config.get("SERVER_RTMP","overlay")

  # Inizializzazione delle variabili di configurazione
  preview=config.getboolean("GENERAL","preview")
  socket_port=config.getint("GENERAL","socket_port")
  autostartstreaming=config.getboolean("GENERAL","autostartstreaming")
  
  loadingCameras()
  threading.Thread(target= startServerSocket).start()

  if(autostartstreaming):
    startSendingRTSP()
  
  
  if(preview):
    cv2.namedWindow("Preview",flags=cv2.WINDOW_NORMAL)

  # Questo loop ora alimenta la funzione need_data indirettamente
  while True:
    
    # Qui il thread principale aggiorna il frame
    [current_frame,success]=getCurrentFrame()
    
    # Nota: La funzione need_data di GStreamer spingerà il frame
    # quando ne avrà bisogno. Questo ciclo continua a popolare current_frame.

    if(success):
      cv2.putText(current_frame,"CAMERA "+str(selected_camera+1),(20,60),cv2.FONT_HERSHEY_PLAIN,5,(255,0,0),5)
      
      scale_percent = 20 # percent of original size
      width = int(current_frame.shape[1] * scale_percent / 100)
      height = int(current_frame.shape[0] * scale_percent / 100)
      dim = (width, height)
      resized=cv2.resize(current_frame,dim)
    
    if(preview and current_frame is not None):
      try:
          cv2.imshow("Preview",resized)
      except:
          pass

      key=cv2.waitKey(1)
      if(key==49):
        selected_camera=0
      if(key==50):
        if(len(cameras)<3):
          selected_camera=1
      if(key==51):
        if(len(cameras)<4):
          selected_camera=2