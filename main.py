import asyncio
import json
import os
import platform
import sys
import uuid
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llamacppllm import LlamaCppChats, LlamaCppLlm

# A context window that doesn't take too much resources, making
# it easier to work with for now
MAX_CTX = 4096


def print_err(msg):
    print(f'Error: {msg}', file=sys.stderr)


class Prompt(BaseModel):
    prompt: str


app = FastAPI()

origins = [
    'http://127.0.0.1:8080'
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=['*'],
    allow_headers=['*']
)

model_path = os.getenv('MODEL_PATH', '')
if model_path == '':
    print_err('MODEL_PATH env is not set')
    sys.exit(1)

# Windows sometimes struggles with opening large files.
# Pre-warming the model file should help Windows prepare to load the model.
if platform.system() == 'Windows':
    with open(model_path, 'rb') as f:
        f.read(4096)

# If using fastapi dev, make sure the --no-reload option is set,
# otherwise the LLM will be loaded multiple times and use
# excessive resources
llm = LlamaCppLlm(model_path, MAX_CTX)


@app.get('/')
async def root():
    return 'Welcome to ChatBox'


@app.websocket('/chat')
async def chat(ws: WebSocket):
    await ws.accept()
    chats = LlamaCppChats()
    while True:
        prompt = await ws.receive_text()
        chats.add(LlamaCppChats.USER_ROLE, prompt)

        res_stream = llm.chat(chats)
        res_chunks = []

        chat_id = str(uuid.uuid4())

        for chunk in res_stream:
            res_chunks.append(chunk)
            payload = {'chatId': chat_id, 'chunk': chunk}
            await ws.send_text(json.dumps(payload))
            # Helps make the payload actually sent before moving on
            await asyncio.sleep(0)

        chats.add(LlamaCppChats.LLM_ROLE, ''.join(res_chunks))

