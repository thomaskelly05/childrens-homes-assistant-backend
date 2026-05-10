/* IndiCare AI Suite standalone runtime.
   Clean ChatGPT-style product shell using existing assistant APIs and runtime systems.
*/
(function () {
  if (window.IndiCareAISuiteApp?.version) return;

  const STORAGE_KEY = 'indicare_ai_suite_conversations';
  const ACTIVE_KEY = 'indicare_ai_suite_active_conversation';
  const APP_KEY = 'indicare_ai_suite_active_app';
  const MAX_HISTORY = 14;

  const APPS = {
    intelligence: {
      title: 'IndiCare AI',
      subtitle: 'AI Suite',
      placeholder: 'Message IndiCare AI',
      instruction: 'You are IndiCare AI, a professional conversational assistant. Respond clearly in British English.'
    },
    notes: {
      title: 'I-Notes',
      subtitle: 'Capture and clean up notes',
      placeholder: 'Ask IndiCare to capture, clean up or summarise notes',
      instruction: 'You are working in I-Notes. Help capture, clean up, structure, summarise and extract actions from notes.'
    },
    docs: {
      title: 'IndiCare Docs',
      subtitle: 'Draft and review documents',
      placeholder: 'Ask IndiCare to draft, rewrite or review a document',
      instruction: 'You are working in IndiCare Docs. Help draft, rewrite, improve, review and structure documents.'
    },
    connect: {
      title: 'IndiCare Connect',
      subtitle: 'Meetings and collaboration',
      placeholder: 'Ask IndiCare about meetings, actions or collaboration',
      instruction: 'You are working in IndiCare Connect. Help with meetings, collaboration, summaries, actions, follow-ups and continuity.'
    },
    mail: {
      title: 'IndiCare Mail',
      subtitle: 'Communication intelligence',
      placeholder: 'Ask IndiCare to draft, summarise or respond to mail',
      instruction: 'You are working in IndiCare Mail. Help draft, summarise, rewrite and respond to messages professionally.'
    }
  };

  const state = {
    version: '1.0.0',
    activeApp: localStorage.getItem(APP_KEY) || 'intelligence',
    activeConversationId: localStorage.getItem(ACTIVE_KEY) || null,
    conversations: [],
    isSending: false,
    upload: null,
    abortController: null
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(`indicare:ai-suite-app:${name}`, { detail: detail || snapshot() }));
  }

  function snapshot() {
    return {
      version: state.version,
      activeApp: state.activeApp,
      activeConversationId: state.activeConversationId,
      conversationCount: state.conversations.length,
      isSending: state.isSending
    };
  }

  function getCookie(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + escaped + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : '';
  }

  function csrfHeaders(method, headers) {
    const next = { ...(headers || {}) };
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase())) {
      const token = getCookie('__Host-indicare_csrf') || getCookie('indicare_csrf');
      if (token) next['X-CSRF-Token'] = token;
    }
    return next;
  }

  function safeJson(value, fallback) {
    try { return JSON.parse(value || ''); } catch (_) { return fallback; }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadState() {
    const saved = safeJson(localStorage.getItem(STORAGE_KEY), []);
    state.conversations = Array.isArray(saved) ? saved : [];
    if (!state.conversations.some((item) => item.id === state.activeConversationId)) {
      state.activeConversationId = state.conversations[0]?.id || null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations.slice(0, 80)));
    if (state.activeConversationId) localStorage.setItem(ACTIVE_KEY, state.activeConversationId);
    localStorage.setItem(APP_KEY, state.activeApp);
  }

  function activeConversation() {
    return state.conversations.find((item) => item.id === state.activeConversationId) || null;
  }

  function createConversation(app) {
    const conversation = {
      id: uid('ai-suite'),
      title: 'New conversation',
      app: app || state.activeApp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    state.conversations.unshift(conversation);
    state.activeConversationId = conversation.id;
    saveState();
    return conversation;
  }

  function ensureConversation() {
    return activeConversation() || createConversation(state.activeApp);
  }

  function titleFrom(text) {
    const clean = String(text || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
    return clean ? clean.split(' ').slice(0, 7).join(' ') : 'New conversation';
  }

  function markdownLite(text) {
    const escaped = escapeHtml(text || '');
    const linked = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const lines = linked.split('\n');
    let html = '';
    let list = false;
    for (const line of lines) {
      if (/^\s*[-*•]\s+/.test(line)) {
        if (!list) { html += '<ul>'; list = true; }
        html += `<li>${line.replace(/^\s*[-*•]\s+/, '')}</li>`;
      } else {
        if (list) { html += '</ul>'; list = false; }
        if (/^#{1,3}\s+/.test(line)) html += `<h3>${line.replace(/^#{1,3}\s+/, '')}</h3>`;
        else if (line.trim()) html += `<p>${line}</p>`;
        else html += '<br>';
      }
    }
    if (list) html += '</ul>';
    return html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  function setActiveApp(app, options) {
    state.activeApp = APPS[app] ? app : 'intelligence';
    localStorage.setItem(APP_KEY, state.activeApp);
    document.body.setAttribute('data-ai-suite-active-app', state.activeApp);

    const meta = APPS[state.activeApp];
    const title = $('#aiSuiteTitle');
    const subtitle = $('#aiSuiteSubtitle');
    const input = $('#input');
    if (title) title.textContent = meta.title;
    if (subtitle) subtitle.textContent = meta.subtitle;
    if (input) input.placeholder = meta.placeholder;

    $$('.ai-suite-app-pill, .ai-suite-side-link').forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-ai-suite-app') === state.activeApp);
    });

    if (!options?.silent) emit('app-change');
  }

  function renderHistory() {
    const list = $('#conversationList');
    if (!list) return;
    if (!state.conversations.length) {
      list.innerHTML = '<p class="ai-suite-context-label">No conversations yet.</p>';
      return;
    }
    list.innerHTML = state.conversations.map((conversation) => `
      <button type="button" class="ai-suite-side-link ${conversation.id === state.activeConversationId ? 'active' : ''}" data-open-conversation="${conversation.id}">
        <span class="ai-suite-dot"></span><span>${escapeHtml(conversation.title || 'Conversation')}</span>
      </button>`).join('');
  }

  function renderMessages() {
    const messages = $('#messages');
    const empty = $('#empty');
    const conversation = activeConversation();
    if (!messages || !empty) return;

    if (!conversation || !conversation.messages.length) {
      messages.innerHTML = '';
      messages.classList.add('hidden');
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    messages.classList.remove('hidden');
    messages.innerHTML = conversation.messages.map((message, index) => {
      const role = message.role === 'user' ? 'user' : 'assistant';
      const label = role === 'user' ? 'You' : 'AI';
      const pending = message.pending ? '<div class="meta">Writing...</div>' : '';
      return `<div class="wrap ${role}" data-message-index="${index}"><div class="avatar">${label}</div><div class="block"><div class="msg">${markdownLite(message.content)}</div>${pending}</div></div>`;
    }).join('');
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  function appendMessage(role, content, extra) {
    const conversation = ensureConversation();
    conversation.messages.push({ role, content: String(content || ''), createdAt: new Date().toISOString(), ...(extra || {}) });
    conversation.updatedAt = new Date().toISOString();
    conversation.app = state.activeApp;
    if (role === 'user' && (!conversation.title || conversation.title === 'New conversation')) conversation.title = titleFrom(content);
    saveState();
    renderHistory();
    renderMessages();
    return conversation.messages.length - 1;
  }

  function updateMessage(index, content, extra) {
    const conversation = activeConversation();
    if (!conversation || !conversation.messages[index]) return;
    conversation.messages[index] = { ...conversation.messages[index], content: String(content || ''), ...(extra || {}) };
    conversation.updatedAt = new Date().toISOString();
    saveState();
    renderMessages();
  }

  function buildHistory() {
    const conversation = activeConversation();
    return (conversation?.messages || []).filter((message) => !message.pending).slice(-MAX_HISTORY).map((message) => ({ role: message.role, content: message.content }));
  }

  function parseSse(block) {
    let event = 'message';
    const data = [];
    String(block || '').split('\n').forEach((line) => {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    });
    return { event, data: data.join('\n') };
  }

  async function askAssistant(payload, onToken) {
    state.abortController = new AbortController();
    const response = await fetch('/assistant/general/stream', {
      method: 'POST',
      credentials: 'include',
      signal: state.abortController.signal,
      headers: csrfHeaders('POST', { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    if (!response.ok || !response.body) throw new Error(`Assistant stream failed: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';
      for (const block of blocks) {
        const parsed = parseSse(block);
        if (!parsed.data || parsed.event === 'done' || parsed.event === 'progress' || parsed.event === 'meta') continue;
        onToken(parsed.data);
      }
    }
  }

  async function fallbackAssistant(payload) {
    const response = await fetch('/assistant/general-safe', {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders('POST', { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Assistant fallback failed: ${response.status}`);
    const data = await response.json().catch(() => ({}));
    return data.answer || data.response || data.message || '';
  }

  async function sendMessage() {
    if (state.isSending) return;
    const input = $('#input');
    if (!input) return;
    const text = input.value.trim();
    if (!text && !state.upload) return;

    const appMeta = APPS[state.activeApp] || APPS.intelligence;
    const conversation = ensureConversation();
    const visibleText = text || `Please review the attached file: ${state.upload?.name || 'file'}`;
    const prompt = `${appMeta.instruction}\n\nAI Suite app context: ${appMeta.title}.\nUse British English. Keep the response practical, clear and conversational.\n\nUser request:\n${visibleText}`;

    appendMessage('user', visibleText);
    input.value = '';
    input.style.height = 'auto';
    const assistantIndex = appendMessage('assistant', '', { pending: true });
    state.isSending = true;
    $('#send')?.setAttribute('disabled', 'disabled');
    window.IndiCareRuntimeCore?.setThinking?.();

    const payload = {
      message: prompt,
      history: buildHistory(),
      response_mode: 'balanced',
      conversation_id: conversation.id,
      assistant_surface: 'ai-suite',
      assistant_mode: state.activeApp,
      document_name: state.upload?.name || null,
      document_text: state.upload?.text || null
    };

    let answer = '';
    try {
      await askAssistant(payload, (token) => {
        answer += token;
        updateMessage(assistantIndex, answer, { pending: true });
        window.IndiCareRuntimeCore?.stream?.appendToken?.(token);
      });
      if (!answer.trim()) answer = 'I could not generate a response just now.';
      updateMessage(assistantIndex, answer, { pending: false });
      window.IndiCareRuntimeCore?.setSpeaking?.();
    } catch (error) {
      try {
        answer = await fallbackAssistant(payload);
        updateMessage(assistantIndex, answer || 'I could not generate a response just now.', { pending: false });
      } catch (_) {
        updateMessage(assistantIndex, 'Sorry, I could not reach IndiCare AI just now. Please try again.', { pending: false });
      }
    } finally {
      state.isSending = false;
      state.upload = null;
      $('#send')?.removeAttribute('disabled');
      window.IndiCareRuntimeCore?.clearState?.();
      input.focus();
      emit('message-sent');
    }
  }

  async function handleAttach(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const canRead = /^(text\/|application\/json)/.test(file.type || '') || /\.(txt|md|csv|json)$/i.test(file.name || '');
    if (canRead) {
      const text = await file.text();
      state.upload = { name: file.name, text: text.slice(0, 60000) };
      const input = $('#input');
      if (input && !input.value.trim()) input.value = `Please review ${file.name}`;
    } else {
      state.upload = { name: file.name, text: '' };
      const input = $('#input');
      if (input && !input.value.trim()) input.value = `Please help me with the attached file: ${file.name}`;
    }
  }

  function newChat() {
    createConversation(state.activeApp);
    renderHistory();
    renderMessages();
    $('#input')?.focus();
  }

  function openConversation(id) {
    if (!state.conversations.some((item) => item.id === id)) return;
    state.activeConversationId = id;
    const conversation = activeConversation();
    if (conversation?.app) setActiveApp(conversation.app, { silent: true });
    saveState();
    renderHistory();
    renderMessages();
  }

  function insertPrompt(text) {
    const input = $('#input');
    if (!input) return;
    input.value = text;
    input.focus();
    input.dispatchEvent(new Event('input'));
  }

  function toggleSidebar(force) {
    const open = typeof force === 'boolean' ? force : !document.body.classList.contains('ai-sidebar-open');
    document.body.classList.toggle('ai-sidebar-open', open);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const appButton = event.target.closest('[data-ai-suite-app]');
      if (appButton) {
        setActiveApp(appButton.getAttribute('data-ai-suite-app'));
        toggleSidebar(false);
        return;
      }

      const promptButton = event.target.closest('[data-ai-suite-prompt]');
      if (promptButton) {
        insertPrompt(promptButton.getAttribute('data-ai-suite-prompt') || '');
        return;
      }

      const openButton = event.target.closest('[data-open-conversation]');
      if (openButton) {
        openConversation(openButton.getAttribute('data-open-conversation'));
        toggleSidebar(false);
        return;
      }

      if (event.target.closest('#send')) sendMessage();
      if (event.target.closest('#newChat')) newChat();
      if (event.target.closest('[data-ai-sidebar-toggle]')) toggleSidebar();
      if (event.target.closest('#aiSuiteVoiceButton')) {
        document.body.classList.add('ic-voice-mode-open');
        window.IndiCareRuntimeCore?.setListening?.();
        window.IndiCareVoiceCompanion?.open?.();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        toggleSidebar(false);
        document.body.classList.remove('ic-voice-mode-open');
        window.IndiCareRuntimeCore?.interrupt?.('escape_key');
      }
      if (event.key === 'Enter' && !event.shiftKey && event.target?.id === 'input') {
        event.preventDefault();
        sendMessage();
      }
    });

    const input = $('#input');
    if (input) {
      const resize = () => {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, window.innerHeight * 0.34)}px`;
      };
      input.addEventListener('input', resize);
      input.addEventListener('focus', () => document.body.classList.add('ai-composer-focused'));
      input.addEventListener('blur', () => document.body.classList.remove('ai-composer-focused'));
      resize();
    }

    const attach = $('#attach');
    if (attach && !$('#aiSuiteFileInput')) {
      const file = document.createElement('input');
      file.type = 'file';
      file.id = 'aiSuiteFileInput';
      file.hidden = true;
      file.addEventListener('change', handleAttach);
      document.body.appendChild(file);
      attach.addEventListener('click', () => file.click());
    }
  }

  function boot() {
    document.documentElement.setAttribute('data-product-surface', 'ai-suite');
    document.body.classList.add('indicare-ai-suite', 'indicare-ai-suite-app-ready');
    loadState();
    if (!state.activeConversationId && !state.conversations.length) createConversation(state.activeApp);
    setActiveApp(state.activeApp, { silent: true });
    renderHistory();
    renderMessages();
    bind();
    emit('ready');
  }

  window.IndiCareAISuiteApp = {
    version: state.version,
    boot,
    snapshot,
    setActiveApp,
    sendMessage,
    newChat
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 0);
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
