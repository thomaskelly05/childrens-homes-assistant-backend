(() => {
  const FLAG = '__indicareOperationalNotificationRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const ENDPOINTS = [
    '/api/tasks',
    '/api/actions',
    '/api/notifications',
    '/api/os-command',
    '/api/os-command/safeguarding-patterns',
    '/api/os-command/inspection/workspaces'
  ];

  const state = {
    items: [],
    open: false,
    lastRun: null
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function contextQuery() {
    const ctx = window.IndiCareOSContext || window.IndiCareContext?.get?.() || {};
    const params = new URLSearchParams({ limit: '80' });
    if (ctx.homeId) params.set('home_id', ctx.homeId);
    if (ctx.childId) params.set('young_person_id', ctx.childId);
    return params.toString();
  }

  async function fetchJson(endpoint) {
    try {
      const query = contextQuery();
      const response = await fetch(`${endpoint}${query ? `?${query}` : ''}`, { credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json().catch(() => ({}));
      if (Array.isArray(data)) return data;
      return [
        ...(data.notifications || []),
        ...(data.tasks || []),
        ...(data.actions || []),
        ...(data.items || []),
        ...(data.records || []),
        ...(data.patterns || []),
        ...(data.workspaces || [])
      ];
    } catch {
      return [];
    }
  }

  function textOf(item) {
    return JSON.stringify(item || {}).toLowerCase();
  }

  function titleOf(item) {
    return item.title || item.name || item.task_type || item.action_type || item.pattern_type || item.record_type || item.domain || 'Operational alert';
  }

  function summaryOf(item) {
    return item.summary || item.description || item.recommended_action || item.body || item.plain_text || item.narrative || item.leadership_summary || 'Operational item requiring review.';
  }

  function priorityOf(item) {
    const source = `${item.priority || ''} ${item.risk_level || ''} ${item.severity || ''} ${item.status || ''} ${textOf(item)}`.toLowerCase();
    if (/critical|urgent|missing|safeguard|high/.test(source)) return 'critical';
    if (/review|required|returned|due|overdue|medium/.test(source)) return 'review';
    return 'info';
  }

  function normalise(item, source) {
    return {
      id: String(item.id || item.record_id || item.task_id || `${titleOf(item)}-${Math.random()}`),
      title: titleOf(item),
      summary: summaryOf(item),
      priority: priorityOf(item),
      source,
      raw: item
    };
  }

  function ensureShell() {
    if (document.getElementById('ic365-notification-centre')) return;

    const panel = document.createElement('section');
    panel.id = 'ic365-notification-centre';
    panel.className = 'ic365-notification-centre';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="ic365-notification-backdrop" data-close-notifications></div>
      <aside class="ic365-notification-panel" role="dialog" aria-label="Notification centre">
        <header>
          <div><p class="eyebrow">Operational alerts</p><h2>Notification centre</h2></div>
          <button type="button" class="ic365-button" data-close-notifications>Close</button>
        </header>
        <div id="ic365-notification-results" class="ic365-notification-results"></div>
      </aside>`;
    document.body.appendChild(panel);
  }

  function ensureLauncher() {
    const actions = document.querySelector('.ic365-top-actions');
    if (actions && !document.querySelector('[data-open-notifications]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ic365-button subtle';
      button.dataset.openNotifications = 'true';
      button.innerHTML = 'Alerts <span id="ic365-notification-count" class="ic365-alert-count">0</span>';
      actions.prepend(button);
    }
  }

  function render() {
    const count = document.getElementById('ic365-notification-count');
    if (count) count.textContent = String(state.items.length);

    const results = document.getElementById('ic365-notification-results');
    if (!results) return;

    results.innerHTML = state.items.length ? state.items.map((item) => `
      <button type="button" class="ic365-notification-item ${esc(item.priority)}" data-notification-record="${esc(item.id)}">
        <strong>${esc(item.title)}</strong>
        <span>${esc(item.summary).slice(0, 180)}</span>
        <small>${esc(item.priority)} • ${esc(item.source)}</small>
      </button>
    `).join('') : '<div class="ic365-empty-state">No operational alerts returned for this context.</div>';
  }

  async function refresh() {
    const batches = await Promise.all(ENDPOINTS.map(async (endpoint) => ({ endpoint, items: await fetchJson(endpoint) })));
    const seen = new Set();
    const items = [];
    batches.forEach((batch) => {
      batch.items.map((item) => normalise(item, batch.endpoint)).forEach((item) => {
        const key = `${item.source}:${item.id}:${item.title}`;
        if (!seen.has(key) && /critical|review|required|returned|due|overdue|safeguard|missing|risk|action|task|inspection|evidence/i.test(`${item.priority} ${item.title} ${item.summary}`)) {
          seen.add(key);
          items.push(item);
        }
      });
    });
    state.items = items.sort((a, b) => (a.priority === 'critical' ? -1 : b.priority === 'critical' ? 1 : 0)).slice(0, 40);
    state.lastRun = new Date().toISOString();
    render();
    document.dispatchEvent(new CustomEvent('indicare:notifications-refreshed', { detail: { items: state.items } }));
  }

  function open() {
    ensureShell();
    const panel = document.getElementById('ic365-notification-centre');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    state.open = true;
    render();
  }

  function close() {
    const panel = document.getElementById('ic365-notification-centre');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
    state.open = false;
  }

  function injectStyles() {
    if (document.getElementById('ic365-notification-styles')) return;
    const style = document.createElement('style');
    style.id = 'ic365-notification-styles';
    style.textContent = `.ic365-alert-count{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;margin-left:6px}.ic365-notification-centre{position:fixed;inset:0;display:none;z-index:999995}.ic365-notification-centre.open{display:block}.ic365-notification-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.34);backdrop-filter:blur(8px)}.ic365-notification-panel{position:absolute;top:16px;right:16px;bottom:16px;width:min(520px,calc(100vw - 32px));border-radius:26px;background:#fff;box-shadow:0 28px 90px rgba(15,23,42,.28);display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}.ic365-notification-panel header{padding:18px;display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(15,23,42,.08)}.ic365-notification-panel h2{margin:0;color:#10201f}.ic365-notification-results{padding:14px;display:grid;gap:10px;align-content:start;overflow:auto;background:#f8fafc}.ic365-notification-item{border:1px solid rgba(15,23,42,.08);background:#fff;border-radius:16px;padding:13px;text-align:left;display:grid;gap:5px}.ic365-notification-item.critical{border-color:rgba(239,68,68,.25);background:linear-gradient(135deg,rgba(239,68,68,.08),#fff)}.ic365-notification-item.review{border-color:rgba(245,158,11,.25);background:linear-gradient(135deg,rgba(245,158,11,.08),#fff)}.ic365-notification-item strong{font-size:13px;color:#10201f}.ic365-notification-item span{font-size:12px;color:#475569;line-height:1.45}.ic365-notification-item small{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800}`;
    document.head.appendChild(style);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-open-notifications]')) open();
      if (event.target.closest('[data-close-notifications]')) close();
      const record = event.target.closest('[data-notification-record]');
      if (record && window.IndiCareOpenRecordWorkspace) window.IndiCareOpenRecordWorkspace(record.dataset.notificationRecord);
    });
    document.addEventListener('indicare:os-context-ready', refresh);
    document.addEventListener('indicare:care-data-changed', refresh);
    document.addEventListener('indicare:enterprise-hydration-complete', refresh);
    window.addEventListener('focus', refresh);
  }

  function boot() {
    injectStyles();
    ensureShell();
    ensureLauncher();
    bind();
    refresh();
  }

  window.IndiCareRefreshNotifications = refresh;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();