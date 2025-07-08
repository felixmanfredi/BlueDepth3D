import webview
import webview.menu as wm
import signal
import  cv2
from multiprocessing import Process
import zed as ZED
import socket
import requests
import base64
import subprocess

bluedepth_socket=None
global window_visibility
window_visibility=True
p1=None
p2=None
p3=None


class Api:
    def startDataset(self,dataset):
        return sendPost("datasets/start",dataset)
    def stopDataset(self):
        return sendPut("datasets/stop",None)

    def capture(self):
        img=sendGet("camera/capture")
        with open("capture.jpeg",'wb') as f:
            f.write(img)
        
        subprocess.call("capture.jpeg",shell=True)
        return

    def on_event(self,data):
        print(data)
        return data

def sigterm_handler(_signo, _stack_frame):
    # Raises SystemExit(0):
    p1.terminate()
    p1.kill()
    p2.terminate()
    p2.kill()

def playRTSP():
    global onRunRTSP
    input_rtsp_url = "rtsp://192.168.1.233/live/1_0"
    cap = cv2.VideoCapture(input_rtsp_url)
    
    width = 800
    height = 450
    cv2.namedWindow('Camera', cv2.WINDOW_GUI_NORMAL)
    #cv2.setWindowProperty('Camera',cv2.WND_PROP_TOPMOST,1)
    cv2.setWindowProperty('Camera', cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    cv2.moveWindow('Camera',400,0)
    cv2.resizeWindow('Camera', width, height)
   
    while  True:
        ret,  frame = cap.read()
        if(ret):
            cv2.imshow("Camera",  frame)
        if  cv2.waitKey(1) == ord("q"):
            break
    cap.release()

    

    cv2.destroyAllWindows()


def hideshowWindow():
    global window_visibility

    if(window_visibility):
        window.hide()
        window_visibility=False
    else:
        window.show()
        window_visibility=True

def connectSocket():
    bluedepth_socket = socket.socket()  # instantiate
    bluedepth_socket.connect(("192.168.1.235", 5555))  # connect to the server
    while(True):
        data = bluedepth_socket.recv(1024).decode()  # receive response 
        #print(data)


def sendGet(endpoint):
    res=requests.get("http://192.168.1.235:45032/"+endpoint)
    return res.content


def sendPost(endpoint,data):
    res=requests.post("http://192.168.1.235:45032/"+endpoint,json=data)
    return res.json



def sendPut(endpoint,data):
    res=requests.put("http://192.168.1.235:45032/"+endpoint,json=data)
    return res.json

def exitApp():
    global onRunRTSP
    p1.terminate()
    p1.kill()
    p2.terminate()
    p2.kill
    window.destroy()
    exit()
    quit()

if __name__ == '__main__':
    signal.signal(signal.SIGTERM, sigterm_handler)

    
    window=webview.create_window('BlueDepth Camera', 'templates/index.html',width=420,height=1200,minimized=False,maximized=False,y=0,x=0,on_top=False,frameless=True,resizable=False,js_api=Api())

    menu_items = [
        wm.Menu(
            'Menu',
            [
                wm.MenuAction('Mostra/Nascondi', hideshowWindow),
                wm.MenuAction('Esci', exitApp),
            ]
        )
    ]
    
    p1 = Process(target = playRTSP)
    p1.start()
    p2 = Process(target=ZED.initZed)
    p2.start()
    #p3=Process(target=connectSocket)
    #p3.start()

    webview.start(menu=menu_items,debug=False)


    
