import threading
from abc import ABCMeta, abstractmethod
from typing import Tuple, Optional
from enum import StrEnum, IntEnum
from common_interfaces.events import EventManager, EventType, SubjectType, LocationStatus, ErrorData

class LatitudeDirection(StrEnum):
    NORTH = "N"
    SOUTH = "S"

class LongitudeDirection(StrEnum):
    EAST = "E"
    WEST = "W"

class AltitudeDirection(IntEnum):
    ASL = 0
    BSL = 1

class LocationSystemInterface(metaclass=ABCMeta):

    """Riceve coordinate Latitudine, Longitudine, Altitudine con i rispettivi riferimenti ('N', 'S'), ('E', 'W') e
     ('ASL', 'BSL') """

    @abstractmethod
    def __init__(self):
        self._is_running = False
        self._lock = threading.RLock() # Reentrant Lock for thread-safe data updates
        self.__timestamp: Optional[float] = None
        self.__latitude: Optional[float] = None
        self.__latitude_ref: Optional[LatitudeDirection] = None
        self.__longitude: Optional[float] = None
        self.__longitude_ref: Optional[LongitudeDirection] = None
        self.__altitude: Optional[float] = None
        self.__altitude_ref: Optional[AltitudeDirection] = None

    @property
    def name(self):
        return type(self).__name__

    @property
    def is_running(self):
        return self._is_running

    def _status(self):
        with self._lock:
            return LocationStatus(
                is_running=self._is_running,
                timestamp=self.__timestamp,
                latitude=(self.__latitude, self.__latitude_ref) if self.__latitude is not None else None,
                longitude=(self.__longitude, self.__longitude_ref) if self.__longitude is not None else None,
                altitude=(self.__altitude, self.__altitude_ref.name) if self.__altitude is not None else None
            )

    def notify_status(self):
        status = self._status()
        EventManager.get_instance().trigger_event(EventType.STATUS_CHANGE, SubjectType.LOCATION_SYSTEM, status)

    def notify_error(self, e: ErrorData):
        EventManager.get_instance().trigger_event(EventType.ERROR_OCCURRED, SubjectType.LOCATION_SYSTEM, e)

    def _update_coordinates(self, timestamp: float, latitude: Optional[tuple[float, LatitudeDirection]],
                            longitude: Optional[tuple[float, LongitudeDirection]], altitude: Optional[tuple[float, AltitudeDirection]]):
        """
        Service call this function to update current coordinates
        """
        with self._lock:
            self.__timestamp = timestamp
            # Limit the decimal digits
            if latitude is not None:
                latitude = (round(latitude[0], 7), latitude[1])
                if 0 <= latitude[0] <= 90:
                    self.__latitude, self.__latitude_ref = latitude
                elif -90 <= latitude[0] < 0:
                    self.__latitude = abs(latitude[0])
                    self.__latitude_ref = LatitudeDirection.SOUTH if latitude[1] == LatitudeDirection.NORTH else LatitudeDirection.NORTH
                else:
                    raise ValueError("Latitude value out of range. Must be between -90 and 90.")

            if longitude is not None:
                longitude = (round(longitude[0], 7), longitude[1])
                if 0 <= longitude[0] <= 180:
                    self.__longitude, self.__longitude_ref = longitude
                elif -180 <= longitude[0] < 0:
                    self.__longitude = abs(longitude[0])
                    self.__longitude_ref = LongitudeDirection.WEST if latitude[1] == LongitudeDirection.EAST else LongitudeDirection.EAST
                else:
                    raise ValueError("Latitude value out of range. Must be between -180 and 180.")

            if altitude is not None:
                altitude = (round(altitude[0], 3), altitude[1])
                if altitude[0] >= 0:
                    self.__altitude, self.__altitude_ref = altitude
                else:
                    self.__altitude = abs(altitude[0])
                    self.__altitude_ref = AltitudeDirection.ASL if altitude[1] == AltitudeDirection.BSL else AltitudeDirection.BSL

            if self._is_running:
                self.notify_status()

    def get_location(self) -> Tuple[float, tuple[float, str], tuple[float, str], tuple[float, int]]:
        """
        :return: Last received location coordinates with respective timestamp in the following order: timestamp,
            latitude, longitude, altitude.
        :raise: Error if no location has been received yet.
        """
        with self._lock:
            if self.__timestamp is None:
                raise ValueError("No location has been available yet.")
            latitude  = self.__latitude, self.__latitude_ref
            longitude = self.__longitude, self.__longitude_ref
            altitude  = self.__altitude, self.__altitude_ref
            return self.__timestamp, latitude, longitude, altitude

    @abstractmethod
    def start_service(self) -> bool:
        """
        Represents an abstract method that initializes and starts Location System service
         to update periodically coordinates and altitude notifying observers at each update.

        This method must be implemented by any derived class. It serves
        as a template for enabling specific service operations, enforcing
        that subclasses provide their customized implementation.

        :raises NotImplementedError: If the subclass does not override this method.
        :return: A boolean indicating the success of starting the service.
        :rtype: bool
        """
        raise NotImplementedError("Start Service function not implemented!")

    @abstractmethod
    def stop_service(self, to_finalise=False):
        """
        Stop Location System Service
        """
        raise NotImplementedError("Stop Service function not implemented!")

    @abstractmethod
    def log(self):
        """
       TODO: Start Logging?? Get Logging?? -> Could be included in start()??
        :return:
        """
        raise NotImplementedError("Log function not implemented!")

    # TODO: Define other common methods
