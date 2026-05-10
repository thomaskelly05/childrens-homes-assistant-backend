(() => {
  const STYLE_ID = 'os-therapeutic-record-creator-style';
  const DRAWER_ID = 'therapeutic-record-create-drawer';
  const BACKDROP_ID = 'therapeutic-record-create-backdrop';
  const FLAG = '__indicareTherapeuticRecordCreatorV2';

  const RECORD_TYPES = {
    daily_note: { record_type: 'daily_note', category: 'care_record', title: 'Daily living record', tone: 'Reflective daily life recording', sccif_area: 'children_experiences_progress' },
    care: { record_type: 'daily_note', category: 'care_record', title: 'Daily living record', tone: 'Reflective daily life recording', sccif_area: 'children_experiences_progress' },
    incident: { record_type: 'incident', category: 'safeguarding', title: 'Incident record', tone: 'Calm factual safeguarding-aware recording', safeguarding: true, risk: 'medium', review: true, sccif_area: 'helped_and_protected' },
    incidents: { record_type: 'incident', category: 'safeguarding', title: 'Incident record', tone: 'Calm factual safeguarding-aware recording', safeguarding: true, risk: 'medium', review: true, sccif_area: 'helped_and_protected' },
    missing_episode: { record_type: 'missing_episode', category: 'safeguarding', title: 'Missing episode', tone: 'Contextual safeguarding and return-home understanding', safeguarding: true, risk: 'high', review: true, sccif_area: 'helped_and_protected' },
    physical_intervention: { record_type: 'physical_intervention', category: 'safeguarding', title: 'Physical intervention', tone: 'Safety, debrief and relational repair', safeguarding: true, risk: 'high', review: true, sccif_area: 'helped_and_protected' },
    safeguarding: { record_type: 'safeguarding_concern', category: 'safeguarding', title: 'Safeguarding concern', tone: 'Risk, protection and follow-up', safeguarding: true, risk: 'high', review: true, sccif_area: 'helped_and_protected' },
    keywork: { record_type: 'key_work', category: 'keywork', title: 'Key work session', tone: 'Therapeutic direct work and reflection', sccif_area: 'children_experiences_progress' },
    key_work: { record_type: 'key_work', category: 'keywork', title: 'Key work session', tone: 'Therapeutic direct work and reflection', sccif_area: 'children_experiences_progress' },
    child_voice: { record_type: 'child_voice', category: 'participation', title: 'Child voice', tone: 'Wishes, feelings and participation', sccif_area: 'children_experiences_progress' },
    education: { record_type: 'education_record', category: 'education', title: 'Education record', tone: 'School, learning and emotional impact', sccif_area: 'children_experiences_progress' },
    health: { record_type: 'health_record', category: 'health', title: 'Health and wellbeing record', tone: 'Clinical safety and emotional wellbeing', sccif_area: 'children_experiences_progress' },
    family: { record_type: 'family_contact', category: 'family', title: 'Family time record', tone: 'Relational impact before, during and after contact', sccif_area: 'children_experiences_progress' },
    plans: { record_type: 'support_plan', category: 'plan', title: 'Plan update', tone: 'Care, risk or support plan update', sccif_area: 'children_experiences_progress' },
    journey: { record_type: 'chronology_note', category: 'care_record', title: 'Child journey note', tone: 'Chronology and lived experience', sccif_area: 'children_experiences_progress' }
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .record-create-row{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0 0 12px}.record-create-button{border:0;border-radius:14px;background:var(--ic-blue,#155eef);color:#fff;font-weight:900;padding:10px 14px}.record-create-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.42);display:none;z-index:900}.record-create-backdrop.open{display:block}.record-create-drawer{position:fixed;inset:18px;background:#fff;border:1px solid var(--ic-border,#dbe7f3);border-radius:28px;box-shadow:0 30px 90px rgba(15,23,42,.32);z-index:901;transform:translateY(24px);opacity:0;pointer-events:none;transition:transform .18s ease,opacity .18s ease;display:flex;flex-direction:column;overflow:hidden}.record-create-drawer.open{transform:translateY(0);opacity:1;pointer-events:auto}.record-create-head{padding:18px 20px;border-bottom:1px solid var(--ic-border,#dbe7f3);display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:linear-gradient(180deg,#f8fafc,#fff)}.record-create-body{padding:0;overflow:auto;display:grid;grid-template-columns:minmax(0,1fr) 300px;min-height:0}.record-create-close{border:0;background:#eef4fb;border-radius:999px;width:40px;height:40px;font-weight:950}.record-workspace-main{padding:20px;overflow:auto}.record-context-rail{border-left:1px solid #e2e8f0;background:#f8fafc;padding:18px;display:grid;align-content:start;gap:12px}.record-context-card{border:1px solid #e2e8f0;background:#fff;border-radius:18px;padding:12px}.record-context-card strong{display:block;color:#0f172a;margin-bottom:4px}.record-context-card small,.record-context-card p{color:#64748b;margin:0;line-height:1.45}.therapeutic-guidance{background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;padding:14px;margin-bottom:14px;color:#1e3a8a;line-height:1.45}.therapeutic-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.therapeutic-field{display:grid;gap:6px}.therapeutic-field-full{grid-column:1/-1}.therapeutic-field label{font-size:12px;font-weight:900;color:var(--ic-muted,#64748b);text-transform:uppercase;letter-spacing:.05em}.therapeutic-field small{color:var(--ic-muted,#64748b);line-height:1.4}.therapeutic-field input,.therapeutic-field select,.therapeutic-field textarea{border:1px solid var(--ic-border,#dbe7f3);border-radius:14px;padding:11px;background:#fff}.therapeutic-field textarea{min-height:120px;resize:vertical}.therapeutic-checks{display:flex;gap:14px;flex-wrap:wrap;color:var(--ic-muted,#64748b);font-size:13px}.therapeutic-submit{border:0;border-radius:14px;background:var(--ic-blue,#155eef);color:#fff;font-weight:900;padding:13px 16px}.record-launcher-fixed{position:fixed;right:24px;bottom:24px;z-index:120;border:0;border-radius:999px;background:var(--ic-blue,#155eef);color:#fff;font-weight:950;padding:14px 18px;box-shadow:0 18px 48px rgba(21,94,239,.28)}@media(max-width:900px){.record-create-drawer{inset:0;border-radius:0}.record-create-body{grid-template-columns:1fr}.record-context-rail{border-left:0;border-top:1px solid #e2e8f0}.therapeutic-form{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function qs() { return new URLSearchParams(location.search); }
  function profile() { return window.state?.selectedChild?.profile || {}; }
  function childId() { return profile().young_person_id || profile().id || document.getElementById('care-yp-id')?.value || qs().get('young_person_id'); }
  function homeId() { return profile().home_id || document.getElementById('care-home-id')?.value || qs().get('home_id') || ''; }
  function childName() { const p = profile(); return p.display_name || p.preferred_name || p.first_name || p.name || (childId() ? `Young person ${childId()}` : 'Select a young person'); }
  function headers() { return { 'Content-Type': 'application/json', 'X-User-Id': qs().get('user_id') || '1', 'X-Role': qs().get('role') || 'manager' }; }
  function safeRun(label, fn) { return window.IndiCareSafe?.run?.(label, fn) ?? fn(); }

  function ensureDrawer() {
    if (document.getElementById(DRAWER_ID)) return;
    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'record-create-backdrop';
    const drawer = document.createElement('aside');
    drawer.id = DRAWER_ID;
    drawer.className = 'record-create-drawer';
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('role', 'dialog');
    drawer.innerHTML = `<div class="record-create-head"><div><h3 class="ic-h3" id="record-create-title">Create record</h3><small class="ic-card-subtitle" id="record-create-subtitle">Therapeutic person-centred recording</small></div><button class="record-create-close" type="button" aria-label="Close recording workspace">×</button></div><div class="record-create-body" id="record-create-body"></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    backdrop.addEventListener('click', closeDrawer);
    drawer.querySelector('.record-create-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  }

  function closeDrawer() {
    document.getElementById(DRAWER_ID)?.classList.remove('open');
    document.getElementById(BACKDROP_ID)?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function normaliseType(type) {
    const raw = String(type || 'daily_note').trim();
    return RECORD_TYPES[raw] ? raw : ({ daily_record: 'daily_note', observation: 'daily_note', concern: 'safeguarding_concern', safeguarding_concern: 'safeguarding', key_work_session: 'keywork', health_note: 'health', education_note: 'education', family_contact: 'family', emotional_wellbeing_note: 'health', behaviour_note: 'daily_note', positive_outcome: 'daily_note', care_plan_update: 'plans', risk_assessment_update: 'safeguarding' }[raw] || 'daily_note');
  }

  function openDrawer(tabKey = 'daily_note') {
    ensureDrawer();
    const key = normaliseType(tabKey);
    const config = RECORD_TYPES[key] || RECORD_TYPES.daily_note;
    document.getElementById('record-create-title').textContent = config.title;
    document.getElementById('record-create-subtitle').textContent = `${childName()} · ${config.tone || 'therapeutic record'}`;
    document.getElementById('record-create-body').innerHTML = `<div class="record-workspace-main">${renderForm(key, config)}</div>${renderContextRail(key, config)}`;
    document.getElementById(DRAWER_ID).classList.add('open');
    document.getElementById(BACKDROP_ID).classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('therapeutic-record-form').addEventListener('submit', submitRecord);
    document.querySelector('[name="narrative"]')?.focus?.();
  }

  function renderContextRail(key, config) {
    const timeline = Array.isArray(window.state?.selectedChild?.timeline) ? window.state.selectedChild.timeline.slice(0, 3) : [];
    return `<aside class="record-context-rail"><div class="record-context-card"><strong>Current child</strong><p>${esc(childName())}</p><small>Home ${esc(homeId() || '—')} · ID ${esc(childId() || '—')}</small></div><div class="record-context-card"><strong>Connected outcome</strong><small>This record saves into universal records and is marked chronology-visible, inspection-relevant and assistant-readable within permissions.</small></div><div class="record-context-card"><strong>Recent chronology</strong>${timeline.length ? timeline.map(item => `<p>${esc(item.title || item.event_title || item.summary || 'Timeline entry')}</p>`).join('') : '<small>No recent child timeline loaded yet.</small>'}</div><div class="record-context-card"><strong>Assistant support</strong><small>Use Ask IndiCare for context, patterns, wording support or safeguarding reflection.</small><button type="button" class="record-create-button" data-record-ask style="margin-top:10px">Ask IndiCare</button></div></aside>`;
  }

  function renderForm(tabKey, config) {
    const specialised = specialisedFields(tabKey);
    return `
      <div class="therapeutic-guidance"><strong>${esc(config.tone || 'Person-centred recording')}:</strong> record once, then IndiCare links this to chronology, safeguarding, oversight, inspection evidence and assistant context.</div>
      <form id="therapeutic-record-form" class="therapeutic-form" data-tab-key="${esc(tabKey)}">
        <input type="hidden" name="record_type" value="${esc(config.record_type)}" />
        <input type="hidden" name="record_category" value="${esc(config.category)}" />
        <input type="hidden" name="sccif_area" value="${esc(config.sccif_area || '')}" />
        <div class="therapeutic-field"><label>Record type</label><select name="record_type_select">${Object.entries(RECORD_TYPES).map(([key, value]) => `<option value="${esc(key)}" ${key === tabKey ? 'selected' : ''}>${esc(value.title)}</option>`).join('')}</select></div>
        <div class="therapeutic-field"><label>Risk level</label><select name="risk_level"><option value="low">Low</option><option value="medium" ${config.risk === 'medium' ? 'selected' : ''}>Medium</option><option value="high" ${config.risk === 'high' ? 'selected' : ''}>High</option><option value="critical">Critical</option></select></div>
        <div class="therapeutic-field therapeutic-field-full"><label>Title</label><input name="title" required placeholder="Short professional title" value="${esc(config.title)}" /></div>
        ${specialised}
        <div class="therapeutic-field therapeutic-field-full"><label>Child voice</label><small>Record the child’s words, choices, wishes, feelings or communication.</small><textarea name="child_voice" placeholder="What did the child say, show, choose or communicate?"></textarea></div>
        <div class="therapeutic-field therapeutic-field-full"><label>Staff reflection / analysis</label><small>Think therapeutically: emotions, unmet needs, triggers, strengths and relationships.</small><textarea name="staff_analysis" placeholder="What might this tell us about the child’s experience, emotions or support needs?"></textarea></div>
        <div class="therapeutic-field therapeutic-field-full"><label>Therapeutic support and next steps</label><small>Include co-regulation, repair, safety planning or follow-up work.</small><textarea name="therapeutic_analysis" placeholder="How did staff support safety, regulation, connection and repair? What happens next?"></textarea></div>
        <div class="therapeutic-field"><label>Priority</label><select name="priority"><option value="normal">Normal</option><option value="medium">Medium</option><option value="high" ${config.review ? 'selected' : ''}>High</option><option value="critical">Critical</option></select></div>
        <div class="therapeutic-field"><label>Status</label><select name="status"><option value="submitted">Submitted</option><option value="draft">Draft</option><option value="active">Active</option><option value="open">Open</option></select></div>
        <div class="therapeutic-field therapeutic-field-full therapeutic-checks"><label><input type="checkbox" name="safeguarding_relevant" ${config.safeguarding ? 'checked' : ''}/> Safeguarding relevant</label><label><input type="checkbox" name="manager_review_required" ${config.review ? 'checked' : ''}/> Manager review required</label><label><input type="checkbox" name="restricted" /> Restricted</label><label><input type="checkbox" name="inspection_relevant" checked /> Inspection relevant</label></div>
        <div class="therapeutic-field therapeutic-field-full"><button class="therapeutic-submit" type="submit">Save and link record</button></div>
      </form>
    `;
  }

  function specialisedFields(key) {
    const labels = {
      incident: ['What happened?', 'Describe the incident factually, including context, triggers, response and impact.'],
      missing_episode: ['Missing episode detail', 'What happened before, during and after the episode? Include return-home presentation and contextual risks.'],
      physical_intervention: ['What happened?', 'Record the lead-up, intervention, safety rationale, debrief and repair.'],
      keywork: ['Key work discussion', 'What was explored, how did the child engage, and what progress or themes emerged?'],
      child_voice: ['What the child told us', 'Record wishes, feelings, views, complaints, choices or participation.'],
      education: ['Education update', 'Attendance, engagement, learning, relationships and emotional impact.'],
      health: ['Health and wellbeing update', 'Physical health, medication, appointments, sleep, eating and emotional wellbeing.'],
      family: ['Family time update', 'Before, during and after contact: emotional impact, relationships and support needed.'],
      safeguarding: ['Safeguarding concern', 'Concern, evidence, immediate safety, notifications and follow-up needed.'],
      plans: ['Plan update', 'What has changed in the plan, why, and what action is needed?']
    };
    const [label, help] = labels[key] || ['Daily living narrative', 'Capture the child’s day: emotional presentation, routines, relationships, education, health, activities and what adults should know.'];
    return `<div class="therapeutic-field therapeutic-field-full"><label>${esc(label)}</label><small>${esc(help)}</small><textarea name="narrative" required placeholder="Write the record here..."></textarea></div>`;
  }

  async function submitRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedKey = normaliseType(form.record_type_select.value);
    const config = RECORD_TYPES[selectedKey] || RECORD_TYPES.daily_note;
    const payload = {
      source_table: 'universal_manual_records', record_type: config.record_type, record_category: config.category, entity_type: 'child',
      home_id: Number(homeId()) || null, young_person_id: Number(childId()) || null, title: form.title.value,
      summary: form.narrative.value.slice(0, 300), narrative: form.narrative.value, child_voice: form.child_voice.value,
      staff_analysis: form.staff_analysis.value, staff_reflection: form.staff_analysis.value, therapeutic_analysis: form.therapeutic_analysis.value,
      status: form.status.value, priority: form.priority.value, risk_level: form.risk_level.value,
      review_state: form.manager_review_required.checked ? 'required' : 'not_required', safeguarding_relevant: form.safeguarding_relevant.checked,
      inspection_relevant: form.inspection_relevant.checked, chronology_visible: true, manager_review_required: form.manager_review_required.checked,
      restricted: form.restricted.checked, sccif_area: config.sccif_area, tags: [config.category, config.record_type, 'therapeutic-record'].filter(Boolean),
      occurred_at: new Date().toISOString(), metadata: { created_from: 'os_command_fullscreen_recording', form_key: selectedKey }
    };
    try {
      const res = await fetch('/api/universal-records', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      closeDrawer();
      window.toast?.('Therapeutic record saved and linked');
      window.IndiCareSafe?.emit?.('indicare:care-data-changed', { source: 'therapeutic_record', payload });
      if (typeof window.loadAll === 'function') await window.loadAll();
    } catch (error) {
      alert('Could not save record: ' + error.message);
    }
  }

  function wireExistingUI() {
    document.querySelectorAll('[data-record-wired="true"]').forEach(() => {});
    document.querySelectorAll('#care-form button[type="submit"], .os-new, [data-os-new-record], [data-create-record], [data-care-record-type]').forEach((node) => {
      if (node.dataset.recordWired === 'true') return;
      node.dataset.recordWired = 'true';
      if (node.closest('#therapeutic-record-form')) return;
      node.addEventListener('click', (event) => {
        const explicit = node.dataset.osNewRecord || node.dataset.createRecord || node.dataset.careRecordType;
        if (explicit || node.classList.contains('os-new')) {
          event.preventDefault();
          openDrawer(explicit || 'daily_note');
        }
      });
    });

    const careForm = document.getElementById('care-form');
    if (careForm && careForm.dataset.fullscreenIntercept !== 'true') {
      careForm.dataset.fullscreenIntercept = 'true';
      careForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const type = careForm.record_type?.value || 'daily_note';
        openDrawer(type);
      }, true);
    }

    document.querySelectorAll('[data-record-ask]').forEach((btn) => {
      if (btn.dataset.askBound === 'true') return;
      btn.dataset.askBound = 'true';
      btn.addEventListener('click', () => {
        window.IndiCareOSAssistant?.open?.();
        window.IndiCareOSAssistant?.ask?.(`Help me complete a ${document.getElementById('record-create-title')?.textContent || 'record'} for ${childName()}. Include chronology context, child voice, safeguarding considerations and what adults should know.`);
      });
    });
  }

  function addFloatingLauncher() {
    if (document.querySelector('[data-record-launcher-fixed]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'record-launcher-fixed';
    button.dataset.recordLauncherFixed = 'true';
    button.textContent = '+ Record';
    button.addEventListener('click', () => openDrawer('daily_note'));
    document.body.appendChild(button);
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    ensureDrawer();
    addFloatingLauncher();
    wireExistingUI();
    window.IndiCareTherapeuticRecordCreator = { open: openDrawer, close: closeDrawer, recordTypes: RECORD_TYPES };
    window.IndiCareYoungPersonWorkspace = window.IndiCareYoungPersonWorkspace || {};
    window.IndiCareYoungPersonWorkspace.newRecord = openDrawer;
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('record-wire-ui', wireExistingUI, 150) || setTimeout(wireExistingUI, 150));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => safeRun('record creator boot', boot)); else safeRun('record creator boot', boot);
})();
