import asyncio
import json
import os
import platform
import sys
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from llamacppllm import LlamaCppChats, LlamaCppLlm

# A context window that doesn't take too much resources, making
# it easier to work with for now
MAX_CTX = 4096


def print_err(msg):
    print(f'Error: {msg}', file=sys.stderr)


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

chat_histories = {}


@app.get('/')
async def root():
    return 'Welcome to ChatBox'


@app.websocket('/connection')
async def connection(ws: WebSocket):
    await ws.accept()
    client_id = str(uuid.uuid4())
    chat_histories[client_id] = LlamaCppChats()
    await ws.send_text(client_id)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        del chat_histories[client_id]


@app.websocket('/chat')
async def chat(ws: WebSocket):
    await ws.accept()
    # Format: { clientId: str; prompt: str }
    payload = json.loads(await ws.receive_text())
    chats = chat_histories[payload['clientId']]
    chunks = []

    chats.add(LlamaCppChats.USER_ROLE, payload['prompt'])
    res_stream = llm.chat(chats)

    try:
        for chnk in res_stream:
            await ws.send_text(chnk)
            await asyncio.sleep(0)
            chunks.append(chnk)
        await ws.close()
    except:
        pass
    finally:
        chats.add(LlamaCppChats.LLM_ROLE, ''.join(chunks))

