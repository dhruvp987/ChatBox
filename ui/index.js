import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';

const USER_CHAT_CLASS = 'chat__user';
const LLM_CHAT_CLASS = 'chat__llm';

const CHAT_URL = 'ws://127.0.0.1:8000/chat';

function addChat(mdText, chatClass, chatCont) {
    const chat = document.createElement('div');
    chat.innerHTML = marked.parse(mdText);
    chat.className = chatClass;
    chatCont.appendChild(chat);
}

const chatCont = document.getElementById(CHAT_CONT_ID);
const promptInput = document.getElementById(PROMPT_INPUT_ID);

const chatWs = new WebSocket(CHAT_URL);
chatWs.onmessage = (evnt) => {
    addChat(evnt.data, LLM_CHAT_CLASS, chatCont);
};

const submitChatButton = document.getElementById(SBMT_CHAT_BTN_ID);
submitChatButton.addEventListener('click', () => {
    const userText = promptInput.value;
    addChat(userText, USER_CHAT_CLASS, chatCont);
    chatWs.send(userText);
    promptInput.value = '';
});

