class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class ProcessTask:

    def __init__(self, method, args):
        self.method = method
        self.args = args

    def __call__(self):
        return self.method(*self.args)