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
      .child-workspace-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px;padding:8px;border:1px solid var(--ic-border,#dbe7f3);background:var(--ic-surface-soft,#f8fafc);border-radius:18px}.child-workspace-tab{border:0;border-radius:999px;padding:9px 12px;background:transparent;color:var(--ic-muted,#64748b);font-weight:850;font-size:12px}.child-workspace-tab:hover,.child-workspace-tab.active{background:#dbeafe;color:#1d4ed8}.child-tab-view{display:none}.child-tab-view.active{display:block}.child-tab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}.child-tab-section-title{font-size:14px;font-weight:900;color:var(--ic-muted,#64748b);text-transform:uppercase;letter-spacing:.06em;margin:2px 0 10px}.universal-record-toolbar{display:grid;grid-template-columns:1fr 180px 160px auto;gap:10px;margin:0 0 14px}.universal-record-toolbar input,.universal-record-toolbar select{border:1px solid var(--ic-border,#dbe7f3);border-radius:14px;padding:10px;background:#fff}.new-record-btn{border:0;border-radius:14px;background:#155eef;color:#fff;font-weight:950;padding:10px 12px}.universal-record-card{border:1px solid var(--ic-border,#dbe7f3);background:var(--ic-surface-soft,#f8fafc);border-radius:18px;padding:13px;text-align:left;width:100%;display:block}.universal-record-card:hover{background:#fff;border-color:var(--ic-border-strong,#bdd3ea)}.universal-record-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;color:var(--ic-muted,#64748b);font-size:12px}.record-drawer-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);z-index:160;display:none}.record-drawer-backdrop.open{display:block}.record-drawer{position:fixed;top:0;right:0;width:min(1040px,96vw);height:100vh;background:#fff;box-shadow:-24px 0 70px rgba(15,23,42,.24);z-index:161;transform:translateX(105%);transition:transform .18s ease;display:flex;flex-direction:column}.record-drawer.open{transform:translateX(0)}.record-drawer-head{padding:18px 20px;border-bottom:1px solid var(--ic-border,#dbe7f3);display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:linear-gradient(180deg,#fff,#f8fafc)}.record-drawer-body{padding:18px;overflow:auto;background:#f8fafc;flex:1}.record-drawer-close{border:0;background:#eef4fb;border-radius:999px;width:36px;height:36px;font-weight:900}.record-workspace-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px}.record-workspace-main,.record-workspace-rail{min-width:0}.record-section{border:1px solid var(--ic-border,#dbe7f3);border-radius:20px;padding:14px;margin-bottom:12px;background:#fff}.record-section h4{margin:0 0 8px;color:#0f172a}.record-field-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.record-field{font-size:13px}.record-field strong{display:block;color:var(--ic-muted,#64748b);font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}.manager-action-row,.workspace-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.manager-action-row button,.workspace-actions button,.therapeutic-btn{border:0;border-radius:12px;padding:10px 12px;font-weight:900}.action-approve{background:#dcfce7;color:#166534}.action-return{background:#fee2e2;color:#991b1b}.action-review{background:#fef3c7;color:#92400e}.action-comment{background:#dbeafe;color:#1d4ed8}.manager-comment-box{width:100%;min-height:86px;border:1px solid var(--ic-border,#dbe7f3);border-radius:14px;padding:10px;margin-top:10px}.record-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.record-form-field{display:grid;gap:6px}.record-form-field.full{grid-column:1/-1}.record-form-field label{font-size:12px;font-weight:950;color:#334155}.record-form-field input,.record-form-field select,.record-form-field textarea{border:1px solid #cbd5e1;border-radius:14px;padding:10px;background:#fff;font:inherit}.record-form-field textarea{min-height:92px;resize:vertical}.therapeutic-panel{border:1px solid #dbe7f3;border-radius:20px;background:#fff;padding:13px;margin-bottom:12px}.therapeutic-score{display:flex;align-items:center;justify-content:space-between;gap:8px}.score-pill{border-radius:999px;padding:6px 10px;font-weight:950;background:#eef4fb;color:#334155}.score-pill.strong{background:#dcfce7;color:#166534}.score-pill.developing{background:#fef3c7;color:#92400e}.score-pill.needs_review{background:#fee2e2;color:#991b1b}.prompt-chip{display:block;width:100%;border:0;text-align:left;border-radius:14px;background:#eef4fb;color:#334155;font-weight:800;margin:6px 0;padding:9px 10px}.record-type-card{border:1px solid #dbe7f3;background:#fff;border-radius:18px;padding:12px;text-align:left;width:100%;margin-bottom:8px}.record-type-card:hover{border-color:#93c5fd;background:#eff6ff}.chronology-preview{border-left:4px solid #155eef;padding-left:10px;margin:8px 0;color:#334155}.callback-item{display:flex;gap:8px;align-items:flex-start;margin:7px 0}.callback-item input{margin-top:4px}@media(max-width:920px){.record-workspace-grid{grid-template-columns:1fr}.universal-record-toolbar{grid-template-columns:1fr}.record-form-grid{grid-template-columns:1fr}.record-drawer{width:100vw}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function badge(value) { const raw = String(value || 'monitor'); return `<span class="ic-badge ic-badge-${esc(raw.replaceAll('_','-'))}">${esc(raw.replaceAll('_',' '))}</span>`; }
  function listFrom(payload, ...keys) { if (Array.isArray(payload)) return payload; for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key]; return []; }
  function empty(text) { return `<div class="ic-empty">${esc(text)}</div>`; }
  function childId() { return window.state?.selectedChild?.profile?.young_person_id || window.state?.selectedChild?.profile?.id; }
  function childProfile() { return window.state?.selectedChild?.profile || {}; }
  function headers() { return { 'Content-Type': 'application/json', 'X-User-Id': new URLSearchParams(location.search).get('user_id') || '1', 'X-Role': new URLSearchParams(location.search).get('role') || 'manager' }; }

  const RECORD_BLUEPRINTS = {
    daily_note: {
      title: 'Daily living note',
      subtitle: 'Whole-child daily diary across care, health, education, relationships and wellbeing.',
      endpoint: (yp) => `/young-people/${yp}/daily-notes`,
      defaults: () => ({ note_date: new Date().toISOString().slice(0,10), shift_type: 'day', workflow_status: 'draft', link_to_chronology: true, link_quality_standards: true }),
      fields: [
        ['note_date','date','Date'], ['shift_type','select','Shift', ['morning','day','evening','night']], ['mood','text','Mood / emotional tone'],
        ['presentation','textarea','Emotional presentation'], ['activities','textarea','Activities, routines and achievements'], ['education_update','textarea','Education / learning'],
        ['health_update','textarea','Health, medication, sleep and wellbeing'], ['family_update','textarea','Family time / relationships'], ['behaviour_update','textarea','Behaviour as communication / support needed'],
        ['young_person_voice','textarea','Child voice'], ['positives','textarea','Positive moments / strengths'], ['actions_required','textarea','Handover actions / callbacks'], ['significance','select','Significance', ['low','medium','high','critical']]
      ]
    },
    incident: { title: 'Incident record', subtitle: 'Structured safeguarding-aware event recording.', fields: [['occurred_at','datetime-local','Date/time'], ['title','text','Incident title'], ['antecedents','textarea','Antecedents / context'], ['narrative','textarea','What happened factually'], ['staff_response','textarea','Staff response / de-escalation'], ['child_voice','textarea','Child voice / presentation after'], ['follow_up_actions','textarea','Follow-up, repair and review actions'], ['risk_level','select','Risk level',['low','medium','high','critical']]] },
    keywork: { title: 'Key work session', subtitle: 'Reflective direct work focused on voice, meaning and next steps.', fields: [['session_date','date','Session date'], ['purpose','textarea','Purpose of session'], ['child_voice','textarea','What the young person said'], ['reflection','textarea','Reflection and meaning'], ['actions_agreed','textarea','Actions agreed'], ['next_steps','textarea','Next steps']] },
    missing_episode: { title: 'Missing episode', subtitle: 'Contextual safeguarding-led missing-from-care recording.', fields: [['occurred_at','datetime-local','Last seen'], ['returned_at','datetime-local','Returned'], ['push_pull_factors','textarea','Push / pull factors'], ['contextual_risks','textarea','Contextual safeguarding risks'], ['return_home_conversation','textarea','Return home conversation'], ['child_voice','textarea','Child voice'], ['follow_up_actions','textarea','Follow-up actions']] },
    physical_intervention: { title: 'Physical intervention', subtitle: 'Proportionality, debrief and repair focused recording.', fields: [['occurred_at','datetime-local','Date/time'], ['de_escalation','textarea','De-escalation attempted'], ['narrative','textarea','What happened'], ['reason','textarea','Why intervention was necessary'], ['child_debrief','textarea','Child debrief / voice'], ['staff_debrief','textarea','Staff debrief / learning'], ['follow_up_actions','textarea','Repair and follow-up actions']] }
  };

  function ensureDrawer() {
    if (document.getElementById(DRAWER_ID)) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'record-drawer-backdrop';
    backdrop.id = `${DRAWER_ID}-backdrop`;
    const drawer = document.createElement('aside');
    drawer.className = 'record-drawer';
    drawer.id = DRAWER_ID;
    drawer.innerHTML = `<div class="record-drawer-head"><div><h3 class="ic-h3" id="record-drawer-title">Workspace</h3><small class="ic-card-subtitle" id="record-drawer-subtitle">Full pull-page workspace</small></div><button class="record-drawer-close" type="button" aria-label="Close record">×</button></div><div class="record-drawer-body" id="record-drawer-body"></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    backdrop.addEventListener('click', closeDrawer);
    drawer.querySelector('.record-drawer-close').addEventListener('click', closeDrawer);
  }

  function openDrawer(title, subtitle, bodyHtml) {
    ensureDrawer();
    document.getElementById('record-drawer-title').textContent = title;
    document.getElementById('record-drawer-subtitle').textContent = subtitle || 'Workspace';
    document.getElementById('record-drawer-body').innerHTML = bodyHtml;
    document.getElementById(DRAWER_ID).classList.add('open');
    document.getElementById(`${DRAWER_ID}-backdrop`).classList.add('open');
  }

  function closeDrawer() { document.getElementById(DRAWER_ID)?.classList.remove('open'); document.getElementById(`${DRAWER_ID}-backdrop`)?.classList.remove('open'); }

  async function reviewRecord(recordId, action) {
    const comment = document.getElementById('manager-review-comment')?.value || '';
    if ((action === 'return' || action === 'comment') && !comment.trim()) { alert('Please add a manager comment first.'); return; }
    try {
      const res = await fetch(`/api/universal-records/record/${encodeURIComponent(recordId)}/review`, { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ action, comment }) });
      if (!res.ok) throw new Error(await res.text());
      if (window.toast) window.toast(action === 'approve' ? 'Record approved' : 'Manager action saved');
      await openUniversalRecord(recordId);
      const root = document.getElementById('child-workspace'); const active = root?.querySelector('.child-tab-view.active')?.dataset?.childTabView; if (active) await loadUniversalRecords(active, root);
    } catch (error) { alert('Could not update record: ' + error.message); }
  }

  async function openUniversalRecord(recordId) {
    openDrawer('Loading record...', '', empty('Loading full record...'));
    const body = document.getElementById('record-drawer-body');
    try {
      const res = await fetch(`/api/universal-records/record/${encodeURIComponent(recordId)}`, { credentials: 'include' });
      const data = await res.json(); const r = data.record;
      if (!r) { body.innerHTML = empty('Record not found.'); return; }
      document.getElementById('record-drawer-title').textContent = r.title || 'Record';
      document.getElementById('record-drawer-subtitle').textContent = `${r.record_type || 'record'} · ${r.source_table || ''} #${r.source_id || ''}`;
      const links = listFrom(data, 'links'), comments = listFrom(data, 'comments'), attachments = listFrom(data, 'attachments'), audit = listFrom(data, 'audit'), quality = listFrom(data, 'quality_checks');
      body.innerHTML = `<div class="record-workspace-grid"><main class="record-workspace-main"><section class="record-section"><h4>Record summary</h4><p>${esc(r.summary || r.narrative || 'No summary recorded.')}</p>${r.child_voice ? `<p><strong>Child voice:</strong> ${esc(r.child_voice)}</p>` : ''}${r.staff_analysis || r.staff_reflection ? `<p><strong>Staff reflection:</strong> ${esc(r.staff_analysis || r.staff_reflection)}</p>` : ''}${r.therapeutic_analysis ? `<p><strong>Therapeutic analysis:</strong> ${esc(r.therapeutic_analysis)}</p>` : ''}</section><section class="record-section"><h4>Key details</h4><div class="record-field-grid">${['record_type','record_category','status','priority','risk_level','review_state','occurred_at','created_at','sccif_area'].map(k => `<div class="record-field"><strong>${esc(k.replaceAll('_',' '))}</strong>${esc(r[k] || '—')}</div>`).join('')}</div></section><section class="record-section"><h4>Linked chronology / records</h4>${links.length ? links.map(l => `<div class="ic-item"><div class="ic-item-title">${esc(l.target_title || l.link_type)}</div><div class="ic-item-text">${esc(l.summary || l.target_record_type || '')}</div></div>`).join('') : empty('No linked records yet.')}</section><section class="record-section"><h4>Attachments</h4>${attachments.length ? attachments.map(a => `<div class="ic-item" data-attachment-id="${esc(a.id || '')}" data-file-name="${esc(a.file_name || '')}"><div class="ic-item-title">${esc(a.file_name)}</div><div class="ic-item-text">${esc(a.mime_type || '')}</div></div>`).join('') : empty('No attachments yet.')}</section></main><aside class="record-workspace-rail"><section class="record-section"><h4>Manager review</h4><div class="record-field-grid"><div class="record-field"><strong>Status</strong>${esc(r.status || '—')}</div><div class="record-field"><strong>Review state</strong>${esc(r.review_state || '—')}</div><div class="record-field"><strong>Manager review</strong>${r.manager_review_required ? 'Required' : 'Not required'}</div></div><textarea id="manager-review-comment" class="manager-comment-box" placeholder="Add manager comment, approval note or return reason..."></textarea><div class="manager-action-row"><button class="action-approve" data-review-action="approve">Approve</button><button class="action-return" data-review-action="return">Return</button><button class="action-review" data-review-action="require_review">Require review</button><button class="action-comment" data-review-action="comment">Comment</button></div></section><section class="record-section"><h4>Therapeutic quality</h4>${quality.length ? quality.map(q => `<div class="ic-item"><div class="ic-item-title">Quality score ${esc(q.quality_score)}</div><div class="ic-item-text">${esc((q.suggestions || []).join(' · '))}</div></div>`).join('') : empty('No quality check yet.')}</section><section class="record-section"><h4>Comments</h4>${comments.length ? comments.map(c => `<div class="ic-item"><div class="ic-item-title">${esc(c.comment_type)}</div><div class="ic-item-text">${esc(c.body)}</div></div>`).join('') : empty('No comments yet.')}</section><section class="record-section"><h4>Audit trail</h4>${audit.length ? audit.map(a => `<div class="ic-item"><div class="ic-item-title">${esc(a.event_type)}</div><div class="ic-item-text">${esc(a.event_summary || a.created_at || '')}</div></div>`).join('') : empty('No audit events yet.')}</section></aside></div>`;
      body.querySelectorAll('[data-review-action]').forEach(btn => btn.addEventListener('click', () => reviewRecord(recordId, btn.dataset.reviewAction)));
    } catch (err) { body.innerHTML = empty('Could not load this record.'); }
  }

  function openNewRecordWorkspace(recordType = 'daily_note') {
    const blueprint = RECORD_BLUEPRINTS[recordType] || RECORD_BLUEPRINTS.daily_note;
    const defaults = blueprint.defaults ? blueprint.defaults() : {};
    openDrawer(blueprint.title, blueprint.subtitle, `<div class="record-workspace-grid"><main class="record-workspace-main"><section class="record-section"><h4>${esc(blueprint.title)}</h4><p>${esc(blueprint.subtitle)}</p><form id="therapeutic-record-form" data-record-type="${esc(recordType)}" class="record-form-grid">${blueprint.fields.map(([name,type,label,options]) => renderField(name,type,label,options,defaults[name])).join('')}<div class="record-form-field full"><div class="workspace-actions"><button class="therapeutic-btn action-comment" type="button" data-record-review>Review therapeutically</button><button class="therapeutic-btn action-approve" type="submit">Save record</button></div></div></form></section><section class="record-section"><h4>Chronology preview</h4><div id="chronology-preview">${empty('As you complete this record, relevant chronology areas will be suggested here.')}</div></section></main><aside class="record-workspace-rail"><div id="therapeutic-review-panel">${therapeuticPlaceholder(recordType)}</div><section class="record-section"><h4>Other record types</h4>${Object.entries(RECORD_BLUEPRINTS).map(([key,bp]) => `<button class="record-type-card" type="button" data-new-record-type="${esc(key)}"><strong>${esc(bp.title)}</strong><br><small>${esc(bp.subtitle)}</small></button>`).join('')}</section></aside></div>`);
    bindRecordForm();
  }

  function renderField(name,type,label,options,value='') {
    const full = type === 'textarea' ? ' full' : '';
    if (type === 'select') return `<div class="record-form-field"><label>${esc(label)}</label><select name="${esc(name)}">${(options||[]).map(o => `<option value="${esc(o)}" ${o===value?'selected':''}>${esc(String(o).replaceAll('_',' '))}</option>`).join('')}</select></div>`;
    return `<div class="record-form-field${full}"><label>${esc(label)}</label>${type === 'textarea' ? `<textarea name="${esc(name)}">${esc(value)}</textarea>` : `<input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" />`}</div>`;
  }

  function therapeuticPlaceholder(recordType) { return `<section class="therapeutic-panel"><h4>Therapeutic coach</h4><p>Use the review button to check child voice, tone, safeguarding, callback actions and chronology links.</p><button class="prompt-chip" type="button">What may the young person have been communicating?</button><button class="prompt-chip" type="button">Has the child’s voice been captured?</button><button class="prompt-chip" type="button">What follow-up is needed?</button></section>`; }

  function bindRecordForm() {
    const form = document.getElementById('therapeutic-record-form');
    if (!form) return;
    document.querySelectorAll('[data-new-record-type]').forEach(btn => btn.addEventListener('click', () => openNewRecordWorkspace(btn.dataset.newRecordType)));
    form.querySelector('[data-record-review]')?.addEventListener('click', () => reviewCurrentDraft(form));
    form.addEventListener('input', debounce(() => updateChronologyPreview(form), 300));
    form.addEventListener('submit', saveTherapeuticRecord);
    updateChronologyPreview(form);
  }

  function formPayload(form) { const data = {}; new FormData(form).forEach((v,k)=>{ data[k]=v; }); return data; }

  function updateChronologyPreview(form) {
    const data = formPayload(form); const text = Object.values(data).join(' ').toLowerCase(); const items = [];
    if (/school|education|learning|pep|attendance/.test(text)) items.push('Education chronology');
    if (/health|medication|camhs|therapy|sleep|injury|appointment/.test(text)) items.push('Health and wellbeing chronology');
    if (/mum|dad|family|contact|sibling/.test(text)) items.push('Family and relationships chronology');
    if (/missing|risk|police|safeguard|self-harm|restraint|exploitation/.test(text)) items.push('Safeguarding chronology');
    if (/football|activity|achievement|positive|progress|independence/.test(text)) items.push('Achievement / activity chronology');
    const target = document.getElementById('chronology-preview'); if (target) target.innerHTML = items.length ? items.map(i => `<div class="chronology-preview">${esc(i)} will be linked when saved.</div>`).join('') : empty('No specific chronology category detected yet.');
  }

  async function reviewCurrentDraft(form) {
    const recordType = form.dataset.recordType || 'generic'; const payload = formPayload(form); const panel = document.getElementById('therapeutic-review-panel');
    if (panel) panel.innerHTML = `<section class="therapeutic-panel"><h4>Reviewing...</h4><p>Checking tone, child voice, safeguarding and callbacks.</p></section>`;
    try {
      const res = await fetch('/api/therapeutic-recording/review', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ record_type: recordType, payload, young_person_id: childId(), home_id: childProfile().home_id }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); renderTherapeuticReview(data); return data;
    } catch (error) { if (panel) panel.innerHTML = `<section class="therapeutic-panel"><h4>Review unavailable</h4><p>${esc(error.message)}</p></section>`; return null; }
  }

  function renderTherapeuticReview(data) {
    const panel = document.getElementById('therapeutic-review-panel'); if (!panel) return;
    const q = data.therapeutic_quality || {}; const flags = data.language_flags || []; const missing = data.missing_elements || []; const safe = data.safeguarding_considerations || []; const callbacks = data.suggested_callbacks || [];
    panel.innerHTML = `<section class="therapeutic-panel"><div class="therapeutic-score"><h4>Therapeutic quality</h4><span class="score-pill ${esc(q.rating)}">${esc(q.rating || 'review')} · ${esc(q.score || 0)}</span></div>${flags.length ? `<h4>Language suggestions</h4>${flags.map(f => `<p><strong>${esc(f.phrase)}</strong><br>${esc(f.suggestion)}</p>`).join('')}` : '<p>No blaming language detected.</p>'}${missing.length ? `<h4>Missing elements</h4>${missing.map(m => `<p>${esc(m.message)}</p>`).join('')}` : ''}${safe.length ? `<h4>Safeguarding considerations</h4>${safe.map(s => `<p>${esc(s.message)}</p>`).join('')}` : ''}<h4>Suggested callbacks</h4>${callbacks.length ? callbacks.map(c => `<label class="callback-item"><input type="checkbox" checked value="${esc(c)}" data-callback-item /> <span>${esc(c)}</span></label>`).join('') : '<p>No callbacks suggested.</p>'}</section>`;
  }

  async function saveTherapeuticRecord(event) {
    event.preventDefault(); const form = event.currentTarget; const type = form.dataset.recordType || 'daily_note'; const data = formPayload(form); const yp = childId();
    if (!yp) return alert('Select a young person first.');
    await reviewCurrentDraft(form);
    try {
      let url = `/api/universal-records`; let payload = { young_person_id: yp, home_id: childProfile().home_id, record_type: type, title: data.title || (RECORD_BLUEPRINTS[type]?.title || 'Record'), summary: Object.values(data).filter(Boolean).join(' | ').slice(0, 800), narrative: Object.entries(data).map(([k,v])=>`${k}: ${v}`).join('\n'), child_voice: data.child_voice || data.young_person_voice, record_category: categoryForTab(type), metadata: { source: 'therapeutic_workspace', form_payload: data }, chronology_visible: true, manager_review_required: true };
      if (type === 'daily_note') { url = RECORD_BLUEPRINTS.daily_note.endpoint(yp); payload = { ...RECORD_BLUEPRINTS.daily_note.defaults(), ...data, home_id: childProfile().home_id, title: 'Daily living note', manager_review_needed: data.significance === 'high' || data.significance === 'critical', safeguarding_concern: /missing|self-harm|safeguard|police|restraint|exploitation/i.test(Object.values(data).join(' ')), create_follow_up_task: Boolean(data.actions_required), link_to_chronology: true, link_quality_standards: true }; }
      const res = await fetch(url, { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json(); if (window.toast) window.toast('Record saved and linked to chronology'); closeDrawer(); const root = document.getElementById('child-workspace'); const active = root?.querySelector('.child-tab-view.active')?.dataset?.childTabView; if (active) loadUniversalRecords(active, root); window.IndiCareOSAssistant?.ask?.('A new young person record has just been saved. Summarise what should be followed up and what chronology areas it links to.');
    } catch (error) { alert('Could not save record: ' + error.message); }
  }

  async function loadUniversalRecords(tabKey, root) {
    const yp = childId(); if (!yp) return; const view = root.querySelector(`[data-child-tab-view="${tabKey}"]`); if (!view) return;
    const q = view.querySelector('[data-record-search]')?.value || ''; const category = view.querySelector('[data-record-category]')?.value || categoryForTab(tabKey); const risk = view.querySelector('[data-record-risk]')?.value || '';
    const params = new URLSearchParams({ young_person_id: yp, limit: '200' }); if (q) params.set('q', q); if (category) params.set('category', category); if (risk) params.set('risk_level', risk);
    const list = view.querySelector('[data-universal-record-list]'); if (!list) return; list.innerHTML = empty('Loading records...');
    try { const res = await fetch(`/api/universal-records/search?${params.toString()}`, { credentials: 'include' }); const data = await res.json(); const records = listFrom(data, 'records'); list.innerHTML = records.length ? records.map(recordCard).join('') : empty('No records match these filters.'); list.querySelectorAll('[data-record-id]').forEach(btn => btn.addEventListener('click', () => openUniversalRecord(btn.dataset.recordId))); } catch (err) { list.innerHTML = empty('Could not load searchable records.'); }
  }

  function categoryForTab(tabKey) { return { care: 'care_record', daily_note: 'care_record', safeguarding: 'safeguarding', incident: 'safeguarding', missing_episode: 'safeguarding', physical_intervention: 'safeguarding', plans: 'plan', education: 'education', health: 'health', family: 'family', keywork: 'keywork', incidents: 'safeguarding' }[tabKey] || ''; }
  function recordToolbar(tabKey) { return `<div class="universal-record-toolbar"><input data-record-search placeholder="Search ${esc(tabKey.replaceAll('-',' '))} records..." /><select data-record-category><option value="${esc(categoryForTab(tabKey))}">${esc(categoryForTab(tabKey) || 'All categories')}</option><option value="">All categories</option><option value="care_record">Care records</option><option value="safeguarding">Safeguarding</option><option value="risk">Risk</option><option value="plan">Plans</option><option value="education">Education</option><option value="health">Health</option><option value="family">Family</option><option value="keywork">Key work</option></select><select data-record-risk><option value="">All risk</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select><button class="new-record-btn" type="button" data-new-record="${esc(tabKey === 'incidents' ? 'incident' : tabKey === 'keywork' ? 'keywork' : 'daily_note')}">New record</button></div><div class="ic-list" data-universal-record-list>${empty('Select this tab to load records.')}</div>`; }
  function recordCard(r) { return `<button type="button" class="universal-record-card" data-record-id="${esc(r.id)}"><div class="ic-item-top"><div><div class="ic-item-title">${esc(r.title || r.record_type || 'Record')}</div><div class="ic-item-text">${esc(r.summary || '').slice(0, 260)}</div><div class="universal-record-meta"><span>${esc(r.record_type || 'record')}</span><span>${esc(r.record_category || '')}</span><span>${esc(r.occurred_at ? new Date(r.occurred_at).toLocaleDateString() : '')}</span>${r.safeguarding_relevant ? '<span>Safeguarding</span>' : ''}${r.manager_review_required ? '<span>Manager review</span>' : ''}</div></div>${badge(r.risk_level || r.priority || r.status)}</div></button>`; }

  function renderChildTabs(data) {
    const p = data?.profile || {}; const timeline = listFrom(data, 'timeline', 'events'); const commandItems = listFrom(data, 'command_items');
    return `<div class="child-workspace-tabs" role="tablist">${TAB_DEFS.map(([key,label],i)=>`<button type="button" class="child-workspace-tab ${i===0?'active':''}" data-child-tab="${key}">${label}</button>`).join('')}</div><section class="child-tab-view active" data-child-tab-view="overview"><div class="workspace-actions"><button class="new-record-btn" type="button" data-new-record="daily_note">New daily living note</button><button class="new-record-btn" type="button" data-new-record="incident">New incident</button><button class="new-record-btn" type="button" data-new-record="keywork">New key work</button></div><br><div class="child-tab-grid"><div class="ic-metric"><strong class="ic-metric-value">${esc(p.records_today||0)}</strong><span class="ic-metric-label">Records today</span></div><div class="ic-metric"><strong class="ic-metric-value">${esc(p.manager_review_count||0)}</strong><span class="ic-metric-label">Manager reviews</span></div><div class="ic-metric"><strong class="ic-metric-value">${esc(p.open_commands||commandItems.length||0)}</strong><span class="ic-metric-label">Open commands</span></div><div class="ic-metric"><strong class="ic-metric-value">${esc(Math.round(p.disruption_risk_score||data?.placement_stability?.disruption_risk_score||0))}</strong><span class="ic-metric-label">Disruption risk</span></div></div><div class="child-tab-section-title">Latest chronology</div>${timelineRows(timeline.slice(0,6))}</section><section class="child-tab-view" data-child-tab-view="journey"><div class="child-tab-section-title">Full child journey</div>${recordToolbar('journey')}</section><section class="child-tab-view" data-child-tab-view="care"><div class="child-tab-section-title">Care notes and daily records</div>${recordToolbar('care')}</section><section class="child-tab-view" data-child-tab-view="safeguarding"><div class="child-tab-section-title">Safeguarding records, alerts and concerns</div>${recordToolbar('safeguarding')}</section><section class="child-tab-view" data-child-tab-view="plans"><div class="child-tab-section-title">Risk assessments, support plans and reviews</div>${recordToolbar('plans')}</section><section class="child-tab-view" data-child-tab-view="education"><div class="child-tab-section-title">Education records</div>${recordToolbar('education')}</section><section class="child-tab-view" data-child-tab-view="health"><div class="child-tab-section-title">Health and wellbeing records</div>${recordToolbar('health')}</section><section class="child-tab-view" data-child-tab-view="family"><div class="child-tab-section-title">Family contact records</div>${recordToolbar('family')}</section><section class="child-tab-view" data-child-tab-view="keywork"><div class="child-tab-section-title">Key work records</div>${recordToolbar('keywork')}</section><section class="child-tab-view" data-child-tab-view="incidents"><div class="child-tab-section-title">Incidents and missing episodes</div>${recordToolbar('incidents')}</section><section class="child-tab-view" data-child-tab-view="command"><div class="child-tab-section-title">Command items</div><div class="ic-list">${commandItems.length?commandItems.map(r=>`<div class="ic-item"><div class="ic-item-top"><div><div class="ic-item-title">${esc(r.title)}</div><div class="ic-item-text">${esc(r.summary||r.recommended_action||'')}</div></div>${badge(r.priority||r.status)}</div></div>`).join(''):empty('No command items for this child.')}</div></section>`;
  }
  function timelineRows(rows) { return rows.length ? `<div class="timeline">${rows.map((t)=>`<div class="timeline-row"><div class="ic-item"><div class="ic-item-top"><div><div class="ic-item-title">${esc(t.title||t.event_title||t.source_type||'Timeline entry')}</div><div class="ic-item-text">${esc(t.summary||t.event_summary||t.narrative||'')}</div>${t.child_voice?`<div class="ic-item-text"><strong>Child voice:</strong> ${esc(t.child_voice)}</div>`:''}</div>${badge(t.timeline_state||t.status||'recorded')}</div></div></div>`).join('')}</div>` : empty('No timeline entries yet.'); }
  function activateTab(root, key) { root.querySelectorAll('.child-workspace-tab').forEach((btn)=>btn.classList.toggle('active', btn.dataset.childTab===key)); root.querySelectorAll('.child-tab-view').forEach((view)=>view.classList.toggle('active', view.datasetChildTabView===key || view.dataset.childTabView===key)); if (!['overview','command'].includes(key)) loadUniversalRecords(key, root); }
  function bindRecordFilters(root) { root.querySelectorAll('[data-record-search],[data-record-category],[data-record-risk]').forEach((control) => { const handler = () => { const view = control.closest('[data-child-tab-view]'); if (view?.dataset?.childTabView) loadUniversalRecords(view.dataset.childTabView, root); }; control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', debounce(handler, 250)); }); root.querySelectorAll('[data-new-record]').forEach(btn => btn.addEventListener('click', () => openNewRecordWorkspace(btn.dataset.newRecord))); }
  function debounce(fn, wait) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
  function enhanceCurrentChildWorkspace() { const root = document.getElementById('child-workspace'); const data = window.state?.selectedChild; if (!root || !data?.profile) return false; root.innerHTML = renderChildTabs(data); root.querySelectorAll('.child-workspace-tab').forEach((btn)=>btn.addEventListener('click',()=>activateTab(root, btn.dataset.childTab))); bindRecordFilters(root); return true; }
  function patchOpenChild() { if (window[PATCH_FLAG]) return; const originalOpenChild = window.openChild; if (typeof originalOpenChild !== 'function') return; window.openChild = async function patchedOpenChild(...args) { const result = await originalOpenChild.apply(this,args); enhanceCurrentChildWorkspace(); return result; }; window[PATCH_FLAG] = true; }
  function boot() { injectStyles(); ensureDrawer(); patchOpenChild(); window.loadUniversalRecords = loadUniversalRecords; window.IndiCareYoungPersonWorkspace = { openRecord: openUniversalRecord, newRecord: openNewRecordWorkspace, refresh: enhanceCurrentChildWorkspace }; const observer = new MutationObserver(()=>{ patchOpenChild(); const root=document.getElementById('child-workspace'); if(root&&window.state?.selectedChild?.profile&&!root.querySelector('.child-workspace-tabs')) enhanceCurrentChildWorkspace(); }); observer.observe(document.body,{childList:true,subtree:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
