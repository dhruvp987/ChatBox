class Chat:
    USER_ROLE = 'user'
    MODEL_ROLE = 'assistant'

    def __init__(self):
        self._msgs = []

    def add(self, role, text):
        self._msgs.append({'role': role, 'content': text})

    @property
    def msgs(self):
        return self._msgs

