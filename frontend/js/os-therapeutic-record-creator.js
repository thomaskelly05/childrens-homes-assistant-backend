(() => {
  const STYLE_ID = 'os-therapeutic-record-creator-style';
  const DRAWER_ID = 'therapeutic-record-create-drawer';
  const BACKDROP_ID = 'therapeutic-record-create-backdrop';
  const FLAG = '__indicareTherapeuticRecordCreatorV3';

  const RECORD_TYPES = {
    daily_note: { record_type: 'daily_note', category: 'care_record', title: 'Daily living record', tone: 'Whole-child daily life, routines, relationships and what adults should know', sccif_area: 'children_experiences_progress' },
    care: { alias: 'daily_note' },
    family: { record_type: 'family_contact', category: 'family', title: 'Family time record', tone: 'Before, during and after contact; attachment, identity, regulation and continuity', sccif_area: 'children_experiences_progress' },
    family_contact: { alias: 'family' },
    incident: { record_type: 'incident', category: 'safeguarding', title: 'Incident record', tone: 'Calm factual sequence, emotional meaning, safety, debrief and repair', safeguarding: true, risk: 'medium', review: true, sccif_area: 'helped_and_protected' },
    incidents: { alias: 'incident' },
    missing_episode: { record_type: 'missing_episode', category: 'safeguarding', title: 'Missing episode', tone: 'Contextual safeguarding, vulnerability, return-home understanding and safety planning', safeguarding: true, risk: 'high', review: true, sccif_area: 'helped_and_protected' },
    physical_intervention: { record_type: 'physical_intervention', category: 'safeguarding', title: 'Physical intervention', tone: 'Proportionality, de-escalation, safety, debrief and relational repair', safeguarding: true, risk: 'high', review: true, sccif_area: 'helped_and_protected' },
    safeguarding: { record_type: 'safeguarding_concern', category: 'safeguarding', title: 'Safeguarding concern', tone: 'Evidence, immediate safety, notifications, vulnerability and follow-up', safeguarding: true, risk: 'high', review: true, sccif_area: 'helped_and_protected' },
    keywork: { record_type: 'key_work', category: 'keywork', title: 'Key work session', tone: 'Therapeutic direct work, child voice, identity, progress and next steps', sccif_area: 'children_experiences_progress' },
    key_work: { alias: 'keywork' },
    child_voice: { record_type: 'child_voice', category: 'participation', title: 'Child voice', tone: 'Wishes, feelings, choices, rights, complaints and participation', sccif_area: 'children_experiences_progress' },
    education: { record_type: 'education_record', category: 'education', title: 'Education record', tone: 'School experience, emotional readiness, learning, relationships and aspiration', sccif_area: 'children_experiences_progress' },
    health: { record_type: 'health_record', category: 'health', title: 'Health and wellbeing record', tone: 'Physical health, emotional wellbeing, sleep, appetite, medication and appointments', sccif_area: 'children_experiences_progress' },
    plans: { record_type: 'support_plan', category: 'plan', title: 'Plan update', tone: 'Care, risk, support plan changes, rationale and actions', sccif_area: 'children_experiences_progress' },
    journey: { record_type: 'chronology_note', category: 'care_record', title: 'Child journey note', tone: 'Chronology, lived experience, transitions, meaning and progress', sccif_area: 'children_experiences_progress' }
  };

  const FORM_SECTIONS = {
    daily_note: [
      section('Emotional presentation', 'How has life felt today?', [ta('emotional_presentation','Emotional presentation','Mood, regulation, confidence, anxiety, shifts during the day.'), ta('regulation_support','Regulation and co-regulation','What helped, what did not help, and any repair moments?')]),
      section('Daily life', 'Capture the whole day, not just incidents.', [ta('routines','Routines, meals, sleep, hygiene','Meals, sleep, self-care, routines, independence and daily living.'), ta('activities','Activities and engagement','Activities, hobbies, community, play, enjoyment or withdrawal.'), ta('education_update','Education / learning','Attendance, engagement, school contact, learning and emotional impact.')]),
      section('Relationships and strengths', 'Record connection, progress and protective factors.', [ta('relationships','Relationships','Peers, staff, trusted adults, conflict, repair and belonging.'), ta('positive_moments','Positive moments / achievements','Strengths, joy, progress, resilience and things to reinforce.'), ta('what_adults_should_know','What adults should know','Continuity message for the next adult or shift.')]),
      commonVoiceAndActions()
    ],
    family: [
      section('Before family time', 'Preparation, anticipation and emotional presentation.', [ta('before_contact','Before contact','Anticipation, anxiety, excitement, avoidance, dysregulation or preparation needed.'), ta('preparation_support','Preparation and support','How staff prepared the child and what helped them feel safe.')]),
      section('During family time', 'Relationship quality, attachment and safety.', [ta('during_contact','During contact','Engagement, emotional shifts, attachment behaviour, themes discussed and observations.'), ta('relationship_quality','Relationship quality','Warmth, tension, boundaries, reassurance, rejection, loyalty conflict, identity themes.'), ta('safety_concerns','Any safety concerns','Concerns, adult behaviour, supervision issues, disclosures or worries.')]),
      section('After family time', 'Impact on the child and placement continuity.', [ta('after_contact','After contact','Regulation, sadness, anger, withdrawal, escalation, relief or need for co-regulation.'), ta('placement_impact','Impact on home life','Behaviour changes, routines disrupted, sleep/meals affected, relationships affected.'), ta('therapeutic_meaning','Therapeutic meaning','Attachment, grief, belonging, identity, rejection fears or unresolved feelings.')]),
      commonVoiceAndActions('What did the child say or show about family time?')
    ],
    incident: [
      section('Factual sequence', 'Separate facts from interpretation.', [ta('factual_sequence','What happened?','Clear factual sequence without blame or judgement.'), ta('context_triggers','What may have contributed?','Transitions, family contact, school, peers, unmet needs, sensory overload, tiredness.'), ta('risk_impact','Risk and impact','Injuries, damage, distress, people affected and immediate safety concerns.')]),
      section('Staff response and repair', 'Record care response, not just behaviour.', [ta('staff_response','Staff response','De-escalation, co-regulation, boundaries, safety steps and what helped.'), ta('repair_debrief','Debrief and repair','Child debrief, staff debrief, relationship repair and learning.'), ta('follow_up_needed','Follow-up needed','Manager review, safeguarding, health, key work, callback or plan update.')]),
      commonVoiceAndActions('What did the child say, show or communicate after the incident?')
    ],
    missing_episode: [
      section('Before missing', 'Understand vulnerability and context.', [ta('before_missing','Presentation before missing','Mood, triggers, peer/family/school issues, conflict, avoidance or distress.'), ta('push_pull_factors','Push and pull factors','What may have pushed the child away or pulled them elsewhere?'), ta('known_associations','Peers, locations and associations','Known peers, addresses, locations, online/contact concerns.')]),
      section('During and return', 'Contextual safeguarding and return-home understanding.', [ta('during_missing','During missing','Locations, risks, contact, police involvement, exploitation indicators.'), ta('return_home','Return home presentation','Emotional state, willingness to talk, tiredness, fear, avoidance, disclosures.'), ta('safety_plan','Safety planning','Immediate safety, return interview, notifications and follow-up.')]),
      commonVoiceAndActions('What did the child say during return home conversation?')
    ],
    physical_intervention: [
      section('Lead-up and intervention', 'Proportionality, safety and least restrictive practice.', [ta('lead_up','Lead-up','What was happening before intervention? What de-escalation was attempted?'), ta('intervention_details','Intervention details','What was used, why it was necessary, duration, staff involved and safety checks.'), ta('injury_health','Health / injury check','Injuries, first aid, medical attention, body checks and emotional presentation.')]),
      section('Debrief and repair', 'Learning and relational repair.', [ta('child_debrief','Child debrief','Child voice, feelings, understanding and wishes.'), ta('staff_debrief','Staff debrief','Learning, reflection, alternative approaches and support needs.'), ta('repair_follow_up','Repair and follow-up','Relationship repair, manager review, safeguarding and plan changes.')]),
      commonVoiceAndActions('What did the child say about the intervention?')
    ],
    safeguarding: [
      section('Concern and evidence', 'Be clear, precise and protective.', [ta('concern_details','Safeguarding concern','What is the concern? What evidence or disclosure supports it?'), ta('immediate_safety','Immediate safety','Immediate protective actions, people notified, supervision or restrictions.'), ta('vulnerability_context','Vulnerability context','Exploitation, missing, peers, online, family, school, self-harm or contextual risks.')]),
      section('Action and oversight', 'Make follow-up unmissable.', [ta('notifications','Notifications','Social worker, police, EDT, LADO, manager, health, school, family where appropriate.'), ta('follow_up_plan','Follow-up plan','Actions, review timescale, safety plan, chronology links and manager oversight.'), ta('what_adults_should_know','What adults should know','Critical continuity message for all adults caring for this child.')]),
      commonVoiceAndActions('Child voice, disclosure, presentation or non-verbal communication')
    ],
    keywork: [
      section('Session and engagement', 'Therapeutic direct work.', [ta('topic','Topic explored','What was the session about and why now?'), ta('engagement','Engagement','How did the child engage? What helped connection?'), ta('emotional_themes','Emotional themes','Identity, belonging, grief, safety, trust, relationships, aspirations.')]),
      section('Progress and next steps', 'Meaning, strengths and follow-up.', [ta('progress','Progress / insight','What changed, what was understood, what strengths emerged?'), ta('agreed_actions','Agreed actions','What was agreed with the child?'), ta('next_session','Next session / continuity','What should adults remember or revisit?')]),
      commonVoiceAndActions('Child voice and direct quotes')
    ],
    child_voice: [
      section('Voice and participation', 'Preserve lived experience.', [ta('wishes_feelings','Wishes and feelings','What does the child want, feel, worry about or hope for?'), ta('choices_rights','Choices, rights and participation','Choices offered, decisions influenced, rights/advocacy, complaints or compliments.'), ta('meaning','Emotional meaning','What might this tell us about safety, belonging, identity or relationships?')]),
      section('Response', 'Show the child their voice matters.', [ta('adult_response','Adult response','How did adults respond and validate the child?'), ta('actions_agreed','Actions agreed','What will happen because of what the child said?'), ta('feedback_loop','Feedback loop','How will the child know this was acted on?')]),
      commonVoiceAndActions('Direct child voice')
    ],
    education: [
      section('School experience', 'Learning and emotional readiness.', [ta('attendance','Attendance and engagement','Attendance, punctuality, participation, lessons and barriers.'), ta('emotional_readiness','Emotional readiness','Regulation, anxiety, confidence, fatigue, transitions and school relationships.'), ta('achievement','Achievement and progress','Learning progress, strengths, positive feedback, aspirations.')]),
      section('Support and risks', 'Connect education to care.', [ta('school_relationships','Relationships in school','Peers, trusted adults, conflict, bullying, belonging.'), ta('concerns','Concerns / exclusion risk','Exclusion, refusal, unmet SEND needs, peer issues, safeguarding.'), ta('education_actions','Actions','PEP/EHCP actions, school contact, transport, routines, key work.')]),
      commonVoiceAndActions('What did the child say or show about education?')
    ],
    health: [
      section('Physical and emotional wellbeing', 'Health as whole-child wellbeing.', [ta('physical_health','Physical health','Symptoms, injuries, appointments, pain, illness or concerns.'), ta('emotional_health','Emotional wellbeing','Mood, anxiety, trauma responses, regulation, self-esteem, CAMHS/therapy.'), ta('sleep_appetite','Sleep, appetite and routines','Sleep, food, hydration, self-care, hygiene and routine changes.')]),
      section('Medication and follow-up', 'Safe health recording.', [ta('medication','Medication','Medication taken/refused, side effects, PRN, errors or monitoring.'), ta('appointments','Appointments / professionals','Health appointments, outcomes and professional advice.'), ta('health_actions','Actions','Follow-up, monitoring, notifications, care plan changes.')]),
      commonVoiceAndActions('What did the child say or communicate about their health?')
    ],
    plans: [
      section('Plan change', 'Record why support is changing.', [ta('plan_area','Plan area','Care plan, risk assessment, support plan, behaviour support, education, health or family.'), ta('change_reason','Reason for change','What has changed in the child’s life, risk, needs or presentation?'), ta('new_support','New support / response','What adults will do differently and why.')]),
      section('Review and evidence', 'Make the plan actionable.', [ta('evidence','Evidence informing update','Records, chronology, child voice, incidents, professional input.'), ta('actions','Actions and owners','Who will do what and by when?'), ta('review_date','Review arrangements','When and how this will be reviewed.')]),
      commonVoiceAndActions('Child involvement in the plan')
    ],
    journey: [
      section('Journey meaning', 'Chronology as lived experience.', [ta('event_meaning','What happened and what did it mean?','Describe the event and its meaning for the child.'), ta('emotional_overlay','Emotional overlay','Feelings, regulation, relationships, repair, disruption or progress.'), ta('linked_context','Linked context','Family, school, health, safeguarding, placement, key work, achievements.')]),
      commonVoiceAndActions('Child voice within this journey moment')
    ]
  };

  function section(title, help, fields) { return { title, help, fields }; }
  function ta(name, label, help) { return { type: 'textarea', name, label, help }; }
  function commonVoiceAndActions(label = 'Child voice') { return section('Voice, reflection and continuity', 'This is what turns a form into therapeutic care recording.', [ta('child_voice', label, 'Use the child’s words where possible, including non-verbal communication.'), ta('staff_analysis', 'Therapeutic reflection', 'What does this tell us about the child’s experience, needs, strengths or relationships?'), ta('therapeutic_analysis', 'Support, repair and next steps', 'What should adults do next? What needs monitoring, repair, follow-up or celebration?')]); }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .record-create-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.42);display:none;z-index:900}.record-create-backdrop.open{display:block}.record-create-drawer{position:fixed;inset:18px;background:#fff;border:1px solid var(--ic-border,#dbe7f3);border-radius:28px;box-shadow:0 30px 90px rgba(15,23,42,.32);z-index:901;transform:translateY(24px);opacity:0;pointer-events:none;transition:transform .18s ease,opacity .18s ease;display:flex;flex-direction:column;overflow:hidden}.record-create-drawer.open{transform:translateY(0);opacity:1;pointer-events:auto}.record-create-head{padding:18px 20px;border-bottom:1px solid #dbe7f3;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:linear-gradient(180deg,#f8fafc,#fff)}.record-create-body{padding:0;overflow:auto;display:grid;grid-template-columns:minmax(0,1fr) 320px;min-height:0}.record-create-close{border:0;background:#eef4fb;border-radius:999px;width:40px;height:40px;font-weight:950}.record-workspace-main{padding:20px;overflow:auto}.record-context-rail{border-left:1px solid #e2e8f0;background:#f8fafc;padding:18px;display:grid;align-content:start;gap:12px}.record-context-card{border:1px solid #e2e8f0;background:#fff;border-radius:18px;padding:12px}.record-context-card strong{display:block;color:#0f172a;margin-bottom:4px}.record-context-card small,.record-context-card p{color:#64748b;margin:0;line-height:1.45}.record-section-card{border:1px solid #e2e8f0;background:#fff;border-radius:22px;padding:15px;margin-bottom:14px}.record-section-card h4{margin:0 0 4px;color:#0f172a}.record-section-card p{margin:0 0 12px;color:#64748b}.therapeutic-guidance{background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;padding:14px;margin-bottom:14px;color:#1e3a8a;line-height:1.45}.therapeutic-form{display:block}.therapeutic-field{display:grid;gap:6px;margin-bottom:10px}.therapeutic-field label{font-size:12px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.05em}.therapeutic-field small{color:#64748b;line-height:1.4}.therapeutic-field input,.therapeutic-field select,.therapeutic-field textarea{border:1px solid #dbe7f3;border-radius:14px;padding:11px;background:#fff}.therapeutic-field textarea{min-height:96px;resize:vertical}.record-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.therapeutic-checks{display:flex;gap:14px;flex-wrap:wrap;color:#64748b;font-size:13px}.therapeutic-submit{border:0;border-radius:14px;background:var(--ic-blue,#155eef);color:#fff;font-weight:900;padding:13px 16px}.record-launcher-fixed{position:fixed;right:24px;bottom:24px;z-index:120;border:0;border-radius:999px;background:var(--ic-blue,#155eef);color:#fff;font-weight:950;padding:14px 18px;box-shadow:0 18px 48px rgba(21,94,239,.28)}.record-create-button{border:0;border-radius:14px;background:var(--ic-blue,#155eef);color:#fff;font-weight:900;padding:10px 14px}.record-type-mini{border:1px solid #dbe7f3;background:#fff;border-radius:14px;padding:9px;text-align:left;width:100%;margin:4px 0}.record-type-mini:hover{background:#eff6ff;border-color:#93c5fd}@media(max-width:900px){.record-create-drawer{inset:0;border-radius:0}.record-create-body{grid-template-columns:1fr}.record-context-rail{border-left:0;border-top:1px solid #e2e8f0}.record-meta-grid{grid-template-columns:1fr}}
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

  function resolveType(type) {
    const raw = String(type || 'daily_note').trim();
    const value = RECORD_TYPES[raw];
    if (value?.alias) return value.alias;
    if (value) return raw;
    return ({ daily_record: 'daily_note', observation: 'daily_note', concern: 'safeguarding', safeguarding_concern: 'safeguarding', key_work_session: 'keywork', health_note: 'health', education_note: 'education', family_contact: 'family', emotional_wellbeing_note: 'health', behaviour_note: 'daily_note', positive_outcome: 'daily_note', care_plan_update: 'plans', risk_assessment_update: 'safeguarding' }[raw] || 'daily_note');
  }

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

  function openDrawer(tabKey = 'daily_note') {
    ensureDrawer();
    const key = resolveType(tabKey);
    const config = RECORD_TYPES[key] || RECORD_TYPES.daily_note;
    document.getElementById('record-create-title').textContent = config.title;
    document.getElementById('record-create-subtitle').textContent = `${childName()} · ${config.tone}`;
    document.getElementById('record-create-body').innerHTML = `<div class="record-workspace-main">${renderForm(key, config)}</div>${renderContextRail(key, config)}`;
    document.getElementById(DRAWER_ID).classList.add('open');
    document.getElementById(BACKDROP_ID).classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('therapeutic-record-form').addEventListener('submit', submitRecord);
    document.querySelector('[data-record-switch]')?.addEventListener('change', (e) => openDrawer(e.target.value));
    document.querySelector('[name]')?.focus?.();
    bindAskButtons();
  }

  function renderForm(key, config) {
    const sections = FORM_SECTIONS[key] || FORM_SECTIONS.daily_note;
    return `<div class="therapeutic-guidance"><strong>${esc(config.tone)}:</strong> this is a specialised therapeutic workspace. It saves once, then links to chronology, safeguarding, continuity, inspection evidence, oversight and assistant context.</div><form id="therapeutic-record-form" class="therapeutic-form" data-form-key="${esc(key)}"><div class="record-meta-grid"><div class="therapeutic-field"><label>Record type</label><select data-record-switch name="record_type_select">${Object.entries(RECORD_TYPES).filter(([,v])=>!v.alias).map(([value,type]) => `<option value="${esc(value)}" ${value === key ? 'selected' : ''}>${esc(type.title)}</option>`).join('')}</select></div><div class="therapeutic-field"><label>Risk level</label><select name="risk_level"><option value="low">Low</option><option value="medium" ${config.risk === 'medium' ? 'selected' : ''}>Medium</option><option value="high" ${config.risk === 'high' ? 'selected' : ''}>High</option><option value="critical">Critical</option></select></div><div class="therapeutic-field"><label>Status</label><select name="status"><option value="submitted">Submitted</option><option value="draft">Draft</option><option value="active">Active</option><option value="open">Open</option></select></div><div class="therapeutic-field"><label>Priority</label><select name="priority"><option value="normal">Normal</option><option value="medium">Medium</option><option value="high" ${config.review ? 'selected' : ''}>High</option><option value="critical">Critical</option></select></div></div><div class="therapeutic-field"><label>Title</label><input name="title" required value="${esc(config.title)}" /></div>${sections.map(renderSection).join('')}<div class="record-section-card"><h4>Linking and governance</h4><div class="therapeutic-checks"><label><input type="checkbox" name="safeguarding_relevant" ${config.safeguarding ? 'checked' : ''}/> Safeguarding relevant</label><label><input type="checkbox" name="manager_review_required" ${config.review ? 'checked' : ''}/> Manager review required</label><label><input type="checkbox" name="restricted" /> Restricted</label><label><input type="checkbox" name="inspection_relevant" checked /> Inspection relevant</label><label><input type="checkbox" name="chronology_visible" checked /> Chronology visible</label></div></div><button class="therapeutic-submit" type="submit">Save and link therapeutic record</button></form>`;
  }

  function renderSection(section) {
    return `<section class="record-section-card"><h4>${esc(section.title)}</h4><p>${esc(section.help)}</p>${section.fields.map(field => `<div class="therapeutic-field"><label>${esc(field.label)}</label><small>${esc(field.help)}</small><textarea name="${esc(field.name)}" placeholder="Write therapeutically, factually and respectfully..."></textarea></div>`).join('')}</section>`;
  }

  function renderContextRail(key, config) {
    const timeline = Array.isArray(window.state?.selectedChild?.timeline) ? window.state.selectedChild.timeline.slice(0, 4) : [];
    return `<aside class="record-context-rail"><div class="record-context-card"><strong>Current child</strong><p>${esc(childName())}</p><small>Home ${esc(homeId() || '—')} · ID ${esc(childId() || '—')}</small></div><div class="record-context-card"><strong>Connected outcome</strong><small>${esc(config.title)} feeds chronology, safeguarding, continuity, inspection evidence, oversight and assistant context.</small></div><div class="record-context-card"><strong>Recent chronology</strong>${timeline.length ? timeline.map(item => `<p>${esc(item.title || item.event_title || item.summary || 'Timeline entry')}</p>`).join('') : '<small>No recent child timeline loaded yet.</small>'}</div><div class="record-context-card"><strong>Specialised workspaces</strong>${Object.entries(RECORD_TYPES).filter(([,v])=>!v.alias).map(([value,type]) => `<button type="button" class="record-type-mini" data-open-record-type="${esc(value)}"><strong>${esc(type.title)}</strong><br><small>${esc(type.tone)}</small></button>`).join('')}</div><div class="record-context-card"><strong>Assistant support</strong><small>Ask IndiCare for wording, therapeutic reflection, safeguarding prompts or what adults should know.</small><button type="button" class="record-create-button" data-record-ask style="margin-top:10px">Ask IndiCare</button></div></aside>`;
  }

  function collectNarrative(form) {
    const parts = [];
    form.querySelectorAll('textarea').forEach(area => {
      const label = area.closest('.therapeutic-field')?.querySelector('label')?.textContent || area.name;
      if (area.value.trim()) parts.push(`${label}: ${area.value.trim()}`);
    });
    return parts.join('\n\n');
  }

  async function submitRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedKey = resolveType(form.record_type_select.value);
    const config = RECORD_TYPES[selectedKey] || RECORD_TYPES.daily_note;
    const narrative = collectNarrative(form);
    const payload = {
      source_table: 'universal_manual_records', record_type: config.record_type, record_category: config.category, entity_type: 'child',
      home_id: Number(homeId()) || null, young_person_id: Number(childId()) || null, title: form.title.value,
      summary: narrative.slice(0, 500), narrative,
      child_voice: form.querySelector('[name="child_voice"]')?.value || '', staff_analysis: form.querySelector('[name="staff_analysis"]')?.value || '', staff_reflection: form.querySelector('[name="staff_analysis"]')?.value || '', therapeutic_analysis: form.querySelector('[name="therapeutic_analysis"]')?.value || '',
      status: form.status.value, priority: form.priority.value, risk_level: form.risk_level.value,
      review_state: form.manager_review_required.checked ? 'required' : 'not_required', safeguarding_relevant: form.safeguarding_relevant.checked,
      inspection_relevant: form.inspection_relevant.checked, chronology_visible: form.chronology_visible.checked, manager_review_required: form.manager_review_required.checked,
      restricted: form.restricted.checked, sccif_area: config.sccif_area, tags: [config.category, config.record_type, selectedKey, 'specialised-therapeutic-record'].filter(Boolean),
      occurred_at: new Date().toISOString(), metadata: { created_from: 'specialised_os_recording_workspace', form_key: selectedKey, sectioned: true }
    };
    try {
      const res = await fetch('/api/universal-records', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      closeDrawer();
      window.toast?.('Therapeutic record saved and linked');
      window.IndiCareSafe?.emit?.('indicare:care-data-changed', { source: 'specialised_therapeutic_record', payload });
      if (typeof window.loadAll === 'function') await window.loadAll();
    } catch (error) { alert('Could not save record: ' + error.message); }
  }

  function bindAskButtons() {
    document.querySelectorAll('[data-record-ask]').forEach(btn => {
      if (btn.dataset.askBound === 'true') return;
      btn.dataset.askBound = 'true';
      btn.addEventListener('click', () => {
        window.IndiCareOSAssistant?.open?.();
        window.IndiCareOSAssistant?.ask?.(`Help me complete this specialised therapeutic record for ${childName()}. Consider child voice, emotional meaning, chronology, safeguarding, continuity, inspection evidence and what adults should know.`);
      });
    });
    document.querySelectorAll('[data-open-record-type]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => openDrawer(btn.dataset.openRecordType));
    });
  }

  function wireExistingUI() {
    document.querySelectorAll('#care-form button[type="submit"], .os-new, [data-os-new-record], [data-create-record], [data-care-record-type]').forEach((node) => {
      if (node.dataset.recordWired === 'true' || node.closest('#therapeutic-record-form')) return;
      node.dataset.recordWired = 'true';
      node.addEventListener('click', (event) => {
        const explicit = node.dataset.osNewRecord || node.dataset.createRecord || node.dataset.careRecordType;
        if (explicit || node.classList.contains('os-new')) { event.preventDefault(); openDrawer(explicit || 'daily_note'); }
      });
    });
    const careForm = document.getElementById('care-form');
    if (careForm && careForm.dataset.fullscreenIntercept !== 'true') {
      careForm.dataset.fullscreenIntercept = 'true';
      careForm.addEventListener('submit', (event) => { event.preventDefault(); openDrawer(careForm.record_type?.value || 'daily_note'); }, true);
    }
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
    injectStyles(); ensureDrawer(); addFloatingLauncher(); wireExistingUI(); bindAskButtons();
    window.IndiCareTherapeuticRecordCreator = { open: openDrawer, close: closeDrawer, recordTypes: RECORD_TYPES, sections: FORM_SECTIONS };
    window.IndiCareYoungPersonWorkspace = window.IndiCareYoungPersonWorkspace || {};
    window.IndiCareYoungPersonWorkspace.newRecord = openDrawer;
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('record-wire-ui', () => { wireExistingUI(); bindAskButtons(); }, 150) || setTimeout(() => { wireExistingUI(); bindAskButtons(); }, 150));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => safeRun('record creator boot', boot)); else safeRun('record creator boot', boot);
})();
