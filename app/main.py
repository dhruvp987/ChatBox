import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
import os
import platform
from queue import Queue
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
from llamacppsampler import CBSampler
from chat import Chat
from chattemplate import Jinja2ChatTemplate


def complete_chat_task(ctx, chat, sampler, out_qu):
    tok_gen = ctx.complete_chat(chat, sampler)
    for chnk in tok_gen:
        out_qu.put(chnk)


# A context window that doesn't take too much resources, making
# it easier to work with for now
MAX_CTX = 4096

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

model_path = os.getenv("CB_MODEL_PATH", "")
if model_path == "":
    raise OSError("CB_MODEL_PATH env is not set")

if not os.path.isfile(model_path):
    raise FileNotFoundError("model path is invalid or does not lead to a file")

samp_temp = float(os.getenv("CB_TEMP", "0.8"))
samp_top_k = int(os.getenv("CB_TOP_K", "40"))
samp_rep_pen = float(os.getenv("CB_REP_PEN", "1.1"))
samp_min_p = float(os.getenv("CB_MIN_P", "0.05"))
samp_top_p = float(os.getenv("CB_TOP_P", "0.95"))

lcm.llama_init()

# If using fastapi dev, make sure the --no-reload option is set,
# otherwise the LLM will be loaded multiple times and use
# excessive resources
model = LlamaCppModel(bytes(model_path, "utf-8"))

sampler = CBSampler(samp_temp, samp_top_k, samp_rep_pen, samp_min_p, samp_top_p)

chat_template_str = model.chat_template()
chat_template_str = (
    chat_template_str
    if chat_template_str is not None
    else Jinja2ChatTemplate.LLAMA2_TEMP
)
chat_template = Jinja2ChatTemplate(chat_template_str)

chat_histories = {}

thp_exec = ThreadPoolExecutor()


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
    chats.add(Chat.USER_ROLE, payload["prompt"])

    ctx = LlamaCppContext(model, MAX_CTX)

    out_qu = Queue()

    future = thp_exec.submit(
        complete_chat_task,
        ctx,
        bytes(chat_template.render(chats), "utf-8"),
        sampler,
        out_qu,
    )

    chunks = []

    async def get_and_send_chnk():
        try:
            chnk = out_qu.get_nowait()
        except:
            return
        await ws.send_text(chnk)
        await asyncio.sleep(0)
        chunks.append(chnk)

    try:
        while not future.done():
            await get_and_send_chnk()
        while not out_qu.empty():
            await get_and_send_chnk()

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
