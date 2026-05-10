/* IndiCare AI Suite Bootstrap
   Deterministic startup and wiring for app.indicare.co.uk/assistant.
   Keeps AI Suite separate from IndiCare OS while reusing shared intelligence services.
*/
(function () {
  if (window.IndiCareAISuite?.version) return;

  const AI_APPS = [
    { id: 'intelligence', label: 'Chat', aliases: ['assistant', 'ai'] },
    { id: 'notes', label: 'Notes', aliases: ['i-notes', 'inotes'] },
    { id: 'docs', label: 'Docs', aliases: ['documents'] },
    { id: 'connect', label: 'Connect', aliases: ['meetings'] },
    { id: 'mail', label: 'Mail', aliases: ['email'] }
  ];

  const state = {
    version: '1.0.0',
    activeApp: 'intelligence',
    booted: false,
    sidebarOpen: false
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(`indicare:ai-suite:${name}`, { detail: detail || snapshot() }));
  }

  function snapshot() {
    return {
      version: state.version,
      activeApp: state.activeApp,
      booted: state.booted,
      sidebarOpen: state.sidebarOpen
    };
  }

  function safe(label, fn) {
    try {
      return fn();
    } catch (error) {
      console.warn(`AI Suite skipped ${label}`, error);
      emit('error', { label, error: String(error?.message || error) });
      return null;
    }
  }

  function normaliseApp(appId) {
    const value = String(appId || '').toLowerCase().trim();
    const match = AI_APPS.find((app) => app.id === value || app.aliases.includes(value));
    return match ? match.id : 'intelligence';
  }

  function markProductSurface() {
    document.documentElement.setAttribute('data-product-surface', 'ai-suite');
    document.body?.classList.add('indicare-ai-suite', 'indicare-ai-suite-ready');
  }

  function ensureSwitcher() {
    const composerShell = $('.composer-shell') || $('.composer-dock') || $('.assistant-layout');
    if (!composerShell || $('.ai-suite-app-switcher')) return;

    const switcher = document.createElement('nav');
    switcher.className = 'ai-suite-app-switcher';
    switcher.setAttribute('aria-label', 'IndiCare AI Suite apps');
    switcher.innerHTML = AI_APPS.map((app) => (
      `<button type="button" class="ai-suite-app-pill" data-ai-suite-app="${app.id}">${app.label}</button>`
    )).join('');

    composerShell.parentNode?.insertBefore(switcher, composerShell);
  }

  function setTopbar() {
    const title = $('.page-title, #title');
    if (title) title.textContent = 'IndiCare AI';
    const overline = $('.page-overline');
    if (overline) overline.textContent = 'AI Suite';
  }

  function hideNonAiPanels() {
    $$('.panel').forEach((panel) => {
      const isAssistant = panel.classList.contains('panel-assistant') || panel.id === 'assistantPanel';
      const view = panel.getAttribute('data-suite-panel') || panel.getAttribute('data-view') || '';
      const isAiApp = AI_APPS.some((app) => app.id === view || (app.id === 'intelligence' && isAssistant));
      if (!isAssistant && !isAiApp) {
        panel.setAttribute('data-ai-suite-hidden', 'true');
        panel.style.display = 'none';
      }
    });

    $$('[data-suite-view]').forEach((node) => {
      const view = normaliseApp(node.getAttribute('data-suite-view'));
      const raw = String(node.getAttribute('data-suite-view') || '').toLowerCase();
      const allowed = AI_APPS.some((app) => app.id === raw || app.aliases.includes(raw)) || raw === 'intelligence';
      if (!allowed) {
        node.setAttribute('data-ai-suite-hidden', 'true');
        node.style.display = 'none';
      } else {
        node.setAttribute('data-ai-suite-app-link', view);
      }
    });
  }

  function setActiveApp(appId, options) {
    const app = normaliseApp(appId);
    state.activeApp = app;
    document.body?.setAttribute('data-ai-suite-active-app', app);

    $$('.ai-suite-app-pill').forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-ai-suite-app') === app);
    });

    $$('[data-ai-suite-app-link]').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('data-ai-suite-app-link') === app);
    });

    const input = $('#input, textarea');
    const placeholders = {
      intelligence: 'Message IndiCare AI',
      notes: 'Ask IndiCare to capture, clean up or summarise notes',
      docs: 'Ask IndiCare to draft, rewrite or review a document',
      connect: 'Ask IndiCare about meetings, actions or collaboration',
      mail: 'Ask IndiCare to draft, summarise or respond to mail'
    };
    if (input) input.setAttribute('placeholder', placeholders[app] || placeholders.intelligence);

    const title = $('.page-title, #title');
    if (title) {
      const label = AI_APPS.find((item) => item.id === app)?.label || 'Chat';
      title.textContent = app === 'intelligence' ? 'IndiCare AI' : `IndiCare ${label}`;
    }

    if (!options?.silent) {
      window.IndiCareRuntimeCore?.markChatStarted?.();
      emit('app-change', snapshot());
    }
  }

  function toggleSidebar(force) {
    state.sidebarOpen = typeof force === 'boolean' ? force : !state.sidebarOpen;
    document.body?.classList.toggle('ai-sidebar-open', state.sidebarOpen);
    emit('sidebar', snapshot());
  }

  function wireClicks() {
    document.addEventListener('click', (event) => {
      const appButton = event.target.closest('[data-ai-suite-app]');
      if (appButton) {
        setActiveApp(appButton.getAttribute('data-ai-suite-app'));
        return;
      }

      const legacyApp = event.target.closest('[data-suite-view]');
      if (legacyApp) {
        const raw = legacyApp.getAttribute('data-suite-view');
        const isAllowed = AI_APPS.some((app) => app.id === raw || app.aliases.includes(String(raw || '').toLowerCase())) || raw === 'intelligence';
        if (isAllowed) setActiveApp(raw);
        else event.preventDefault();
        return;
      }

      const sidebarToggle = event.target.closest('[data-ai-sidebar-toggle], #mobileMenu, #openSidebar, .mobile-menu-button');
      if (sidebarToggle) {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (state.sidebarOpen && !event.target.closest('.sidebar, .ic-sidebar, aside[class*="sidebar"], [data-ai-sidebar-toggle]')) {
        toggleSidebar(false);
      }
    }, true);
  }

  function wireComposer() {
    const input = $('#input, textarea');
    if (!input || input.__aiSuiteComposerWired) return;
    input.__aiSuiteComposerWired = true;

    const resize = () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, window.innerHeight * 0.34)}px`;
    };

    input.addEventListener('input', resize);
    input.addEventListener('focus', () => document.body?.classList.add('ai-composer-focused'));
    input.addEventListener('blur', () => document.body?.classList.remove('ai-composer-focused'));
    resize();
  }

  function wireVoiceMode() {
    document.addEventListener('click', (event) => {
      const voice = event.target.closest('.ic-cgi-orb-wrap, #openVoiceCompanion, #voiceOrb, .voice-trigger, .mic-btn');
      if (!voice) return;
      document.body?.classList.add('ic-voice-mode-open');
      window.IndiCareRuntimeCore?.setListening?.();
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.body?.classList.remove('ic-voice-mode-open');
        window.IndiCareRuntimeCore?.interrupt?.('escape_key');
      }
    });

    window.addEventListener('indicare:runtime:interrupt', () => {
      document.body?.classList.remove('ic-voice-mode-open');
    });
  }

  function observeDom() {
    const observer = new MutationObserver(() => {
      markProductSurface();
      setTopbar();
      hideNonAiPanels();
      ensureSwitcher();
      wireComposer();
      setActiveApp(state.activeApp, { silent: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    if (state.booted) return;
    state.booted = true;
    markProductSurface();
    setTopbar();
    hideNonAiPanels();
    ensureSwitcher();
    wireClicks();
    wireComposer();
    wireVoiceMode();
    observeDom();
    setActiveApp('intelligence', { silent: true });
    emit('ready');
  }

  window.IndiCareAISuite = {
    version: state.version,
    boot,
    snapshot,
    setActiveApp,
    toggleSidebar,
    apps: () => AI_APPS.map((app) => ({ ...app }))
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.setTimeout(boot, 0);
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
