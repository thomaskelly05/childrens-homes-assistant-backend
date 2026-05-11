(() => {
  const FLAG = '__indicareOperationalOverviewSync';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const endpoints = [
    '/api/os-command/care-recording',
    '/api/os-command/chronology-intelligence',
    '/api/os-command',
    '/api/os-command/safeguarding-patterns',
    '/api/os-command/inspection/workspaces'
  ];

  function contextParams() {
    const ctx = window.IndiCareOSContext || window.IndiCareContext?.get?.() || {};
    const params = new URLSearchParams({ limit: '120' });
    if (ctx.homeId) params.set('home_id', ctx.homeId);
    if (ctx.childId) params.set('young_person_id', ctx.childId);
    return params.toString();
  }

  async function getJson(path) {
    const query = contextParams();
    const response = await fetch(`${path}${query ? `?${query}` : ''}`, { credentials: 'include' });
    if (!response.ok) return null;
    return response.json();
  }

  function normalise(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    return [
      ...(payload.records || []),
      ...(payload.items || []),
      ...(payload.patterns || []),
      ...(payload.workspaces || []),
      ...(payload.care_plan_reviews || []),
      ...(payload.placements || [])
    ];
  }

  function text(record) {
    return JSON.stringify(record || {}).toLowerCase();
  }

  function setCard(index, value, label) {
    const card = document.querySelectorAll('.ic365-overview-card')[index];
    if (!card) return;
    const strong = card.querySelector('strong');
    const span = card.querySelector('span');
    if (strong) strong.textContent = value;
    if (span) span.textContent = label;
  }

  function renderContinuity(records) {
    const continuity = document.querySelector('.ic365-continuity-list');
    const focus = document.querySelector('.ic365-focus-stack');
    if (!continuity || !focus) return;

    const recent = records.slice(0, 3);
    continuity.innerHTML = recent.length ? recent.map((record) => {
      const title = record.title || record.event_title || record.record_type || record.pattern_type || 'Chronology item';
      const summary = record.summary || record.narrative || record.event_summary || record.recommended_action || 'Linked to the live operational chronology.';
      return `<div class="ic365-continuity-item"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(String(summary).slice(0, 180))}</span></div>`;
    }).join('') : '<div class="ic365-continuity-item"><strong>Live continuity</strong><span>Records will appear here once the selected context has chronology activity.</span></div>';

    const risks = records.filter((r) => /safeguard|incident|risk|missing|review|document|evidence/i.test(text(r))).slice(0, 3);
    focus.innerHTML = risks.length ? risks.map((record) => {
      const title = record.pattern_type || record.record_type || record.title || record.status || 'Operational focus';
      const summary = record.recommended_action || record.summary || record.narrative || 'Requires operational review.';
      return `<div class="ic365-focus-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(String(summary).slice(0, 180))}</p></div>`;
    }).join('') : '<div class="ic365-focus-card"><strong>Operational focus</strong><p>No live risk, review or document focus has been returned for this context.</p></div>';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  async function refresh() {
    try {
      const payloads = await Promise.all(endpoints.map(getJson));
      const records = payloads.flatMap(normalise);
      const review = records.filter((r) => /review|returned|submitted|manager|action|sign.off|critical|high/i.test(text(r))).length;
      const safeguarding = records.filter((r) => /safeguard|incident|missing|risk/i.test(text(r))).length;
      const withVoice = records.filter((r) => r.child_voice || r.young_person_voice).length;
      const continuity = records.length ? Math.round((withVoice / records.length) * 100) : 0;
      setCard(0, String(records.length), 'Live chronology items');
      setCard(1, String(review), 'Reviews pending');
      setCard(2, String(safeguarding), 'Safeguarding links');
      setCard(3, `${continuity}%`, 'Chronology continuity');
      renderContinuity(records);
    } catch (error) {
      console.warn('[IndiCare OS] Operational overview sync failed', error);
    }
  }

  function boot() {
    refresh();
    document.addEventListener('indicare:os-context-ready', refresh);
    document.addEventListener('indicare:care-data-changed', refresh);
    window.addEventListener('focus', refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
