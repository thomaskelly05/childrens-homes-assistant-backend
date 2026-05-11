(() => {
  const FLAG = '__indicareOperatingSystemResilience';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const REQUIRED_IDS = [
    'command-list',
    'care-list',
    'pattern-list',
    'placement-list',
    'workforce-board',
    'network-board',
    'chronology-board',
    'inspection-board',
    'recommendations',
    'alerts'
  ];

  function ensureMount(id) {
    if (document.getElementById(id)) return;

    const fallback = document.createElement('div');
    fallback.id = id;
    fallback.className = 'ic-list os-runtime-fallback';
    fallback.setAttribute('data-runtime-generated', 'true');
    fallback.style.display = 'grid';
    fallback.style.gap = '10px';

    const workspace = document.querySelector('.ic-workspace, .workspace, main');
    if (!workspace) return;

    const card = document.createElement('section');
    card.className = 'ic-card';
    card.innerHTML = `<div class="ic-card-head"><div><h3 class="ic-h3">Runtime recovery</h3><small class="ic-card-subtitle">OS runtime auto-created a missing operational mount point (${id}).</small></div></div>`;
    card.appendChild(fallback);

    workspace.appendChild(card);

    console.warn('[IndiCare OS] Missing mount restored:', id);
  }

  function hardenRenderPipeline() {
    REQUIRED_IDS.forEach(ensureMount);
  }

  function stabiliseState() {
    window.state = window.state || {};
    window.state.operatingSystemMode = true;
    window.state.connectedSafeguarding = true;
    window.state.liveOperationalModel = true;
  }

  function boot() {
    stabiliseState();
    hardenRenderPipeline();

    document.addEventListener('indicare:care-data-changed', hardenRenderPipeline);

    setInterval(hardenRenderPipeline, 4000);

    console.info('[IndiCare OS] Operating system resilience active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();