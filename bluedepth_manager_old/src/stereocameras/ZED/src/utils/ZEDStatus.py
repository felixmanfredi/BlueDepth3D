from typing import Optional
from common_interfaces.events import DeviceStatus

class ZEDStatus(DeviceStatus):
    def __init__(self, name:str, settings: Optional[dict[str, any]] = None,
                 is_running: Optional[bool] = None, is_recording: Optional[bool] = None, 
                 center_distance: Optional[float] = None, ply_stream_view: Optional[int] = None, full_scale: Optional[float] = None, transparency:Optional[float]= None):
        
        super().__init__(name=name, settings=settings, is_running=is_running, is_recording=is_recording)
        self._center_distance = center_distance
        self._ply_stream_view = ply_stream_view
        self._transparency = transparency
        self._full_scale = full_scale
        self._name = name
        self._is_running = is_running
        self._settings = settings

    
    @property
    def center_distance(self):
        return self._center_distance
    
    @property
    def ply_stream_view(self):
        return self._ply_stream_view
    
    @property
    def transparency(self):
        return self._transparency