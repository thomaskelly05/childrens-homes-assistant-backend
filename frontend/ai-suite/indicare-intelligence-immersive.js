(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));

  const starters = [
    {
      title: 'Think through a complex incident',
      prompt: 'Help me think through this incident like a calm senior leader. Separate facts, concerns, missing information, risk, recording language and next actions: ',
    },
    {
      title: 'Challenge my thinking',
      prompt: 'Act as Intelligence AI. Challenge my assumptions, spot blind spots, and help me reason through this decision: ',
    },
    {
      title: 'Build an Ofsted evidence narrative',
      prompt: 'Help me turn this into a strong Ofsted evidence narrative, with impact, leadership oversight, child voice and next steps: ',
    },
    {
      title: 'Spot risk patterns',
      prompt: 'Analyse this as a pattern of risk, relationships, triggers, protective factors and leadership actions: ',
    },
  ];

  const modes = {
    live: 'Live reasoning',
    strategy: 'Strategy partner',
    safeguarding: 'Safeguarding lens',
    leadership: 'Leadership oversight',
  };

  let intelligenceMessages = JSON.parse(localStorage.getItem('ic_intelligence_messages') || '[]');
  let intelligenceMode = localStorage.getItem('ic_intelligence_mode') || 'live';

  function save() {
    localStorage.setItem('ic_intelligence_messages', JSON.stringify(intelligenceMessages.slice(-80)));
    localStorage.setItem('ic_intelligence_mode', intelligenceMode);
  }

  function renderMessages() {
    const feed = $('icIntelligenceFeed');
    if (!feed) return;

    if (!intelligenceMessages.length) {
      feed.innerHTML = `
        <div class="ic-empty-conversation">
          <div class="ic-ai-mark large">IC</div>
          <h2>Talk to Intelligence naturally.</h2>
          <p>Use this space like an immersive strategic AI: unpack incidents, test decisions, reason through safeguarding, prepare for Ofsted, or think aloud after a difficult shift.</p>
          <div class="ic-starter-grid">
            ${starters.map((item) => `<button type="button" data-ic-intel-starter="${esc(item.prompt)}"><strong>${esc(item.title)}</strong><span>${esc(item.prompt.replace(': ', ''))}</span></button>`).join('')}
          </div>
        </div>`;
      return;
    }

    feed.innerHTML = intelligenceMessages.map((message) => `
      <div class="ic-message-row ${message.role === 'user' ? 'user' : 'assistant'}">
        <div class="ic-message-avatar">${message.role === 'user' ? 'You' : 'IC'}</div>
        <div class="ic-message-bubble">${esc(message.content).replace(/\n/g, '<br>')}</div>
      </div>`).join('');
    feed.scrollTop = feed.scrollHeight;
  }

  function setThinking(isThinking) {
    const status = $('icIntelligenceStatus');
    if (status) status.textContent = isThinking ? 'Intelligence is reasoning...' : 'Always-on conversational reasoning';
    const feed = $('icIntelligenceFeed');
    if (!feed) return;
    const existing = $('icIntelligenceThinking');
    if (existing) existing.remove();
    if (isThinking) {
      feed.insertAdjacentHTML('beforeend', '<div id="icIntelligenceThinking" class="ic-thinking"><span></span><span></span><span></span></div>');
      feed.scrollTop = feed.scrollHeight;
    }
  }

  function currentModeInstruction() {
    const label = modes[intelligenceMode] || modes.live;
    return `You are IndiCare Intelligence AI in ${label} mode. Respond as an immersive conversational reasoning partner, similar in feel to a deep strategic AI companion, but grounded in British residential childcare practice. Be natural, thoughtful and direct. Help the user reason, not just complete a form.`;
  }

  async function askIntelligence(prompt) {
    const input = $('icIntelligenceInput');
    const text = String(prompt || input?.value || '').trim();
    if (!text) return;
    if (input) input.value = '';

    intelligenceMessages.push({ role: 'user', content: text });
    save();
    renderMessages();
    setThinking(true);

    let answer = '';
    try {
      const res = await fetch('/assistant/general/stream', {
        method: 'POST',
        credentials: 'include',
        headers: typeof headers === 'function' ? headers() : { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${currentModeInstruction()}\n\nUser message:\n${text}`,
          response_mode: 'deep',
          history: intelligenceMessages.slice(-14),
          conversation_id: 'intelligence-immersive',
          assistant_surface: 'ai-suite',
          assistant_mode: 'intelligence',
          use_orchestrator: true,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`AI request failed ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      intelligenceMessages.push({ role: 'assistant', content: '' });
      setThinking(false);

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
            answer += `${token}\n`;
            intelligenceMessages[intelligenceMessages.length - 1].content = answer.trim();
            save();
            renderMessages();
          });
        }
      }

      if (!answer.trim()) {
        intelligenceMessages[intelligenceMessages.length - 1].content = 'I am here. Tell me what you want to think through and I will reason it through with you.';
      }
    } catch (error) {
      setThinking(false);
      intelligenceMessages.push({
        role: 'assistant',
        content: `I could not reach Intelligence just now. ${error.message || error}`,
      });
    }

    save();
    renderMessages();
  }

  function renderShell() {
    const screen = $('intelligenceScreen');
    if (!screen || screen.dataset.immersiveReady === 'true') return;
    screen.dataset.immersiveReady = 'true';
    screen.innerHTML = `
      <div class="ic-intelligence-shell">
        <aside class="ic-intelligence-rail">
          <div class="ic-ai-mark">IC</div>
          <h2>Intelligence AI</h2>
          <p class="ic-rail-copy">An immersive reasoning partner for care, risk, leadership, Inspection evidence preparation and reflective decision-making.</p>
          <div class="ic-rail-actions">
            <button type="button" class="ic-primary-action" id="icNewIntelligence">New intelligence thread</button>
            <button type="button" class="ic-secondary-action" id="icSummariseIntelligence">Summarise thinking</button>
          </div>
          <div class="ic-mode-stack">
            <span class="ic-section-label">Reasoning mode</span>
            ${Object.entries(modes).map(([key, label]) => `<button type="button" class="icModeBtn ${key === intelligenceMode ? 'active' : ''}" data-ic-mode="${key}">${esc(label)}</button>`).join('')}
          </div>
          <div class="ic-memory-card">
            <span class="ic-section-label">Live context</span>
            <p id="icIntelligenceStatus">Always-on conversational reasoning</p>
            <small>Uses the IndiCare AI Suite context, recent conversation and uploaded material where available.</small>
          </div>
        </aside>
        <main class="ic-intelligence-main">
          <section class="ic-intelligence-hero">
            <p class="ic-kicker">Immersive operational intelligence</p>
            <h1>Ask anything. Think deeply. Decide clearly.</h1>
            <p>Speak to Intelligence like a strategic colleague. It can challenge assumptions, map risk, strengthen records, prepare inspection narratives and help you slow down after difficult moments.</p>
          </section>
          <section class="ic-intelligence-feed" id="icIntelligenceFeed"></section>
          <section class="ic-intelligence-composer-wrap">
            <div class="ic-intelligence-composer">
              <button type="button" class="ic-composer-tool" id="icVoiceIntelligence" title="Voice mode">◎</button>
              <textarea id="icIntelligenceInput" rows="1" placeholder="Talk to Intelligence..."></textarea>
              <button type="button" class="ic-composer-send" id="icSendIntelligence">↑</button>
            </div>
            <div class="ic-composer-hint">Intelligence can reason with you, but final safeguarding, legal, clinical or employment decisions stay with the right professional lead.</div>
          </section>
        </main>
      </div>`;

    renderMessages();
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const starter = event.target.closest('[data-ic-intel-starter]');
      if (starter) {
        const input = $('icIntelligenceInput');
        if (input) {
          input.value = starter.dataset.icIntelStarter || '';
          input.focus();
        }
      }

      const mode = event.target.closest('[data-ic-mode]');
      if (mode) {
        intelligenceMode = mode.dataset.icMode || 'live';
        save();
        document.querySelectorAll('[data-ic-mode]').forEach((button) => button.classList.toggle('active', button === mode));
      }

      if (event.target.closest('#icSendIntelligence')) askIntelligence();
      if (event.target.closest('#icNewIntelligence')) {
        intelligenceMessages = [];
        save();
        renderMessages();
      }
      if (event.target.closest('#icSummariseIntelligence')) {
        askIntelligence('Summarise this Intelligence conversation into: key themes, risks, decisions, actions, and what still needs professional review.');
      }
      if (event.target.closest('#icVoiceIntelligence')) {
        const input = $('icIntelligenceInput');
        if (input) {
          input.placeholder = 'Voice mode is coming next. For now, type naturally here...';
          input.focus();
        }
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.target && event.target.id === 'icIntelligenceInput' && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        askIntelligence();
      }
    });
  }

  function boot() {
    renderShell();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
