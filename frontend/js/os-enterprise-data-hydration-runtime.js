(() => {
  const FLAG = '__indicareEnterpriseDataHydrationRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const MODULE_ENDPOINTS = {
    staffing: ['/api/staff-today', '/api/staff-profile', '/api/supervision'],
    documents: ['/api/document-library', '/api/evidence'],
    health: ['/api/health', '/api/mar'],
    compliance: ['/api/qa', '/api/reg44', '/api/ofsted-pack'],
    connect: ['/api/connect', '/api/calendar', '/api/tasks']
  };

  const cache = new Map();

  async function fetchJson(endpoint) {
    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        endpoint,
        status: response.status,
        data
      };
    } catch (error) {
      return {
        ok: false,
        endpoint,
        status: 'offline'
      };
    }
  }

  async function hydrateModule(module) {
    const endpoints = MODULE_ENDPOINTS[module] || [];
    const results = await Promise.all(endpoints.map(fetchJson));
    cache.set(module, results);

    document.dispatchEvent(new CustomEvent('indicare:enterprise-hydration-complete', {
      detail: {
        module,
        results
      }
    }));

    return results;
  }

  function renderHydration(results) {
    const target = document.querySelector('[data-enterprise-hydration]');
    if (!target) return;

    target.innerHTML = results.map((result) => `
      <div class="ic365-continuity-item ${result.ok ? 'verified' : 'failed'}">
        <strong>${result.endpoint}</strong>
        <span>${result.ok ? 'Hydrated operationally' : `Unavailable (${result.status})`}</span>
      </div>
    `).join('');
  }

  document.addEventListener('indicare:enterprise-workspace-opened', async (event) => {
    const module = event.detail?.module;
    if (!module) return;

    const results = await hydrateModule(module);
    renderHydration(results);
  });

  window.IndiCareEnterpriseHydration = {
    hydrateModule,
    cache
  };
})();