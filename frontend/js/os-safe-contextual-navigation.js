(() => {
  const FLAG = '__indicareSafeContextualNavigation';
  const STYLE_ID = 'os-safe-contextual-navigation-style';
  const HOST_ID = 'os-safe-contextual-nav';

  if (window[FLAG]) return;
  window[FLAG] = true;

  const MENUS = {
    overview: [
      ['Home dashboard', 'Current operational picture', 'focus:provider-matrix'],
      ['Command queue', 'Immediate actions', 'focus:command-list'],
      ['Care recording feed', 'Recent records', 'focus:care-list'],
      ['Safeguarding patterns', 'Emerging concerns', 'focus:pattern-list'],
      ['Continuity memory', 'What adults should know', 'intel:continuity'],
    ],
    'young-people': [
      ['Profiles', 'Select a young person', 'focus:young-people-list'],
      ['Daily living', 'Create a whole-child daily record', 'record:daily_note'],
      ['Child journey', 'Chronology and lived experience', 'childtab:journey'],
      ['Education', 'School and learning impact', 'childtab:education'],
      ['Health', 'Health and wellbeing', 'childtab:health'],
      ['Family time', 'Relational impact', 'childtab:family'],
      ['Key work', 'Therapeutic direct work', 'record:keywork'],
      ['Child voice', 'Wishes and feelings', 'record:child_voice'],
      ['Safeguarding', 'Child-specific safeguarding', 'childtab:safeguarding'],
      ['Plans & reviews', 'Care, risk and support plans', 'childtab:plans'],
    ],
    safeguarding: [
      ['Active concerns', 'Safeguarding board', 'focus:safeguarding-board'],
      ['Incident record', 'Create incident', 'record:incident'],
      ['Missing episode', 'Create missing episode', 'record:missing_episode'],
      ['Physical intervention', 'Create intervention record', 'record:physical_intervention'],
      ['Risk patterns', 'Chronology intelligence', 'focus:chronology-board'],
      ['Safeguarding workspace', 'Open connected view', 'intel:safeguarding'],
    ],
    placements: [
      ['Stability board', 'Placement risk and resilience', 'focus:placements-board'],
      ['Placement workspace', 'Connected placement intelligence', 'intel:placement'],
      ['Record update', 'Create linked update', 'record:daily_note'],
      ['Ask IndiCare', 'Placement stability summary', 'ask:placement stability'],
    ],
    workforce: [
      ['Wellbeing board', 'Team resilience', 'focus:workforce-board'],
      ['Handover quality', 'Continuity and shift memory', 'ask:handover quality'],
      ['Practice learning', 'Reflective themes', 'ask:practice learning'],
    ],
    inspection: [
      ['Inspection board', 'Ofsted/SCCIF readiness', 'focus:inspection-board'],
      ['Evidence workspace', 'Connected inspection evidence', 'intel:inspection'],
      ['Reg 44/45 themes', 'Governance summary', 'ask:Reg 44 and Reg 45 evidence themes'],
    ],
    provider: [
      ['Provider board', 'Executive intelligence', 'focus:provider-board'],
      ['Inspection evidence', 'Provider-wide evidence', 'intel:inspection'],
      ['Safeguarding pressure', 'Provider risk summary', 'intel:safeguarding'],
      ['Leadership briefing', 'Ask IndiCare', 'ask:provider leadership briefing'],
    ],
    network: [
      ['Network board', 'Contextual safeguarding links', 'focus:network-board'],
      ['Safeguarding workspace', 'Open network risk view', 'intel:safeguarding'],
      ['Detect shared risks', 'Run existing detector', 'action:detect-shared-risks'],
      ['Ask IndiCare', 'Community safeguarding summary', 'ask:community safeguarding hotspots'],
    ],
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .os-safe-context-nav{margin-top:14px;padding-top:12px;border-top:1px solid rgba(148,163,184,.32)}.os-safe-context-title{font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 8px}.os-safe-context-item{width:100%;border:0;background:transparent;text-align:left;border-radius:14px;padding:9px 10px;margin:4px 0;color:inherit;display:block}.os-safe-context-item:hover,.os-safe-context-item.active{background:rgba(219,234,254,.9);color:#1d4ed8}.os-safe-context-item strong{display:block;font-size:13px}.os-safe-context-item small{display:block;font-size:11px;opacity:.76;margin-top:1px}.os-safe-context-divider{height:1px;background:rgba(148,163,184,.25);margin:8px 0}@media(max-width:1180px){.os-safe-context-nav{display:block}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function activeView() {
    return document.querySelector('.ic-nav-button.active')?.dataset?.view || window.state?.activeView || 'overview';
  }

  function ensureHost() {
    const rail = document.querySelector('.ic-rail');
    if (!rail) return null;
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('section');
      host.id = HOST_ID;
      host.className = 'os-safe-context-nav';
      rail.appendChild(host);
    }
    return host;
  }

  function render(view = activeView()) {
    const host = ensureHost();
    if (!host) return;
    const items = MENUS[view] || MENUS.overview;
    host.innerHTML = `<div class="os-safe-context-title">${esc(view.replaceAll('-', ' '))}</div>${items.map(([label, hint, action]) => `<button type="button" class="os-safe-context-item" data-safe-context-action="${esc(action)}"><strong>${esc(label)}</strong><small>${esc(hint)}</small></button>`).join('')}`;
    bind(host);
  }

  function bind(host) {
    host.querySelectorAll('[data-safe-context-action]').forEach(button => {
      button.addEventListener('click', () => {
        host.querySelectorAll('.os-safe-context-item').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        handleAction(button.dataset.safeContextAction || '');
      });
    });
  }

  function handleAction(action) {
    const [type, ...rest] = action.split(':');
    const value = rest.join(':');
    if (type === 'focus') return focusElement(value);
    if (type === 'record') return window.IndiCareTherapeuticRecordCreator?.open?.(value || 'daily_note');
    if (type === 'intel') return window.IndiCareOperationalIntelligence?.openIntelligenceWorkspace?.(value || 'continuity');
    if (type === 'ask') return ask(value);
    if (type === 'action') return document.querySelector(`[data-action="${css(value)}"]`)?.click();
    if (type === 'childtab') return openChildTab(value);
  }

  function focusElement(id) {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    node.animate?.([{ outline: '3px solid rgba(21,94,239,.35)' }, { outline: '0 solid transparent' }], { duration: 1200 });
  }

  function openChildTab(tab) {
    const nav = document.querySelector('.ic-nav-button[data-view="young-people"]');
    if (nav && !nav.classList.contains('active')) nav.click();
    setTimeout(() => {
      const btn = document.querySelector(`[data-child-tab="${css(tab)}"], [data-os-ui-tab="${css(tab)}"]`);
      if (btn) btn.click();
      else focusElement('child-workspace');
    }, 80);
  }

  function ask(topic) {
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(`Context: ${activeView()} / ${topic}. Summarise relevant records, chronology, safeguarding, continuity, inspection evidence and next actions for the children's home.`);
  }

  function css(value) {
    return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function bindTopNav() {
    document.querySelectorAll('.ic-nav-button[data-view]').forEach(btn => {
      if (btn.dataset.safeContextBound === 'true') return;
      btn.dataset.safeContextBound = 'true';
      btn.addEventListener('click', () => setTimeout(() => render(btn.dataset.view), 50));
    });
  }

  function boot() {
    injectStyles();
    bindTopNav();
    render();
    document.addEventListener('indicare:care-data-changed', () => setTimeout(() => render(activeView()), 100));
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('safe-context-nav-refresh', () => { bindTopNav(); render(activeView()); }, 350) || setTimeout(() => render(activeView()), 350));
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareSafeContextNavigation = { render, menus: MENUS };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
