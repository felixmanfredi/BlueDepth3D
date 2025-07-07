import webview
import webview.menu as wm
import threading
import  cv2
from multiprocessing import Process

global window_visibility
window_visibility=True

def playRTSP():
    
    input_rtsp_url = "rtsp://192.168.1.233/live/1_0"
    cap = cv2.VideoCapture(input_rtsp_url)
    #cap = cv2.VideoCapture(0)
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    while  True:
        ret,  frame = cap.read()
        if(ret):
            cv2.imshow("Processed Frame",  frame)
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

def exitApp():
    window.destroy()
    exit()
    quit()

if __name__ == '__main__':
    window=webview.create_window('BlueDepth', 'templates/index.html')
    window.on_top=True
    window.frameless=True
    
    menu_items = [
        wm.Menu(
            'BlueDepth',
            [
                wm.MenuAction('Mostra/Nascondi', hideshowWindow),
                wm.MenuAction('Esci', exitApp),
            ]
        )
    ]
    
    p1= Process(target = playRTSP).start()
    webview.start(menu=menu_items)



