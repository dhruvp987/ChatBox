import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llamacppllm import LlamaCppLlm

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

# If using fastapi dev, make sure the --no-reload option is set,
# otherwise the LLM will be loaded multiple times and use
# excessive resources
llm = LlamaCppLlm(model_path, MAX_CTX)


@app.get('/')
async def root():
    return 'Welcome to ChatBox'


@app.post('/chat')
async def chat(prmt: Prompt):
    return {'completion': llm.chat(prmt.prompt)}
