import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';

const USER_CHAT_CLASS = 'chat__user';
const LLM_CHAT_CLASS = 'chat__llm';

const CHAT_URL = 'ws://127.0.0.1:8000/chat';

const CHAT_ID_PREFIX = 'chat-';

function createChatStore(chatClass, chatCont, chatId = null) {
    const chatStore = document.createElement('div');
    if (chatId !== null) chatStore.id = chatId;
    chatStore.className = chatClass;
    chatCont.append(chatStore);
    return chatStore;
}

function fillChatStore(store, mdText) {
    store.innerHTML = DOMPurify.sanitize(marked.parse(mdText));
}

function addChat(mdText, chatClass, chatCont) {
    const chatStore = createChatStore(chatClass, chatCont);
    fillChatStore(chatStore, mdText);
}

const llmChats = {};

const chatCont = document.getElementById(CHAT_CONT_ID);
const promptInput = document.getElementById(PROMPT_INPUT_ID);

const chatWs = new WebSocket(CHAT_URL);
chatWs.onmessage = (evnt) => {
    const payload = JSON.parse(evnt.data);
    const chatId = CHAT_ID_PREFIX + payload.chatId;

    let chatStore = document.getElementById(chatId);
    if (chatStore === null) {
        chatStore = createChatStore(LLM_CHAT_CLASS, chatCont, chatId);
    }

    if (llmChats[chatId] === undefined) {
        llmChats[chatId] = '';
    }

    const currentText = llmChats[chatId] + payload.chunk;
    fillChatStore(chatStore, currentText);
    llmChats[chatId] = currentText;
};

const submitChatButton = document.getElementById(SBMT_CHAT_BTN_ID);
submitChatButton.addEventListener('click', () => {
    const userText = promptInput.value;
    addChat(userText, USER_CHAT_CLASS, chatCont);
    chatWs.send(userText);
    promptInput.value = '';
});

