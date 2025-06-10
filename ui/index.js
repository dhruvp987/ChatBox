import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';

const USER_CHAT_CLASS = 'chat__user';
const LLM_CHAT_CLASS = 'chat__llm';

const CHAT_URL = 'http://127.0.0.1:8000/chat';

async function llmChatComp(text) {
    const res = await fetch(CHAT_URL, {
        method: 'post',
	headers: {
            'Content-Type': 'application/json'
	},
	body: JSON.stringify({ prompt: text })
    });
    const json = await res.json();
    return json.completion;
}

function addChat(mdText, chatClass, chatCont) {
    const chat = document.createElement('div');
    chat.innerHTML = marked.parse(mdText);
    chat.className = chatClass;
    chatCont.appendChild(chat);
}

async function submitUserChat(userText, chatCont) {
    addChat(userText, USER_CHAT_CLASS, chatCont);
    const llmText = await llmChatComp(userText);
    addChat(llmText, LLM_CHAT_CLASS, chatCont);
}

const chatCont = document.getElementById(CHAT_CONT_ID);
const promptInput = document.getElementById(PROMPT_INPUT_ID);

const submitChatButton = document.getElementById(SBMT_CHAT_BTN_ID);
submitChatButton.addEventListener('click', () => {
    const text = promptInput.value;
    submitUserChat(text, chatCont);
    promptInput.value = '';
});
