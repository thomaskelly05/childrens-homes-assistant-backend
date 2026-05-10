(() => {
  const FLAG = '__indicareOSContextualNavigation';
  const STYLE_ID = 'os-contextual-navigation-style';
  const SUBNAV_ID = 'os-contextual-subnav';

  const MENUS = {
    overview: {
      title: 'Command overview',
      items: [
        ['overview', 'Home dashboard', 'Open overview', 'view:overview'],
        ['priorities', 'Immediate priorities', 'Focus command queue', 'focus:command-list'],
        ['records', 'Care recording feed', 'Focus recording feed', 'focus:care-list'],
        ['patterns', 'Safeguarding patterns', 'Focus safeguarding patterns', 'focus:pattern-list'],
      ],
    },
    'young-people': {
      title: 'Young people',
      items: [
        ['yp-overview', 'Overview', 'Profiles and current picture', 'view:young-people'],
        ['journey', 'Child Journey', 'Chronology and lived experience', 'childtab:journey'],
        ['daily', 'Daily Living', 'Daily notes and home life', 'record:daily_note'],
        ['education', 'Education', 'PEP, EHCP and school experience', 'childtab:education'],
        ['health', 'Health', 'Health, medication and wellbeing', 'childtab:health'],
        ['family', 'Family Time', 'Relationships and contact impact', 'childtab:family'],
        ['keywork', 'Key Work', 'Direct work and reflection', 'record:keywork'],
        ['voice', 'Child Voice', 'Wishes, feelings and participation', 'record:child_voice'],
        ['chronology', 'Chronology', 'Timeline and patterns', 'childtab:journey'],
        ['safeguarding-child', 'Safeguarding', 'Child safeguarding context', 'childtab:safeguarding'],
        ['plans', 'Plans & Reviews', 'Care, risk and review plans', 'childtab:plans'],
        ['documents', 'Documents', 'Child documents and expiry', 'childtab:documents'],
      ],
    },
    safeguarding: {
      title: 'Safeguarding',
      items: [
        ['active', 'Active Concerns', 'Open safeguarding board', 'view:safeguarding'],
        ['missing', 'Missing Episodes', 'Missing and return-home work', 'record:missing_episode'],
        ['exploitation', 'Exploitation Risks', 'Contextual safeguarding', 'focus:safeguarding-board'],
        ['incidents', 'Incidents', 'Incident recording', 'record:incident'],
        ['physical', 'Physical Intervention', 'Debrief and repair', 'record:physical_intervention'],
        ['patterns', 'Chronology Patterns', 'Risk-aware chronology', 'focus:chronology-board'],
        ['followups', 'Follow-Ups', 'Callbacks and actions', 'assistant:safeguarding follow-ups'],
      ],
    },
    placements: {
      title: 'Placements',
      items: [
        ['stability', 'Placement Stability', 'Predictive stability board', 'view:placements'],
        ['risk', 'Disruption Risk', 'Focus placement risk', 'focus:placements-board'],
        ['protective', 'Protective Factors', 'Ask assistant for strengths', 'assistant:placement protective factors'],
        ['actions', 'Placement Actions', 'Open action summary', 'assistant:placement actions'],
      ],
    },
    workforce: {
      title: 'Workforce',
      items: [
        ['wellbeing', 'Workforce Wellbeing', 'Team wellbeing and resilience', 'view:workforce'],
        ['supervision', 'Supervision', 'Reflective practice support', 'assistant:supervision summary'],
        ['handover', 'Handover Quality', 'Continuity and shift flow', 'assistant:handover quality'],
        ['learning', 'Practice Learning', 'Themes and support needs', 'assistant:practice learning'],
      ],
    },
    inspection: {
      title: 'Ofsted / inspection',
      items: [
        ['readiness', 'Ofsted Readiness', 'Inspection workspace', 'view:inspection'],
        ['evidence', 'Evidence Packs', 'SCCIF evidence', 'focus:inspection-board'],
        ['reg44', 'Reg 44', 'Open Reg 44 reader', 'hash:#reg44'],
        ['reg45', 'Reg 45', 'Generate learning themes', 'assistant:Reg 45 learning themes'],
      ],
    },
    provider: {
      title: 'Provider',
      items: [
        ['provider-dashboard', 'Provider Intelligence', 'Executive overview', 'view:provider'],
        ['homes', 'Home Comparison', 'Cross-home trends', 'focus:provider-board'],
        ['quality', 'Quality Assurance', 'QA and actions', 'assistant:provider QA summary'],
        ['briefing', 'RI / CEO Briefing', 'Generate briefing', 'assistant:RI CEO oversight briefing'],
      ],
    },
    network: {
      title: 'Network',
      items: [
        ['mapping', 'Network Mapping', 'Contextual safeguarding network', 'view:network'],
        ['shared', 'Shared Risks', 'Detect shared risks', 'action:detect-shared-risks'],
        ['locations', 'Locations', 'Community hotspots', 'assistant:community safeguarding hotspots'],
        ['peers', 'Peer Links', 'Peer relationships and risks', 'assistant:peer network risks'],
      ],
    },
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .os-context-subnav{margin-top:14px;padding-top:12px;border-top:1px solid rgba(148,163,184,.28)}.os-context-title{font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--ic-muted,#64748b);margin:0 0 8px}.os-context-item{width:100%;border:0;background:transparent;text-align:left;border-radius:14px;padding:9px 10px;margin:4px 0;color:inherit;display:block}.os-context-item:hover,.os-context-item.active{background:rgba(219,234,254,.8);color:#1d4ed8}.os-context-item strong{display:block;font-size:13px}.os-context-item small{display:block;font-size:11px;opacity:.74;margin-top:1px}.os-context-back{width:100%;border:1px solid rgba(148,163,184,.35);background:#fff;border-radius:14px;padding:8px 10px;font-weight:900;margin-bottom:8px;color:#334155}@media(max-width:1180px){.os-context-subnav{display:block;overflow:auto}.os-context-item{min-width:160px}}
    `;
    document.head.appendChild(style);
  }

  function rail() {
    return document.querySelector('.ic-rail');
  }

  function activeTopView() {
    return document.querySelector('.ic-nav-button.active')?.dataset?.view || window.state?.activeView || 'overview';
  }

  function ensureSubnav() {
    const host = rail();
    if (!host) return null;
    let node = document.getElementById(SUBNAV_ID);
    if (!node) {
      node = document.createElement('div');
      node.id = SUBNAV_ID;
      node.className = 'os-context-subnav';
      host.appendChild(node);
    }
    return node;
  }

  function render(view = activeTopView()) {
    const node = ensureSubnav();
    if (!node) return;
    const menu = MENUS[view] || MENUS.overview;
    node.innerHTML = `<div class="os-context-title">${escapeHtml(menu.title)}</div>${menu.items.map(([key, label, hint, action]) => `<button type="button" class="os-context-item" data-context-key="${escapeHtml(key)}" data-context-action="${escapeHtml(action)}"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(hint)}</small></button>`).join('')}`;
    bind(node);
  }

  function bind(node) {
    node.querySelectorAll('[data-context-action]').forEach((button) => {
      button.addEventListener('click', () => {
        node.querySelectorAll('.os-context-item').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        handleAction(button.dataset.contextAction);
      });
    });
  }

  function handleAction(action = '') {
    const [type, value = ''] = action.split(':');
    if (type === 'view') return switchView(value);
    if (type === 'focus') return focusId(value);
    if (type === 'record') return openRecord(value);
    if (type === 'childtab') return openChildTab(value);
    if (type === 'assistant') return ask(value);
    if (type === 'hash') { location.hash = value; window.IndiCareReg44Reader?.mount?.(); return; }
    if (type === 'action') return document.querySelector(`[data-action="${css(value)}"]`)?.click();
  }

  function switchView(view) {
    const button = document.querySelector(`.ic-nav-button[data-view="${css(view)}"]`);
    if (button) button.click();
    else if (typeof window.switchView === 'function') window.switchView(view);
    render(view);
  }

  function focusId(id) {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    node.animate?.([{ outline: '3px solid rgba(21,94,239,.35)' }, { outline: '0 solid transparent' }], { duration: 1200 });
  }

  function openRecord(type) {
    window.IndiCareConnectedCare?.newRecord?.(type) || window.IndiCareYoungPersonWorkspace?.newRecord?.(type);
  }

  function openChildTab(tab) {
    switchView('young-people');
    const childTab = document.querySelector(`[data-child-tab="${css(tab)}"], [data-os-ui-tab="${css(tab)}"]`);
    if (childTab) childTab.click();
    else window.IndiCareOSCommandUIBridge?.upgradeChildWorkspace?.(true);
  }

  function ask(prompt) {
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(`Context: ${activeTopView()}. ${prompt}`);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function css(value) {
    return window.IndiCareSafe?.css?.(value) || (window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'));
  }

  function bindTopNav() {
    document.querySelectorAll('.ic-nav-button[data-view]').forEach((button) => {
      if (button.dataset.contextNavBound === 'true') return;
      button.dataset.contextNavBound = 'true';
      button.addEventListener('click', () => setTimeout(() => render(button.dataset.view), 20));
    });
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    bindTopNav();
    render();
    document.addEventListener('indicare:care-data-changed', () => window.IndiCareSafe?.debounce?.('context-nav-refresh', () => { bindTopNav(); render(activeTopView()); }, 250));
    window.IndiCareContextualNavigation = { render, menus: MENUS };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
