from llama_cpp import Llama

class LlamaCppLlm:
    def __init__(self, mdl_path, ctx_size):
        self.chats = []
        self.llm = Llama(
            model_path=mdl_path,
            n_ctx=ctx_size,
            verbose=False
        )


    def chat(self, prompt):
        self.chats.append({'role': 'user', 'content': prompt})
        output = self.llm.create_chat_completion(
            messages=self.chats
        )['choices'][0]['message']
        self.chats.append(output)
        return output['content']
