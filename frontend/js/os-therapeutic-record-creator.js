(() => {
  const STYLE_ID = 'os-therapeutic-record-creator-style';
  const DRAWER_ID = 'therapeutic-record-create-drawer';
  const BACKDROP_ID = 'therapeutic-record-create-backdrop';

  const RECORD_TYPES = {
    care: { record_type: 'daily_note', category: 'care_record', title: 'Daily care record', sccif_area: 'children_experiences_progress' },
    safeguarding: { record_type: 'safeguarding_concern', category: 'safeguarding', title: 'Safeguarding concern', safeguarding: true, risk: 'high', review: true, sccif_area: 'helped_and_protected' },
    plans: { record_type: 'support_plan', category: 'plan', title: 'Support plan update', sccif_area: 'children_experiences_progress' },
    education: { record_type: 'education_record', category: 'education', title: 'Education record', sccif_area: 'children_experiences_progress' },
    health: { record_type: 'health_record', category: 'health', title: 'Health and wellbeing record', sccif_area: 'children_experiences_progress' },
    family: { record_type: 'family_contact', category: 'family', title: 'Family contact record', sccif_area: 'children_experiences_progress' },
    keywork: { record_type: 'key_work', category: 'keywork', title: 'Key work session', sccif_area: 'children_experiences_progress' },
    incidents: { record_type: 'incident', category: 'safeguarding', title: 'Incident record', safeguarding: true, risk: 'medium', review: true, sccif_area: 'helped_and_protected' },
    journey: { record_type: 'chronology_note', category: 'care_record', title: 'Child journey note', sccif_area: 'children_experiences_progress' }
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .record-create-row{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0 0 12px}.record-create-button{border:0;border-radius:14px;background:var(--ic-blue,#155eef);color:#fff;font-weight:900;padding:10px 14px}.record-create-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);display:none;z-index:90}.record-create-backdrop.open{display:block}.record-create-drawer{position:fixed;top:0;right:0;width:min(760px,96vw);height:100vh;background:#fff;box-shadow:-24px 0 60px rgba(15,23,42,.24);z-index:91;transform:translateX(105%);transition:transform .18s ease;display:flex;flex-direction:column}.record-create-drawer.open{transform:translateX(0)}.record-create-head{padding:18px;border-bottom:1px solid var(--ic-border,#dbe7f3);display:flex;justify-content:space-between;gap:16px}.record-create-body{padding:18px;overflow:auto}.record-create-close{border:0;background:#eef4fb;border-radius:999px;width:36px;height:36px;font-weight:900}.therapeutic-guidance{background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;padding:14px;margin-bottom:14px;color:#1e3a8a;line-height:1.45}.therapeutic-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.therapeutic-field{display:grid;gap:6px}.therapeutic-field-full{grid-column:1/-1}.therapeutic-field label{font-size:12px;font-weight:900;color:var(--ic-muted,#64748b);text-transform:uppercase;letter-spacing:.05em}.therapeutic-field small{color:var(--ic-muted,#64748b);line-height:1.4}.therapeutic-field input,.therapeutic-field select,.therapeutic-field textarea{border:1px solid var(--ic-border,#dbe7f3);border-radius:14px;padding:11px;background:#fff}.therapeutic-field textarea{min-height:110px;resize:vertical}.therapeutic-checks{display:flex;gap:14px;flex-wrap:wrap;color:var(--ic-muted,#64748b);font-size:13px}.therapeutic-submit{border:0;border-radius:14px;background:var(--ic-blue,#155eef);color:#fff;font-weight:900;padding:12px 14px}@media(max-width:760px){.therapeutic-form{grid-template-columns:1fr}.record-create-drawer{width:100vw}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function profile() { return window.state?.selectedChild?.profile || {}; }
  function childId() { return profile().young_person_id || profile().id; }
  function homeId() { return profile().home_id || ''; }
  function headers() { return { 'Content-Type': 'application/json', 'X-User-Id': new URLSearchParams(location.search).get('user_id') || '1', 'X-Role': new URLSearchParams(location.search).get('role') || 'manager' }; }

  function ensureDrawer() {
    if (document.getElementById(DRAWER_ID)) return;
    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'record-create-backdrop';
    const drawer = document.createElement('aside');
    drawer.id = DRAWER_ID;
    drawer.className = 'record-create-drawer';
    drawer.innerHTML = `<div class="record-create-head"><div><h3 class="ic-h3" id="record-create-title">Create record</h3><small class="ic-card-subtitle" id="record-create-subtitle">Therapeutic person-centred recording</small></div><button class="record-create-close" type="button">×</button></div><div class="record-create-body" id="record-create-body"></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    backdrop.addEventListener('click', closeDrawer);
    drawer.querySelector('.record-create-close').addEventListener('click', closeDrawer);
  }

  function closeDrawer() {
    document.getElementById(DRAWER_ID)?.classList.remove('open');
    document.getElementById(BACKDROP_ID)?.classList.remove('open');
  }

  function openDrawer(tabKey = 'care') {
    ensureDrawer();
    const config = RECORD_TYPES[tabKey] || RECORD_TYPES.care;
    document.getElementById('record-create-title').textContent = `Create ${config.title}`;
    document.getElementById('record-create-subtitle').textContent = `${profile().display_name || profile().preferred_name || profile().first_name || 'Young person'} · therapeutic record`;
    document.getElementById('record-create-body').innerHTML = renderForm(tabKey, config);
    document.getElementById(DRAWER_ID).classList.add('open');
    document.getElementById(BACKDROP_ID).classList.add('open');
    document.getElementById('therapeutic-record-form').addEventListener('submit', submitRecord);
  }

  function renderForm(tabKey, config) {
    return `
      <div class="therapeutic-guidance"><strong>Person-centred recording:</strong> keep the record factual, respectful and therapeutic. Include the child’s voice, what may have influenced their presentation, how staff supported regulation, and what needs to happen next.</div>
      <form id="therapeutic-record-form" class="therapeutic-form" data-tab-key="${esc(tabKey)}">
        <input type="hidden" name="record_type" value="${esc(config.record_type)}" />
        <input type="hidden" name="record_category" value="${esc(config.category)}" />
        <input type="hidden" name="sccif_area" value="${esc(config.sccif_area || '')}" />
        <div class="therapeutic-field"><label>Record type</label><select name="record_type_select">${Object.entries(RECORD_TYPES).map(([key, value]) => `<option value="${esc(key)}" ${key === tabKey ? 'selected' : ''}>${esc(value.title)}</option>`).join('')}</select></div>
        <div class="therapeutic-field"><label>Risk level</label><select name="risk_level"><option value="low">Low</option><option value="medium" ${config.risk === 'medium' ? 'selected' : ''}>Medium</option><option value="high" ${config.risk === 'high' ? 'selected' : ''}>High</option><option value="critical">Critical</option></select></div>
        <div class="therapeutic-field therapeutic-field-full"><label>Title</label><input name="title" required placeholder="Short professional title" value="${esc(config.title)}" /></div>
        <div class="therapeutic-field therapeutic-field-full"><label>What happened / what is being recorded?</label><small>Use factual, respectful and non-blaming language.</small><textarea name="narrative" required placeholder="Describe the event, observation, plan update or session..."></textarea></div>
        <div class="therapeutic-field therapeutic-field-full"><label>Child voice</label><small>Record the child’s words, choices, wishes, feelings or communication.</small><textarea name="child_voice" placeholder="What did the child say, show, choose or communicate?"></textarea></div>
        <div class="therapeutic-field therapeutic-field-full"><label>Staff reflection / analysis</label><small>Think therapeutically: emotions, unmet needs, triggers, strengths and relationships.</small><textarea name="staff_analysis" placeholder="What might this tell us about the child’s experience, emotions or support needs?"></textarea></div>
        <div class="therapeutic-field therapeutic-field-full"><label>Therapeutic support and next steps</label><small>Include co-regulation, repair, safety planning or follow-up work.</small><textarea name="therapeutic_analysis" placeholder="How did staff support safety, regulation, connection and repair? What happens next?"></textarea></div>
        <div class="therapeutic-field"><label>Priority</label><select name="priority"><option value="normal">Normal</option><option value="medium">Medium</option><option value="high" ${config.review ? 'selected' : ''}>High</option><option value="critical">Critical</option></select></div>
        <div class="therapeutic-field"><label>Status</label><select name="status"><option value="submitted">Submitted</option><option value="draft">Draft</option><option value="active">Active</option><option value="open">Open</option></select></div>
        <div class="therapeutic-field therapeutic-field-full therapeutic-checks"><label><input type="checkbox" name="safeguarding_relevant" ${config.safeguarding ? 'checked' : ''}/> Safeguarding relevant</label><label><input type="checkbox" name="manager_review_required" ${config.review ? 'checked' : ''}/> Manager review required</label><label><input type="checkbox" name="restricted" /> Restricted</label><label><input type="checkbox" name="inspection_relevant" checked /> Inspection relevant</label></div>
        <div class="therapeutic-field therapeutic-field-full"><button class="therapeutic-submit" type="submit">Save therapeutic record</button></div>
      </form>
    `;
  }

  async function submitRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const tabKey = form.dataset.tabKey;
    const selectedKey = form.record_type_select.value;
    const config = RECORD_TYPES[selectedKey] || RECORD_TYPES[tabKey] || RECORD_TYPES.care;
    const payload = {
      source_table: 'universal_manual_records',
      record_type: config.record_type,
      record_category: config.category,
      entity_type: 'child',
      home_id: Number(homeId()) || null,
      young_person_id: Number(childId()) || null,
      title: form.title.value,
      summary: form.narrative.value.slice(0, 300),
      narrative: form.narrative.value,
      child_voice: form.child_voice.value,
      staff_analysis: form.staff_analysis.value,
      staff_reflection: form.staff_analysis.value,
      therapeutic_analysis: form.therapeutic_analysis.value,
      status: form.status.value,
      priority: form.priority.value,
      risk_level: form.risk_level.value,
      review_state: form.manager_review_required.checked ? 'required' : 'not_required',
      safeguarding_relevant: form.safeguarding_relevant.checked,
      inspection_relevant: form.inspection_relevant.checked,
      chronology_visible: true,
      manager_review_required: form.manager_review_required.checked,
      restricted: form.restricted.checked,
      sccif_area: config.sccif_area,
      tags: [config.category, config.record_type, 'therapeutic-record'].filter(Boolean),
      occurred_at: new Date().toISOString(),
      metadata: { created_from: 'os_child_workspace', tab: tabKey }
    };
    try {
      const res = await fetch('/api/universal-records', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      closeDrawer();
      if (window.toast) window.toast('Therapeutic record saved');
      if (typeof window.loadAll === 'function') await window.loadAll();
      const root = document.getElementById('child-workspace');
      const active = root?.querySelector('.child-tab-view.active')?.dataset?.childTabView;
      if (root && active && typeof window.loadUniversalRecords === 'function') window.loadUniversalRecords(active, root);
    } catch (error) {
      alert('Could not save record: ' + error.message);
    }
  }

  function addCreateButtons() {
    const root = document.getElementById('child-workspace');
    if (!root || !window.state?.selectedChild?.profile) return;
    root.querySelectorAll('[data-child-tab-view]').forEach((view) => {
      const key = view.dataset.childTabView;
      if (['overview', 'command'].includes(key) || view.querySelector('[data-create-record]')) return;
      const title = view.querySelector('.child-tab-section-title');
      if (!title) return;
      const row = document.createElement('div');
      row.className = 'record-create-row';
      title.parentNode.insertBefore(row, title);
      row.appendChild(title);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'record-create-button';
      btn.dataset.createRecord = key;
      btn.textContent = `Add ${labelFor(key)}`;
      btn.addEventListener('click', () => openDrawer(key));
      row.appendChild(btn);
    });
  }

  function labelFor(key) {
    return ({ journey: 'journey note', care: 'care note', safeguarding: 'safeguarding concern', plans: 'plan update', education: 'education record', health: 'health record', family: 'family contact', keywork: 'key work', incidents: 'incident' }[key] || 'record');
  }

  function boot() {
    injectStyles();
    ensureDrawer();
    const observer = new MutationObserver(addCreateButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    addCreateButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
