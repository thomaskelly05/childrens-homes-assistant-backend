(() => {
  const TAB_DEFS = [
    ['overview', 'Overview'],
    ['timeline', 'Timeline'],
    ['care', 'Care Notes'],
    ['safeguarding', 'Safeguarding'],
    ['plans', 'Plans'],
    ['education', 'Education'],
    ['health', 'Health'],
    ['family', 'Family'],
    ['keywork', 'Key Work'],
    ['incidents', 'Incidents'],
    ['command', 'Command']
  ];

  const STYLE_ID = 'os-child-workspace-tabs-style';
  const PATCH_FLAG = '__indicareChildTabsPatched';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .child-workspace-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin: 0 0 16px;
        padding: 8px;
        border: 1px solid var(--ic-border, #dbe7f3);
        background: var(--ic-surface-soft, #f8fafc);
        border-radius: 18px;
      }
      .child-workspace-tab {
        border: 0;
        border-radius: 999px;
        padding: 9px 12px;
        background: transparent;
        color: var(--ic-muted, #64748b);
        font-weight: 850;
        font-size: 12px;
      }
      .child-workspace-tab:hover,
      .child-workspace-tab.active {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .child-tab-view { display: none; }
      .child-tab-view.active { display: block; }
      .child-tab-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }
      .child-tab-section-title {
        font-size: 14px;
        font-weight: 900;
        color: var(--ic-muted, #64748b);
        text-transform: uppercase;
        letter-spacing: .06em;
        margin: 2px 0 10px;
      }
    `;
    document.head.appendChild(style);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function badge(value) {
    const raw = String(value || 'monitor');
    const cls = raw.replaceAll('_', '-');
    return `<span class="ic-badge ic-badge-${esc(cls)}">${esc(raw.replaceAll('_', ' '))}</span>`;
  }

  function listFrom(payload, ...keys) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
  }

  function empty(text) {
    return `<div class="ic-empty">${esc(text)}</div>`;
  }

  function item(title, text, state) {
    return `<div class="ic-item"><div class="ic-item-top"><div><div class="ic-item-title">${esc(title || 'Record')}</div><div class="ic-item-text">${esc(text || '').slice(0, 360)}</div></div>${badge(state || 'recorded')}</div></div>`;
  }

  function timelineRows(rows) {
    return rows.length ? `<div class="timeline">${rows.map((t) => `
      <div class="timeline-row"><div class="ic-item"><div class="ic-item-top"><div>
        <div class="ic-item-title">${esc(t.title || t.event_title || t.source_type || 'Timeline entry')}</div>
        <div class="ic-item-text">${esc(t.summary || t.event_summary || t.narrative || '')}</div>
        ${t.child_voice ? `<div class="ic-item-text"><strong>Child voice:</strong> ${esc(t.child_voice)}</div>` : ''}
      </div>${badge(t.timeline_state || t.status || 'recorded')}</div></div></div>
    `).join('')}</div>` : empty('No timeline entries yet.');
  }

  function filterRecords(records, names) {
    return records.filter((r) => names.includes(String(r.record_type || r.source_type || '').toLowerCase()));
  }

  function renderChildTabs(data) {
    const p = data?.profile || {};
    const timeline = listFrom(data, 'timeline', 'events');
    const careRecords = listFrom(data, 'care_records', 'records', 'items');
    const commandItems = listFrom(data, 'command_items');
    const safeguarding = listFrom(data, 'safeguarding_patterns', 'patterns');
    const plans = listFrom(data, 'care_plan_reviews', 'plans');
    const alerts = listFrom(data, 'alerts');
    const chronology = listFrom(data, 'chronology_intelligence');

    const education = filterRecords(careRecords.concat(timeline), ['education_note', 'education', 'education_record']);
    const health = filterRecords(careRecords.concat(timeline), ['health_note', 'health', 'health_record']);
    const family = filterRecords(careRecords.concat(timeline), ['family_contact', 'family', 'family_contact_record']);
    const keywork = filterRecords(careRecords.concat(timeline), ['key_work_session', 'keywork', 'keywork_session']);
    const incidents = filterRecords(careRecords.concat(timeline), ['incident_note', 'incident', 'incidents']);
    const care = careRecords.length ? careRecords : timeline;

    return `
      <div class="child-workspace-tabs" role="tablist">
        ${TAB_DEFS.map(([key, label], index) => `<button type="button" class="child-workspace-tab ${index === 0 ? 'active' : ''}" data-child-tab="${key}">${label}</button>`).join('')}
      </div>

      <section class="child-tab-view active" data-child-tab-view="overview">
        <div class="child-tab-grid">
          <div class="ic-metric"><strong class="ic-metric-value">${esc(p.records_today || 0)}</strong><span class="ic-metric-label">Records today</span></div>
          <div class="ic-metric"><strong class="ic-metric-value">${esc(p.manager_review_count || 0)}</strong><span class="ic-metric-label">Manager reviews</span></div>
          <div class="ic-metric"><strong class="ic-metric-value">${esc(p.open_commands || commandItems.length || 0)}</strong><span class="ic-metric-label">Open commands</span></div>
          <div class="ic-metric"><strong class="ic-metric-value">${esc(Math.round(p.disruption_risk_score || data?.placement_stability?.disruption_risk_score || 0))}</strong><span class="ic-metric-label">Disruption risk</span></div>
        </div>
        <div class="child-tab-section-title">Latest chronology</div>
        ${timelineRows(timeline.slice(0, 6))}
      </section>

      <section class="child-tab-view" data-child-tab-view="timeline">
        <div class="child-tab-section-title">Full operational timeline</div>
        ${timelineRows(timeline)}
      </section>

      <section class="child-tab-view" data-child-tab-view="care">
        <div class="child-tab-section-title">Care notes and daily records</div>
        <div class="ic-list">${care.length ? care.map((r) => item(r.title || r.record_type, r.narrative || r.summary || r.event_summary, r.feed_state || r.status)).join('') : empty('No care notes found.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="safeguarding">
        <div class="child-tab-section-title">Safeguarding patterns and alerts</div>
        <div class="ic-list">${safeguarding.concat(alerts).length ? safeguarding.concat(alerts).map((r) => item(r.title || r.pattern_type, r.summary || r.recommended_action, r.severity || r.risk_level)).join('') : empty('No safeguarding records or alerts found.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="plans">
        <div class="child-tab-section-title">Plans and reviews</div>
        <div class="ic-list">${plans.length ? plans.map((r) => item(r.section_title || r.title || 'Plan review', r.current_summary || r.summary || r.needs, r.review_state || r.status)).join('') : empty('No care plan review data found.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="education">
        <div class="child-tab-section-title">Education</div>
        <div class="ic-list">${education.length ? education.map((r) => item(r.title || 'Education update', r.narrative || r.summary || r.event_summary, r.status)).join('') : empty('No education records found yet.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="health">
        <div class="child-tab-section-title">Health and wellbeing</div>
        <div class="ic-list">${health.length ? health.map((r) => item(r.title || 'Health update', r.narrative || r.summary || r.event_summary, r.status)).join('') : empty('No health records found yet.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="family">
        <div class="child-tab-section-title">Family contact</div>
        <div class="ic-list">${family.length ? family.map((r) => item(r.title || 'Family contact', r.narrative || r.summary || r.event_summary, r.status)).join('') : empty('No family contact records found yet.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="keywork">
        <div class="child-tab-section-title">Key work</div>
        <div class="ic-list">${keywork.length ? keywork.map((r) => item(r.title || 'Key work session', r.narrative || r.summary || r.event_summary, r.status)).join('') : empty('No key work sessions found yet.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="incidents">
        <div class="child-tab-section-title">Incidents and missing episodes</div>
        <div class="ic-list">${incidents.length ? incidents.map((r) => item(r.title || 'Incident', r.narrative || r.summary || r.event_summary, r.status)).join('') : empty('No incidents found in this workspace yet.')}</div>
      </section>

      <section class="child-tab-view" data-child-tab-view="command">
        <div class="child-tab-section-title">Command items</div>
        <div class="ic-list">${commandItems.length ? commandItems.map((r) => item(r.title, r.summary || r.recommended_action, r.priority || r.status)).join('') : empty('No command items for this child.')}</div>
        <div class="child-tab-section-title" style="margin-top:16px">Chronology intelligence</div>
        <div class="ic-list">${chronology.length ? chronology.slice(0, 10).map((r) => item(r.event_title || r.title, r.event_summary || r.summary, (r.max_overlay_severity_rank || 0) >= 3 ? 'high' : 'monitor')).join('') : empty('No chronology intelligence overlays yet.')}</div>
      </section>
    `;
  }

  function activateTab(root, key) {
    root.querySelectorAll('.child-workspace-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.childTab === key));
    root.querySelectorAll('.child-tab-view').forEach((view) => view.classList.toggle('active', view.dataset.childTabView === key));
  }

  function enhanceCurrentChildWorkspace() {
    const root = document.getElementById('child-workspace');
    const data = window.state?.selectedChild;
    if (!root || !data?.profile) return false;
    root.innerHTML = renderChildTabs(data);
    root.querySelectorAll('.child-workspace-tab').forEach((btn) => {
      btn.addEventListener('click', () => activateTab(root, btn.dataset.childTab));
    });
    return true;
  }

  function patchOpenChild() {
    if (window[PATCH_FLAG]) return;
    const originalOpenChild = window.openChild;
    if (typeof originalOpenChild !== 'function') return;
    window.openChild = async function patchedOpenChild(...args) {
      const result = await originalOpenChild.apply(this, args);
      enhanceCurrentChildWorkspace();
      return result;
    };
    window[PATCH_FLAG] = true;
  }

  function boot() {
    injectStyles();
    patchOpenChild();
    const observer = new MutationObserver(() => {
      patchOpenChild();
      const root = document.getElementById('child-workspace');
      if (root && window.state?.selectedChild?.profile && !root.querySelector('.child-workspace-tabs')) {
        enhanceCurrentChildWorkspace();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
