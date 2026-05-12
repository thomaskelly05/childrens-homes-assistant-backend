(() => {
  const FLAG = '__indicareEnterpriseModuleWiring';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const MODULES = [
    {
      id: 'staffing',
      label: 'Staffing & Workforce',
      description: 'Rotas, staffing continuity, supervision, training and workforce risk.',
      routes: ['/api/staff', '/api/rota', '/api/supervision'],
      prompts: ['Show staffing risks', 'Prepare staffing handover', 'Training compliance overview']
    },
    {
      id: 'documents-dms',
      label: 'Home Documents',
      description: 'Policies, plans, assessments, evidence and inspection documentation.',
      routes: ['/api/documents', '/api/os-command/inspection/workspaces'],
      prompts: ['Inspection evidence gaps', 'Reg 44 preparation', 'Document review summary']
    },
    {
      id: 'medication',
      label: 'Medication & Health',
      description: 'MAR, medication administration, appointments, sleep and wellbeing.',
      routes: ['/api/mar', '/api/health'],
      prompts: ['Medication risks', 'Health appointments', 'Sleep concerns overview']
    },
    {
      id: 'compliance',
      label: 'Compliance & Oversight',
      description: 'Regulation, audit, quality assurance and operational compliance.',
      routes: ['/api/compliance', '/api/reg44'],
      prompts: ['Compliance concerns', 'Audit summary', 'Outstanding actions']
    }
  ];

  function ensureEnterpriseRail() {
    const rail = document.querySelector('.ic365-rightpanel');
    if (!rail || document.getElementById('ic365-enterprise-wiring')) return;

    const section = document.createElement('section');
    section.id = 'ic365-enterprise-wiring';
    section.className = 'ic365-side-card';

    section.innerHTML = `
      <h2>Enterprise OS</h2>
      <p>Previously-built enterprise modules now unified into the operational shell.</p>
      <div class="ic365-action-list">
        ${MODULES.map(module => `
          <button type="button" data-enterprise-module="${module.id}">
            <strong>${module.label}</strong>
            <span>${module.description}</span>
          </button>
        `).join('')}
      </div>
    `;

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
      button.innerHTML = `<span>${module.label}</span>`;
      nav.appendChild(button);
    });
  }

  function renderWorkspace(module) {
    const main = document.getElementById('workspace-main');
    if (!main) return;

    main.innerHTML = `
      <section class="ic365-shift-ribbon">
        <article><strong>Connected</strong><span>Legacy module</span></article>
        <article><strong>Unified</strong><span>OS workspace</span></article>
        <article><strong>Live</strong><span>Operational shell</span></article>
        <article><strong>Enterprise</strong><span>Integrated flow</span></article>
      </section>

      <section class="two-column">
        <article class="panel">
          <div class="section-header-row">
            <div>
              <p class="eyebrow">Enterprise workspace</p>
              <h3>${module.label}</h3>
            </div>
            <div class="hero-actions">
              <button class="ic365-button primary" data-open-os-assistant>Assistant</button>
            </div>
          </div>

          <div class="ic365-focus-stack">
            <div class="ic365-focus-card">
              <strong>Unified operational routing</strong>
              <p>Existing routes, records and chronology systems now mounted into the unified shell.</p>
            </div>

            <div class="ic365-focus-card">
              <strong>Connected routes</strong>
              <p>${module.routes.join(' • ')}</p>
            </div>

            <div class="ic365-focus-card">
              <strong>Operational continuity</strong>
              <p>${module.description}</p>
            </div>
          </div>
        </article>

        <article class="panel">
          <p class="eyebrow">Assistant workflows</p>
          <h3>Operational prompts</h3>

          <div class="ic365-action-list">
            ${module.prompts.map(prompt => `
              <button type="button" data-os-assistant-prompt="${prompt}">
                <strong>${prompt}</strong>
                <span>Run operational intelligence</span>
              </button>
            `).join('')}
          </div>
        </article>
      </section>
    `;

    document.dispatchEvent(new CustomEvent('indicare:enterprise-workspace-opened', {
      detail: {
        module: module.id
      }
    }));
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-enterprise-module]');
      if (!trigger) return;

      const module = MODULES.find(item => item.id === trigger.dataset.enterpriseModule);
      if (!module) return;

      renderWorkspace(module);
    });
  }

  function boot() {
    ensureEnterpriseRail();
    ensureNavigation();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();