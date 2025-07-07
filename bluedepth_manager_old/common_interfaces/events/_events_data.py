from enum import Enum
from typing import Optional
from ._base_events import EventData

class ErrorData(EventData):

    class Severity(Enum):
        WARNING = 0
        EXCEPTION = 1 # Può essere catturato e gestito - Simili ad eccezioni Java Checked
        CRITICAL = 2 # Da Notificare perché non gestibile - Simili ad eccezioni Java Unchecked

    class ServiceStatus(Enum):
        STARTING = 0
        RUNNING = 1
        STOPPED = 2

    def __init__(self, severity: Severity, description: str, service_name:str, service_status: ServiceStatus):
        super().__init__("service_error")
        self._severity = severity
        self._description = description
        # Service dato che potrebbe riguardare plug-in ma anche altri componenti (e.g. DatasetManager)
        self._service_name = service_name
        self._service_status = service_status

    @property
    def severity(self):
        return self._severity

    @property
    def description(self):
        return self._description

    @property
    def service(self):
        return self._service_name

    @property
    def service_status(self):
        return  self._service_status


class LocationStatus(EventData):

    def __init__(self, is_running: bool=False, timestamp: Optional[float] = None, latitude: Optional[tuple[float,str]] = None,
                 longitude: Optional[tuple[float,str]] = None, altitude: Optional[tuple[float,str]] = None):
        super().__init__("location_status")
        self._is_running = is_running
        self._timestamp = timestamp
        self._latitude = latitude
        self._longitude = longitude
        self._altitude = altitude

    @property
    def is_running(self) -> bool:
        return self._is_running

    @property
    def latitude(self) -> tuple[float,str]:
        return self._latitude

    @property
    def longitude(self) -> tuple[float,str]:
        return self._longitude

    @property
    def altitude(self) -> tuple[float,str]:
        return self._altitude

    @property
    def timestamp(self) -> float:
        return self._timestamp


class DeviceStatus(EventData):

    def __init__(self, name:str, settings: Optional[dict[str, any]] = None,
                 is_running: Optional[bool] = None, is_recording: Optional[bool] = None):
        super().__init__("device_status")
        self._name = name
        self._is_running = is_running
        self._settings = settings
        self._is_recording = is_recording

    @property
    def name(self):
        return self._name

    @property
    def is_running(self):
        return self._is_running

    @property
    def settings(self):
        return self._settings

    @property
    def is_recording(self):
        return self._is_recording
