import os
import cv2
import threading

class Camera:
    name="";
    cap=None
    frame=None
    success=False
    width=0
    height=0
    enable=False
    url=""

    def init(self,path):
        self.url=path
        self.cap = cv2.VideoCapture(path)
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.enable=self.cap.isOpened()
        threading.Thread(target= self.start).start()
       

    def start(self):
        while self.cap.isOpened():
            self.success, self.frame = self.cap.read()
            if(self.success):
                self.enable=True
                scale_percent = 20 # percent of original size
                width = int(self.frame.shape[1] * scale_percent / 100)
                height = int(self.frame.shape[0] * scale_percent / 100)
                dim = (width, height)
                resized=cv2.resize(self.frame,dim)
                cv2.imwrite(self.name+".jpg",resized)
        
        self.enable=False