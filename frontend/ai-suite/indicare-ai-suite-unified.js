(function () {
  const MODES = {
    assistant: {
      title: 'Assistant',
      subtitle: 'ChatGPT-style operational AI',
      hero: 'Think, ask, reflect and work naturally.',
      copy: 'A calm conversational workspace for residential childcare.',
      starters: [
        'Help me think through a difficult incident calmly.',
        'Turn these notes into a professional handover.',
        'Help me prepare for supervision tomorrow.',
        'Challenge my thinking around this safeguarding concern.',
      ],
    },
    connect: {
      title: 'Connect',
      subtitle: 'AI-native operational collaboration',
      hero: 'Live collaboration for the home.',
      copy: 'Teams-style communication with AI woven into every interaction.',
    },
    notes: {
      title: 'I-Notes',
      subtitle: 'Beam-style AI notes and reflection',
      hero: 'Capture natural thought and conversation.',
      copy: 'Voice-first reflective recording powered by AI.',
    },
    docs: {
      title: 'Docs',
      subtitle: 'AI-assisted operational writing',
      hero: 'Write clearly. Think deeply.',
      copy: 'Beautiful AI-assisted documents, plans and reports.',
    },
    intelligence: {
      title: 'Intelligence',
      subtitle: 'Immersive operational cognition',
      hero: 'Ask anything. Think deeply. Decide clearly.',
      copy: 'A Grok/Tesla-style reasoning environment for leadership and safeguarding.',
    },
  };

  const state = {
    mode: localStorage.getItem('ic_suite_mode') || 'assistant',
    messages: JSON.parse(localStorage.getItem('ic_suite_messages') || '[]'),
    threads: JSON.parse(localStorage.getItem('ic_suite_threads') || '[]'),
  };

  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  function save() {
    localStorage.setItem('ic_suite_mode', state.mode);
    localStorage.setItem('ic_suite_messages', JSON.stringify(state.messages.slice(-100)));
    localStorage.setItem('ic_suite_threads', JSON.stringify(state.threads.slice(-20)));
  }

  function root() {
    return document.getElementById('icUnifiedSuite');
  }

  function messagesForMode(mode) {
    return state.messages.filter((item) => item.mode === mode);
  }

  function renderSidebar() {
    return `
      <aside class="ic-sidebar">
        <div class="ic-brand">
          <div class="ic-logo">IC</div>
          <div>
            <strong>IndiCare AI Suite</strong>
            <span>AI operating system for care</span>
          </div>
        </div>

        <button class="ic-new-thread" id="icNewThread">＋ New thread</button>

        <div>
          <div class="ic-section-title">Experiences</div>
          <div class="ic-mode-list">
            ${Object.entries(MODES).map(([key, value]) => `
              <button class="ic-mode-button ${state.mode === key ? 'active' : ''}" data-mode="${key}">
                <div class="ic-mode-icon">${value.title.charAt(0)}</div>
                <div>
                  <strong>${value.title}</strong>
                  <span>${value.subtitle}</span>
                </div>
              </button>`).join('')}
          </div>
        </div>

        <div class="ic-section-title">Recent thinking</div>
        <div class="ic-thread-list">
          ${(state.threads.length ? state.threads : [{ title: 'Welcome to IndiCare AI', mode: 'assistant' }]).map((thread, index) => `
            <button class="ic-thread ${index === 0 ? 'active' : ''}">
              <strong>${esc(thread.title)}</strong>
              <span>${esc(thread.mode || 'assistant')}</span>
            </button>`).join('')}
        </div>

        <div class="ic-user-card">
          <div class="ic-avatar">IC</div>
          <div>
            <strong>Operational Intelligence</strong>
            <span>Unified AI environment</span>
          </div>
        </div>
      </aside>`;
  }

  function renderAssistant() {
    const config = MODES.assistant;
    const messages = messagesForMode('assistant');

    return `
      <div class="ic-view ic-chat-view ${state.mode === 'assistant' ? 'active' : ''}" data-view="assistant">
        <div class="ic-feed"><div class="ic-feed-inner">
          ${messages.length ? renderMessages(messages, false) : `
            <div class="ic-hero">
              <div class="ic-hero-mark">IC</div>
              <h2>${config.hero}</h2>
              <p>${config.copy}</p>
            </div>
            <div class="ic-starters">
              ${config.starters.map((item) => `<button class="ic-starter" data-starter="${esc(item)}"><strong>${esc(item)}</strong><span>Open a natural AI conversation.</span></button>`).join('')}
            </div>`}
        </div></div>
        ${renderComposer('Talk to IndiCare AI...')}
      </div>`;
  }

  function renderMessages(messages, intelligence) {
    return messages.map((message) => `
      <div class="ic-message ${message.role}">
        <div class="ic-message-avatar">${message.role === 'user' ? 'You' : 'IC'}</div>
        <div class="ic-bubble">${esc(message.content)}</div>
      </div>`).join('') + (intelligence && state.loading ? '<div class="ic-thinking"><span></span><span></span><span></span></div>' : '');
  }

  function renderConnect() {
    return `
      <div class="ic-view ${state.mode === 'connect' ? 'active' : ''}" data-view="connect">
        <div class="ic-split-view">
          <div class="ic-panel">
            <h3>Channels</h3>
            <div class="ic-list">
              <div class="ic-list-item"><strong>Shift Handover</strong><span>AI summarising current operational risks.</span></div>
              <div class="ic-list-item"><strong>Managers</strong><span>Leadership decisions and escalations.</span></div>
              <div class="ic-list-item"><strong>Safeguarding</strong><span>Protected operational collaboration.</span></div>
            </div>
          </div>

          <div class="ic-canvas">
            <div class="ic-card">
              <h2>Operational collaboration</h2>
              <p class="ic-note-copy">Connect combines Teams-style communication with live AI summarisation, action extraction, handover intelligence and operational reasoning.</p>
              <div class="ic-team-thread">
                <div class="ic-team-post"><strong>Shift lead</strong><p>AI detected an escalation in emotional presentation across the evening shift.</p></div>
                <div class="ic-team-post"><strong>IndiCare AI</strong><p>I have prepared a shift summary, extracted actions and linked relevant chronology entries.</p></div>
              </div>
              <div class="ic-inline-compose">
                <textarea placeholder="Message the team..."></textarea>
                <button class="ic-blue-button">Send</button>
              </div>
            </div>
          </div>

          <div class="ic-panel right">
            <h3>AI actions</h3>
            <div class="ic-list">
              <div class="ic-list-item"><strong>Handover generated</strong><span>AI prepared a professional shift summary.</span></div>
              <div class="ic-list-item"><strong>Risk escalation flagged</strong><span>Repeated trigger patterns identified.</span></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderNotes() {
    return `
      <div class="ic-view ${state.mode === 'notes' ? 'active' : ''}" data-view="notes">
        <div class="ic-notes-layout">
          <div class="ic-canvas">
            <div class="ic-recorder">
              <div class="ic-kicker">AI reflective capture</div>
              <h2>Talk naturally.</h2>
              <p>The AI listens, structures, reflects and transforms speech into professional recording.</p>
              <div class="ic-wave"></div>
              <button class="ic-blue-button">Start recording</button>
            </div>
            <div class="ic-transcript" contenteditable="true">
              Ethan appeared emotionally dysregulated after contact and required significant co-regulation support...
            </div>
          </div>
          <div class="ic-panel right">
            <h3>AI transformations</h3>
            <div class="ic-list">
              <div class="ic-list-item"><strong>Chronology entry</strong><span>Generated from transcript.</span></div>
              <div class="ic-list-item"><strong>Handover note</strong><span>Professional summary prepared.</span></div>
              <div class="ic-list-item"><strong>Reflective language review</strong><span>AI removed emotional wording.</span></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderDocs() {
    return `
      <div class="ic-view ${state.mode === 'docs' ? 'active' : ''}" data-view="docs">
        <div class="ic-doc-layout">
          <div class="ic-panel">
            <h3>Workspace</h3>
            <div class="ic-list">
              <div class="ic-list-item"><strong>Placement Plan</strong><span>AI-assisted live document.</span></div>
              <div class="ic-list-item"><strong>Provider Review</strong><span>Inspection preparation workspace.</span></div>
              <div class="ic-list-item"><strong>Safeguarding Audit</strong><span>Operational intelligence attached.</span></div>
            </div>
          </div>

          <div class="ic-doc-page-wrap">
            <article class="ic-doc-page" contenteditable="true">
              <h1>Reflective Incident Review</h1>
              <p>This review explores the escalation involving Ethan following family contact. The incident highlights emotional dysregulation, relationship insecurity and staff co-regulation responses.</p>
              <p>The AI has suggested strengthening the analysis around triggers, protective relationships and leadership oversight.</p>
            </article>
          </div>

          <div class="ic-panel right">
            <h3>AI writing intelligence</h3>
            <div class="ic-list">
              <div class="ic-list-item"><strong>Inspection language strengthened</strong><span>AI improved evaluative wording.</span></div>
              <div class="ic-list-item"><strong>Missing evidence identified</strong><span>Leadership oversight not referenced.</span></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderIntelligence() {
    const messages = messagesForMode('intelligence');
    return `
      <div class="ic-view ${state.mode === 'intelligence' ? 'active' : ''}" data-view="intelligence">
        <div class="ic-intelligence">
          <div class="ic-panel">
            <div class="ic-kicker">Immersive operational cognition</div>
            <h3>Intelligence AI</h3>
            <p class="ic-note-copy">A conversational reasoning system for safeguarding, leadership and operational awareness.</p>

            <button class="ic-intel-mode active">Live reasoning</button>
            <button class="ic-intel-mode">Leadership oversight</button>
            <button class="ic-intel-mode">Safeguarding lens</button>
            <button class="ic-intel-mode">Pattern analysis</button>

            <div class="ic-section-title">Suggested thinking</div>
            <div class="ic-list">
              <div class="ic-list-item"><strong>Analyse escalation patterns</strong><span>Reason through emerging behavioural risk.</span></div>
              <div class="ic-list-item"><strong>Challenge assumptions</strong><span>Identify blind spots and missing information.</span></div>
            </div>
          </div>

          <div class="ic-intelligence-main">
            <div class="ic-intelligence-hero">
              <div class="ic-kicker">Immersive intelligence</div>
              <h2>${MODES.intelligence.hero}</h2>
              <p>${MODES.intelligence.copy}</p>
            </div>

            <div class="ic-intelligence-feed">
              <div class="ic-feed-inner">
                ${messages.length ? renderMessages(messages, true) : `
                  <div class="ic-hero">
                    <div class="ic-hero-mark">IC</div>
                    <h2>Think with the system.</h2>
                    <p>Ask Intelligence to reason through incidents, identify patterns, challenge assumptions and support leadership thinking.</p>
                  </div>
                  <div class="ic-starters">
                    <button class="ic-starter" data-starter="Help me understand the emotional pattern behind these incidents."><strong>Analyse emotional patterns</strong><span>AI operational reasoning.</span></button>
                    <button class="ic-starter" data-starter="Challenge my assumptions around this safeguarding concern."><strong>Challenge assumptions</strong><span>Strategic safeguarding thinking.</span></button>
                  </div>`}
              </div>
            </div>

            ${renderComposer('Talk to Intelligence AI...', true)}
          </div>
        </div>
      </div>`;
  }

  function renderComposer(placeholder, intelligence) {
    return `
      <div class="ic-composer-zone">
        <div class="ic-composer">
          <textarea id="icComposerInput" placeholder="${placeholder}"></textarea>
          <div class="ic-composer-row">
            <div class="ic-tool-row">
              <button class="ic-tool">＋</button>
              <button class="ic-tool">◎</button>
            </div>
            <button class="ic-send" id="icSendButton">↑</button>
          </div>
        </div>
      </div>`;
  }

  function renderWorkspace() {
    return `
      <main class="ic-main">
        <div class="ic-topbar">
          <div>
            <h1>${MODES[state.mode].title}</h1>
            <p>${MODES[state.mode].subtitle}</p>
          </div>
          <div class="ic-top-actions">
            <button class="ic-pill">Operational context</button>
            <button class="ic-pill">AI memory</button>
          </div>
        </div>

        <div class="ic-workspace">
          ${renderAssistant()}
          ${renderConnect()}
          ${renderNotes()}
          ${renderDocs()}
          ${renderIntelligence()}
        </div>
      </main>`;
  }

  function render() {
    const container = root();
    if (!container) return;
    container.innerHTML = renderSidebar() + renderWorkspace();
  }

  async function sendMessage(text) {
    const prompt = String(text || document.getElementById('icComposerInput')?.value || '').trim();
    if (!prompt) return;

    const mode = state.mode;
    state.messages.push({ role: 'user', content: prompt, mode });
    state.loading = true;
    save();
    render();

    const input = document.getElementById('icComposerInput');
    if (input) input.value = '';

    try {
      const res = await fetch('/assistant/general-safe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[${mode.toUpperCase()} MODE]\n${prompt}`,
          history: messagesForMode(mode).slice(-10),
          response_mode: mode === 'intelligence' ? 'deep' : 'balanced',
        }),
      });

      const data = await res.json();
      state.messages.push({
        role: 'assistant',
        content: data.answer || 'The AI responded without content.',
        mode,
      });

      if (!state.threads.length) {
        state.threads.unshift({
          title: prompt.slice(0, 40),
          mode,
        });
      }
    } catch (error) {
      state.messages.push({
        role: 'assistant',
        content: `AI connection issue: ${error.message || error}`,
        mode,
      });
    }

    state.loading = false;
    save();
    render();
  }

  function mount() {
    if (document.getElementById('icUnifiedSuite')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'icUnifiedSuite';
    wrapper.className = 'ic-suite';

    document.body.innerHTML = '';
    document.body.appendChild(wrapper);

    render();

    document.body.addEventListener('click', (event) => {
      const modeButton = event.target.closest('[data-mode]');
      if (modeButton) {
        state.mode = modeButton.dataset.mode;
        save();
        render();
      }

      const starter = event.target.closest('[data-starter]');
      if (starter) {
        sendMessage(starter.dataset.starter || '');
      }

      if (event.target.closest('#icSendButton')) {
        sendMessage();
      }

      if (event.target.closest('#icNewThread')) {
        state.messages = [];
        save();
        render();
      }
    });

    document.body.addEventListener('keydown', (event) => {
      if (event.target && event.target.id === 'icComposerInput' && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  function boot() {
    document.documentElement.setAttribute('data-product-surface', 'ai-suite');
    mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
