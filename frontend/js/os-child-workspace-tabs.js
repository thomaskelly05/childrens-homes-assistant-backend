(() => {
  const TAB_DEFS = [
    ['overview', 'Overview'],
    ['journey', 'Child Journey'],
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
  const DRAWER_ID = 'universal-record-drawer';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .child-workspace-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px;padding:8px;border:1px solid var(--ic-border,#dbe7f3);background:var(--ic-surface-soft,#f8fafc);border-radius:18px}.child-workspace-tab{border:0;border-radius:999px;padding:9px 12px;background:transparent;color:var(--ic-muted,#64748b);font-weight:850;font-size:12px}.child-workspace-tab:hover,.child-workspace-tab.active{background:#dbeafe;color:#1d4ed8}.child-tab-view{display:none}.child-tab-view.active{display:block}.child-tab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}.child-tab-section-title{font-size:14px;font-weight:900;color:var(--ic-muted,#64748b);text-transform:uppercase;letter-spacing:.06em;margin:2px 0 10px}.universal-record-toolbar{display:grid;grid-template-columns:1fr 180px 160px;gap:10px;margin:0 0 14px}.universal-record-toolbar input,.universal-record-toolbar select{border:1px solid var(--ic-border,#dbe7f3);border-radius:14px;padding:10px;background:#fff}.universal-record-card{border:1px solid var(--ic-border,#dbe7f3);background:var(--ic-surface-soft,#f8fafc);border-radius:18px;padding:13px;text-align:left;width:100%;display:block}.universal-record-card:hover{background:#fff;border-color:var(--ic-border-strong,#bdd3ea)}.universal-record-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;color:var(--ic-muted,#64748b);font-size:12px}.record-drawer-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);z-index:80;display:none}.record-drawer-backdrop.open{display:block}.record-drawer{position:fixed;top:0;right:0;width:min(720px,96vw);height:100vh;background:#fff;box-shadow:-24px 0 60px rgba(15,23,42,.22);z-index:81;transform:translateX(105%);transition:transform .18s ease;display:flex;flex-direction:column}.record-drawer.open{transform:translateX(0)}.record-drawer-head{padding:18px;border-bottom:1px solid var(--ic-border,#dbe7f3);display:flex;justify-content:space-between;gap:16px}.record-drawer-body{padding:18px;overflow:auto}.record-drawer-close{border:0;background:#eef4fb;border-radius:999px;width:36px;height:36px;font-weight:900}.record-section{border:1px solid var(--ic-border,#dbe7f3);border-radius:18px;padding:14px;margin-bottom:12px;background:#f8fafc}.record-section h4{margin:0 0 8px}.record-field-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.record-field{font-size:13px}.record-field strong{display:block;color:var(--ic-muted,#64748b);font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}.manager-action-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.manager-action-row button{border:0;border-radius:12px;padding:10px 12px;font-weight:900}.action-approve{background:#dcfce7;color:#166534}.action-return{background:#fee2e2;color:#991b1b}.action-review{background:#fef3c7;color:#92400e}.action-comment{background:#dbeafe;color:#1d4ed8}.manager-comment-box{width:100%;min-height:86px;border:1px solid var(--ic-border,#dbe7f3);border-radius:14px;padding:10px;margin-top:10px}@media(max-width:760px){.universal-record-toolbar{grid-template-columns:1fr}.record-drawer{width:100vw}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function badge(value) { const raw = String(value || 'monitor'); return `<span class="ic-badge ic-badge-${esc(raw.replaceAll('_','-'))}">${esc(raw.replaceAll('_',' '))}</span>`; }
  function listFrom(payload, ...keys) { if (Array.isArray(payload)) return payload; for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key]; return []; }
  function empty(text) { return `<div class="ic-empty">${esc(text)}</div>`; }
  function childId() { return window.state?.selectedChild?.profile?.young_person_id || window.state?.selectedChild?.profile?.id; }
  function headers() { return { 'Content-Type': 'application/json', 'X-User-Id': new URLSearchParams(location.search).get('user_id') || '1', 'X-Role': new URLSearchParams(location.search).get('role') || 'manager' }; }

  function ensureDrawer() {
    if (document.getElementById(DRAWER_ID)) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'record-drawer-backdrop';
    backdrop.id = `${DRAWER_ID}-backdrop`;
    const drawer = document.createElement('aside');
    drawer.className = 'record-drawer';
    drawer.id = DRAWER_ID;
    drawer.innerHTML = `<div class="record-drawer-head"><div><h3 class="ic-h3" id="record-drawer-title">Record</h3><small class="ic-card-subtitle" id="record-drawer-subtitle">Full record detail</small></div><button class="record-drawer-close" type="button" aria-label="Close record">×</button></div><div class="record-drawer-body" id="record-drawer-body"></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    backdrop.addEventListener('click', closeDrawer);
    drawer.querySelector('.record-drawer-close').addEventListener('click', closeDrawer);
  }

  function closeDrawer() {
    document.getElementById(DRAWER_ID)?.classList.remove('open');
    document.getElementById(`${DRAWER_ID}-backdrop`)?.classList.remove('open');
  }

  async function reviewRecord(recordId, action) {
    const comment = document.getElementById('manager-review-comment')?.value || '';
    if ((action === 'return' || action === 'comment') && !comment.trim()) {
      alert('Please add a manager comment first.');
      return;
    }
    try {
      const res = await fetch(`/api/universal-records/record/${encodeURIComponent(recordId)}/review`, {
        method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ action, comment })
      });
      if (!res.ok) throw new Error(await res.text());
      if (window.toast) window.toast(action === 'approve' ? 'Record approved' : 'Manager action saved');
      await openUniversalRecord(recordId);
      const root = document.getElementById('child-workspace');
      const active = root?.querySelector('.child-tab-view.active')?.dataset?.childTabView;
      if (active) await loadUniversalRecords(active, root);
    } catch (error) {
      alert('Could not update record: ' + error.message);
    }
  }

  async function openUniversalRecord(recordId) {
    ensureDrawer();
    const drawer = document.getElementById(DRAWER_ID);
    const body = document.getElementById('record-drawer-body');
    document.getElementById('record-drawer-title').textContent = 'Loading record...';
    document.getElementById('record-drawer-subtitle').textContent = '';
    body.innerHTML = empty('Loading full record...');
    drawer.classList.add('open');
    document.getElementById(`${DRAWER_ID}-backdrop`).classList.add('open');
    try {
      const res = await fetch(`/api/universal-records/record/${encodeURIComponent(recordId)}`, { credentials: 'include' });
      const data = await res.json();
      const r = data.record;
      if (!r) { body.innerHTML = empty('Record not found.'); return; }
      document.getElementById('record-drawer-title').textContent = r.title || 'Record';
      document.getElementById('record-drawer-subtitle').textContent = `${r.record_type || 'record'} · ${r.source_table || ''} #${r.source_id || ''}`;
      const links = listFrom(data, 'links');
      const comments = listFrom(data, 'comments');
      const attachments = listFrom(data, 'attachments');
      const audit = listFrom(data, 'audit');
      const quality = listFrom(data, 'quality_checks');
      body.innerHTML = `
        <section class="record-section"><h4>Manager review</h4><div class="record-field-grid"><div class="record-field"><strong>Status</strong>${esc(r.status || '—')}</div><div class="record-field"><strong>Review state</strong>${esc(r.review_state || '—')}</div><div class="record-field"><strong>Manager review</strong>${r.manager_review_required ? 'Required' : 'Not required'}</div><div class="record-field"><strong>Reviewed at</strong>${esc(r.reviewed_at || '—')}</div></div><textarea id="manager-review-comment" class="manager-comment-box" placeholder="Add manager comment, approval note or return reason..."></textarea><div class="manager-action-row"><button class="action-approve" data-review-action="approve">Approve</button><button class="action-return" data-review-action="return">Return for amendment</button><button class="action-review" data-review-action="require_review">Require review</button><button class="action-comment" data-review-action="comment">Add comment</button></div></section>
        <section class="record-section"><h4>Record summary</h4><p>${esc(r.summary || r.narrative || 'No summary recorded.')}</p>${r.child_voice ? `<p><strong>Child voice:</strong> ${esc(r.child_voice)}</p>` : ''}${r.staff_analysis || r.staff_reflection ? `<p><strong>Staff reflection:</strong> ${esc(r.staff_analysis || r.staff_reflection)}</p>` : ''}${r.therapeutic_analysis ? `<p><strong>Therapeutic analysis:</strong> ${esc(r.therapeutic_analysis)}</p>` : ''}</section>
        <section class="record-section"><h4>Key details</h4><div class="record-field-grid">${['record_type','record_category','status','priority','risk_level','review_state','occurred_at','created_at','sccif_area'].map(k => `<div class="record-field"><strong>${esc(k.replaceAll('_',' '))}</strong>${esc(r[k] || '—')}</div>`).join('')}</div></section>
        <section class="record-section"><h4>Safeguarding / inspection</h4><div class="record-field-grid"><div class="record-field"><strong>Safeguarding relevant</strong>${r.safeguarding_relevant ? 'Yes' : 'No'}</div><div class="record-field"><strong>Inspection relevant</strong>${r.inspection_relevant ? 'Yes' : 'No'}</div><div class="record-field"><strong>Restricted</strong>${r.restricted ? 'Yes' : 'No'}</div></div></section>
        <section class="record-section"><h4>Linked records</h4>${links.length ? links.map(l => `<div class="ic-item"><div class="ic-item-title">${esc(l.target_title || l.link_type)}</div><div class="ic-item-text">${esc(l.summary || l.target_record_type || '')}</div></div>`).join('') : empty('No linked records yet.')}</section>
        <section class="record-section"><h4>Attachments</h4>${attachments.length ? attachments.map(a => `<div class="ic-item"><div class="ic-item-title">${esc(a.file_name)}</div><div class="ic-item-text">${esc(a.mime_type || '')}</div></div>`).join('') : empty('No attachments yet.')}</section>
        <section class="record-section"><h4>Comments / management notes</h4>${comments.length ? comments.map(c => `<div class="ic-item"><div class="ic-item-title">${esc(c.comment_type)}</div><div class="ic-item-text">${esc(c.body)}</div></div>`).join('') : empty('No comments yet.')}</section>
        <section class="record-section"><h4>Therapeutic recording quality</h4>${quality.length ? quality.map(q => `<div class="ic-item"><div class="ic-item-title">Quality score ${esc(q.quality_score)}</div><div class="ic-item-text">${esc((q.suggestions || []).join(' · '))}</div></div>`).join('') : empty('No quality check yet.')}</section>
        <section class="record-section"><h4>Audit trail</h4>${audit.length ? audit.map(a => `<div class="ic-item"><div class="ic-item-title">${esc(a.event_type)}</div><div class="ic-item-text">${esc(a.event_summary || a.created_at || '')}</div></div>`).join('') : empty('No audit events yet.')}</section>
      `;
      body.querySelectorAll('[data-review-action]').forEach(btn => btn.addEventListener('click', () => reviewRecord(recordId, btn.dataset.reviewAction)));
    } catch (err) { body.innerHTML = empty('Could not load this record.'); }
  }

  async function loadUniversalRecords(tabKey, root) {
    const yp = childId();
    if (!yp) return;
    const view = root.querySelector(`[data-child-tab-view="${tabKey}"]`);
    if (!view) return;
    const q = view.querySelector('[data-record-search]')?.value || '';
    const category = view.querySelector('[data-record-category]')?.value || categoryForTab(tabKey);
    const risk = view.querySelector('[data-record-risk]')?.value || '';
    const params = new URLSearchParams({ young_person_id: yp, limit: '200' });
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (risk) params.set('risk_level', risk);
    const list = view.querySelector('[data-universal-record-list]');
    if (!list) return;
    list.innerHTML = empty('Loading records...');
    try {
      const res = await fetch(`/api/universal-records/search?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      const records = listFrom(data, 'records');
      list.innerHTML = records.length ? records.map(recordCard).join('') : empty('No records match these filters.');
      list.querySelectorAll('[data-record-id]').forEach(btn => btn.addEventListener('click', () => openUniversalRecord(btn.dataset.recordId)));
    } catch (err) { list.innerHTML = empty('Could not load searchable records.'); }
  }

  function categoryForTab(tabKey) { return { care: 'care_record', safeguarding: 'safeguarding', plans: 'plan', education: 'education', health: 'health', family: 'family', keywork: 'keywork', incidents: 'safeguarding' }[tabKey] || ''; }
  function recordToolbar(tabKey) { return `<div class="universal-record-toolbar"><input data-record-search placeholder="Search ${esc(tabKey.replaceAll('-',' '))} records..." /><select data-record-category><option value="${esc(categoryForTab(tabKey))}">${esc(categoryForTab(tabKey) || 'All categories')}</option><option value="">All categories</option><option value="care_record">Care records</option><option value="safeguarding">Safeguarding</option><option value="risk">Risk</option><option value="plan">Plans</option><option value="education">Education</option><option value="health">Health</option><option value="family">Family</option><option value="keywork">Key work</option></select><select data-record-risk><option value="">All risk</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div class="ic-list" data-universal-record-list>${empty('Select this tab to load records.')}</div>`; }
  function recordCard(r) { return `<button type="button" class="universal-record-card" data-record-id="${esc(r.id)}"><div class="ic-item-top"><div><div class="ic-item-title">${esc(r.title || r.record_type || 'Record')}</div><div class="ic-item-text">${esc(r.summary || '').slice(0, 260)}</div><div class="universal-record-meta"><span>${esc(r.record_type || 'record')}</span><span>${esc(r.record_category || '')}</span><span>${esc(r.occurred_at ? new Date(r.occurred_at).toLocaleDateString() : '')}</span>${r.safeguarding_relevant ? '<span>Safeguarding</span>' : ''}${r.manager_review_required ? '<span>Manager review</span>' : ''}</div></div>${badge(r.risk_level || r.priority || r.status)}</div></button>`; }

  function renderChildTabs(data) {
    const p = data?.profile || {}; const timeline = listFrom(data, 'timeline', 'events'); const commandItems = listFrom(data, 'command_items');
    return `<div class="child-workspace-tabs" role="tablist">${TAB_DEFS.map(([key,label],i)=>`<button type="button" class="child-workspace-tab ${i===0?'active':''}" data-child-tab="${key}">${label}</button>`).join('')}</div><section class="child-tab-view active" data-child-tab-view="overview"><div class="child-tab-grid"><div class="ic-metric"><strong class="ic-metric-value">${esc(p.records_today||0)}</strong><span class="ic-metric-label">Records today</span></div><div class="ic-metric"><strong class="ic-metric-value">${esc(p.manager_review_count||0)}</strong><span class="ic-metric-label">Manager reviews</span></div><div class="ic-metric"><strong class="ic-metric-value">${esc(p.open_commands||commandItems.length||0)}</strong><span class="ic-metric-label">Open commands</span></div><div class="ic-metric"><strong class="ic-metric-value">${esc(Math.round(p.disruption_risk_score||data?.placement_stability?.disruption_risk_score||0))}</strong><span class="ic-metric-label">Disruption risk</span></div></div><div class="child-tab-section-title">Latest chronology</div>${timelineRows(timeline.slice(0,6))}</section><section class="child-tab-view" data-child-tab-view="journey"><div class="child-tab-section-title">Full child journey</div>${recordToolbar('journey')}</section><section class="child-tab-view" data-child-tab-view="care"><div class="child-tab-section-title">Care notes and daily records</div>${recordToolbar('care')}</section><section class="child-tab-view" data-child-tab-view="safeguarding"><div class="child-tab-section-title">Safeguarding records, alerts and concerns</div>${recordToolbar('safeguarding')}</section><section class="child-tab-view" data-child-tab-view="plans"><div class="child-tab-section-title">Risk assessments, support plans and reviews</div>${recordToolbar('plans')}</section><section class="child-tab-view" data-child-tab-view="education"><div class="child-tab-section-title">Education records</div>${recordToolbar('education')}</section><section class="child-tab-view" data-child-tab-view="health"><div class="child-tab-section-title">Health and wellbeing records</div>${recordToolbar('health')}</section><section class="child-tab-view" data-child-tab-view="family"><div class="child-tab-section-title">Family contact records</div>${recordToolbar('family')}</section><section class="child-tab-view" data-child-tab-view="keywork"><div class="child-tab-section-title">Key work records</div>${recordToolbar('keywork')}</section><section class="child-tab-view" data-child-tab-view="incidents"><div class="child-tab-section-title">Incidents and missing episodes</div>${recordToolbar('incidents')}</section><section class="child-tab-view" data-child-tab-view="command"><div class="child-tab-section-title">Command items</div><div class="ic-list">${commandItems.length?commandItems.map(r=>`<div class="ic-item"><div class="ic-item-top"><div><div class="ic-item-title">${esc(r.title)}</div><div class="ic-item-text">${esc(r.summary||r.recommended_action||'')}</div></div>${badge(r.priority||r.status)}</div></div>`).join(''):empty('No command items for this child.')}</div></section>`;
  }
  function timelineRows(rows) { return rows.length ? `<div class="timeline">${rows.map((t)=>`<div class="timeline-row"><div class="ic-item"><div class="ic-item-top"><div><div class="ic-item-title">${esc(t.title||t.event_title||t.source_type||'Timeline entry')}</div><div class="ic-item-text">${esc(t.summary||t.event_summary||t.narrative||'')}</div>${t.child_voice?`<div class="ic-item-text"><strong>Child voice:</strong> ${esc(t.child_voice)}</div>`:''}</div>${badge(t.timeline_state||t.status||'recorded')}</div></div></div>`).join('')}</div>` : empty('No timeline entries yet.'); }
  function activateTab(root, key) { root.querySelectorAll('.child-workspace-tab').forEach((btn)=>btn.classList.toggle('active', btn.dataset.childTab===key)); root.querySelectorAll('.child-tab-view').forEach((view)=>view.classList.toggle('active', view.dataset.childTabView===key)); if (!['overview','command'].includes(key)) loadUniversalRecords(key, root); }
  function bindRecordFilters(root) { root.querySelectorAll('[data-record-search],[data-record-category],[data-record-risk]').forEach((control) => { const handler = () => { const view = control.closest('[data-child-tab-view]'); if (view?.dataset?.childTabView) loadUniversalRecords(view.dataset.childTabView, root); }; control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', debounce(handler, 250)); }); }
  function debounce(fn, wait) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
  function enhanceCurrentChildWorkspace() { const root = document.getElementById('child-workspace'); const data = window.state?.selectedChild; if (!root || !data?.profile) return false; root.innerHTML = renderChildTabs(data); root.querySelectorAll('.child-workspace-tab').forEach((btn)=>btn.addEventListener('click',()=>activateTab(root, btn.dataset.childTab))); bindRecordFilters(root); return true; }
  function patchOpenChild() { if (window[PATCH_FLAG]) return; const originalOpenChild = window.openChild; if (typeof originalOpenChild !== 'function') return; window.openChild = async function patchedOpenChild(...args) { const result = await originalOpenChild.apply(this,args); enhanceCurrentChildWorkspace(); return result; }; window[PATCH_FLAG] = true; }
  function boot() { injectStyles(); ensureDrawer(); patchOpenChild(); window.loadUniversalRecords = loadUniversalRecords; const observer = new MutationObserver(()=>{ patchOpenChild(); const root=document.getElementById('child-workspace'); if(root&&window.state?.selectedChild?.profile&&!root.querySelector('.child-workspace-tabs')) enhanceCurrentChildWorkspace(); }); observer.observe(document.body,{childList:true,subtree:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
