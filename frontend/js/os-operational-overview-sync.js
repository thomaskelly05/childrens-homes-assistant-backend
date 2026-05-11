(() => {
  const FLAG = '__indicareOperationalOverviewSync';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const endpoints = [
    '/api/os-command/care-recording',
    '/api/os-command/chronology-intelligence',
    '/api/os-command',
    '/api/os-command/safeguarding-patterns',
    '/api/os-command/inspection/workspaces',
    '/api/os-command/placement-stability'
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

  function text(record) { return JSON.stringify(record || {}).toLowerCase(); }
  function dateValue(record) { return record.occurred_at || record.event_at || record.created_at || record.detected_at || record.record_date || record.updated_at || ''; }
  function titleOf(record) { return record.title || record.event_title || record.record_type || record.pattern_type || record.domain || 'Chronology item'; }
  function summaryOf(record) { return record.summary || record.narrative || record.event_summary || record.recommended_action || record.leadership_summary || 'Linked to the live operational chronology.'; }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

  function setCard(index, value, label) {
    const card = document.querySelectorAll('.ic365-overview-card')[index];
    if (!card) return;
    const strong = card.querySelector('strong');
    const span = card.querySelector('span');
    if (strong) strong.textContent = value;
    if (span) span.textContent = label;
  }

  function ensureLiveSections() {
    const main = document.querySelector('.ic365-main');
    if (!main) return;
    if (!document.getElementById('ic365-live-action-centre')) {
      const section = document.createElement('section');
      section.id = 'ic365-live-action-centre';
      section.className = 'ic365-continuity-grid ic365-live-action-centre';
      section.innerHTML = `
        <article class="ic365-continuity-panel">
          <h3>Live handover brief</h3>
          <div class="ic365-handover-list"><div class="ic365-continuity-item"><strong>Loading handover</strong><span>Building a live shift brief from chronology, safeguarding, review and document feeds.</span></div></div>
        </article>
        <article class="ic365-continuity-panel">
          <h3>Action centre</h3>
          <div class="ic365-action-centre-list"><div class="ic365-focus-card"><strong>Loading actions</strong><p>Review, risk and document actions will appear here.</p></div></div>
        </article>`;
      main.appendChild(section);
    }
  }

  function renderContinuity(records) {
    const continuity = document.querySelector('.ic365-continuity-list');
    const focus = document.querySelector('.ic365-focus-stack');
    if (!continuity || !focus) return;
    const sorted = [...records].sort((a, b) => String(dateValue(b)).localeCompare(String(dateValue(a))));
    const recent = sorted.slice(0, 4);
    continuity.innerHTML = recent.length ? recent.map((record) => `<div class="ic365-continuity-item"><strong>${escapeHtml(titleOf(record))}</strong><span>${escapeHtml(String(summaryOf(record)).slice(0, 190))}</span></div>`).join('') : '<div class="ic365-continuity-item"><strong>Live continuity</strong><span>Records will appear here once the selected context has chronology activity.</span></div>';
    const risks = sorted.filter((r) => /safeguard|incident|risk|missing|review|document|evidence|action|critical|high/i.test(text(r))).slice(0, 4);
    focus.innerHTML = risks.length ? risks.map((record) => `<div class="ic365-focus-card"><strong>${escapeHtml(titleOf(record))}</strong><p>${escapeHtml(String(summaryOf(record)).slice(0, 190))}</p></div>`).join('') : '<div class="ic365-focus-card"><strong>Operational focus</strong><p>No live risk, review or document focus has been returned for this context.</p></div>';
  }

  function renderHandover(records) {
    ensureLiveSections();
    const handover = document.querySelector('.ic365-handover-list');
    const actions = document.querySelector('.ic365-action-centre-list');
    if (!handover || !actions) return;
    const sorted = [...records].sort((a, b) => String(dateValue(b)).localeCompare(String(dateValue(a))));
    const handoverItems = sorted.filter((r) => /handover|daily|observation|sleep|education|contact|wellbeing|medication/i.test(text(r))).slice(0, 5);
    const actionItems = sorted.filter((r) => /review|returned|submitted|manager|action|sign.off|critical|high|safeguard|incident|missing|risk|document|evidence/i.test(text(r))).slice(0, 5);
    handover.innerHTML = handoverItems.length ? handoverItems.map((record) => `<div class="ic365-continuity-item"><strong>${escapeHtml(titleOf(record))}</strong><span>${escapeHtml(String(summaryOf(record)).slice(0, 180))}</span></div>`).join('') : '<div class="ic365-continuity-item"><strong>No handover items</strong><span>No recent handover, daily, observation, sleep, education or contact records returned.</span></div>';
    actions.innerHTML = actionItems.length ? actionItems.map((record) => `<div class="ic365-focus-card"><strong>${escapeHtml(titleOf(record))}</strong><p>${escapeHtml(String(summaryOf(record)).slice(0, 180))}</p></div>`).join('') : '<div class="ic365-focus-card"><strong>No live actions</strong><p>No review, risk, safeguarding or document actions returned.</p></div>';
  }

  function renderRightRail(records) {
    const rail = document.querySelector('.ic365-rightpanel');
    if (!rail || document.getElementById('ic365-live-right-rail')) return;
    const card = document.createElement('section');
    card.id = 'ic365-live-right-rail';
    card.className = 'ic365-side-card';
    card.innerHTML = '<h2>Live watchlist</h2><div class="ic365-live-watchlist"></div>';
    rail.appendChild(card);
  }

  function updateRightRail(records) {
    renderRightRail(records);
    const list = document.querySelector('.ic365-live-watchlist');
    if (!list) return;
    const watch = records.filter((r) => /critical|high|safeguard|incident|missing|risk|review|returned/i.test(text(r))).slice(0, 6);
    list.innerHTML = watch.length ? watch.map((record) => `<button type="button"><strong>${escapeHtml(titleOf(record))}</strong><span>${escapeHtml(String(summaryOf(record)).slice(0, 120))}</span></button>`).join('') : '<div class="ic365-empty-state">No watchlist items.</div>';
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
      renderHandover(records);
      updateRightRail(records);
    } catch (error) {
      console.warn('[IndiCare OS] Operational overview sync failed', error);
    }
  }

  function boot() {
    ensureLiveSections();
    refresh();
    document.addEventListener('indicare:os-context-ready', refresh);
    document.addEventListener('indicare:care-data-changed', refresh);
    window.addEventListener('focus', refresh);
    window.setInterval(refresh, 90000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
