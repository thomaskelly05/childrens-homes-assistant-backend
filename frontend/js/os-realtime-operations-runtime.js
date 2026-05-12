(() => {
  const FLAG = '__indicareRealtimeOperationsRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const EVENTS = [
    'indicare:care-data-changed',
    'indicare:enterprise-hydration-complete',
    'indicare:runtime-verification-complete',
    'indicare:notifications-refreshed'
  ];

  const state = {
    connected: false,
    lastSync: null,
    activity: []
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function ensureRail() {
    const rail = document.querySelector('.ic365-rightpanel');
    if (!rail || document.getElementById('ic365-realtime-ops')) return;

    const section = document.createElement('section');
    section.id = 'ic365-realtime-ops';
    section.className = 'ic365-side-card';

    section.innerHTML = `
      <h2>Live Operations</h2>
      <p>Operational continuity and realtime activity.</p>
      <div class="ic365-continuity-list" id="ic365-realtime-results">
        <div class="ic365-empty-state">Awaiting operational activity...</div>
      </div>
    `;

    rail.appendChild(section);
  }

  function render() {
    const container = document.getElementById('ic365-realtime-results');
    if (!container) return;

    container.innerHTML = `
      <div class="ic365-continuity-item ${state.connected ? 'verified' : 'failed'}">
        <strong>${state.connected ? 'Operational continuity active' : 'Realtime continuity inactive'}</strong>
        <span>Last sync: ${esc(state.lastSync || 'never')}</span>
      </div>
      ${state.activity.slice(0, 12).map((item) => `
        <div class="ic365-continuity-item verified">
          <strong>${esc(item.type)}</strong>
          <span>${esc(item.summary)}</span>
        </div>
      `).join('')}
    `;
  }

  function addActivity(type, summary) {
    state.connected = true;
    state.lastSync = new Date().toLocaleTimeString();
    state.activity.unshift({
      type,
      summary,
      ts: Date.now()
    });

    state.activity = state.activity.slice(0, 20);
    render();
  }

  function bind() {
    EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, (event) => {
        addActivity(eventName.replace('indicare:', '').replace(/-/g, ' '), JSON.stringify(event.detail || {}).slice(0, 180));
      });
    });

    window.addEventListener('focus', () => {
      addActivity('window focus', 'Operational workspace resumed.');
    });
  }

  function boot() {
    ensureRail();
    bind();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();