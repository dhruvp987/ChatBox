import asyncio
import json
import os
import platform
import uuid
from fastapi import (
    FastAPI,
    Header,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import Annotated
import llamacppmodel as lcm
from llamacppmodel import LlamaCppModel, LlamaCppContext
from chat import Chat
from chattemplate import Jinja2ChatTemplate

# A context window that doesn't take too much resources, making
# it easier to work with for now
MAX_CTX = 4096

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

model_path = os.getenv("MODEL_PATH", "")
if model_path == "":
    raise OSError("MODEL_PATH env is not set")

if not os.path.isfile(model_path):
    raise FileNotFoundError("model path is invalid or does not lead to a file")

model_temp = float(os.getenv("MODEL_TEMP", "0.8"))
model_min_p = float(os.getenv("MODEL_MIN_P", "0.05"))

lcm.llama_init()

# If using fastapi dev, make sure the --no-reload option is set,
# otherwise the LLM will be loaded multiple times and use
# excessive resources
model = LlamaCppModel(bytes(model_path, "utf-8"))

chat_template_str = model.chat_template()
chat_template_str = (
    chat_template_str
    if chat_template_str is not None
    else Jinja2ChatTemplate.LLAMA2_TEMP
)
chat_template = Jinja2ChatTemplate(chat_template_str)

chat_histories = {}


@app.get("/", response_class=HTMLResponse)
async def index(req: Request):
    return templates.TemplateResponse(request=req, name="index.html")


@app.websocket("/connection")
async def connection(ws: WebSocket):
    await ws.accept()
    client_id = str(uuid.uuid4())
    chat_histories[client_id] = Chat()
    await ws.send_text(client_id)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        del chat_histories[client_id]


@app.websocket("/chat")
async def chat(ws: WebSocket):
    await ws.accept()
    # Format: { clientId: str; prompt: str }
    payload = json.loads(await ws.receive_text())
    chats = chat_histories[payload["clientId"]]

    ctx = LlamaCppContext(model, MAX_CTX, min_p=model_min_p, temp=model_temp)

    chats.add(Chat.USER_ROLE, payload["prompt"])

    res_stream = ctx.complete_chat(chats, chat_template)
    chunks = []

    try:
        for chnk in res_stream:
            await ws.send_text(chnk)
            await asyncio.sleep(0)
            chunks.append(chnk)
        await ws.close()
    except:
        pass
    finally:
        if len(chunks) > 0:
            chats.add(Chat.MODEL_ROLE, "".join(chunks))


@app.post("/clear")
async def clear(authorization: Annotated[str | None, Header()] = None):
    if authorization is None or authorization not in chat_histories:
        raise HTTPException(status_code=401)
    else:
        chat_histories[authorization] = Chat()
