from llama_cpp import Llama

class LlamaCppChats:
    USER_ROLE = 'user'
    LLM_ROLE = 'assistant'

    def __init__(self):
        self._chats = []

    @property
    def chats(self):
        return self._chats
    
    @property
    def length(self):
        return len(self.chats)

    def add(self, role, text):
        self.chats.append({'role': role, 'content': text})
    
    def append(self, chat):
        self.chats.append(chat)

    def update_content(self, index, content):
        self.chats[i]['content'] = content


class LlamaCppLlm:
    def __init__(self, mdl_path, ctx_size):
        self.llm = Llama(
            model_path=mdl_path,
            n_gpu_layers=-1,
            n_ctx=ctx_size,
            verbose=False
        )


    def chat(self, chats):
        stream = self.llm.create_chat_completion(
            messages=chats.chats,
            stream=True
        )
        for chunk in stream:
            delta = chunk['choices'][0]['delta']
            if 'content' in delta:
                yield delta['content']

