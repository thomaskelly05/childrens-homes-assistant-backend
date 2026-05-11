(() => {
  const FLAG = '__indicareOperatingSystemResilience';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const CONTEXT_KEY = 'indicare.os.context.v1';
  const WALL_ID = 'indicare-os-context-wall';
  const PROTECTED_SELECTOR = '.existing-journey-runtime, #indicare-existing-journey-runtime, #os-runtime-root, .indicare-os-host';

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
    if (window.IndiCareContext?.set) {
      window.IndiCareContext.set(clean);
    }
    document.dispatchEvent(new CustomEvent('indicare:os-context-ready', { detail: clean }));
    return clean;
  }

  function clearContext() {
    sessionStorage.removeItem(CONTEXT_KEY);
    window.IndiCareOSContext = {};
    window.IndiCareContext?.clear?.();
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

  function stabiliseState() {
    const context = readContext();
    window.IndiCareOSContext = context;
    if (context.homeId && context.childId && window.IndiCareContext?.set) {
      window.IndiCareContext.set(context);
    }
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
        <div class="os-context-panel">
          <div class="os-context-kicker">IndiCare OS</div>
          <h1 class="os-context-title" id="os-context-title">Select home and young person</h1>
          <p class="os-context-copy">Start with the home and the young person you are working with. The OS then opens the child, adult, home, documents, standards and oversight journey in one context.</p>
          <div class="os-context-steps">
            <article class="os-context-card">
              <h3>1. Home</h3>
              <small>This sets the operational and safeguarding boundary.</small>
              <div class="os-context-list" data-os-home-list><div class="os-context-empty">Loading homes…</div></div>
            </article>
            <article class="os-context-card">
              <h3>2. Young person</h3>
              <small>This opens the living journey and links every action to their profile.</small>
              <div class="os-context-list" data-os-child-list><div class="os-context-empty">Select a home first.</div></div>
            </article>
          </div>
          <div class="os-context-footer">
            <div class="os-context-status" data-os-context-status>Waiting for home and young person.</div>
            <div class="os-context-actions">
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
      list.innerHTML = '<div class="os-context-empty">No young people found for this home.</div>';
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
        status.textContent = `${selectedHome.name} selected. Now choose the young person.`;
        enter.disabled = true;
      } else {
        status.textContent = 'Waiting for home and young person.';
        enter.disabled = true;
      }
    }

    try {
      const allChildren = await fetchYoungPeople('');
      const homes = deriveHomes(allChildren);
      if (!homes.length) {
        homeList.innerHTML = '<div class="os-context-empty">No homes found. Check profiles and permissions.</div>';
        return;
      }
      homeList.innerHTML = homes.map((home) => `<button type="button" class="os-context-option" data-os-home-id="${esc(home.id)}" data-os-home-name="${esc(home.name)}"><strong>${esc(home.name)}</strong><span>${home.children} young person${home.children === 1 ? '' : 's'} · ${esc(home.highestState)}</span></button>`).join('');
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
      homeList.innerHTML = '<div class="os-context-empty">Could not load homes yet. Check OS young people API and permissions.</div>';
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
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('indicare:care-data-changed'));
        window.loadTodayForChild?.();
      }, 120);
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

    window.IndiCareOSContextGate = {
      readContext,
      clearContext: () => {
        clearContext();
        location.reload();
      },
      requireContext: ensureContextWall
    };

    console.info('[IndiCare OS] Context wall active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();