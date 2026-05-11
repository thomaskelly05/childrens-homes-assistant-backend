(() => {
  const FLAG = '__indicareExistingJourneyRuntimeBridge';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const CANONICAL_CONTAINER_ID = 'indicare-existing-journey-runtime';

  function osContext() {
    return window.IndiCareOSContext || {};
  }

  function ensureWorkspaceShell() {
    const shell = document.getElementById(CANONICAL_CONTAINER_ID);
    if (!shell) return null;
    if (!document.getElementById('workspace-main')) {
      const main = document.createElement('section');
      main.id = 'workspace-main';
      main.className = 'ic365-content-panel';
      main.innerHTML = '<div class="ic365-empty-state">Waiting for home and young person context...</div>';
      shell.appendChild(main);
    }
    return shell;
  }

  function updateContextChrome(ctx) {
    document.querySelectorAll('[data-os-context-home],[data-os-side-home]').forEach((node) => {
      node.textContent = ctx.homeName || (ctx.homeId ? `Home ${ctx.homeId}` : 'Choose home');
    });
    document.querySelectorAll('[data-os-context-child],[data-os-side-child]').forEach((node) => {
      node.textContent = ctx.childName || (ctx.childId ? `Young person ${ctx.childId}` : 'Choose young person');
    });
  }

  function syncContext() {
    const ctx = osContext();
    updateContextChrome(ctx);
    if (!ctx.homeId || !ctx.childId) return null;

    const next = {
      homeId: String(ctx.homeId || ''),
      homeName: ctx.homeName || `Home ${ctx.homeId}`,
      childId: String(ctx.childId || ''),
      childName: ctx.childName || `Young person ${ctx.childId}`,
      childSummary: 'Selected through the OS context wall.',
      childRiskLevel: ctx.childRiskLevel || '',
      childPlacementStatus: ctx.childPlacementStatus || 'active journey'
    };

    if (window.IndiCareContext?.set) {
      window.IndiCareContext.set(next);
    } else {
      let current = { ...next };
      window.IndiCareContext = {
        get: () => current,
        set: (value) => {
          current = { ...current, ...(value || {}) };
          return current;
        },
        clear: () => {
          current = { ...next };
          return current;
        }
      };
    }

    return next;
  }

  function setHeader(view) {
    const title = document.getElementById('view-title');
    const subtitle = document.getElementById('view-subtitle');
    const labels = {
      'today-child': ['Today', 'Daily recording, support and continuity for the selected young person.'],
      'child-life': ['Young Person', 'Profile, routines, identity, relationships and whole-child understanding.'],
      'child-journey': ['Journey', 'Narrative journey, direct work, outcomes and lived experience.'],
      'child-timeline': ['Timeline', 'Chronology, records, events, documents and manager review history.'],
      'adult-profile': ['Adults', 'Reflective workforce profile, supervision, consistency and wellbeing.'],
      'home-profile': ['Home', 'Home profile, atmosphere, routines, continuity and safeguarding environment.'],
      'standards-ofsted': ['Standards & Ofsted', 'Quality standards, documents, Reg 44/45 and inspection readiness.'],
      review: ['Oversight', 'Manager comments, returns, approvals, actions and sign-off.']
    };
    const [nextTitle, nextSubtitle] = labels[view] || labels['today-child'];
    if (title) title.textContent = nextTitle;
    if (subtitle) subtitle.textContent = nextSubtitle;
  }

  function activate(view) {
    const shell = ensureWorkspaceShell();
    if (!shell) return;
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === view);
      button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false');
    });
    setHeader(view);

    if (view === 'today-child' && typeof window.loadTodayForChild === 'function') return window.loadTodayForChild();
    if (view === 'child-life' && typeof window.loadChildLifeEcosystem === 'function') return window.loadChildLifeEcosystem();
    if (view === 'child-journey' && typeof window.loadChildJourneyExperience === 'function') return window.loadChildJourneyExperience();
    if (view === 'child-timeline' && typeof window.loadChildTimeline === 'function') return window.loadChildTimeline();
    if (view === 'adult-profile' && typeof window.loadAdultJourneyProfile === 'function') return window.loadAdultJourneyProfile();
    if (view === 'home-profile' && typeof window.loadHomeJourneyProfile === 'function') return window.loadHomeJourneyProfile();
    if (view === 'standards-ofsted' && typeof window.loadStandardsOfstedReadiness === 'function') return window.loadStandardsOfstedReadiness();
    if (view === 'review' && typeof window.loadManagerOversight === 'function') return window.loadManagerOversight();
  }

  function bindNav() {
    if (document.body.dataset.ic365NavBound === 'true') return;
    document.body.dataset.ic365NavBound = 'true';
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        syncContext();
        activate(button.dataset.view);
      });
    });
  }

  function bootExistingModules() {
    ensureWorkspaceShell();
    bindNav();
    const ctx = syncContext();
    if (!ctx) return;
    setTimeout(() => activate(document.querySelector('[data-view].active')?.dataset.view || 'today-child'), 100);
  }

  function boot() {
    ensureWorkspaceShell();
    bindNav();
    bootExistingModules();
    document.addEventListener('indicare:os-context-ready', bootExistingModules);
    document.addEventListener('indicare:care-data-changed', () => {
      const active = document.querySelector('[data-view].active')?.dataset.view || 'today-child';
      syncContext();
      activate(active);
    });
    console.info('[IndiCare OS] SharePoint journey shell bridge active');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();