(() => {
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));

  const state = {
    messages: JSON.parse(localStorage.getItem('ic_intelligence_messages') || '[]'),
    listening: false,
    streaming: false,
  };

  function save() {
    localStorage.setItem('ic_intelligence_messages', JSON.stringify(state.messages.slice(-60)));
  }

  function activeMode() {
    return localStorage.getItem('ic_orb_mode') || 'everyday';
  }

  function projectId() {
    return localStorage.getItem('ic_active_project') || 'general';
  }

  function ensureLayout() {
    const screen = $('intelligenceScreen') || document.querySelector('[data-app="intelligence"]');
    if (!screen || $('icIntelligenceShell')) return;

    screen.innerHTML = `
      <div id="icIntelligenceShell" class="ic-intelligence-shell">
        <aside class="ic-intelligence-rail" aria-label="Intelligence controls">
          <div class="ic-ai-mark">IC</div>
          <h2>IndiCare Intelligence</h2>
          <p class="ic-rail-copy">A calm operational AI companion for everyday leadership, safeguarding reflection and specialist children’s home reasoning.</p>
          <div class="ic-rail-actions">
            <button id="icStartVoice" class="ic-primary-action" type="button">Start voice</button>
            <button id="icStopVoice" class="ic-secondary-action" type="button">Stop</button>
          </div>
          <div class="ic-mode-stack" aria-label="Conversation mode">
            <span class="ic-section-label">Mode</span>
            <button data-ic-mode="everyday" class="icModeBtn" type="button">Everyday operational</button>
            <button data-ic-mode="specialist" class="icModeBtn" type="button">Specialist Ofsted</button>
          </div>
          <div class="ic-memory-card">
            <span class="ic-section-label">Live context</span>
            <div id="icIntelligenceContext">Project: ${esc(projectId())}</div>
          </div>
        </aside>
        <main class="ic-intelligence-main">
          <header class="ic-intelligence-hero">
            <div>
              <p class="ic-kicker">IndiCare Intelligence</p>
              <h1>What should we think through?</h1>
              <p>Speak or type naturally. IndiCare responds like an experienced operational partner, not a form.</p>
            </div>
          </header>
          <div id="icIntelligenceFeed" class="ic-intelligence-feed" aria-live="polite"></div>
          <footer class="ic-intelligence-composer-wrap">
            <div class="ic-intelligence-composer">
              <button id="icIntelAttach" class="ic-composer-tool" type="button" aria-label="Attach">+</button>
              <textarea id="icIntelligenceInput" placeholder="Message IndiCare Intelligence..." rows="1"></textarea>
              <button id="icIntelligenceSend" class="ic-composer-send" type="button" aria-label="Send">↑</button>
            </div>
            <p class="ic-composer-hint">Everyday and Specialist modes use the active project, actions and operational memory.</p>
          </footer>
        </main>
      </div>`;

    qsa('.icModeBtn').forEach((button) => {
      button.classList.toggle('active', button.dataset.icMode === activeMode());
      button.addEventListener('click', () => {
        localStorage.setItem('ic_orb_mode', button.dataset.icMode);
        qsa('.icModeBtn').forEach((b) => b.classList.toggle('active', b === button));
      });
    });
  }

  function render() {
    const feed = $('icIntelligenceFeed');
    if (!feed) return;

    if (!state.messages.length) {
      feed.innerHTML = `
        <div class="ic-empty-conversation">
          <div class="ic-ai-mark large">IC</div>
          <h2>Start a conversation with IndiCare</h2>
          <p>Ask about risk, chronology, leadership decisions, staff communication, Ofsted evidence or reflective supervision.</p>
          <div class="ic-starter-grid">
            <button data-intel-starter="Analyse the key safeguarding risks in this situation: ">Analyse risk</button>
            <button data-intel-starter="Help me prepare an Inspection evidence support evidence summary about: ">Ofsted evidence</button>
            <button data-intel-starter="Think through the leadership decision here: ">Leadership decision</button>
            <button data-intel-starter="Turn this into calm reflective supervision prompts: ">Reflective supervision</button>
          </div>
        </div>`;
      qsa('[data-intel-starter]', feed).forEach((button) => {
        button.addEventListener('click', () => {
          const input = $('icIntelligenceInput');
          if (input) {
            input.value = button.dataset.intelStarter;
            input.focus();
          }
        });
      });
      return;
    }

    feed.innerHTML = state.messages.map((message) => `
      <article class="ic-message-row ${message.role === 'user' ? 'user' : 'assistant'}">
        <div class="ic-message-avatar">${message.role === 'user' ? 'You' : 'IC'}</div>
        <div class="ic-message-bubble">${esc(message.content).replace(/\n/g, '<br>')}</div>
      </article>`).join('') + (state.streaming ? '<div class="ic-thinking"><span></span><span></span><span></span></div>' : '');
    feed.scrollTop = feed.scrollHeight;
  }

  async function send() {
    const input = $('icIntelligenceInput');
    if (!input || !input.value.trim() || state.streaming) return;
    const text = input.value.trim();
    input.value = '';
    state.messages.push({ role: 'user', content: text });
    state.streaming = true;
    render();
    save();

    let response;
    try {
      response = await fetch('/assistant/general/stream', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          assistant_mode: 'intelligence',
          assistant_surface: 'ai-suite',
          response_mode: 'balanced',
          history: state.messages.slice(-10),
          project_id: projectId(),
          intelligence_mode: activeMode(),
        }),
      });
    } catch (error) {
      state.streaming = false;
      state.messages.push({ role: 'assistant', content: `I could not reach IndiCare Intelligence. ${error.message}` });
      render();
      save();
      return;
    }

    if (!response.body) {
      state.streaming = false;
      state.messages.push({ role: 'assistant', content: 'IndiCare Intelligence did not return a response stream.' });
      render();
      save();
      return;
    }

    const ai = { role: 'assistant', content: '' };
    state.messages.push(ai);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (part.startsWith('event:')) continue;
        part.split('\n').forEach((line) => {
          if (!line.startsWith('data:')) return;
          const token = line.slice(5).trimStart();
          if (!token || token === '[DONE]') return;
          ai.content += token;
          render();
        });
      }
    }

    state.streaming = false;
    render();
    save();

    if (window.speechSynthesis && ai.content.trim()) {
      const utterance = new SpeechSynthesisUtterance(ai.content.slice(0, 1400));
      utterance.lang = 'en-GB';
      utterance.rate = 0.94;
      utterance.pitch = 1;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  }

  function wire() {
    ensureLayout();
    render();

    const sendButton = $('icIntelligenceSend');
    if (sendButton && !sendButton.dataset.intelligenceWired) {
      sendButton.dataset.intelligenceWired = '1';
      sendButton.addEventListener('click', send);
    }

    const input = $('icIntelligenceInput');
    if (input && !input.dataset.intelligenceWired) {
      input.dataset.intelligenceWired = '1';
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          send();
        }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
      });
    }

    const startVoice = $('icStartVoice');
    if (startVoice && !startVoice.dataset.intelligenceWired) {
      startVoice.dataset.intelligenceWired = '1';
      startVoice.addEventListener('click', () => window.IndiCareOrbAI?.startConversation?.('orb'));
    }

    const stopVoice = $('icStopVoice');
    if (stopVoice && !stopVoice.dataset.intelligenceWired) {
      stopVoice.dataset.intelligenceWired = '1';
      stopVoice.addEventListener('click', () => window.IndiCareOrbAI?.stopConversation?.());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  setTimeout(wire, 800);
})();