(() => {
  const FLAG = '__indicareSafeOperationalLinks';
  const STYLE_ID = 'os-safe-operational-links-style';
  const WORKSPACE_ID = 'os-safe-operational-workspace';
  const BACKDROP_ID = 'os-safe-operational-backdrop';
  const CONTINUITY_ID = 'os-safe-continuity-strip';

  if (window[FLAG]) return;
  window[FLAG] = true;

  function safe(label, fn) {
    try { return fn(); } catch (error) { console.error(`[IndiCare operational links] ${label}`, error); return undefined; }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .os-safe-clickable{cursor:pointer}.os-safe-clickable:hover{outline:2px solid rgba(21,94,239,.18);outline-offset:2px}.os-safe-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:850;display:none}.os-safe-backdrop.open{display:block}.os-safe-workspace{position:fixed;inset:18px;background:#fff;border:1px solid var(--ic-border,#dbe7f3);border-radius:28px;box-shadow:0 30px 90px rgba(15,23,42,.30);z-index:851;display:none;overflow:hidden}.os-safe-workspace.open{display:grid;grid-template-rows:auto minmax(0,1fr)}.os-safe-head{padding:18px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;background:linear-gradient(180deg,#fff,#f8fafc)}.os-safe-head h3{margin:0;color:#0f172a}.os-safe-head p{margin:4px 0 0;color:#64748b}.os-safe-close{border:0;border-radius:999px;background:#eef4fb;width:40px;height:40px;font-weight:950}.os-safe-body{overflow:auto;padding:18px;background:#f8fafc;display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:14px}.os-safe-panel{border:1px solid #dbe7f3;background:#fff;border-radius:20px;padding:14px;margin-bottom:12px}.os-safe-panel h4{margin:0 0 8px;color:#0f172a}.os-safe-panel p{color:#475569;line-height:1.45}.os-safe-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.os-safe-actions button{border:0;border-radius:13px;padding:10px 12px;font-weight:900;background:#eef4fb;color:#334155}.os-safe-actions button.primary{background:#155eef;color:#fff}.os-safe-continuity{position:sticky;bottom:0;z-index:30;margin-top:14px;border:1px solid #dbe7f3;background:#fff;border-radius:22px;padding:12px;box-shadow:0 18px 50px rgba(15,23,42,.08)}.os-safe-continuity-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}.os-safe-continuity-card{border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:10px}.os-safe-continuity-card strong{display:block;color:#0f172a}.os-safe-continuity-card small{color:#64748b}.os-safe-mini-list{display:grid;gap:8px}.os-safe-mini-item{border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:10px}@media(max-width:900px){.os-safe-workspace{inset:0;border-radius:0}.os-safe-body{grid-template-columns:1fr}.os-safe-continuity{position:static}}
    `;
    document.head.appendChild(style);
  }

  function state() { return window.state || {}; }
  function selectedChild() { return state().selectedChild || {}; }
  function selectedProfile() { return selectedChild().profile || {}; }
  function childName() {
    const p = selectedProfile();
    return p.display_name || p.preferred_name || p.first_name || p.name || 'selected young person';
  }
  function timeline() {
    const data = selectedChild();
    return Array.isArray(data.timeline) ? data.timeline : Array.isArray(data.events) ? data.events : [];
  }
  function commands() { return listFrom(state().command, 'items', 'command_items').slice(0, 8); }
  function records() { return listFrom(state().care, 'records', 'items').slice(0, 8); }
  function patterns() { return listFrom(state().patterns, 'patterns', 'items').slice(0, 8); }
  function placements() { return listFrom(state().placements, 'placements', 'items').slice(0, 8); }
  function alerts() { return listFrom(state().network, 'alerts').slice(0, 8); }
  function listFrom(payload, ...keys) { if (Array.isArray(payload)) return payload; for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key]; return []; }

  function ensureWorkspace() {
    if (document.getElementById(WORKSPACE_ID)) return;
    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'os-safe-backdrop';
    const workspace = document.createElement('section');
    workspace.id = WORKSPACE_ID;
    workspace.className = 'os-safe-workspace';
    workspace.innerHTML = `<header class="os-safe-head"><div><h3 data-os-safe-title>Operational workspace</h3><p data-os-safe-subtitle>Connected care context</p></div><button class="os-safe-close" type="button" aria-label="Close workspace">×</button></header><div class="os-safe-body" data-os-safe-body></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(workspace);
    backdrop.addEventListener('click', closeWorkspace);
    workspace.querySelector('.os-safe-close')?.addEventListener('click', closeWorkspace);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeWorkspace(); });
  }

  function openWorkspace(title, subtitle, mainHtml, railHtml = '') {
    ensureWorkspace();
    document.querySelector('[data-os-safe-title]').textContent = title;
    document.querySelector('[data-os-safe-subtitle]').textContent = subtitle || 'Connected operational context';
    document.querySelector('[data-os-safe-body]').innerHTML = `<main>${mainHtml}</main><aside>${railHtml || contextRail(title)}</aside>`;
    document.getElementById(WORKSPACE_ID).classList.add('open');
    document.getElementById(BACKDROP_ID).classList.add('open');
    bindWorkspaceActions();
  }

  function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.classList.remove('open');
    document.getElementById(BACKDROP_ID)?.classList.remove('open');
  }

  function contextRail(topic) {
    const recent = timeline().slice(0, 4);
    return `<section class="os-safe-panel"><h4>Current context</h4><p><strong>${esc(childName())}</strong></p><p>Topic: ${esc(topic)}</p></section><section class="os-safe-panel"><h4>Recent chronology</h4>${recent.length ? recent.map(item => miniItem(item.title || item.event_title || 'Timeline entry', item.summary || item.event_summary || item.narrative || '')).join('') : '<p>No child chronology loaded yet.</p>'}</section><section class="os-safe-panel"><h4>Assistant</h4><p>Ask IndiCare to summarise context, risks, child voice, continuity actions or reporting wording.</p><div class="os-safe-actions"><button class="primary" data-os-safe-ask="context">Ask IndiCare</button></div></section>`;
  }

  function miniItem(title, text) { return `<div class="os-safe-mini-item"><strong>${esc(title)}</strong><br><small>${esc(text || '').slice(0, 180)}</small></div>`; }

  function bindWorkspaceActions() {
    document.querySelectorAll('[data-os-safe-record]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => window.IndiCareTherapeuticRecordCreator?.open?.(btn.dataset.osSafeRecord || 'daily_note'));
    });
    document.querySelectorAll('[data-os-safe-ask]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => askAssistant(btn.dataset.osSafeAsk || 'context'));
    });
  }

  function askAssistant(topic) {
    const prompt = `Context: ${topic}. Young person: ${childName()}. Summarise relevant chronology, safeguarding context, child voice, continuity actions and what adults should know next.`;
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(prompt);
  }

  function openCommandWorkspace(item = {}) {
    openWorkspace(item.title || 'Command item', 'Immediate operational action', `<section class="os-safe-panel"><h4>What needs attention?</h4><p>${esc(item.summary || item.recommended_action || 'Review this operational priority and decide next action.')}</p><div class="os-safe-actions"><button class="primary" data-os-safe-record="daily_note">Create record</button><button data-os-safe-ask="command">Ask IndiCare</button></div></section><section class="os-safe-panel"><h4>Linked records</h4>${records().length ? records().slice(0, 5).map(r => miniItem(r.title || r.record_type, r.summary || r.narrative)).join('') : '<p>No linked records loaded yet.</p>'}</section>`);
  }

  function openSafeguardingWorkspace(item = {}) {
    openWorkspace(item.title || 'Safeguarding workspace', 'Safeguarding, chronology and follow-up', `<section class="os-safe-panel"><h4>Safeguarding concern</h4><p>${esc(item.summary || 'Review concern, chronology, immediate safety and follow-up.')}</p><div class="os-safe-actions"><button class="primary" data-os-safe-record="safeguarding">Create safeguarding record</button><button data-os-safe-record="incident">Create incident</button><button data-os-safe-record="missing_episode">Missing episode</button><button data-os-safe-ask="safeguarding">Ask IndiCare</button></div></section><section class="os-safe-panel"><h4>Safeguarding patterns</h4>${patterns().length ? patterns().map(p => miniItem(p.title, p.summary)).join('') : '<p>No patterns loaded yet.</p>'}</section>`);
  }

  function openPlacementWorkspace(item = {}) {
    openWorkspace('Placement stability', 'Placement risk, protective factors and continuity', `<section class="os-safe-panel"><h4>Placement picture</h4><p>${esc(item.summary || item.intervention_urgency || 'Review placement stability and protective factors.')}</p><div class="os-safe-actions"><button class="primary" data-os-safe-record="daily_note">Record update</button><button data-os-safe-ask="placement stability">Ask IndiCare</button></div></section><section class="os-safe-panel"><h4>Placement indicators</h4>${placements().length ? placements().map(p => miniItem(`Young person ${p.young_person_id || ''}`, `Risk ${p.disruption_risk_score || 0} · Stability ${p.stability_score || 0}`)).join('') : '<p>No placement indicators loaded yet.</p>'}</section>`);
  }

  function openChronologyWorkspace(item = {}) {
    openWorkspace(item.title || item.event_title || 'Chronology entry', 'Narrative child journey context', `<section class="os-safe-panel"><h4>Chronology meaning</h4><p>${esc(item.summary || item.event_summary || item.narrative || 'Review this chronology item in context.')}</p><div class="os-safe-actions"><button class="primary" data-os-safe-record="journey">Add journey note</button><button data-os-safe-ask="chronology">Ask IndiCare</button></div></section><section class="os-safe-panel"><h4>Nearby chronology</h4>${timeline().slice(0, 8).map(t => miniItem(t.title || t.event_title, t.summary || t.event_summary || t.narrative)).join('') || '<p>No timeline loaded.</p>'}</section>`);
  }

  function makeExistingCardsClickable() {
    const mappings = [
      ['#command-list .ic-item', commands, openCommandWorkspace],
      ['#pattern-list .ic-item, #safeguarding-board .ic-item', patterns, openSafeguardingWorkspace],
      ['#placement-list .ic-item, #placements-board .ic-item', placements, openPlacementWorkspace],
      ['#chronology-board .ic-item, #child-workspace .timeline-row, #child-workspace .ic-item', timeline, openChronologyWorkspace],
      ['#alerts .ic-item, #network-board .ic-item', alerts, openSafeguardingWorkspace],
      ['#recommendations .ic-item', () => [], (item) => openWorkspace('Leadership recommendation', 'Connected action workspace', `<section class="os-safe-panel"><h4>Recommendation</h4><p>${esc(item.title || item.summary || 'Review this recommendation.')}</p><div class="os-safe-actions"><button class="primary" data-os-safe-ask="leadership recommendation">Ask IndiCare</button><button data-os-safe-record="daily_note">Create record</button></div></section>`)]
    ];
    mappings.forEach(([selector, getter, opener]) => {
      document.querySelectorAll(selector).forEach((node, index) => {
        if (node.dataset.safeClickable === 'true') return;
        node.dataset.safeClickable = 'true';
        node.classList.add('os-safe-clickable');
        node.setAttribute('role', 'button');
        node.tabIndex = 0;
        const handler = () => {
          const source = typeof getter === 'function' ? getter() : [];
          const item = Array.isArray(source) ? (source[index] || {}) : {};
          opener(item);
        };
        node.addEventListener('click', handler);
        node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(); } });
      });
    });
  }

  function renderContinuityStrip() {
    const workspace = document.getElementById('workspace') || document.querySelector('.ic-workspace');
    if (!workspace) return;
    let strip = document.getElementById(CONTINUITY_ID);
    if (!strip) {
      strip = document.createElement('section');
      strip.id = CONTINUITY_ID;
      strip.className = 'os-safe-continuity';
      workspace.appendChild(strip);
    }
    const openCommands = commands().length;
    const safeguardCount = patterns().length + alerts().length;
    const recentRecords = records().length;
    const recentTimeline = timeline().length;
    strip.innerHTML = `<div class="os-safe-continuity-grid"><div class="os-safe-continuity-card"><strong>${openCommands}</strong><small>open command items</small></div><div class="os-safe-continuity-card"><strong>${safeguardCount}</strong><small>safeguarding signals</small></div><div class="os-safe-continuity-card"><strong>${recentRecords}</strong><small>recent records</small></div><div class="os-safe-continuity-card"><strong>${recentTimeline}</strong><small>chronology items</small></div><div class="os-safe-continuity-card os-safe-clickable" data-os-safe-continuity-ask><strong>What adults should know</strong><small>Ask IndiCare for today’s continuity summary</small></div></div>`;
    strip.querySelector('[data-os-safe-continuity-ask]')?.addEventListener('click', () => askAssistant('continuity summary'));
  }

  function patchLoadAll() {
    if (window.__osSafeLoadAllPatched || typeof window.loadAll !== 'function') return;
    window.__osSafeLoadAllPatched = true;
    const original = window.loadAll;
    window.loadAll = async function patchedLoadAll(...args) {
      const result = await original.apply(this, args);
      setTimeout(refresh, 50);
      return result;
    };
  }

  function refresh() {
    safe('refresh', () => { makeExistingCardsClickable(); renderContinuityStrip(); bindWorkspaceActions(); });
  }

  function boot() {
    injectStyles();
    ensureWorkspace();
    patchLoadAll();
    refresh();
    document.addEventListener('indicare:care-data-changed', () => setTimeout(refresh, 80));
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('os-safe-links-refresh', refresh, 150) || setTimeout(refresh, 150));
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareOperationalLinks = { openWorkspace, openCommandWorkspace, openSafeguardingWorkspace, openPlacementWorkspace, openChronologyWorkspace, refresh };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => safe('boot', boot)); else safe('boot', boot);
})();
