(() => {
  const FLAG = '__indicareExistingJourneyRuntimeBridge';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const CANONICAL_CONTAINER_ID = 'indicare-existing-journey-runtime';

  function osContext() {
    return window.IndiCareOSContext || {};
  }

  function ensureWorkspaceShell() {
    let shell = document.getElementById(CANONICAL_CONTAINER_ID);
    if (shell) return shell;

    const workspace = document.querySelector('.ic-workspace, .workspace, main');
    if (!workspace) return null;

    shell = document.createElement('section');
    shell.id = CANONICAL_CONTAINER_ID;
    shell.className = 'ic-card existing-journey-runtime';
    shell.innerHTML = `
      <style>
        .existing-journey-runtime{display:grid;gap:16px;padding:22px;border-radius:28px;background:#fff;margin-bottom:18px}
        .existing-journey-runtime #workspace-nav{display:flex;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid #dbe7f3;background:#f8fafc;border-radius:18px}
        .existing-journey-runtime .nav-item{border:0;border-radius:999px;background:transparent;color:#64748b;font-weight:900;padding:10px 13px;cursor:pointer}
        .existing-journey-runtime .nav-item.active{background:#dbeafe;color:#1d4ed8}
        .existing-journey-runtime #view-title{margin:0;font-size:28px;letter-spacing:-.03em;color:#0f172a}
        .existing-journey-runtime #view-subtitle{margin:4px 0 0;color:#64748b;line-height:1.5}
        .existing-journey-runtime #workspace-main{display:grid;gap:16px}
      </style>
      <header>
        <p class="eyebrow">Connected journey workspace</p>
        <h2 id="view-title">Today for child</h2>
        <p id="view-subtitle">Existing journey, profile, recording, oversight and reporting modules wired into the OS context.</p>
      </header>
      <nav id="workspace-nav" aria-label="Journey navigation">
        <button type="button" class="nav-item active" data-view="today-child">Today</button>
        <button type="button" class="nav-item" data-view="child-life">Child profile</button>
        <button type="button" class="nav-item" data-view="child-journey">Child journey</button>
        <button type="button" class="nav-item" data-view="child-timeline">Timeline</button>
        <button type="button" class="nav-item" data-view="review">Manager oversight</button>
      </nav>
      <main id="workspace-main"><div class="panel">Waiting for home and child context…</div></main>
    `;

    workspace.prepend(shell);
    return shell;
  }

  function syncContext() {
    const ctx = osContext();
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

  function activate(view) {
    const shell = ensureWorkspaceShell();
    if (!shell) return;
    shell.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));

    if (view === 'today-child' && typeof window.loadTodayForChild === 'function') return window.loadTodayForChild();
    if (view === 'child-life' && typeof window.loadChildLifeEcosystem === 'function') return window.loadChildLifeEcosystem();
    if (view === 'child-journey' && typeof window.loadChildJourneyExperience === 'function') return window.loadChildJourneyExperience();
    if (view === 'child-timeline' && typeof window.loadChildTimeline === 'function') return window.loadChildTimeline();
    if (view === 'review' && typeof window.loadManagerOversight === 'function') return window.loadManagerOversight();
  }

  function bindNav() {
    const shell = ensureWorkspaceShell();
    if (!shell || shell.dataset.bound === 'true') return;
    shell.dataset.bound = 'true';
    shell.querySelectorAll('[data-view]').forEach((button) => {
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
    setTimeout(() => activate('today-child'), 100);
  }

  function boot() {
    ensureWorkspaceShell();
    bindNav();
    bootExistingModules();
    document.addEventListener('indicare:os-context-ready', bootExistingModules);
    document.addEventListener('indicare:care-data-changed', () => {
      const active = document.querySelector(`#${CANONICAL_CONTAINER_ID} .nav-item.active`)?.dataset.view || 'today-child';
      syncContext();
      activate(active);
    });
    console.info('[IndiCare OS] Existing journey runtime bridge active');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();