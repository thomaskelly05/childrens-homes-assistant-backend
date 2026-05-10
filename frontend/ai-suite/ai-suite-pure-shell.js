/* IndiCare AI Suite Pure Shell
   Final route-level correction: /assistant must render the AI Suite conversation shell, not the OS workspace.
   This reuses existing composer/messages when present so the assistant wiring keeps working.
*/
(function () {
  if (window.__indicareAiSuitePureShell) return;
  window.__indicareAiSuitePureShell = true;

  const APP_KEY = 'indicare_ai_suite_active_app';
  const APPS = [
    ['intelligence', 'Chat'],
    ['notes', 'Notes'],
    ['docs', 'Docs'],
    ['connect', 'Connect'],
    ['mail', 'Mail']
  ];

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function isAssistantRoute() {
    return location.pathname.includes('/assistant') || document.title.toLowerCase().includes('indicare ai');
  }

  function ensureClass() {
    document.documentElement.setAttribute('data-product-surface', 'ai-suite');
    document.body?.classList.add('indicare-ai-suite', 'indicare-ai-suite-pure');
  }

  function findMainMount() {
    return $('.main-shell') || $('.app-shell') || document.body;
  }

  function existingMessages() {
    return $('#messages') || $('.messages');
  }

  function existingComposer() {
    return $('.composer-dock') || $('.composer-shell') || $('.modern-composer')?.closest('.composer-dock') || $('.composer-card')?.closest('.composer-dock');
  }

  function createMessages() {
    const messages = document.createElement('div');
    messages.id = 'messages';
    messages.className = 'messages hidden';
    return messages;
  }

  function createComposer() {
    const dock = document.createElement('div');
    dock.className = 'composer-dock';
    dock.innerHTML = `
      <div class="composer-shell">
        <div class="quickbar starter-chips">
          <button class="chip" type="button" data-ai-suite-app="notes">Notes</button>
          <button class="chip" type="button" data-ai-suite-app="docs">Docs</button>
          <button class="chip" type="button" data-ai-suite-app="connect">Connect</button>
          <button class="chip" type="button" data-ai-suite-app="mail">Mail</button>
        </div>
        <div class="modern-composer composer-card">
          <div class="composer-row input-row">
            <button id="attach" class="attach-btn" type="button" aria-label="Attach">+</button>
            <textarea id="input" rows="1" placeholder="Message IndiCare AI"></textarea>
            <button id="send" class="send-btn" type="button" aria-label="Send">↑</button>
          </div>
        </div>
      </div>`;
    return dock;
  }

  function buildShell() {
    const shell = document.createElement('main');
    shell.id = 'aiSuiteShell';
    shell.className = 'ai-suite-shell';
    shell.innerHTML = `
      <section class="ai-suite-chat-surface" aria-label="IndiCare AI Suite">
        <header class="ai-suite-mobile-header">
          <button class="ai-suite-menu" type="button" data-ai-sidebar-toggle aria-label="Open menu">☰</button>
          <div>
            <strong id="aiSuiteTitle">IndiCare AI</strong>
            <span id="aiSuiteSubtitle">AI Suite</span>
          </div>
          <button class="ai-suite-voice" type="button" id="aiSuiteVoiceButton" aria-label="Open voice">AI</button>
        </header>

        <nav class="ai-suite-app-switcher" aria-label="IndiCare AI Suite apps">
          ${APPS.map(([id, label]) => `<button type="button" class="ai-suite-app-pill" data-ai-suite-app="${id}">${label}</button>`).join('')}
        </nav>

        <div class="ai-suite-conversation" id="aiSuiteConversation">
          <div class="assistant-empty" id="aiSuiteWelcome">
            <div class="assistant-empty-inner">
              <h1 class="assistant-title">How can IndiCare help?</h1>
              <p class="assistant-subtitle">Chat, write notes, draft documents, manage messages and use Connect from one conversational AI workspace.</p>
            </div>
          </div>
        </div>
      </section>`;
    return shell;
  }

  function suppressOldWorkspace(root, shell) {
    Array.from(root.children).forEach((child) => {
      if (child === shell || child.classList.contains('sidebar') || child.classList.contains('ic-sidebar')) return;
      child.setAttribute('data-ai-suite-hidden', 'true');
      child.style.display = 'none';
    });

    const hardSelectors = [
      '.right-rail', '.evidence-rail', '.ic-evidence-panel', '.connected-care-workspace',
      '.care-workspace-grid', '.operational-dashboard-grid', '.record-dashboard', '.chronology-grid',
      '.dashboard-grid', '.dashboard-card', '[data-os-module]', '[data-care-module]', '[data-operational-grid]'
    ];
    hardSelectors.forEach((selector) => {
      $$(selector).forEach((node) => {
        if (shell.contains(node)) return;
        node.setAttribute('data-ai-suite-hidden', 'true');
        node.style.display = 'none';
      });
    });
  }

  function moveWorkingParts(shell) {
    const conversation = $('#aiSuiteConversation', shell);
    const welcome = $('#aiSuiteWelcome', shell);
    let messages = existingMessages();
    let composer = existingComposer();

    if (!messages) messages = createMessages();
    if (!composer) composer = createComposer();

    if (messages.parentElement !== conversation) {
      conversation.appendChild(messages);
    }
    if (composer.parentElement !== shell.querySelector('.ai-suite-chat-surface')) {
      shell.querySelector('.ai-suite-chat-surface').appendChild(composer);
    }

    const hasMessages = messages.children.length > 0 && !messages.classList.contains('hidden');
    if (hasMessages) welcome.style.display = 'none';

    const input = $('#input, textarea', composer);
    if (input && !input.__aiPureShellResize) {
      input.__aiPureShellResize = true;
      const resize = () => {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, window.innerHeight * 0.34)}px`;
      };
      input.addEventListener('input', resize);
      resize();
    }
  }

  function setActiveApp(appId) {
    const active = String(appId || localStorage.getItem(APP_KEY) || 'intelligence');
    localStorage.setItem(APP_KEY, active);
    document.body?.setAttribute('data-ai-suite-active-app', active);

    $$('.ai-suite-app-pill').forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-ai-suite-app') === active);
    });

    const title = $('#aiSuiteTitle');
    const subtitle = $('#aiSuiteSubtitle');
    const input = $('#input, textarea');
    const labels = {
      intelligence: ['IndiCare AI', 'AI Suite', 'Message IndiCare AI'],
      notes: ['I-Notes', 'Capture and clean up notes', 'Ask IndiCare to capture, clean up or summarise notes'],
      docs: ['IndiCare Docs', 'Draft and review documents', 'Ask IndiCare to draft, rewrite or review a document'],
      connect: ['IndiCare Connect', 'Meetings and collaboration', 'Ask IndiCare about meetings, actions or collaboration'],
      mail: ['IndiCare Mail', 'Communication intelligence', 'Ask IndiCare to draft, summarise or respond to mail']
    };
    const [t, s, p] = labels[active] || labels.intelligence;
    if (title) title.textContent = t;
    if (subtitle) subtitle.textContent = s;
    if (input) input.setAttribute('placeholder', p);

    window.IndiCareAISuite?.setActiveApp?.(active, { silent: true });
  }

  function wire(shell) {
    if (shell.__aiPureShellWired) return;
    shell.__aiPureShellWired = true;

    shell.addEventListener('click', (event) => {
      const app = event.target.closest('[data-ai-suite-app]');
      if (app) {
        setActiveApp(app.getAttribute('data-ai-suite-app'));
        return;
      }

      const voice = event.target.closest('#aiSuiteVoiceButton');
      if (voice) {
        document.body?.classList.add('ic-voice-mode-open');
        window.IndiCareRuntimeCore?.setListening?.();
        window.IndiCareVoiceCompanion?.open?.();
      }
    });

    const messages = existingMessages();
    if (messages && !messages.__aiPureShellObserved) {
      messages.__aiPureShellObserved = true;
      const observer = new MutationObserver(() => {
        const welcome = $('#aiSuiteWelcome');
        if (welcome && messages.children.length > 0) welcome.style.display = 'none';
        messages.scrollTop = messages.scrollHeight;
      });
      observer.observe(messages, { childList: true, subtree: true });
    }
  }

  function mount() {
    if (!isAssistantRoute()) return;
    ensureClass();

    const root = findMainMount();
    let shell = $('#aiSuiteShell');
    if (!shell) {
      shell = buildShell();
      root.appendChild(shell);
    }

    suppressOldWorkspace(root, shell);
    moveWorkingParts(shell);
    wire(shell);
    setActiveApp(localStorage.getItem(APP_KEY) || 'intelligence');
    document.body?.classList.add('ai-suite-shell-mounted');
  }

  function boot() {
    mount();
    const observer = new MutationObserver(() => mount());
    observer.observe(document.body, { childList: true, subtree: false });
    setTimeout(mount, 250);
    setTimeout(mount, 1000);
    setTimeout(mount, 2500);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
