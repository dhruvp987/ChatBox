const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';

const USER_CHAT_CLASS = 'chat__user';
const LLM_CHAT_CLASS = 'chat__llm';

async function llmChatComp(text) {
    return 'I am working on it';
}

function addChat(text, chatClass, chatCont) {
    const userChat = document.createElement('p');
    userChat.textContent = text;
    userChat.className = chatClass;
    chatCont.appendChild(userChat);
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
