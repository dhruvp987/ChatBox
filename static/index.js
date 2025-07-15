const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';
const CNCL_CHAT_BTN_ID = 'cancel-chat-button';
const CLR_CHAT_BTN_ID = 'clear-chat-button';

const CONN_URL = 'ws://127.0.0.1:8000/connection';
const CHAT_URL = 'ws://127.0.0.1:8000/chat';
const CLEAR_CHAT_URL = 'http://127.0.0.1:8000/clear';

const CLIENT_ID_KEY = 'clientId';

const THINK_TOK = '<think>\n';
const THINK_END_TOK = '\n</think>';
const TOKENS = [THINK_TOK, THINK_END_TOK];

class UserPromptStore {
    constructor() {
        this.store = document.createElement('div');
	this.store.className = 'chat chat__user nunito-400-normal';
    }

    fill(elem) {
        this.store.innerHTML = elem;
    }

    appendTo(container) {
        container.appendChild(this.store);
    }
}

class LlmResponseStore {
    constructor() {
        this.store = document.createElement('div');
	this.store.className = 'chat chat__llm lora-400-normal';
    }

    fill(elem) {
        this.store.innerHTML = elem;
    }

    appendTo(container) {
        container.appendChild(this.store);
    }
}

class LlmThoughtStore {
    static COLLAPSED = 0;
    static EXPANDED = 1;

    constructor() {
	this.topBarMsg = document.createElement('p');
	this.topBarMsg.innerText = 'Thinking';
	this.topBarMsg.className = 'bar-msg bar-msg__thinking-chat';

	this.topBarClspBut = document.createElement('input');
	this.topBarClspBut.type = 'button';
	this.topBarClspBut.className = 'bar-clsp-but bar-clsp-but__thinking-chat';
	this.topBarClspBut.addEventListener('click', () => {
            if (this.clspState === LlmThoughtStore.COLLAPSED) {
                this.expand();
	    } else {
                this.collapse();
	    }
	});

	this.topBar = document.createElement('div');
	this.topBar.className = 'bar bar__thinking-chat';
	this.topBar.appendChild(this.topBarMsg);
	this.topBar.appendChild(this.topBarClspBut);

        this.store = document.createElement('div');

	this.clspState = LlmThoughtStore.COLLAPSED;
	this.collapse();

        this.cont = document.createElement('div');
	this.cont.className = 'chat chat__llm chat--thinking lora-400-normal';
	this.cont.appendChild(this.topBar);
	this.cont.appendChild(this.store);
    }

    fill(elem) {
        this.store.innerHTML = elem;
    }

    expand() {
        this.topBarClspBut.value = 'Collapse';
	this.store.hidden = false;
	this.clspState = LlmThoughtStore.EXPANDED;
    }

    collapse() {
        this.topBarClspBut.value = 'Expand';
	this.store.hidden = true;
	this.clspState = LlmThoughtStore.COLLAPSED;
    }

    finish() {
        this.topBarMsg.innerHTML = 'Thoughts';
    }

    appendTo(container) {
        container.appendChild(this.cont);
    }
}

function renderMd(mdText) {
    return DOMPurify.sanitize(marked.parse(mdText));
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
            this.chatStore = new LlmResponseStore();
	    this.chatStore.appendTo(this.chatCont);
	}
	this.chat += token;
	this.chatStore.fill(renderMd(this.chat));
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
	    if (this.chatStore !== null) this.chatStore.finish();
            return new ResponseState(chatCont);
	}
        if (this.chatStore === null) {
            this.chatStore = new LlmThoughtStore();
	    this.chatStore.appendTo(this.chatCont);
	}
	this.chat += token;
        this.chatStore.fill(renderMd(this.chat));
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

const submitChatButton = document.getElementById(SBMT_CHAT_BTN_ID);
submitChatButton.addEventListener('click', () => {
    const userText = promptInput.value;
    const userStore = new UserPromptStore();
    userStore.appendTo(chatCont);
    userStore.fill(renderMd(userText));
    promptInput.value = '';

    const stateParser = new StateParser(chatCont, new TrieIter(trie.root()));

    chatWs = new WebSocket(CHAT_URL);
    chatWs.onmessage = (evnt) => stateParser.parse(evnt.data);
    chatWs.onclose = (evnt) => {
        submitChatButton.hidden = false;
	cancelChatButton.hidden = true;
    }
    chatWs.onopen = (evnt) => {
	submitChatButton.hidden = true;
	cancelChatButton.hidden = false;
	chatWs.send(JSON.stringify({
            clientId: sessionStorage.getItem(CLIENT_ID_KEY),
            prompt: userText
        }));
    }
});

