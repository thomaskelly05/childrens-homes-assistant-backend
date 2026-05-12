(() => {
  const FLAG = '__indicareRuntimeVerificationRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const FALLBACK_ENDPOINTS = [
    '/api/os-diagnostics/router-status',
    '/api/os-diagnostics/expected-endpoints',
    '/api/os-diagnostics/production-sweep',
    '/api/os-command',
    '/api/os-command/care-recording',
    '/api/os-command/chronology-intelligence',
    '/api/os-command/safeguarding-patterns',
    '/api/os-command/placement-stability',
    '/api/os-command/inspection/workspaces',
    '/api/document-library',
    '/api/evidence',
    '/api/tasks',
    '/api/staff-today',
    '/api/staff-profile',
    '/api/supervision',
    '/api/rostering',
    '/api/qa',
    '/api/reports',
    '/api/ofsted-pack'
  ];

  const state = {
    verified: [],
    failed: [],
    routerStatus: null,
    lastRun: null,
    endpointSource: 'fallback'
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  async function json(endpoint, options = {}) {
    const response = await fetch(endpoint, { credentials: 'include', ...options });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  async function loadEndpoints() {
    try {
      const data = await json('/api/os-diagnostics/expected-endpoints');
      if (Array.isArray(data.expected_endpoints) && data.expected_endpoints.length) {
        state.endpointSource = 'diagnostics';
        return [...new Set(data.expected_endpoints)].filter((endpoint) => endpoint !== '/api/os-assistant/ask');
      }
    } catch (error) {
      state.endpointSource = 'fallback';
    }
    return FALLBACK_ENDPOINTS;
  }

  async function loadRouterStatus() {
    try {
      state.routerStatus = await json('/api/os-diagnostics/router-status');
    } catch (error) {
      state.routerStatus = { ok: false, error: String(error), failed_routers: [] };
    }
  }

  function category(endpoint) {
    if (endpoint.includes('os-diagnostics')) return 'diagnostics';
    if (endpoint.includes('os-command')) return 'os-command';
    if (endpoint.includes('document') || endpoint.includes('evidence')) return 'documents';
    if (endpoint.includes('staff') || endpoint.includes('supervision') || endpoint.includes('rostering')) return 'staffing';
    if (endpoint.includes('qa') || endpoint.includes('ofsted') || endpoint.includes('reports')) return 'compliance';
    return 'enterprise';
  }

  function remediation(status) {
    if (status === 401) return 'Auth/session issue. Check auth hydration and permissions.';
    if (status === 403) return 'Permissions issue. Check role visibility and backend policy.';
    if (status === 404) return 'Missing endpoint or route drift. Reuse a mounted router or compatibility endpoint.';
    if (String(status).startsWith('5')) return 'Server/runtime issue. Check router imports and payloads.';
    return 'Investigate runtime continuity.';
  }

  async function probe(endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include'
      });

      return {
        endpoint,
        ok: response.ok,
        status: response.status,
        category: category(endpoint),
        remediation: remediation(response.status)
      };
    } catch (error) {
      return {
        endpoint,
        ok: false,
        status: 'offline',
        category: category(endpoint),
        remediation: 'Network/runtime failure. Check deployment and service availability.'
      };
    }
  }

  function ensurePanel() {
    const rail = document.querySelector('.ic365-rightpanel');
    if (!rail || document.getElementById('ic365-runtime-verification')) return;

    const panel = document.createElement('section');
    panel.id = 'ic365-runtime-verification';
    panel.className = 'ic365-side-card';

    panel.innerHTML = `
      <h2>Runtime Verification</h2>
      <p>Operational continuity and endpoint verification.</p>
      <div class="ic365-action-list">
        <button type="button" data-run-runtime-verification>
          <strong>Run sweep</strong>
          <span>Check auth, routes, routers and endpoints</span>
        </button>
      </div>
      <div id="ic365-runtime-verification-summary" class="ic365-continuity-list">
        <div class="ic365-empty-state">Waiting for diagnostics...</div>
      </div>
      <div id="ic365-runtime-verification-results" class="ic365-continuity-list"></div>
    `;

    rail.appendChild(panel);
  }

  function renderSummary() {
    const container = document.getElementById('ic365-runtime-verification-summary');
    if (!container) return;

    const failedRouters = state.routerStatus?.failed_routers || [];

    container.innerHTML = `
      <div class="ic365-continuity-item">
        <strong>${state.verified.length}/${state.verified.length + state.failed.length} endpoints connected</strong>
        <span>Endpoint source: ${esc(state.endpointSource)} • Last run: ${esc(state.lastRun || 'not run')}</span>
      </div>

      <div class="ic365-continuity-item ${failedRouters.length ? 'failed' : 'verified'}">
        <strong>${failedRouters.length} failed routers</strong>
        <span>${failedRouters.length ? 'Router import/runtime issues detected.' : 'Router loader reports no failed routers.'}</span>
      </div>

      <div class="ic365-continuity-item">
        <strong>${state.failed.filter((item) => item.status === 401).length} auth issues</strong>
        <span>${state.failed.filter((item) => item.status === 404).length} missing endpoints</span>
      </div>
    `;
  }

  function render() {
    renderSummary();

    const container = document.getElementById('ic365-runtime-verification-results');
    if (!container) return;

    const all = [...state.failed, ...state.verified].slice(0, 50);

    container.innerHTML = all.map((result) => `
      <div class="ic365-continuity-item ${result.ok ? 'verified' : 'failed'}">
        <strong>${esc(result.endpoint)}</strong>
        <span>${result.ok ? `Connected (${result.status})` : `Issue (${result.status}) - ${esc(result.remediation)}`}</span>
      </div>
    `).join('') || '<div class="ic365-empty-state">No diagnostics returned.</div>';
  }

  async function runSweep() {
    ensurePanel();

    await loadRouterStatus();

    const endpoints = await loadEndpoints();
    const results = await Promise.all(endpoints.map(probe));

    state.verified = results.filter((item) => item.ok);
    state.failed = results.filter((item) => !item.ok);
    state.lastRun = new Date().toLocaleString();

    render();

    document.dispatchEvent(new CustomEvent('indicare:runtime-verification-complete', {
      detail: {
        verified: state.verified,
        failed: state.failed,
        routerStatus: state.routerStatus
      }
    }));
  }

  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-run-runtime-verification]')) runSweep();
    });

    document.addEventListener('indicare:os-context-ready', runSweep);
    window.addEventListener('focus', runSweep);
  }

  function boot() {
    ensurePanel();
    bind();
    runSweep();
  }

  window.IndiCareRunRuntimeVerification = runSweep;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();