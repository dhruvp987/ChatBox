const CHAT_CONT_ID = 'chat-container';
const PROMPT_INPUT_ID = 'prompt-input';
const SBMT_CHAT_BTN_ID = 'submit-chat-button';
const CNCL_CHAT_BTN_ID = 'cancel-chat-button';
const CLR_CHAT_BTN_ID = 'clear-chat-button';

const WINDOW_HOST = window.location.host;
const MAYBE_SECURE_S = location.protocol === 'https' ? 's' : '';
const CONN_URL = 'ws' + MAYBE_SECURE_S + '://' + WINDOW_HOST + '/connection';
const CHAT_URL = 'ws' + MAYBE_SECURE_S + '://' + WINDOW_HOST + '/chat';
const CLEAR_CHAT_URL = 'http' + MAYBE_SECURE_S + '://' + WINDOW_HOST + '/clear';

const CLIENT_ID_KEY = 'clientId';

const THINK_TOK = '<think>\n';
const THINK_END_TOK = '\n</think>';
const TOKENS = [THINK_TOK, THINK_END_TOK];

const CHAT_ENDED_SIG = 'sigChatEnded';

function renderMd(mdText) {
    return DOMPurify.sanitize(marked.parse(mdText));
}

class Subscriber {
    constructor(callback) {
        this.callback = callback;
    }

    notify() {
        this.callback();
    }
}

class SignalManager {
    constructor() {
        this.signalAndSubs = {}
    }

    subscribe(signal, subscriber) {
        if (!(signal in this.signalAndSubs)) {
            this.signalAndSubs[signal] = new Set();
	}
	this.signalAndSubs[signal].add(subscriber);
    }

    unsubscribe(signal, subscriber) {
	if (!(signal in this.signalAndSubs)) return;
        this.signalAndSubs[signal].delete(subscriber);
    }

    signal(signalName) {
        if (!(signalName in this.signalAndSubs)) return;
	this.signalAndSubs[signalName].forEach(sub => sub.notify());
    }
}

const sigManager = new SignalManager();

function sigSubscribe(signal, subscriber) {
    sigManager.subscribe(signal, subscriber);
}

function sigUnsubscribe(signal, subscriber) {
    sigManager.unsubscribe(signal, subscriber);
}

function signal(signalName) {
    sigManager.signal(signalName);
}

class CircularIterator {
    constructor(vals, start) {
        this.vals = [...vals];
	this.index = start;
    }

    next() {
        if (this.index >= this.vals.length) {
            this.index = 0;
	}
	return this.vals[this.index++];
    }
}

class UserPromptStore {
    constructor() {
        this.store = document.createElement('div');
	this.store.className = 'chat chat__user fredoka-400-normal';
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
	this.topBarMsg.className = 'msg msg__thinking-msg fredoka-400-normal';

	this.topBarClspBut = document.createElement('input');
	this.topBarClspBut.type = 'button';
	this.topBarClspBut.className = 'button button__think-clsp-but fredoka-400-normal';
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

	this.chatEndedSub = new Subscriber(() => this.finish());
	sigSubscribe(CHAT_ENDED_SIG, this.chatEndedSub);

	const thinkAniIter = new CircularIterator(['Thinking', 'Thinking.', 'Thinking..', 'Thinking...'], 1);
	this.thinkAniTimer = setInterval(() => {
            this.topBarMsg.innerText = thinkAniIter.next();
	}, 1000);
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
	clearInterval(this.thinkAniTimer);
        this.topBarMsg.innerHTML = 'Thoughts';
	sigUnsubscribe(CHAT_ENDED_SIG, this.chatEndedSub);
    }

    appendTo(container) {
        container.appendChild(this.cont);
    }
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
const cancelChatButton = document.getElementById(CNCL_CHAT_BTN_ID);
const clearChatButton = document.getElementById(CLR_CHAT_BTN_ID);
const submitChatButton = document.getElementById(SBMT_CHAT_BTN_ID);

const connWs = new WebSocket(CONN_URL);
connWs.onmessage = (evnt) => {
    sessionStorage.setItem(CLIENT_ID_KEY, evnt.data);
}

let chatWs = null;

function chatOnCloseNormally() {
    signal(CHAT_ENDED_SIG);
    controlsWhenChatInactive(submitChatButton, cancelChatButton, clearChatButton, promptInput);
}

async function chatOnCloseByClearing() {
    signal(CHAT_ENDED_SIG);
    await clearChat();
    controlsWhenChatInactive(submitChatButton, cancelChatButton, clearChatButton, promptInput);
}

function controlsWhenChatInactive(submitBut, cancelBut, clearBut, prmptInput) {
    submitBut.onclick = submit;
    cancelChat.onclick = () => {};
    clearBut.onclick = clearChat;

    submitBut.hidden = false;
    cancelBut.hidden = true;

    prmptInput.onkeydown = (evnt) => {
        if (evnt.ctrlKey && evnt.key === 'Enter') submit();
    }
}

function controlsWhenChatActive(submitBut, cancelBut, clearBut, prmptInput) {
    submitBut.onclick = () => {};
    cancelBut.onclick = cancelChat;
    clearBut.onclick = chatClearWhenActive;

    submitBut.hidden = true;
    cancelBut.hidden = false;

    prmptInput.onkeydown = (evnt) => {};
}

function submit() {
    const userText = promptInput.value;
    const userStore = new UserPromptStore();
    userStore.fill(renderMd(userText));
    userStore.appendTo(chatCont);
    promptInput.value = '';
    chatCont.lastElementChild.scrollIntoView(false);

    const stateParser = new StateParser(chatCont, new TrieIter(trie.root()));

    chatWs = new WebSocket(CHAT_URL);
    chatWs.onmessage = (evnt) => {
	const tolerance = 25;
        const atBottom = chatCont.scrollHeight - chatCont.clientHeight - chatCont.scrollTop <= tolerance;
        stateParser.parse(evnt.data);
	if (atBottom) chatCont.lastElementChild.scrollIntoView(false);
    };
    chatWs.onclose = chatOnCloseNormally;
    chatWs.onopen = (evnt) => {
	controlsWhenChatActive(submitChatButton, cancelChatButton, clearChatButton, promptInput);
	chatWs.send(JSON.stringify({
            clientId: sessionStorage.getItem(CLIENT_ID_KEY),
            prompt: userText
        }));
    };
}

function cancelChat() {
    if (chatWs !== null) {
        chatWs.close();
	chatWs = null;
    }
}

async function clearChat() {
    await fetch(CLEAR_CHAT_URL, {
        method: 'post',
	headers: {
            'Authorization': sessionStorage.getItem(CLIENT_ID_KEY)
	}
    });
    chatCont.innerHTML = '';
}

function chatClearWhenActive() {
    chatWs.onclose = chatOnCloseByClearing;
    cancelChat();
}

controlsWhenChatInactive(submitChatButton, cancelChatButton, clearChatButton, promptInput);
