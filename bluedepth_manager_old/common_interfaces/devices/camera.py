import numpy as np
from abc import ABCMeta, abstractmethod
from typing import Any, Optional, Callable
from common_interfaces.events import EventManager, EventType, SubjectType, ErrorData, DeviceStatus


class CameraInterface(metaclass=ABCMeta):

    @abstractmethod
    def __init__(self):
        self._is_running = False
        self._is_recording = False
        self._recording_interval: Optional[float] = None # It needs to service to trigger shooting

    @property
    def name(self):
        return type(self).__name__

    @property
    def is_running(self):
        return self._is_running
    
    @property
    def is_recording(self):
        return self._is_recording

    def _status(self, add_settings: bool = False):
        status = DeviceStatus(
            name=self.name,
            settings=self.get_settings() if add_settings else None,
            is_running=self._is_running,
            is_recording=self.is_recording
        )
        return status

    # Notify status including name, if recording is_running, duration of running ...
    def notify_status(self, add_settings: bool = False):
        status = self._status(add_settings)
        EventManager.get_instance().trigger_event(EventType.STATUS_CHANGE, SubjectType.CAMERA, status)

    def notify_error(self, e: ErrorData):
        EventManager.get_instance().trigger_event(EventType.ERROR_OCCURRED, SubjectType.CAMERA, e)

    # region: register decorators on abstract template method
    @classmethod
    def __update_recoding_field(cls, function):

        def wrapper(self, *args, **kwargs):
            function(self, *args, **kwargs) # We execute other instructions only if function does not raise an error
            self._recording_interval = kwargs.get("interval", None)
            self._is_recording = True
            self.notify_status()

        return wrapper

    @classmethod
    def __reset_recoding_field(cls, function):

        def wrapper(self, *args, **kwargs):
            function(self, *args, **kwargs) # We execute other instructions only if function does not raise an error
            self._recording_interval = None
            self._is_recording = False
            self.notify_status()

        return wrapper

    @classmethod
    def __notify_settings_changes(cls, function):

        def wrapper(self, *args, **kwargs):
            function(self, *args, **kwargs)
            self.notify_status(True)

        return wrapper


    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.start_recording = cls.__update_recoding_field(cls.start_recording)
        cls.stop_recording = cls.__reset_recoding_field(cls.stop_recording)
        cls.set_settings = cls.__notify_settings_changes(cls.set_settings)

    # endregion


    @abstractmethod
    def start_service(self) -> bool:
        """
        Represents an abstract method that initializes and starts a service.

        This method must be implemented by any derived class. It serves
        as a template for enabling specific service operations, enforcing
        that subclasses provide their customized implementation.

        :raises NotImplementedError: If the subclass does not override this method.
        :return: A boolean indicating the success of starting the service.
        :rtype: bool
        """
        raise NotImplementedError("Start function not implemented!")

    @abstractmethod
    def stop_service(self, to_finalise=False):
        """
        Stop Location System
        """
        raise NotImplementedError("Stop function not implemented!")

    @abstractmethod
    def get_settings(self):
        raise NotImplementedError("Get Settings function not implemented!")

    @abstractmethod
    def set_settings(self, settings: dict[str, Any]):
        raise NotImplementedError("Set Settings function not implemented!")

    @abstractmethod
    def capture_image(self, callback: Callable[[str, bytes|np.ndarray, str], None]):
        raise NotImplementedError("Capture Image function not implemented!")
    
    @abstractmethod
    def preview_image(self, callback: Callable[[bytes, str], None]):
        raise NotImplementedError("Capture Image function not implemented!")

    @abstractmethod
    def start_recording(self, storage_path: str, did: int, name: str, callback: Callable[[str, Optional[bytes|np.ndarray], str], None], interval: Optional[float] = None):
        """
        Start Photo Recording
        :param storage_path: Photo Saving Path
        :param did: Acquisition Id
        :param name: Acquisition Name
        :param callback: Function to call periodically to update dataset and image metadata
        :param interval: Optional float representing automatic shooting interval. None means recording is working in manual mode.
        :return:
        """
        raise NotImplementedError("Start Recording function not implemented!")
    
    @abstractmethod
    def start_video_recording(self, storage_path: str, did: int, name: str, callback:Callable[[], None]):
        """
        Start Video Recording
        :param storage_path: Video Saving Path
        :param did: Acquisition Id
        :param name: Acquisition Name - It matches with Video name
        :param callback: Function to call periodically to update dataset metadata
        :return:
        """
        raise NotImplementedError("Start Video Recording function not implemented!")
    
    @abstractmethod
    def stop_recording(self):
        """
        Stop current Photo or Video Recording
        """
        raise NotImplementedError("Stop Recording function not implemented!")

    @abstractmethod
    def handle_capture_command(self):
        """
         Handle request of async capturing during manual recording
        :return:
        """
        raise NotImplementedError

    @abstractmethod
    def exec(self, command, **params):
        """
         Handle the execution of proprietary management command
        :return:
        """
        raise NotImplementedError