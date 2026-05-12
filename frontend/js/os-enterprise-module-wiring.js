(() => {
  const FLAG = '__indicareEnterpriseModuleWiring';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const MODULES = [
    { id: 'staffing', label: 'Staffing & Workforce', description: 'Rotas, staffing continuity, supervision, training and workforce risk.', routes: ['/api/staff', '/api/rota', '/api/supervision', '/api/staff-today', '/api/staff-profile'], views: ['adult-profile'], prompts: ['Show staffing risks', 'Prepare staffing handover', 'Training compliance overview'] },
    { id: 'documents-dms', label: 'Home Documents', description: 'Policies, plans, assessments, evidence and inspection documentation.', routes: ['/api/documents', '/api/document-library', '/api/os-command/inspection/workspaces', '/api/evidence'], views: ['documents', 'standards-ofsted'], prompts: ['Inspection evidence gaps', 'Reg 44 preparation', 'Document review summary'] },
    { id: 'medication', label: 'Medication & Health', description: 'MAR, medication administration, appointments, sleep and wellbeing.', routes: ['/api/mar', '/api/health', '/api/young-people/health'], views: ['health'], prompts: ['Medication risks', 'Health appointments', 'Sleep concerns overview'] },
    { id: 'compliance', label: 'Compliance & Oversight', description: 'Regulation, audit, quality assurance and operational compliance.', routes: ['/api/compliance', '/api/reg44', '/api/qa', '/api/reports', '/api/ofsted-pack'], views: ['standards-ofsted', 'review'], prompts: ['Compliance concerns', 'Audit summary', 'Outstanding actions'] },
    { id: 'finance', label: 'Finance & Allowances', description: 'Pocket money, incentives, sanctions, purchases, claims and placement cost continuity.', routes: ['/api/finance', '/api/pocket-money', '/api/sanctions'], views: [], prompts: ['Allowance audit', 'Spending concerns', 'Sanctions and incentives overview'] },
    { id: 'connect', label: 'Connect & Communications', description: 'Internal messages, multi-agency communication, meetings, calls and linked records.', routes: ['/api/connect', '/api/mail', '/api/calendar', '/api/tasks'], views: [], prompts: ['Communication summary', 'Meeting follow-up', 'Multi-agency actions'] }
  ];

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

  async function probe(route) {
    try {
      const response = await fetch(route, { credentials: 'include' });
      return { route, ok: response.ok, status: response.status };
    } catch (error) {
      return { route, ok: false, status: 'offline' };
    }
  }

  function ensureEnterpriseRail() {
    const rail = document.querySelector('.ic365-rightpanel');
    if (!rail || document.getElementById('ic365-enterprise-wiring')) return;
    const section = document.createElement('section');
    section.id = 'ic365-enterprise-wiring';
    section.className = 'ic365-side-card';
    section.innerHTML = `<h2>Enterprise OS</h2><p>Previously-built enterprise modules now unified into the operational shell.</p><div class="ic365-action-list">${MODULES.map((module) => `<button type="button" data-enterprise-module="${esc(module.id)}"><strong>${esc(module.label)}</strong><span>${esc(module.description)}</span></button>`).join('')}</div>`;
    rail.appendChild(section);
  }

  function ensureNavigation() {
    const nav = document.getElementById('workspace-nav');
    if (!nav || document.getElementById('ic365-enterprise-nav-divider')) return;
    const divider = document.createElement('div');
    divider.id = 'ic365-enterprise-nav-divider';
    divider.className = 'ic365-nav-divider';
    const title = document.createElement('div');
    title.className = 'ic365-nav-section-title';
    title.textContent = 'Enterprise';
    nav.appendChild(divider);
    nav.appendChild(title);
    MODULES.forEach((module) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ic365-nav-item';
      button.dataset.enterpriseModule = module.id;
      button.innerHTML = `<span>${esc(module.label)}</span>`;
      nav.appendChild(button);
    });
  }

  function routeCards(results) {
    return results.map((result) => `<div class="ic365-continuity-item"><strong>${esc(result.route)}</strong><span>${result.ok ? 'Connected' : `Not responding (${result.status})`}</span></div>`).join('');
  }

  async function renderWorkspace(module) {
    const main = document.getElementById('workspace-main');
    if (!main) return;
    document.querySelectorAll('[data-view],[data-shell],[data-enterprise-module]').forEach((item) => item.classList.toggle('active', item.dataset.enterpriseModule === module.id));
    main.innerHTML = `<div class="ic365-empty-state">Checking existing ${esc(module.label)} routes and mounting the workspace...</div>`;
    const results = await Promise.all(module.routes.map(probe));
    const connected = results.filter((result) => result.ok).length;
    main.innerHTML = `
      <section class="ic365-shift-ribbon">
        <article><strong>${connected}/${results.length}</strong><span>Routes responding</span></article>
        <article><strong>${module.views.length || 'Shell'}</strong><span>Legacy views linked</span></article>
        <article><strong>${module.prompts.length}</strong><span>Assistant workflows</span></article>
        <article><strong>Unified</strong><span>Enterprise workspace</span></article>
      </section>
      <section class="two-column">
        <article class="panel">
          <div class="section-header-row"><div><p class="eyebrow">Enterprise workspace</p><h3>${esc(module.label)}</h3><p>${esc(module.description)}</p></div><div class="hero-actions"><button class="ic365-button primary" data-open-os-assistant>Assistant</button>${module.views.map((view) => `<button class="ic365-button" data-launch-existing-view="${esc(view)}">Open ${esc(view)}</button>`).join('')}</div></div>
          <div class="ic365-continuity-grid">
            <article class="ic365-continuity-panel"><h3>Connected routes</h3><div class="ic365-continuity-list">${routeCards(results)}</div></article>
            <article class="ic365-continuity-panel"><h3>Operational wiring</h3><div class="ic365-focus-stack"><div class="ic365-focus-card"><strong>Unified context</strong><p>This module now inherits the selected home, young person and operational shell context.</p></div><div class="ic365-focus-card"><strong>Chronology continuity</strong><p>Records and actions stay connected to the universal chronology and record workspace.</p></div><div class="ic365-focus-card"><strong>Assistant support</strong><p>Module-specific prompts run through the OS assistant bridge.</p></div></div></article>
          </div>
        </article>
        <article class="panel"><p class="eyebrow">Assistant workflows</p><h3>Operational prompts</h3><div class="ic365-action-list">${module.prompts.map((prompt) => `<button type="button" data-os-assistant-prompt="${esc(prompt)}"><strong>${esc(prompt)}</strong><span>Run operational intelligence</span></button>`).join('')}</div></article>
      </section>`;
    document.dispatchEvent(new CustomEvent('indicare:enterprise-workspace-opened', { detail: { module: module.id, routes: results } }));
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-enterprise-module]');
      if (trigger) {
        const module = MODULES.find((item) => item.id === trigger.dataset.enterpriseModule);
        if (module) renderWorkspace(module);
        return;
      }
      const existing = event.target.closest('[data-launch-existing-view]');
      if (existing) {
        const view = existing.dataset.launchExistingView;
        document.querySelector(`[data-view="${view}"],[data-shell="${view}"]`)?.click();
      }
    });
  }

  function boot() {
    ensureEnterpriseRail();
    ensureNavigation();
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();