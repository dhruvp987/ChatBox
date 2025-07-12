const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';
const CNCL_CHAT_BTN_ID = 'cancel-chat-button';
const CLR_CHAT_BTN_ID = 'clear-chat-button';

const USER_CHAT_CLASS = 'chat chat__user nunito-400-normal';
const LLM_CHAT_CLASS = 'chat chat__llm lora-400-normal';
const LLM_THINKING_CLASS = 'chat chat__llm chat--thinking lora-400-normal';

const CONN_URL = 'ws://127.0.0.1:8000/connection';
const CHAT_URL = 'ws://127.0.0.1:8000/chat';
const CLEAR_CHAT_URL = 'http://127.0.0.1:8000/clear';

const CLIENT_ID_KEY = 'clientId';

const THINK_TOK = '<think>\n';
const THINK_END_TOK = '\n</think>';
const TOKENS = [THINK_TOK, THINK_END_TOK];

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

class TrieNode {
    constructor() {
        this.chs = {};
        this.terminal = null;
    }
}

class Trie {
    constructor(strs) {
        this.start = new TrieNode();
	for (const str of strs) {
            this.add(str);
	}
    }

    root() {
        return this.start;
    }

    add(str) {
	let curNode = this.start;
        for (const chr of str) {
            if (!(curNode.chs.hasOwnProperty(chr))) {
		curNode.chs[chr] = new TrieNode();
	    }
            curNode = curNode.chs[chr];
	}
	curNode.terminal = str;
    }
}

class TrieIter {
    constructor(rootNode) {
        this.root = rootNode;
	this.curNode = this.root;
    }

    next(chr) {
        if (!(this.curNode.chs.hasOwnProperty(chr))) {
            this.curNode = this.root;
	    return false;
	}
	this.curNode = this.curNode.chs[chr];
	const curNodeTerm = this.curNode.terminal;
	if (this.curNode.terminal !== null) this.curNode = this.root;
	return curNodeTerm;
    }
}

class ResponseState {
    constructor(chatCont) {
	this.chatCont = chatCont;
        this.chatStore = null;
	this.chat = '';
    }

    next(token) {
        if (token === THINK_TOK) {
            return new ThinkingState(this.chatCont);
	}
	if (this.chatStore === null) {
            this.chatStore = createChatStore(LLM_CHAT_CLASS, chatCont);
	}
	this.chat += token;
	fillChatStore(this.chatStore, this.chat);
	return this;
    }
}

class ThinkingState {
    constructor(chatCont) {
        this.chatCont = chatCont;
	this.chatStore = null;
	this.chat = '';
    }

    next(token) {
        if (token === THINK_END_TOK) {
            return new ResponseState(chatCont);
	}
        if (this.chatStore === null) {
            this.chatStore = createChatStore(LLM_THINKING_CLASS, chatCont);
	}
	this.chat += token;
	fillChatStore(this.chatStore, this.chat);
	return this;
    }
}

class StateParser {
    constructor(chatCont, trieIter) {
        this.chatCont = chatCont;
	this.state = new ResponseState(chatCont);
	this.trieIter = trieIter;
	this.chunk = '';
    }

    parse(chunk) {
        for (const chr of chunk) {
            const res = this.trieIter.next(chr);
	    if (res === null) {
                this.chunk += chr;
		continue;
	    }
	    this.state = this.state.next(this.chunk + chr);
	    this.chunk = '';
	}
    }
}

const trie = new Trie(TOKENS);

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

    const stateParser = new StateParser(chatCont, new TrieIter(trie.root()));

    chatWs = new WebSocket(CHAT_URL);
    chatWs.onmessage = (evnt) => stateParser.parse(evnt.data);
    chatWs.onclose = (evnt) => {
        submitChatButton.hidden = false;
    }
    chatWs.onopen = (evnt) => {
	submitChatButton.hidden = true;
	chatWs.send(JSON.stringify({
            clientId: sessionStorage.getItem(CLIENT_ID_KEY),
            prompt: userText
        }));
    }
});

const cancelChatButton = document.getElementById(CNCL_CHAT_BTN_ID);
cancelChatButton.addEventListener('click', () => {
    if (chatWs !== null) {
        chatWs.close();
	chatWs = null;
    }
});

const clearChatButton = document.getElementById(CLR_CHAT_BTN_ID);
clearChatButton.addEventListener('click', async () => {
    if (chatWs !== null) {
        chatWs.close();
	chatWs = null;
    }
    await fetch(CLEAR_CHAT_URL, {
        method: 'post',
	headers: {
            'Authorization': sessionStorage.getItem(CLIENT_ID_KEY)
	}
    });
    chatCont.innerHTML = '';
});

