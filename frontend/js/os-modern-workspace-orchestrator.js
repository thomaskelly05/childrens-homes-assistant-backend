(() => {
  const FLAG = '__indicareModernWorkspaceOrchestrator';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const MODES = {
    care: {
      label: 'Care',
      views: ['today-child', 'child-life', 'child-journey', 'child-timeline', 'daily-recording', 'direct-work', 'incidents', 'health', 'education', 'contact'],
      title: 'Care workspace',
      subtitle: 'Daily recording, chronology, direct work and the young person’s lived experience.'
    },
    manage: {
      label: 'Manage',
      views: ['adult-profile', 'home-profile', 'documents', 'standards-ofsted', 'review', 'staffing', 'documents-dms', 'compliance'],
      title: 'Management workspace',
      subtitle: 'Staffing, documents, oversight, standards, compliance and quality assurance.'
    },
    operate: {
      label: 'Operate',
      views: ['assistant', 'alerts', 'command', 'runtime', 'audit', 'connect', 'finance', 'medication'],
      title: 'Operations workspace',
      subtitle: 'Assistant, alerts, command centre, diagnostics, communications and enterprise operations.'
    }
  };

  const state = {
    mode: 'care',
    railExpanded: false
  };

  function ensureModeSwitch() {
    const topbar = document.querySelector('.ic365-topbar');
    if (!topbar || document.getElementById('ic365-mode-switch')) return;

    const switcher = document.createElement('div');
    switcher.id = 'ic365-mode-switch';
    switcher.className = 'ic365-mode-switch';
    switcher.innerHTML = Object.entries(MODES).map(([key, mode]) => `
      <button type="button" class="${key === state.mode ? 'active' : ''}" data-os-mode="${key}">${mode.label}</button>
    `).join('');

    const context = document.querySelector('.ic365-context-strip');
    if (context) context.after(switcher);
    else topbar.appendChild(switcher);
  }

  function ensureFocusBar() {
    const main = document.querySelector('.ic365-main');
    if (!main || document.getElementById('ic365-focus-bar')) return;

    const bar = document.createElement('section');
    bar.id = 'ic365-focus-bar';
    bar.className = 'ic365-focus-bar';
    bar.innerHTML = `
      <button type="button" data-focus-action="record"><strong>+ Record</strong><span>Start recording</span></button>
      <button type="button" data-focus-action="handover"><strong>Handover</strong><span>Prepare shift summary</span></button>
      <button type="button" data-focus-action="review"><strong>Review</strong><span>Manager oversight</span></button>
      <button type="button" data-focus-action="assistant"><strong>Assistant</strong><span>Ask co-pilot</span></button>
    `;

    const header = main.querySelector('.ic365-page-header');
    if (header) header.after(bar);
    else main.prepend(bar);
  }

  function ensureRailToggle() {
    const topActions = document.querySelector('.ic365-top-actions');
    if (!topActions || document.querySelector('[data-toggle-context-rail]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ic365-button subtle';
    button.dataset.toggleContextRail = 'true';
    button.textContent = 'Context';
    topActions.appendChild(button);
  }

  function applyMode(modeKey) {
    const mode = MODES[modeKey] || MODES.care;
    state.mode = modeKey in MODES ? modeKey : 'care';
    document.body.dataset.osMode = state.mode;

    document.querySelectorAll('[data-os-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.osMode === state.mode);
    });

    document.querySelectorAll('[data-view],[data-shell],[data-enterprise-module]').forEach((item) => {
      const key = item.dataset.view || item.dataset.shell || item.dataset.enterpriseModule;
      const visible = mode.views.includes(key) || state.mode === 'care' && !item.dataset.enterpriseModule;
      item.classList.toggle('ic365-nav-hidden', !visible);
    });

    const header = document.querySelector('.ic365-page-header');
    if (header) header.dataset.mode = state.mode;

    document.dispatchEvent(new CustomEvent('indicare:workspace-mode-changed', {
      detail: {
        mode: state.mode,
        title: mode.title,
        subtitle: mode.subtitle
      }
    }));
  }

  function toggleRail() {
    state.railExpanded = !state.railExpanded;
    document.body.classList.toggle('ic365-context-rail-open', state.railExpanded);
  }

  function handleFocusAction(action) {
    if (action === 'record') {
      const daily = document.querySelector('[data-os-record="daily_record"], [data-shell="daily-recording"]');
      daily?.click();
      return;
    }

    if (action === 'handover') {
      document.querySelector('[data-os-record="handover"], [data-os-assistant-prompt*="handover" i]')?.click();
      if (window.IndiCareOpenAssistant) window.IndiCareOpenAssistant('Prepare a handover summary for the current young person and home context.');
      return;
    }

    if (action === 'review') {
      document.querySelector('[data-view="review"]')?.click();
      return;
    }

    if (action === 'assistant' && window.IndiCareOpenAssistant) {
      window.IndiCareOpenAssistant();
    }
  }

  function injectStyles() {
    if (document.getElementById('ic365-modern-orchestrator-styles')) return;

    const style = document.createElement('style');
    style.id = 'ic365-modern-orchestrator-styles';
    style.textContent = `
      .ic365-mode-switch{display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)}
      .ic365-mode-switch button{border:0;border-radius:999px;background:transparent;color:#cbd5e1;font-size:12px;font-weight:900;padding:8px 13px;cursor:pointer}
      .ic365-mode-switch button.active{background:#fff;color:#0f172a;box-shadow:0 8px 20px rgba(15,23,42,.18)}
      .ic365-focus-bar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:-6px 0 18px}
      .ic365-focus-bar button{border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.92);border-radius:20px;padding:16px;text-align:left;box-shadow:0 8px 24px rgba(15,23,42,.06);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;cursor:pointer}
      .ic365-focus-bar button:hover{transform:translateY(-2px);box-shadow:0 18px 42px rgba(15,23,42,.10);border-color:rgba(37,99,235,.18)}
      .ic365-focus-bar strong{display:block;font-size:15px;letter-spacing:-.02em;color:#0f172a;margin-bottom:4px}.ic365-focus-bar span{font-size:12px;color:#64748b;font-weight:750}.ic365-nav-hidden{display:none!important}
      body[data-os-mode="manage"] .ic365-page-header{background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(239,246,255,.92))!important}
      body[data-os-mode="operate"] .ic365-page-header{background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(240,253,250,.92))!important}
      body.ic365-context-rail-open .ic365-rightpanel{display:block!important;position:fixed;right:0;top:64px;bottom:0;width:min(420px,92vw);z-index:99990;box-shadow:-22px 0 60px rgba(15,23,42,.18)}
      @media(max-width:980px){.ic365-focus-bar{grid-template-columns:1fr 1fr}.ic365-mode-switch{display:none}}
      @media(max-width:560px){.ic365-focus-bar{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const mode = event.target.closest('[data-os-mode]');
      if (mode) {
        applyMode(mode.dataset.osMode || 'care');
        return;
      }

      const rail = event.target.closest('[data-toggle-context-rail]');
      if (rail) {
        toggleRail();
        return;
      }

      const action = event.target.closest('[data-focus-action]');
      if (action) {
        handleFocusAction(action.dataset.focusAction);
      }
    });
  }

  function boot() {
    injectStyles();
    ensureModeSwitch();
    ensureFocusBar();
    ensureRailToggle();
    bind();
    applyMode('care');
  }

  window.IndiCareWorkspaceMode = {
    applyMode,
    state
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();