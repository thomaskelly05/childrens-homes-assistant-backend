(() => {
  const FLAG = '__indicareRuntimeVerificationRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const ENDPOINTS = [
    '/api/os-diagnostics/router-status',
    '/api/os-diagnostics/expected-endpoints',
    '/api/os-diagnostics/production-sweep',
    '/api/os-assistant/ask',
    '/api/os-command/care-recording',
    '/api/documents',
    '/api/evidence',
    '/api/tasks'
  ];

  const state = {
    verified: [],
    failed: []
  };

  async function probe(endpoint) {
    try {
      const response = await fetch(endpoint, {
        credentials: 'include'
      });

      return {
        endpoint,
        ok: response.ok,
        status: response.status
      };
    } catch (error) {
      return {
        endpoint,
        ok: false,
        status: 'offline'
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
      <div id="ic365-runtime-verification-results" class="ic365-continuity-list">
        <div class="ic365-empty-state">Running diagnostics...</div>
      </div>
    `;

    rail.appendChild(panel);
  }

  function render() {
    const container = document.getElementById('ic365-runtime-verification-results');
    if (!container) return;

    const all = [...state.verified, ...state.failed];

    container.innerHTML = all.map((result) => `
      <div class="ic365-continuity-item ${result.ok ? 'verified' : 'failed'}">
        <strong>${result.endpoint}</strong>
        <span>${result.ok ? 'Connected' : `Issue (${result.status})`}</span>
      </div>
    `).join('');
  }

  async function runSweep() {
    const results = await Promise.all(ENDPOINTS.map(probe));

    state.verified = results.filter((item) => item.ok);
    state.failed = results.filter((item) => !item.ok);

    render();

    document.dispatchEvent(new CustomEvent('indicare:runtime-verification-complete', {
      detail: {
        verified: state.verified,
        failed: state.failed
      }
    }));
  }

  function bind() {
    document.addEventListener('indicare:os-context-ready', runSweep);
    window.addEventListener('focus', runSweep);
  }

  function boot() {
    ensurePanel();
    bind();
    runSweep();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();