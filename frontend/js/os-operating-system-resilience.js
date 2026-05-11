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

  const CONTEXT_KEY = 'indicare.os.context.v1';
  const WALL_ID = 'indicare-os-context-wall';
  const PROTECTED_SELECTOR = '.ic-layout, .layout';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function listFrom(payload, ...keys) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
  }

  function readContext() {
    try {
      return JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function writeContext(context) {
    const clean = {
      homeId: context.homeId ? String(context.homeId) : '',
      homeName: context.homeName || (context.homeId ? `Home ${context.homeId}` : ''),
      childId: context.childId ? String(context.childId) : '',
      childName: context.childName || (context.childId ? `Young person ${context.childId}` : ''),
      setAt: new Date().toISOString()
    };
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(clean));
    window.IndiCareOSContext = clean;
    window.state = window.state || {};
    window.state.currentHomeId = clean.homeId;
    window.state.currentChildId = clean.childId;
    window.state.currentHomeName = clean.homeName;
    window.state.currentChildName = clean.childName;
    document.dispatchEvent(new CustomEvent('indicare:os-context-ready', { detail: clean }));
    return clean;
  }

  function clearContext() {
    sessionStorage.removeItem(CONTEXT_KEY);
    window.IndiCareOSContext = {};
  }

  function contextIsReady() {
    const context = readContext();
    return Boolean(context.homeId && context.childId);
  }

  function applyContextToUrl(context) {
    const url = new URL(window.location.href);
    if (context.homeId) url.searchParams.set('home_id', context.homeId);
    if (context.childId) url.searchParams.set('young_person_id', context.childId);
    window.history.replaceState({}, '', url.toString());
  }

  function hideProtectedRuntime() {
    if (contextIsReady()) return;
    document.querySelectorAll(PROTECTED_SELECTOR).forEach((node) => {
      node.setAttribute('aria-hidden', 'true');
      node.style.display = 'none';
    });
  }

  function showProtectedRuntime() {
    document.querySelectorAll(PROTECTED_SELECTOR).forEach((node) => {
      node.removeAttribute('aria-hidden');
      node.style.display = '';
    });
  }

  function ensureMount(id) {
    if (!contextIsReady()) return;
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
    if (!contextIsReady()) return;
    REQUIRED_IDS.forEach(ensureMount);
  }

  function stabiliseState() {
    const context = readContext();
    window.state = window.state || {};
    window.state.operatingSystemMode = true;
    window.state.connectedSafeguarding = true;
    window.state.liveOperationalModel = true;
    if (context.homeId) window.state.currentHomeId = context.homeId;
    if (context.childId) window.state.currentChildId = context.childId;
    window.IndiCareOSContext = context;
  }

  async function fetchYoungPeople(homeId = '') {
    const params = new URLSearchParams();
    if (homeId) params.set('home_id', homeId);
    const url = params.toString() ? `/api/os-command/young-people?${params}` : '/api/os-command/young-people';
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'X-User-Id': new URLSearchParams(location.search).get('user_id') || '1',
        'X-Role': new URLSearchParams(location.search).get('role') || 'manager'
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return listFrom(await response.json(), 'young_people', 'children', 'items', 'results');
  }

  function deriveHomes(children) {
    const homes = new Map();
    children.forEach((child) => {
      const homeId = child.home_id ?? child.homeId;
      if (!homeId) return;
      const key = String(homeId);
      if (!homes.has(key)) {
        homes.set(key, {
          id: key,
          name: child.home_name || child.home_display_name || `Home ${key}`,
          children: 0,
          highestState: child.os_state || child.summary_risk_level || 'stable'
        });
      }
      const home = homes.get(key);
      home.children += 1;
      const state = child.os_state || child.summary_risk_level || 'stable';
      if (['critical', 'high'].includes(state)) home.highestState = state;
    });
    return Array.from(homes.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function contextWallHtml() {
    return `
      <section id="${WALL_ID}" class="os-context-wall" role="dialog" aria-modal="true" aria-labelledby="os-context-title">
        <style>
          .os-context-wall{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(135deg,#eef4fb,#f8fafc 55%,#dbeafe);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}.os-context-panel{width:min(980px,100%);max-height:92vh;overflow:auto;border:1px solid #dbe7f3;background:rgba(255,255,255,.96);box-shadow:0 24px 80px rgba(15,23,42,.18);border-radius:30px;padding:24px}.os-context-kicker{font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:#155eef}.os-context-title{margin:8px 0 8px;font-size:34px;line-height:1.05;letter-spacing:-.04em}.os-context-copy{margin:0;color:#64748b;line-height:1.55;max-width:780px}.os-context-steps{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px}.os-context-card{border:1px solid #dbe7f3;border-radius:22px;background:#fff;padding:16px;min-height:240px}.os-context-card h3{margin:0 0 6px;font-size:18px}.os-context-card small{display:block;color:#64748b;margin-bottom:12px}.os-context-list{display:grid;gap:10px}.os-context-option{width:100%;text-align:left;border:1px solid #dbe7f3;border-radius:16px;background:#f8fafc;padding:13px;cursor:pointer;color:#0f172a}.os-context-option:hover,.os-context-option.active{border-color:#155eef;background:#eaf2ff}.os-context-option strong{display:block;font-size:15px}.os-context-option span{display:block;margin-top:4px;color:#64748b;font-size:13px}.os-context-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:18px;padding-top:16px;border-top:1px solid #dbe7f3}.os-context-status{color:#64748b;font-size:13px}.os-context-button{border:0;border-radius:14px;padding:12px 16px;font-weight:900;cursor:pointer}.os-context-button.primary{background:#155eef;color:#fff}.os-context-button.secondary{background:#eef4fb;color:#334155}.os-context-button:disabled{opacity:.45;cursor:not-allowed}.os-context-empty{border:1px dashed #dbe7f3;background:#f8fafc;border-radius:16px;padding:16px;color:#64748b;text-align:center}.os-context-selected{margin-top:10px;padding:10px 12px;border-radius:14px;background:#dcfce7;color:#166534;font-weight:850}@media(max-width:780px){.os-context-steps{grid-template-columns:1fr}.os-context-title{font-size:28px}.os-context-panel{padding:18px;border-radius:22px}}
        </style>
        <div class="os-context-panel">
          <div class="os-context-kicker">IndiCare OS context wall</div>
          <h1 class="os-context-title" id="os-context-title">Choose the home and child before anything opens</h1>
          <p class="os-context-copy">The OS is built around the child’s journey, the adult’s journey and the home’s journey. Select the home first, then the child you are working with. Nothing operational is shown until that context is set.</p>
          <div class="os-context-steps">
            <article class="os-context-card">
              <h3>1. Which home are you working in?</h3>
              <small>This sets the safeguarding and recording boundary.</small>
              <div class="os-context-list" data-os-home-list><div class="os-context-empty">Loading homes…</div></div>
            </article>
            <article class="os-context-card">
              <h3>2. Which child are you working with?</h3>
              <small>This opens the child journey and links every record back to their profile.</small>
              <div class="os-context-list" data-os-child-list><div class="os-context-empty">Select a home first.</div></div>
            </article>
          </div>
          <div class="os-context-footer">
            <div class="os-context-status" data-os-context-status>Waiting for home and child selection.</div>
            <div>
              <button type="button" class="os-context-button secondary" data-os-context-reset>Reset</button>
              <button type="button" class="os-context-button primary" data-os-context-enter disabled>Enter OS</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderChildren(root, children, selectedChildId = '') {
    const list = root.querySelector('[data-os-child-list]');
    if (!children.length) {
      list.innerHTML = '<div class="os-context-empty">No children found for this home.</div>';
      return;
    }
    list.innerHTML = children.map((child) => {
      const id = String(child.young_person_id ?? child.id ?? '');
      const name = child.display_name || child.preferred_name || child.first_name || `Young person ${id}`;
      const state = child.os_state || child.summary_risk_level || 'stable';
      const meta = [child.age ? `Age ${child.age}` : '', state, child.placement_status || ''].filter(Boolean).join(' · ');
      return `<button type="button" class="os-context-option ${id === selectedChildId ? 'active' : ''}" data-os-child-id="${esc(id)}" data-os-child-name="${esc(name)}"><strong>${esc(name)}</strong><span>${esc(meta)}</span></button>`;
    }).join('');
  }

  async function renderWall(root) {
    const status = root.querySelector('[data-os-context-status]');
    const enter = root.querySelector('[data-os-context-enter]');
    const homeList = root.querySelector('[data-os-home-list]');
    let selectedHome = null;
    let selectedChild = null;

    function updateStatus() {
      if (selectedHome && selectedChild) {
        status.innerHTML = `<strong>${esc(selectedHome.name)}</strong> · <strong>${esc(selectedChild.name)}</strong> selected.`;
        enter.disabled = false;
      } else if (selectedHome) {
        status.textContent = `${selectedHome.name} selected. Now choose the child.`;
        enter.disabled = true;
      } else {
        status.textContent = 'Waiting for home and child selection.';
        enter.disabled = true;
      }
    }

    try {
      const allChildren = await fetchYoungPeople('');
      const homes = deriveHomes(allChildren);
      if (!homes.length) {
        homeList.innerHTML = '<div class="os-context-empty">No homes found. Check the young person profile views and permissions.</div>';
        return;
      }
      homeList.innerHTML = homes.map((home) => `<button type="button" class="os-context-option" data-os-home-id="${esc(home.id)}" data-os-home-name="${esc(home.name)}"><strong>${esc(home.name)}</strong><span>${home.children} child${home.children === 1 ? '' : 'ren'} · ${esc(home.highestState)}</span></button>`).join('');

      homeList.querySelectorAll('[data-os-home-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          homeList.querySelectorAll('.os-context-option').forEach((item) => item.classList.remove('active'));
          button.classList.add('active');
          selectedHome = { id: button.dataset.osHomeId, name: button.dataset.osHomeName };
          selectedChild = null;
          updateStatus();
          const children = await fetchYoungPeople(selectedHome.id);
          renderChildren(root, children);
          root.querySelectorAll('[data-os-child-id]').forEach((childButton) => {
            childButton.addEventListener('click', () => {
              root.querySelectorAll('[data-os-child-id]').forEach((item) => item.classList.remove('active'));
              childButton.classList.add('active');
              selectedChild = { id: childButton.dataset.osChildId, name: childButton.dataset.osChildName };
              updateStatus();
            });
          });
        });
      });
    } catch (error) {
      console.warn('[IndiCare OS] Context wall failed to load', error);
      homeList.innerHTML = '<div class="os-context-empty">Could not load homes yet. Check OS young people API and database views.</div>';
    }

    root.querySelector('[data-os-context-reset]').addEventListener('click', () => {
      clearContext();
      location.reload();
    });

    enter.addEventListener('click', () => {
      if (!selectedHome || !selectedChild) return;
      const context = writeContext({
        homeId: selectedHome.id,
        homeName: selectedHome.name,
        childId: selectedChild.id,
        childName: selectedChild.name
      });
      applyContextToUrl(context);
      root.remove();
      showProtectedRuntime();
      hardenRenderPipeline();
      window.loadAll?.();
      setTimeout(() => {
        window.openChild?.(context.childId);
        const childInput = document.getElementById('care-yp-id');
        const homeInput = document.getElementById('care-home-id');
        if (childInput) childInput.value = context.childId;
        if (homeInput) homeInput.value = context.homeId;
      }, 250);
    });
  }

  function ensureContextWall() {
    const url = new URL(location.href);
    const urlHome = url.searchParams.get('home_id');
    const urlChild = url.searchParams.get('young_person_id');
    if (urlHome && urlChild) {
      writeContext({ homeId: urlHome, childId: urlChild });
      showProtectedRuntime();
      return;
    }

    if (contextIsReady()) {
      const context = readContext();
      applyContextToUrl(context);
      showProtectedRuntime();
      return;
    }

    hideProtectedRuntime();
    if (document.getElementById(WALL_ID)) return;
    document.body.insertAdjacentHTML('afterbegin', contextWallHtml());
    renderWall(document.getElementById(WALL_ID));
  }

  function boot() {
    stabiliseState();
    ensureContextWall();
    hardenRenderPipeline();

    document.addEventListener('indicare:care-data-changed', hardenRenderPipeline);
    document.addEventListener('indicare:os-context-ready', hardenRenderPipeline);

    setInterval(hardenRenderPipeline, 4000);

    window.IndiCareOSContextGate = {
      readContext,
      clearContext: () => {
        clearContext();
        location.reload();
      },
      requireContext: ensureContextWall
    };

    console.info('[IndiCare OS] Operating system resilience and context wall active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();