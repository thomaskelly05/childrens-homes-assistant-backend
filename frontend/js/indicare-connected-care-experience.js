(() => {
  const STYLE_ID = 'indicare-connected-care-experience-style';
  const FLAG = '__indicareConnectedCareExperience';
  const ROOT_ID = 'connected-care-launcher-root';
  let refreshTimer = null;

  const RECORD_TYPES = [
    { key: 'daily_note', label: 'Daily Living Note', hint: 'Whole-child daily diary', group: 'Everyday care' },
    { key: 'achievement', label: 'Achievement', hint: 'Strengths, progress and positives', group: 'Everyday care' },
    { key: 'child_voice', label: 'Child Voice', hint: 'Wishes, feelings and participation', group: 'Everyday care' },
    { key: 'incident', label: 'Incident', hint: 'Safeguarding-aware event record', group: 'Safeguarding' },
    { key: 'missing_episode', label: 'Missing Episode', hint: 'Contextual safeguarding workflow', group: 'Safeguarding' },
    { key: 'physical_intervention', label: 'Physical Intervention', hint: 'Debrief, repair and review', group: 'Safeguarding' },
    { key: 'keywork', label: 'Key Work', hint: 'Reflective direct work', group: 'Therapeutic' },
    { key: 'health', label: 'Health / Wellbeing', hint: 'Health, CAMHS, medication, wellbeing', group: 'Life areas' },
    { key: 'education', label: 'Education Update', hint: 'School, PEP, attendance, learning', group: 'Life areas' },
    { key: 'family', label: 'Family Time', hint: 'Contact, relationships and emotional impact', group: 'Life areas' },
    { key: 'doc_analyse', label: 'Analyse Document', hint: 'Classify, route and create reminders', group: 'Documents' },
    { key: 'doc_reminders', label: 'Document Reminders', hint: 'Upcoming expiry/review reminders', group: 'Documents' },
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `.care-launcher{position:fixed;left:22px;bottom:22px;z-index:148;display:flex;gap:10px;align-items:center}.care-launcher-btn{border:0;border-radius:22px;background:linear-gradient(135deg,#0f766e,#155eef);color:#fff;font-weight:950;padding:15px 18px;box-shadow:0 22px 60px rgba(15,118,110,.28);cursor:pointer}.care-launcher-mini{border:0;border-radius:18px;background:#fff;color:#155eef;font-weight:950;padding:13px 15px;box-shadow:0 14px 40px rgba(15,23,42,.16);border:1px solid #dbe7f3}.care-launcher-panel{position:fixed;left:22px;bottom:88px;width:min(460px,calc(100vw - 44px));max-height:min(760px,calc(100vh - 120px));overflow:auto;background:#fff;border:1px solid #dbe7f3;border-radius:26px;box-shadow:0 28px 80px rgba(15,23,42,.24);z-index:149;display:none;padding:14px}.care-launcher-panel.open{display:block}.care-launcher-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.care-launcher-head h3{margin:0;color:#0f172a}.care-launcher-head p{margin:3px 0 0;color:#64748b;font-size:12px}.care-launcher-close{border:0;border-radius:999px;background:#e2e8f0;width:32px;height:32px;font-weight:950}.care-group-title{font-size:11px;font-weight:950;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 7px}.care-record-option{border:1px solid #e2e8f0;background:#f8fafc;border-radius:18px;padding:12px;text-align:left;width:100%;margin-bottom:7px;display:flex;justify-content:space-between;gap:10px;align-items:center}.care-context-card{border:1px solid #dbe7f3;background:#f8fafc;border-radius:18px;padding:11px;margin:10px 0;color:#334155;font-size:12px}.care-context-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}.care-context-mini{border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:7px}.care-search{width:100%;border:1px solid #cbd5e1;border-radius:16px;padding:11px;margin:8px 0 2px;font:inherit}.care-shortcuts{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.care-chip{border:0;border-radius:999px;background:#eef4fb;color:#334155;font-weight:900;padding:7px 9px}.care-toast{position:fixed;left:22px;bottom:88px;z-index:170;width:min(440px,calc(100vw - 44px));background:#fff;border:1px solid #dbe7f3;border-radius:20px;box-shadow:0 22px 60px rgba(15,23,42,.2);padding:13px;display:grid;gap:7px}@media(max-width:760px){.care-launcher{left:14px;right:14px;bottom:14px}.care-launcher-btn{flex:1}.care-launcher-panel{left:14px;bottom:76px;width:calc(100vw - 28px)}.care-context-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function qs() { return new URLSearchParams(location.search); }
  function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
  function childProfile() { return window.state?.selectedChild?.profile || window.childProfile || {}; }
  function childId() { const p = childProfile(); return numberOrNull(p.young_person_id || p.id || qs().get('young_person_id') || qs().get('child_id')); }
  function homeId() { return numberOrNull(childProfile().home_id || window.state?.home_id || qs().get('home_id')) || 1; }
  function providerId() { return numberOrNull(childProfile().provider_id || window.state?.provider_id || qs().get('provider_id')); }

  function currentContext() {
    const p = childProfile();
    return {
      young_person_id: childId(),
      home_id: homeId(),
      provider_id: providerId(),
      page: location.pathname + location.hash,
      child_name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' '),
      records_today: p.records_today || 0,
      manager_reviews: p.manager_review_count || 0,
      open_commands: p.open_commands || window.state?.selectedChild?.command_items?.length || 0,
      disruption_risk: Math.round(p.disruption_risk_score || window.state?.selectedChild?.placement_stability?.disruption_risk_score || 0),
    };
  }

  function ensureLauncher() {
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `<div class="care-launcher"><button class="care-launcher-btn" type="button" data-care-open title="Alt+R">+ Record</button><button class="care-launcher-mini" type="button" data-care-assistant title="Alt+I">Ask IndiCare</button></div><section class="care-launcher-panel" data-care-panel><div class="care-launcher-head"><div><h3>Record care</h3><p>Accessible anywhere. Opens the therapeutic pull-page workspace.</p></div><button class="care-launcher-close" type="button" data-care-close>×</button></div><div class="care-context-card" data-care-context></div><div class="care-shortcuts"><button class="care-chip" data-care-shortcut="daily_note">Daily</button><button class="care-chip" data-care-shortcut="incident">Incident</button><button class="care-chip" data-care-shortcut="keywork">Key work</button><button class="care-chip" data-care-shortcut="ask">Ask</button></div><input class="care-search" data-care-search placeholder="Search actions: daily, incident, document, review..." /><div data-care-options></div></section>`;
    document.body.appendChild(root);
    root.querySelector('[data-care-open]')?.addEventListener('click', togglePanel);
    root.querySelector('[data-care-close]')?.addEventListener('click', closePanel);
    root.querySelector('[data-care-assistant]')?.addEventListener('click', askAssistantAboutContext);
    root.querySelector('[data-care-search]')?.addEventListener('input', renderOptions);
    root.querySelectorAll('[data-care-shortcut]').forEach(btn => btn.addEventListener('click', () => {
      const key = btn.dataset.careShortcut;
      if (key === 'ask') return askAssistantAboutContext();
      openRecord(key);
    }));
    renderOptions();
    return root;
  }

  function togglePanel() { renderOptions(); document.querySelector('[data-care-panel]')?.classList.toggle('open'); document.querySelector('[data-care-search]')?.focus?.(); }
  function closePanel() { document.querySelector('[data-care-panel]')?.classList.remove('open'); }

  function renderOptions() {
    const context = currentContext();
    const contextEl = document.querySelector('[data-care-context]');
    if (contextEl) contextEl.innerHTML = `<strong>Current context</strong><br>${context.child_name ? esc(context.child_name) : 'No child selected'} · Home ${esc(context.home_id || '—')}<br><small>${esc(context.page)}</small><div class="care-context-grid"><div class="care-context-mini"><strong>${esc(context.records_today)}</strong><span>records today</span></div><div class="care-context-mini"><strong>${esc(context.manager_reviews)}</strong><span>manager reviews</span></div><div class="care-context-mini"><strong>${esc(context.open_commands)}</strong><span>open actions</span></div></div>`;
    const options = document.querySelector('[data-care-options]');
    if (!options) return;
    const q = String(document.querySelector('[data-care-search]')?.value || '').trim().toLowerCase();
    const visible = RECORD_TYPES.filter(item => !q || `${item.key} ${item.label} ${item.hint} ${item.group}`.toLowerCase().includes(q));
    const grouped = visible.reduce((acc, item) => { (acc[item.group] ||= []).push(item); return acc; }, {});
    options.innerHTML = Object.entries(grouped).map(([group, items]) => `<div class="care-group-title">${esc(group)}</div>${items.map((item) => `<button class="care-record-option" type="button" data-care-record-type="${esc(item.key)}"><span><strong>${esc(item.label)}</strong><small>${esc(item.hint)}</small></span><span>›</span></button>`).join('')}`).join('') || `<div class="care-context-card">No matching actions.</div>`;
    options.querySelectorAll('[data-care-record-type]').forEach(btn => btn.addEventListener('click', () => openRecord(btn.dataset.careRecordType)));
  }

  function openRecord(type) {
    closePanel();
    const context = currentContext();
    if (type === 'doc_analyse') return window.IndiCareDocumentIntelligence?.open?.();
    if (type === 'doc_reminders') return window.IndiCareDocumentIntelligence?.reminders?.();
    if (!context.young_person_id && ['daily_note','incident','missing_episode','physical_intervention','keywork','child_voice','health','education','family','achievement'].includes(type)) {
      showToast('Select a child first', 'Open a child card first so the record is correctly linked to their journey.', []);
      return;
    }
    if (window.IndiCareYoungPersonWorkspace?.newRecord) window.IndiCareYoungPersonWorkspace.newRecord(normaliseRecordType(type));
    else showToast('Workspace not ready', 'Open a child card and try again.', []);
  }

  function normaliseRecordType(type) { return ['education','health','family','achievement','child_voice'].includes(type) ? 'daily_note' : type; }
  function assistantContextPrompt(prefix = '') { const c = currentContext(); return `Current context: child=${c.child_name || 'none'}, home=${c.home_id}, page=${c.page}, records_today=${c.records_today}, manager_reviews=${c.manager_reviews}, open_actions=${c.open_commands}, disruption_risk=${c.disruption_risk}.\n${prefix}`.trim(); }
  function askAssistantAboutContext() { window.IndiCareOSAssistant?.open?.(); window.IndiCareOSAssistant?.ask?.(assistantContextPrompt('Summarise current priorities, open callbacks, recent chronology and what staff should be mindful of when recording today.')); }

  function showToast(title, body, actions = []) {
    document.querySelector('[data-care-toast]')?.remove();
    const toast = document.createElement('div');
    toast.className = 'care-toast';
    toast.dataset.careToast = 'true';
    toast.innerHTML = `<strong>${esc(title)}</strong><p>${esc(body)}</p><button type="button" data-care-toast-close>Dismiss</button>`;
    document.body.appendChild(toast);
    toast.querySelector('[data-care-toast-close]')?.addEventListener('click', () => toast.remove());
    setTimeout(() => toast.remove(), 8000);
  }

  function emitCareEvent(name, detail = {}) { window.IndiCareSafe?.emit?.(name, { ...detail, context: currentContext() }) || document.dispatchEvent(new CustomEvent(name, { detail: { ...detail, context: currentContext() } })); }

  function patchRefreshEvents() {
    if (window.__indicareCareRefreshPatched) return;
    window.__indicareCareRefreshPatched = true;
    document.addEventListener('indicare:document-intelligence-complete', (event) => {
      emitCareEvent('indicare:care-data-changed', { source: 'document_intelligence', result: event.detail });
      showToast('Document connected', 'The document was analysed and routed into the connected care record system.');
    });
    document.addEventListener('indicare:care-data-changed', () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        window.IndiCareSafe?.run?.('connected care child refresh', () => window.IndiCareYoungPersonWorkspace?.refresh?.());
        window.IndiCareSafe?.run?.('connected care workspace groups refresh', () => window.IndiCareWorkspaceGroups?.render?.());
      }, 250);
    });
  }

  function patchFetchForRecordSaves() {
    if (window.__indicareRecordSaveFetchPatched) return;
    window.__indicareRecordSaveFetchPatched = true;
    const originalFetch = window.fetch;
    window.fetch = async function connectedCareFetch(...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = String(args[0]?.url || args[0] || '');
        const method = String(args[1]?.method || 'GET').toUpperCase();
        if (['POST','PATCH','PUT'].includes(method) && /daily-notes|incidents|keywork|universal-records|document-intelligence|reg44-reader|tasks|actions|chronology|handover/i.test(url)) setTimeout(() => emitCareEvent('indicare:care-data-changed', { source_url: url, method }), 200);
      } catch {}
      return response;
    };
  }

  function bindKeyboardShortcuts() {
    if (window.__indicareCareKeyboardBound) return;
    window.__indicareCareKeyboardBound = true;
    document.addEventListener('keydown', (event) => {
      if (!event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'r') { event.preventDefault(); togglePanel(); }
      if (key === 'i') { event.preventDefault(); askAssistantAboutContext(); }
      if (key === 'd') { event.preventDefault(); openRecord('daily_note'); }
    });
  }

  function exposeGlobalApi() {
    window.IndiCareConnectedCare = { openLauncher: () => { renderOptions(); document.querySelector('[data-care-panel]')?.classList.add('open'); }, closeLauncher: closePanel, newRecord: openRecord, context: currentContext, assistantPrompt: assistantContextPrompt, refresh: () => emitCareEvent('indicare:care-data-changed', { source: 'manual' }), askAssistant: askAssistantAboutContext };
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    ensureLauncher();
    patchRefreshEvents();
    patchFetchForRecordSaves();
    bindKeyboardShortcuts();
    exposeGlobalApi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
