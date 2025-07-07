import logging
from enum import Enum
from typing import Callable, Optional
from concurrent.futures.thread import ThreadPoolExecutor
from common_interfaces.utils.typing import Singleton
from abc import ABCMeta


class EventType(Enum):
    STATUS_CHANGE = 0
    ERROR_OCCURRED = 1


class SubjectType(Enum):
    BOARD = 0
    STORAGE = 1
    ACQUISITION_SYSTEM = 2
    COMMUNICATION_SYSTEM = 3
    LOCATION_SYSTEM = 4
    CAMERA = 5
    STEREOCAMERA = 6


class EventData(metaclass=ABCMeta):

    """
    Common interface to represent data associate with an Event. This hierarchy only aims to abstract information we want to track and provide externally as pair (event_id, event_data).
    """

    def __init__(self, event_id:str):
        self._id = event_id

    @property
    def event_id(self):
        return self._id

    @classmethod
    def _hidden_fields(cls) -> set[str]:
        """
        Could be redefined to filter some information
        :return: Set of fields not accessible from the external API
        """
        return {"_id"}

    def as_dict(self):
        """Returns the data as a dictionary, automatically excluding specific fields."""
        exclude_fields = self._hidden_fields()  # Set of fields to exclude
        return {
            key.lstrip("_"): value  # Removes the '__' prefix from private names
            for key, value in self.__dict__.items()
            if key not in exclude_fields and value is not None
        }

    def __str__(self):
        return str(self.as_dict())

class Event:

    def __init__(self, event_type: EventType, subject_type: SubjectType, event_data: EventData):
        self.__type = event_type
        self.__subject_type = subject_type
        self.__data = event_data

    @property
    def event_type(self):
        return self.__type

    @property
    def subject_type(self):
        return self.__subject_type

    @property
    def event_data(self):
        return self.__data

    def __str__(self):
        return f"Type={self.event_type.name}; Subject={self.__subject_type}; Data={str(self.__data)}"


class EventManager(metaclass=Singleton):

    def __init__(self):
        self.__listeners = {
            e: {
               s: set() for s in SubjectType
            } for e in EventType
        }
        self.__dispatchers = ThreadPoolExecutor(max_workers=4)

    @classmethod
    def get_instance(cls):
        """
        Retrieve the singleton instance of the class.
        Raises:
            ReferenceError: If the singleton instance has not been created yet.

        :return: The singleton instance of the class.
        """
        if cls not in cls._instances:
            return EventManager()
        return cls._instances[cls]

    def register_listener(self, callback: Callable[[Event], None], event_type: Optional[EventType] = None,
                          subject_type:Optional[SubjectType] = None):
        if event_type and subject_type:
            self.__listeners[event_type][subject_type].add(callback) # No effect if the element is already present.
        elif event_type:
            for st in self.__listeners[event_type].keys():
                self.__listeners[event_type][st].add(callback)
        elif subject_type:
            for et in self.__listeners.keys():
                self.__listeners[et][subject_type].add(callback)
        else:
            for et in self.__listeners.keys():
                for st in self.__listeners[et].keys():
                    self.__listeners[et][st].add(callback)

    def unregister_listener(self, callback: Callable[[Event], None], event_type: Optional[EventType] = None,
                          subject_type:Optional[SubjectType] = None):
        if event_type and subject_type:
            self.__listeners[event_type][subject_type].discard(callback) # No effect if the element is already present.
        elif event_type:
            for st in self.__listeners[event_type].keys():
                self.__listeners[event_type][st].discard(callback)
        elif subject_type:
            for et in self.__listeners.keys():
                self.__listeners[et][subject_type].discard(callback)
        else:
            for et in self.__listeners.keys():
                for st in self.__listeners[et].keys():
                    self.__listeners[et][st].discard(callback)

    def _notify_event(self, e: Event):
        for c in self.__listeners[e.event_type][e.subject_type]:
            self.__dispatchers.submit(c, e)

    def trigger_event(self, event_type: EventType, subject_type: SubjectType, data: EventData):
        e = Event(event_type, subject_type, data)
        logging.debug(f"Received Event: {e}")
        self._notify_event(e)
