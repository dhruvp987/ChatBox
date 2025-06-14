const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';
const CNCL_CHAT_BTN_ID = 'cancel-chat-button';
const CLR_CHAT_BTN_ID = 'clear-chat-button';

const USER_CHAT_CLASS = 'chat__user';
const LLM_CHAT_CLASS = 'chat__llm';

const CONN_URL = 'ws://127.0.0.1:8000/connection';
const CHAT_URL = 'ws://127.0.0.1:8000/chat';
const CLEAR_CHAT_URL = 'http://127.0.0.1:8000/clear';

const CLIENT_ID_KEY = 'clientId';

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

function loadChunk(chunk, chunkedText, chatStore) {
    chunkedText.text += chunk;
    fillChatStore(chatStore, chunkedText.text);
}

const chatCont = document.getElementById(CHAT_CONT_ID);
const promptInput = document.getElementById(PROMPT_INPUT_ID);

const connWs = new WebSocket(CONN_URL);
connWs.onmessage = (evnt) => {
    sessionStorage.setItem(CLIENT_ID_KEY, evnt.data);
}

let chatWs = null;

const submitChatButton = document.getElementById(SBMT_CHAT_BTN_ID);
submitChatButton.addEventListener('click', () => {
    const userText = promptInput.value;
    addChat(userText, USER_CHAT_CLASS, chatCont);
    promptInput.value = '';

    const chunkedText = { text: '' };
    const chatStore = createChatStore(LLM_CHAT_CLASS, chatCont);

    chatWs = new WebSocket(CHAT_URL);
    chatWs.onmessage = (evnt) => loadChunk(evnt.data, chunkedText, chatStore);
    chatWs.onopen = (evnt) => chatWs.send(JSON.stringify({
        clientId: sessionStorage.getItem(CLIENT_ID_KEY),
        prompt: userText
    }));
});

const cancelChatButton = document.getElementById(CNCL_CHAT_BTN_ID);
cancelChatButton.addEventListener('click', () => {
    if (chatWs !== null) {
        chatWs.close()
	chatWs = null;
    }
});

const clearChatButton = document.getElementById(CLR_CHAT_BTN_ID);
clearChatButton.addEventListener('click', async () => {
    await fetch(CLEAR_CHAT_URL, {
        method: 'post',
	headers: {
            'Authorization': sessionStorage.getItem(CLIENT_ID_KEY)
	}
    });
    chatCont.innerHTML = '';
});

