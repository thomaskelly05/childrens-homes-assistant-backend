(() => {
  const FLAG = '__indicareOperationalAuditRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const state = {
    entries: [],
    enabled: true,
    lastFlush: null
  };

  const EVENTS = [
    'indicare:runtime-verification-complete',
    'indicare:notifications-refreshed',
    'indicare:enterprise-workspace-opened',
    'indicare:enterprise-hydration-complete',
    'indicare:care-data-changed'
  ];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function addEntry(type, detail) {
    if (!state.enabled) return;

    state.entries.unshift({
      id: `${Date.now()}-${Math.random()}`,
      type,
      detail,
      timestamp: new Date().toISOString()
    });

    state.entries = state.entries.slice(0, 100);
    state.lastFlush = new Date().toLocaleTimeString();

    render();
  }

  function ensurePanel() {
    const rail = document.querySelector('.ic365-rightpanel');
    if (!rail || document.getElementById('ic365-audit-runtime')) return;

    const panel = document.createElement('section');
    panel.id = 'ic365-audit-runtime';
    panel.className = 'ic365-side-card';

    panel.innerHTML = `
      <h2>Operational Audit</h2>
      <p>Enterprise continuity, resilience and audit activity.</p>
      <div class="ic365-action-list">
        <button type="button" data-export-audit-log>
          <strong>Export audit log</strong>
          <span>Operational continuity export</span>
        </button>
      </div>
      <div id="ic365-audit-results" class="ic365-continuity-list">
        <div class="ic365-empty-state">Awaiting operational events...</div>
      </div>
    `;

    rail.appendChild(panel);
  }

  function render() {
    const target = document.getElementById('ic365-audit-results');
    if (!target) return;

    target.innerHTML = state.entries.length ? state.entries.slice(0, 20).map((entry) => `
      <div class="ic365-continuity-item verified">
        <strong>${esc(entry.type)}</strong>
        <span>${esc(entry.detail).slice(0, 180)}</span>
      </div>
    `).join('') : '<div class="ic365-empty-state">No operational audit events.</div>';
  }

  function exportLog() {
    const blob = new Blob([
      JSON.stringify({
        exported_at: new Date().toISOString(),
        last_flush: state.lastFlush,
        entries: state.entries
      }, null, 2)
    ], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `indicare-operational-audit-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function bind() {
    EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, (event) => {
        addEntry(eventName.replace('indicare:', '').replace(/-/g, ' '), JSON.stringify(event.detail || {}));
      });
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-export-audit-log]')) {
        exportLog();
      }
    });

    window.addEventListener('error', (event) => {
      addEntry('runtime error', `${event.message || 'Unknown runtime error'} @ ${event.filename || 'runtime'}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
      addEntry('promise rejection', String(event.reason || 'Unhandled rejection'));
    });
  }

  function boot() {
    ensurePanel();
    bind();
    addEntry('audit runtime', 'Operational audit continuity active.');
  }

  window.IndiCareOperationalAudit = {
    entries: state.entries,
    exportLog,
    addEntry
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();