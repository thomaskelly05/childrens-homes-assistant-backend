const API = {
  authUser: () => JSON.parse(localStorage.getItem("chos_user") || "{}"),
  token: () => localStorage.getItem("chos_access_token") || "",

  ypList: "/young-people/",
  ypProfile: (id) => `/young-people/${id}/profile`,
  ypPhoto: (id) => `/young-people/${id}/photo`,

  daily: {
    list: (id) => `/young-people/${id}/daily-notes`,
    archive: (id) => `/young-people/${id}/daily-notes/archive`,
    get: (id) => `/young-people/daily-notes/${id}`,
    create: "/young-people/daily-notes",
    update: (id) => `/young-people/daily-notes/${id}`,
    submit: (id) => `/young-people/daily-notes/${id}/submit`,
    approve: (id) => `/young-people/daily-notes/${id}/approve`,
    return: (id) => `/young-people/daily-notes/${id}/return`,
    archiveOne: (id) => `/young-people/daily-notes/${id}/archive`,
  },

  incidents: {
    list: (id) => `/young-people/${id}/incidents`,
    archive: (id) => `/young-people/${id}/incidents/archive`,
    get: (id) => `/young-people/incidents/${id}`,
    create: "/young-people/incidents",
    update: (id) => `/young-people/incidents/${id}`,
    submit: (id) => `/young-people/incidents/${id}/submit`,
    approve: (id) => `/young-people/incidents/${id}/approve`,
    return: (id) => `/young-people/incidents/${id}/return`,
    archiveOne: (id) => `/young-people/incidents/${id}/archive`,
  },

  handover: {
    list: (id) => `/young-people/${id}/handover`,
    generate: (id) => `/young-people/${id}/handover/generate`,
    approve: (id) => `/young-people/handover/${id}/approve`,
    archive: (id) => `/young-people/handover/${id}/archive`,
  },

  health: {
    list: (id) => `/young-people/${id}/health`,
    profileSave: (id) => `/young-people/${id}/health/profile`,
    recordGet: (id) => `/young-people/health-records/${id}`,
    recordCreate: "/young-people/health-records",
    recordUpdate: (id) => `/young-people/health-records/${id}`,
    medProfileGet: (id) => `/young-people/medication-profiles/${id}`,
    medProfileCreate: "/young-people/medication-profiles",
    medProfileUpdate: (id) => `/young-people/medication-profiles/${id}`,
    medRecordGet: (id) => `/young-people/medication-records/${id}`,
    medRecordCreate: "/young-people/medication-records",
    medRecordUpdate: (id) => `/young-people/medication-records/${id}`,
  },

  education: {
    list: (id) => `/young-people/${id}/education`,
    profileSave: (id) => `/young-people/${id}/education/profile`,
    get: (id) => `/young-people/education-records/${id}`,
    create: "/young-people/education-records",
    update: (id) => `/young-people/education-records/${id}`,
  },

  family: {
    list: (id) => `/young-people/${id}/family`,
    contactGet: (id) => `/young-people/family/contacts/${id}`,
    contactCreate: (id) => `/young-people/${id}/family/contacts`,
    contactUpdate: (id) => `/young-people/family/contacts/${id}`,
    recordGet: (id) => `/young-people/family/records/${id}`,
    recordCreate: "/young-people/family/records",
    recordUpdate: (id) => `/young-people/family/records/${id}`,
  },

  keywork: {
    list: (id) => `/young-people/${id}/keywork`,
    get: (id) => `/young-people/keywork/${id}`,
    create: "/young-people/keywork",
    update: (id) => `/young-people/keywork/${id}`,
    submit: (id) => `/young-people/keywork/${id}/submit`,
    approve: (id) => `/young-people/keywork/${id}/approve`,
    return: (id) => `/young-people/keywork/${id}/return`,
    archive: (id) => `/young-people/keywork/${id}/archive`,
  },

  plans: {
    list: (id) => `/young-people/${id}/plans`,
    archive: (id) => `/young-people/${id}/plans/archive`,
    get: (id) => `/young-people/plans/${id}`,
    create: "/young-people/plans",
    update: (id) => `/young-people/plans/${id}`,
    submit: (id) => `/young-people/plans/${id}/submit`,
    approve: (id) => `/young-people/plans/${id}/approve`,
    return: (id) => `/young-people/plans/${id}/return`,
    archiveOne: (id) => `/young-people/plans/${id}/archive`,
    export: (id) => `/young-people/plans/${id}/export`,
  },

  risk: {
    list: (id) => `/young-people/${id}/risk`,
    archive: (id) => `/young-people/${id}/risk/archive`,
    get: (id) => `/young-people/risk/${id}`,
    create: "/young-people/risk",
    update: (id) => `/young-people/risk/${id}`,
  },

  chronology: {
    list: (id, params = "") => `/young-people/${id}/chronology${params}`,
    get: (id) => `/young-people/chronology/${id}`,
    create: "/young-people/chronology",
    update: (id) => `/young-people/chronology/${id}`,
    rebuild: (id) => `/young-people/${id}/chronology/rebuild`,
  },

  standards: {
    summary: (id) => `/young-people/${id}/standards`,
    evidence: (id) => `/young-people/${id}/standards/evidence`,
    rebuild: (id) => `/young-people/${id}/standards/rebuild`,
  },

  compliance: {
    list: (id) => `/young-people/${id}/compliance`,
  },

  statutory: {
    list: (id) => `/young-people/${id}/statutory-documents`,
    archive: (id) => `/young-people/${id}/statutory-documents/archive`,
    get: (id) => `/young-people/statutory-documents/${id}`,
    create: (id) => `/young-people/${id}/statutory-documents`,
    upload: (id) => `/young-people/${id}/statutory-documents/upload`,
    update: (id) => `/young-people/statutory-documents/${id}`,
    download: (id) => `/young-people/statutory-documents/${id}/download`,
  },

  ai: {
    history: "/ai-notes/history",
    one: (id) => `/ai-notes/history/${id}`,
    generate: "/ai-notes/generate",
    edit: "/ai-notes/edit",
    save: "/ai-notes/save",
  },

  chat: "/chat",
  command: "/command-centre",
  inspection: {
    create: "/inspection-pack",
    get: (id) => `/inspection-pack/young-person/${id}`,
  },

  rostering: {
    week: "/api/rostering/week",
    build: "/api/rostering/build-week-template",
    publish: "/api/rostering/publish-week",
    evidence: "/api/rostering/evidence",
  }
};

const state = {
  youngPeople: [],
  selectedId: null,
  profile: null,
  daily: [],
  dailyArchive: [],
  incidents: [],
  incidentArchive: [],
  handover: [],
  health: null,
  education: null,
  family: null,
  keywork: [],
  plans: [],
  plansArchive: [],
  risk: [],
  riskArchive: [],
  chronology: [],
  standards: [],
  standardsEvidence: [],
  compliance: [],
  statutory: [],
  statutoryArchive: [],
  aiHistory: [],
  command: null,
  inspection: null,
  managementQueue: {
    daily: [],
    incidents: [],
    keywork: [],
    plans: []
  }
};

const $ = (id) => document.getElementById(id);

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB");
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString("en-GB");
}

function toDateInput(v) {
  return v ? String(v).slice(0, 10) : "";
}

function toDateTimeInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function boolVal(id) {
  return $(id).value === "true";
}

function showStatus(id, text, err = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.style.color = err ? "#991b1b" : "#6b7280";
}

function setHtml(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function modal(id, open = true) {
  $(id)?.classList.toggle("hidden", !open);
}

function currentUser() {
  return API.authUser();
}

function requireAuth() {
  if (!API.token()) {
    window.location.href = "/oslogin.html";
    throw new Error("No session");
  }
}

async function api(url, options = {}) {
  requireAuth();

  const headers = {
    Authorization: `Bearer ${API.token()}`,
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  const type = res.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await res.json() : await res.text();

  if (res.status === 401) {
    localStorage.removeItem("chos_access_token");
    localStorage.removeItem("chos_user");
    window.location.href = "/oslogin.html";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error(typeof body === "object" ? body.detail || "Request failed" : body);
  }

  return body;
}

async function postJson(url, payload) {
  return api(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function putJson(url, payload) {
  return api(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function activateTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === `tab-${tab}`));
}

function renderUser() {
  const u = currentUser();
  $("currentUserChip").textContent = u?.email ? `${u.email} • ${u.role || "user"}` : "Not signed in";
}

function badgeClass(v) {
  const x = String(v || "").toLowerCase();
  if (["high", "critical", "overdue"].some(a => x.includes(a))) return "badge-danger";
  if (["medium", "submitted", "returned", "due_soon"].some(a => x.includes(a))) return "badge-warning";
  if (["approved", "active", "recorded", "ok"].some(a => x.includes(a))) return "badge-success";
  return "badge-neutral";
}

function fullName(yp) {
  return `${yp?.first_name || ""} ${yp?.last_name || ""}`.trim();
}

function renderYoungPeopleList(items = state.youngPeople) {
  if (!items.length) {
    setHtml("youngPeopleList", `<div class="empty-state">No young people found.</div>`);
    return;
  }

  setHtml("youngPeopleList", items.map(yp => `
    <article class="yp-card ${state.selectedId === yp.id ? "active" : ""}" data-yp="${yp.id}">
      <div class="yp-name-row">
        <div class="yp-name">${escapeHtml(fullName(yp))}</div>
        <span class="badge ${badgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk")}</span>
      </div>
      <div class="yp-sub">${escapeHtml(yp.placement_status || "Placement not set")}</div>
    </article>
  `).join(""));

  document.querySelectorAll("[data-yp]").forEach(el => {
    el.onclick = () => loadYoungPerson(Number(el.dataset.yp));
  });
}

function fillYPSelects() {
  const html = state.youngPeople.map(yp => `<option value="${yp.id}">${escapeHtml(fullName(yp))}</option>`).join("");
  ["aiYoungPerson", "dailyYoungPerson", "incidentYoungPerson"].forEach(id => {
    if ($(id)) {
      $(id).innerHTML = html;
      if (state.selectedId) $(id).value = state.selectedId;
    }
  });
}

function renderHero() {
  const yp = state.profile?.young_person;
  if (!yp) {
    $("heroAvatar").textContent = "OS";
    $("heroTitle").textContent = "IndiCare OS";
    $("heroDescription").textContent = "Select a young person to begin.";
    $("heroBadges").innerHTML = "";
    return;
  }

  const initials = `${yp.first_name?.[0] || ""}${yp.last_name?.[0] || ""}`.toUpperCase() || "YP";
  $("heroAvatar").textContent = initials;
  $("heroTitle").textContent = yp.preferred_name || fullName(yp);
  $("heroDescription").textContent = `${yp.placement_status || "Placement not set"} • DOB ${fmtDate(yp.date_of_birth)}`;
  $("heroBadges").innerHTML = `
    <span class="badge ${badgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk set")}</span>
    <span class="badge badge-neutral">${escapeHtml(yp.gender || "No gender set")}</span>
  `;
}

function simpleCard(title, meta, body, actions = "") {
  return `
    <div class="record-card">
      <div class="record-card-header">
        <div>
          <div class="record-title">${escapeHtml(title || "Untitled")}</div>
          <div class="record-meta">${escapeHtml(meta || "")}</div>
        </div>
      </div>
      <div class="record-body">${escapeHtml(body || "No detail")}</div>
      ${actions ? `<div class="record-actions">${actions}</div>` : ""}
    </div>
  `;
}

function renderOverview() {
  const yp = state.profile?.young_person;
  if (!yp) {
    setHtml("profilePanel", `<div class="empty-state">Select a young person to view profile.</div>`);
    setHtml("sideProfilePanel", `<div class="empty-state">Select a young person to view detail.</div>`);
    return;
  }

  const identity = state.profile.identity_profile?.[0] || {};
  const communication = state.profile.communication_profile?.[0] || {};
  const alerts = state.profile.alerts || [];

  setHtml("profilePanel", `
    <div class="kv">
      <div class="kv-label">Full name</div><div>${escapeHtml(fullName(yp))}</div>
      <div class="kv-label">Preferred name</div><div>${escapeHtml(yp.preferred_name || "—")}</div>
      <div class="kv-label">DOB</div><div>${escapeHtml(fmtDate(yp.date_of_birth))}</div>
      <div class="kv-label">Gender</div><div>${escapeHtml(yp.gender || "—")}</div>
      <div class="kv-label">Ethnicity</div><div>${escapeHtml(yp.ethnicity || "—")}</div>
      <div class="kv-label">NHS Number</div><div>${escapeHtml(yp.nhs_number || "—")}</div>
      <div class="kv-label">Local ID</div><div>${escapeHtml(yp.local_id_number || "—")}</div>
      <div class="kv-label">Admission date</div><div>${escapeHtml(fmtDate(yp.admission_date))}</div>
      <div class="kv-label">Placement status</div><div>${escapeHtml(yp.placement_status || "—")}</div>
    </div>
    <div class="section-block">
      <h4>Communication</h4>
      <div class="simple-item"><strong>Communication style</strong><br>${escapeHtml(communication.communication_style || "—")}</div>
      <div class="simple-item"><strong>Sensory profile</strong><br>${escapeHtml(communication.sensory_profile || "—")}</div>
    </div>
  `);

  setHtml("sideProfilePanel", `
    <div class="section-block">
      <h4>Photo</h4>
      ${yp.photo_url ? `<img src="${yp.photo_url}" alt="Young person photo" class="yp-photo-preview" />` : `<div class="empty-state">No photo uploaded.</div>`}
    </div>
    <div class="section-block">
      <h4>Identity</h4>
      <div class="simple-item"><strong>Interests</strong><br>${escapeHtml(identity.interests || "—")}</div>
      <div class="simple-item"><strong>Strengths</strong><br>${escapeHtml(identity.strengths_summary || "—")}</div>
      <div class="simple-item"><strong>What matters to me</strong><br>${escapeHtml(identity.what_matters_to_me || "—")}</div>
    </div>
    <div class="section-block">
      <h4>Alerts</h4>
      ${alerts.length ? alerts.map(a => `<div class="alert-item"><strong>${escapeHtml(a.title || a.alert_type || "Alert")}</strong><br>${escapeHtml(a.description || "")}</div>`).join("") : `<div class="empty-state">No alerts recorded.</div>`}
    </div>
  `);
}

function renderList(panelId, items, mapper, empty = "No records found.") {
  setHtml(panelId, items?.length ? `<div class="records-wrap">${items.map(mapper).join("")}</div>` : `<div class="empty-state">${escapeHtml(empty)}</div>`);
}

function renderDaily() {
  renderList("dailyNotesPanel", state.daily, n => simpleCard(
    n.title || "Daily note",
    `${fmtDate(n.note_date)} • ${n.shift_type || "shift"} • ${n.workflow_status || "draft"}`,
    n.summary || n.presentation || "Daily note recorded",
    `
      <button class="secondary-btn" onclick="App.editDaily(${n.id})">Edit</button>
      ${(n.workflow_status || "").toLowerCase() !== "submitted" ? `<button class="secondary-btn" onclick="App.submitDaily(${n.id})">Submit</button>` : ""}
      <button class="danger-btn" onclick="App.archiveDaily(${n.id})">Archive</button>
    `
  ), "No daily notes found.");
}

function renderIncidents() {
  renderList("incidentsPanel", state.incidents, n => simpleCard(
    n.title || "Incident",
    `${fmtDateTime(n.occurred_at)} • ${n.severity || "medium"}`,
    n.description || "Incident recorded",
    `
      <button class="secondary-btn" onclick="App.editIncident(${n.id})">Edit</button>
      ${(n.workflow_status || "").toLowerCase() !== "submitted" ? `<button class="secondary-btn" onclick="App.submitIncident(${n.id})">Submit</button>` : ""}
      <button class="danger-btn" onclick="App.archiveIncident(${n.id})">Archive</button>
    `
  ), "No incidents found.");
}

function renderHealth() {
  const h = state.health || {};
  const profile = h.health_profile || {};
  const records = h.health_records || [];
  const medProfiles = h.medication_profiles || [];
  const medRecords = h.medication_records || [];

  setHtml("healthProfilePanel", `
    <div class="simple-item"><strong>GP</strong><br>${escapeHtml(profile.gp_name || "—")}</div>
    <div class="simple-item"><strong>Allergies</strong><br>${escapeHtml(profile.allergies || "—")}</div>
    <div class="simple-item"><strong>Diagnoses</strong><br>${escapeHtml(profile.diagnoses || "—")}</div>
  `);

  setHtml("healthPanel", `
    <div class="records-wrap">
      <div class="dashboard-card"><strong>Health records</strong><br>${records.length}</div>
      ${records.map(r => simpleCard(r.title, `${fmtDateTime(r.event_datetime)} • ${r.record_type || "record"}`, r.summary || r.outcome || "Health record", `<button class="secondary-btn" onclick="App.editHealthRecord(${r.id})">Edit</button>`)).join("")}
      <div class="dashboard-card"><strong>Medication profiles</strong><br>${medProfiles.length}</div>
      ${medProfiles.map(r => simpleCard(r.medication_name, `${r.dose || "No dose"} • ${r.frequency || "No frequency"}`, r.reason || "Medication profile", `<button class="secondary-btn" onclick="App.editMedicationProfile(${r.id})">Edit</button>`)).join("")}
      <div class="dashboard-card"><strong>Medication records</strong><br>${medRecords.length}</div>
      ${medRecords.map(r => simpleCard(r.medication_name, `${fmtDateTime(r.administered_time || r.scheduled_time)} • ${r.status || "recorded"}`, `${r.dose || "No dose"} • ${r.route || "No route"}`, `<button class="secondary-btn" onclick="App.editMedicationRecord(${r.id})">Edit</button>`)).join("")}
    </div>
  `);
}

function renderEducation() {
  const e = state.education || {};
  const profile = e.education_profile || {};
  const items = e.education_records || [];
  setHtml("educationProfilePanel", `
    <div class="simple-item"><strong>School</strong><br>${escapeHtml(profile.school_name || "—")}</div>
    <div class="simple-item"><strong>Year group</strong><br>${escapeHtml(profile.year_group || "—")}</div>
    <div class="simple-item"><strong>Status</strong><br>${escapeHtml(profile.education_status || "—")}</div>
  `);

  renderList("educationPanel", items, r => simpleCard(
    r.title || "Education record",
    `${fmtDate(r.record_date)} • ${r.attendance_status || "attendance not set"}`,
    r.summary || r.learning_engagement || "Education record",
    `<button class="secondary-btn" onclick="App.editEducationRecord(${r.id})">Edit</button>`
  ), "No education records found.");
}

function renderFamily() {
  const f = state.family || {};
  const contacts = f.contacts || [];
  const items = f.family_contact_records || [];

  renderList("familyContactsPanel", contacts, c => simpleCard(
    c.full_name,
    `${c.relationship_to_child || "Relationship not set"} • ${c.is_approved_contact ? "Approved contact" : "Not approved"}`,
    c.contact_notes || c.phone_number || c.email || "No contact notes",
    `<button class="secondary-btn" onclick="App.editFamilyContact(${c.id})">Edit</button>`
  ), "No family contacts found.");

  renderList("familyPanel", items, r => simpleCard(
    r.title || "Family contact",
    `${fmtDateTime(r.contact_datetime)} • ${r.contact_type || "contact"}`,
    r.summary || r.concerns || "Family contact recorded",
    `<button class="secondary-btn" onclick="App.editFamilyRecord(${r.id})">Edit</button>`
  ), "No family records found.");
}

function renderKeywork() {
  renderList("keyworkPanel", state.keywork, k => simpleCard(
    k.title || "Keywork",
    `${fmtDate(k.session_date)} • ${k.workflow_status || "draft"}`,
    k.summary || "Keywork session recorded",
    `
      <button class="secondary-btn" onclick="App.editKeywork(${k.id})">Edit</button>
      ${(k.workflow_status || "").toLowerCase() !== "submitted" ? `<button class="secondary-btn" onclick="App.submitKeywork(${k.id})">Submit</button>` : ""}
      <button class="danger-btn" onclick="App.archiveKeywork(${k.id})">Archive</button>
    `
  ), "No keywork sessions found.");
}

function renderPlans() {
  renderList("plansPanel", state.plans, p => simpleCard(
    p.title || "Support plan",
    `${p.plan_type || "plan"} • review ${fmtDate(p.review_due_at)} • ${p.status || "draft"}`,
    p.summary || p.formulation || "Support plan recorded",
    `
      <button class="secondary-btn" onclick="App.editPlan(${p.id})">Edit</button>
      ${String(p.status || "").toLowerCase() !== "submitted" ? `<button class="secondary-btn" onclick="App.submitPlan(${p.id})">Submit</button>` : ""}
      <button class="secondary-btn" onclick="window.open('${API.plans.export(p.id)}','_blank')">Export</button>
      <button class="danger-btn" onclick="App.archivePlan(${p.id})">Archive</button>
    `
  ), "No support plans found.");
}

function renderRisk() {
  renderList("riskPanel", state.risk, r => simpleCard(
    r.title || "Risk assessment",
    `${r.category || "risk"} • ${r.severity || "medium"} • review ${fmtDate(r.review_date)}`,
    r.concern_summary || "Risk assessment recorded",
    `<button class="secondary-btn" onclick="App.editRisk(${r.id})">Edit</button>`
  ), "No risk assessments found.");
}

function renderChronology() {
  renderList("chronologyPanel", state.chronology, e => simpleCard(
    e.title || "Chronology event",
    `${fmtDateTime(e.event_datetime)} • ${e.category || "event"} • ${e.significance || "standard"}`,
    e.summary || "Chronology event",
    `<button class="secondary-btn" onclick="App.editChronology(${e.id})">Edit</button>`
  ), "No chronology found.");
}

function renderStandards() {
  renderList("standardsPanel", state.standards, s => simpleCard(
    `${s.code} • ${s.short_label || s.title}`,
    `Display order ${s.display_order || "—"}`,
    `${s.linked_record_count || 0} linked records`
  ), "No standards summary found.");

  renderList("standardsEvidencePanel", state.standardsEvidence, s => simpleCard(
    `${s.standard_code} • ${s.standard_short_label || s.standard_title}`,
    `${s.source_table || "source"} #${s.source_id || "—"} • ${s.evidence_strength || "supporting"}`,
    s.rationale || "No rationale"
  ), "No standards evidence found.");
}

function renderCompliance() {
  const items = state.compliance.compliance_items || state.compliance.items || [];
  renderList("compliancePanel", items, c => simpleCard(
    c.title || "Compliance item",
    `${c.compliance_type || "item"} • due ${fmtDate(c.due_date)} • ${c.compliance_status || "ok"}`,
    `${c.status || ""} ${c.approval_status || ""}`.trim() || "Compliance tracked"
  ), "No compliance items found.");
}

function renderStatutory() {
  renderList("statutoryPanel", state.statutory, d => simpleCard(
    d.title || "Statutory document",
    `${d.document_type || "document"} • review ${fmtDate(d.review_date)} • expiry ${fmtDate(d.expiry_date)}`,
    d.description || d.status || "Statutory document",
    `
      <button class="secondary-btn" onclick="App.editStatutory(${d.id})">Edit</button>
      ${d.file_url ? `<button class="secondary-btn" onclick="window.open('${API.statutory.download(d.id)}','_blank')">Download</button>` : ""}
    `
  ), "No statutory documents found.");
}

function renderHandover() {
  renderList("handoverPanel", state.handover, h => simpleCard(
    h.title || "Handover",
    `${fmtDate(h.handover_date)} • ${h.shift_type || "shift"} • ${h.status || "draft"}`,
    h.summary_text || "Handover recorded",
    `
      <button class="secondary-btn" onclick="App.approveHandover(${h.id})">Approve</button>
      <button class="danger-btn" onclick="App.archiveHandover(${h.id})">Archive</button>
    `
  ), "No handover found.");
}

function renderAI() {
  renderList("aiHistoryPanel", state.aiHistory, n => simpleCard(
    n.title || "AI note",
    `${n.young_person_name || "No young person"} • ${n.record_date || "No date"}`,
    n.excerpt || n.final_note || "AI note",
    `<button class="secondary-btn" onclick="App.editAi(${n.id})">Open</button>`
  ), "No AI notes found.");
}

function renderCommandCentre() {
  const c = state.command;
  if (!c) {
    setHtml("commandSummaryPanel", `<div class="empty-state">No command centre data.</div>`);
    setHtml("commandAlertsPanel", `<div class="empty-state">No alerts.</div>`);
    setHtml("commandTasksPanel", `<div class="empty-state">No tasks.</div>`);
    return;
  }

  const s = c.summary || {};
  setHtml("commandSummaryPanel", `
    <div class="records-wrap">
      ${Object.entries(s).map(([k, v]) => `<div class="dashboard-card"><strong>${escapeHtml(k.replaceAll("_", " "))}</strong><br>${escapeHtml(v)}</div>`).join("")}
    </div>
  `);

  renderList("commandAlertsPanel", c.alerts || [], a => simpleCard(
    a.title || "Alert",
    `${a.level || "info"} • ${a.young_person_name || ""}`,
    a.detail || ""
  ), "No alerts.");

  setHtml("commandTasksPanel", `
    <div class="records-wrap">
      ${(c.tasks || []).map(t => simpleCard(t.title, `${t.young_person_name || ""} • ${t.due || ""}`, "")).join("")}
      ${(c.meds_due || []).map(m => simpleCard(m.medicine || m.item, `${m.young_person_name || ""} • ${m.time_due || ""}`, m.status || "")).join("")}
      ${(c.handover || []).map(h => simpleCard(h.title, h.time || "", h.detail || "")).join("")}
    </div>
  `);
}

function renderInspection() {
  const i = state.inspection;
  if (!i) {
    setHtml("inspectionPanel", `<div class="empty-state">No inspection data loaded.</div>`);
    setHtml("inspectionSummaryPanel", `<div class="empty-state">No summary available.</div>`);
    return;
  }

  setHtml("inspectionPanel", `
    <div class="records-wrap">
      <div class="dashboard-card"><strong>Plans</strong><br>${(i.plans || []).length}</div>
      <div class="dashboard-card"><strong>Risks</strong><br>${(i.risks || []).length}</div>
      <div class="dashboard-card"><strong>Daily notes</strong><br>${(i.daily_notes || []).length}</div>
      <div class="dashboard-card"><strong>Incidents</strong><br>${(i.incidents || []).length}</div>
      <div class="dashboard-card"><strong>Health records</strong><br>${(i.health_records || []).length}</div>
      <div class="dashboard-card"><strong>Education records</strong><br>${(i.education_records || []).length}</div>
      <div class="dashboard-card"><strong>Family records</strong><br>${(i.family_records || []).length}</div>
      <div class="dashboard-card"><strong>Keywork</strong><br>${(i.keywork_sessions || []).length}</div>
      <div class="dashboard-card"><strong>Chronology</strong><br>${(i.chronology || []).length}</div>
      <div class="dashboard-card"><strong>Standards evidence</strong><br>${(i.standards_evidence || []).length}</div>
      <div class="dashboard-card"><strong>Compliance items</strong><br>${(i.compliance_items || []).length}</div>
    </div>
  `);

  setHtml("inspectionSummaryPanel", `
    <div class="records-wrap">
      ${(i.compliance_items || []).slice(0, 10).map(x => simpleCard(x.title || x.compliance_type, `${fmtDate(x.due_date)} • ${x.compliance_status || "ok"}`, x.status || "")).join("") || `<div class="empty-state">No compliance summary found.</div>`}
    </div>
  `);
}

function renderRostering(data = null) {
  if (!data) {
    setHtml("rosteringPanel", `<div class="empty-state">Load a rostering week to view rota data.</div>`);
    setHtml("rosteringEvidencePanel", `<div class="empty-state">No rostering evidence loaded.</div>`);
    return;
  }

  setHtml("rosteringPanel", `
    <div class="records-wrap">
      <div class="dashboard-card"><strong>Shifts</strong><br>${(data.shifts || []).length}</div>
      <div class="dashboard-card"><strong>Assignments</strong><br>${(data.assignments || []).length}</div>
      <div class="dashboard-card"><strong>Staff</strong><br>${(data.staff || []).length}</div>
      <div class="dashboard-card"><strong>Warnings</strong><br>${(data.warnings || []).length}</div>
      ${(data.shifts || []).slice(0, 20).map(s => simpleCard(
        `${s.shift_date} • ${s.shift_type}`,
        `${s.start_time} - ${s.end_time} • required ${s.required_count}`,
        s.notes || ""
      )).join("")}
    </div>
  `);

  setHtml("rosteringEvidencePanel", `
    <div class="records-wrap">
      ${(data.warnings || []).map(w => simpleCard(w.type || "warning", w.level || "", w.message || "")).join("") || `<div class="empty-state">No warnings.</div>`}
    </div>
  `);
}

function renderArchive() {
  setHtml("archivePanel", `
    <div class="records-wrap">
      <div class="dashboard-card"><strong>Archived daily notes</strong><br>${state.dailyArchive.length}</div>
      <div class="dashboard-card"><strong>Archived incidents</strong><br>${state.incidentArchive.length}</div>
      <div class="dashboard-card"><strong>Archived plans</strong><br>${state.plansArchive.length}</div>
      <div class="dashboard-card"><strong>Archived risks</strong><br>${state.riskArchive.length}</div>
      ${state.dailyArchive.map(r => simpleCard(r.title || "Daily note", fmtDate(r.note_date), r.summary || "")).join("")}
      ${state.incidentArchive.map(r => simpleCard(r.title || "Incident", fmtDateTime(r.occurred_at), r.description || "")).join("")}
      ${state.plansArchive.map(r => simpleCard(r.title || "Plan", fmtDate(r.review_due_at), r.summary || "")).join("")}
      ${state.riskArchive.map(r => simpleCard(r.title || "Risk", fmtDate(r.review_date), r.concern_summary || "")).join("")}
    </div>
  `);
}

function renderDashboard() {
  const queue = state.managementQueue;
  setHtml("dashboardOverview", `
    <div class="records-wrap">
      <div class="dashboard-card"><strong>Young people</strong><br>${state.youngPeople.length}</div>
      <div class="dashboard-card"><strong>Daily notes</strong><br>${state.daily.length}</div>
      <div class="dashboard-card"><strong>Incidents</strong><br>${state.incidents.length}</div>
      <div class="dashboard-card"><strong>Plans</strong><br>${state.plans.length}</div>
      <div class="dashboard-card"><strong>Risks</strong><br>${state.risk.length}</div>
      <div class="dashboard-card"><strong>AI notes</strong><br>${state.aiHistory.length}</div>
    </div>
  `);

  setHtml("dashboardQueue", `
    <div class="records-wrap">
      <div class="dashboard-card"><strong>Daily notes awaiting review</strong><br>${queue.daily.length}</div>
      <div class="dashboard-card"><strong>Incidents awaiting review</strong><br>${queue.incidents.length}</div>
      <div class="dashboard-card"><strong>Keywork awaiting review</strong><br>${queue.keywork.length}</div>
      <div class="dashboard-card"><strong>Plans awaiting review</strong><br>${queue.plans.length}</div>
    </div>
  `);

  setHtml("managementPanel", `
    <div class="records-wrap">
      ${queue.daily.map(x => simpleCard(x.title || "Daily note", `${x.young_person_name || ""} • ${x.workflow_status}`, x.summary || "")).join("")}
      ${queue.incidents.map(x => simpleCard(x.title || "Incident", `${x.young_person_name || ""} • ${x.workflow_status}`, x.description || "")).join("")}
      ${queue.keywork.map(x => simpleCard(x.title || "Keywork", `${x.young_person_name || ""} • ${x.workflow_status}`, x.summary || "")).join("")}
      ${queue.plans.map(x => simpleCard(x.title || "Plan", `${x.young_person_name || ""} • ${x.status}`, x.summary || "")).join("")}
      ${!queue.daily.length && !queue.incidents.length && !queue.keywork.length && !queue.plans.length ? `<div class="empty-state">No items currently awaiting review.</div>` : ""}
    </div>
  `);
}

function buildQueue() {
  state.managementQueue.daily = state.daily.filter(x => String(x.workflow_status || "").toLowerCase() === "submitted");
  state.managementQueue.incidents = state.incidents.filter(x => String(x.workflow_status || "").toLowerCase() === "submitted");
  state.managementQueue.keywork = state.keywork.filter(x => String(x.workflow_status || "").toLowerCase() === "submitted");
  state.managementQueue.plans = state.plans.filter(x => ["submitted"].includes(String(x.status || "").toLowerCase()) || ["submitted"].includes(String(x.approval_status || "").toLowerCase()));

  const yp = state.youngPeople.find(x => x.id === state.selectedId);
  const name = yp ? fullName(yp) : "";
  ["daily", "incidents", "keywork", "plans"].forEach(k => {
    state.managementQueue[k] = state.managementQueue[k].map(item => ({ ...item, young_person_name: name }));
  });
}

async function loadCommandCentre() {
  state.command = await api(API.command);
  renderCommandCentre();
}

async function loadYoungPeople() {
  const data = await api(API.ypList);
  state.youngPeople = Array.isArray(data.items) ? data.items : [];
  renderYoungPeopleList();
  fillYPSelects();
}

async function loadYoungPerson(id) {
  state.selectedId = id;
  renderYoungPeopleList();
  fillYPSelects();

  const [
    profile,
    daily,
    dailyArchive,
    incidents,
    incidentArchive,
    handover,
    health,
    education,
    family,
    keywork,
    plans,
    plansArchive,
    risk,
    riskArchive,
    chronology,
    standards,
    standardsEvidence,
    compliance,
    statutory,
    statutoryArchive
  ] = await Promise.all([
    api(API.ypProfile(id)),
    api(API.daily.list(id)),
    api(API.daily.archive(id)),
    api(API.incidents.list(id)),
    api(API.incidents.archive(id)),
    api(API.handover.list(id)),
    api(API.health.list(id)),
    api(API.education.list(id)),
    api(API.family.list(id)),
    api(API.keywork.list(id)),
    api(API.plans.list(id)),
    api(API.plans.archive(id)),
    api(API.risk.list(id)),
    api(API.risk.archive(id)),
    api(API.chronology.list(id)),
    api(API.standards.summary(id)),
    api(API.standards.evidence(id)),
    api(API.compliance.list(id)).catch(() => ({ compliance_items: [] })),
    api(API.statutory.list(id)),
    api(API.statutory.archive(id))
  ]);

  state.profile = profile;
  state.daily = daily.items || [];
  state.dailyArchive = dailyArchive.items || [];
  state.incidents = incidents.items || [];
  state.incidentArchive = incidentArchive.items || [];
  state.handover = Array.isArray(handover) ? handover : [];
  state.health = health || {};
  state.education = education || {};
  state.family = family || {};
  state.keywork = keywork.items || [];
  state.plans = plans.items || [];
  state.plansArchive = plansArchive.items || [];
  state.risk = Array.isArray(risk) ? risk : (risk.items || []);
  state.riskArchive = Array.isArray(riskArchive) ? riskArchive : (riskArchive.items || []);
  state.chronology = chronology.items || [];
  state.standards = Array.isArray(standards) ? standards : [];
  state.standardsEvidence = Array.isArray(standardsEvidence) ? standardsEvidence : [];
  state.compliance = compliance || {};
  state.statutory = Array.isArray(statutory) ? statutory : [];
  state.statutoryArchive = Array.isArray(statutoryArchive) ? statutoryArchive : [];

  buildQueue();
  renderHero();
  renderOverview();
  renderDaily();
  renderIncidents();
  renderHealth();
  renderEducation();
  renderFamily();
  renderKeywork();
  renderPlans();
  renderRisk();
  renderChronology();
  renderStandards();
  renderCompliance();
  renderStatutory();
  renderHandover();
  renderArchive();
  renderDashboard();
}

async function loadAiHistory() {
  const data = await api(API.ai.history);
  state.aiHistory = data.notes || [];
  renderAI();
}

async function loadInspectionPack() {
  if (!state.selectedId) return;
  state.inspection = await api(API.inspection.get(state.selectedId));
  renderInspection();
}

async function runQuickAssistant() {
  const message = $("quickAssistantPrompt").value.trim();
  if (!message) return;
  $("quickAssistantOutput").textContent = "Generating…";
  const result = await api(API.chat, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: null })
  });
  $("quickAssistantOutput").textContent = typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

async function aiGenerateFromText(text) {
  const fd = new FormData();
  fd.append("transcript", text);
  return api(API.ai.generate, { method: "POST", body: fd });
}

async function aiPolish(text, instruction) {
  const fd = new FormData();
  fd.append("text", text);
  fd.append("mode", "polish");
  fd.append("instruction", instruction);
  return api(API.ai.edit, { method: "POST", body: fd });
}

/* MODAL OPENERS */

function openAiModal() {
  $("aiNoteId").value = "";
  $("aiRecordDate").value = new Date().toISOString().slice(0, 10);
  $("aiTranscript").value = "";
  $("aiDraft").value = "";
  $("aiFinalNote").value = "";
  $("aiShiftType").value = "";
  $("aiLocationContext").value = "";
  if (state.selectedId) $("aiYoungPerson").value = state.selectedId;
  showStatus("aiStatus", "");
  modal("aiNoteModal", true);
}

function openDailyModal() {
  $("dailyNoteId").value = "";
  $("dailyNoteDate").value = new Date().toISOString().slice(0, 10);
  ["dailyShiftType","dailyMood","dailyPresentation","dailyActivities","dailyEducation","dailyHealth","dailyFamily","dailyBehaviour","dailyVoice","dailyPositives","dailyActions","dailyAiDraft"].forEach(id => $(id).value = "");
  if (state.selectedId) $("dailyYoungPerson").value = state.selectedId;
  showStatus("dailyStatus", "");
  modal("dailyNoteModal", true);
}

function openIncidentModal() {
  $("incidentId").value = "";
  $("incidentOccurredAt").value = toDateTimeInput(new Date().toISOString());
  ["incidentLocation","incidentStaffId","incidentDescription","incidentAntecedent","incidentPresentation","incidentStaffResponse","incidentFormulation","incidentVoice","incidentRestorative","incidentAiDraft"].forEach(id => $(id).value = "");
  $("incidentType").value = "other";
  $("incidentSeverity").value = "medium";
  if (state.selectedId) $("incidentYoungPerson").value = state.selectedId;
  showStatus("incidentStatus", "");
  modal("incidentModal", true);
}

function openPlanModal() {
  $("planId").value = "";
  $("planType").value = "support_plan";
  ["planTitle","planOwnerId","planSummary","planChildVoice","planFormulation","planStaffGuidance","planPaceGuidance","planTriggers","planProtectiveFactors"].forEach(id => $(id).value = "");
  $("planStartDate").value = new Date().toISOString().slice(0, 10);
  $("planReviewDate").value = "";
  showStatus("planStatus", "");
  modal("planModal", true);
}

function openRiskModal() {
  $("riskId").value = "";
  ["riskCategory","riskTitle","riskOwnerId","riskConcernSummary","riskKnownTriggers","riskEarlyWarningSigns","riskContextualFactors","riskCurrentControls","riskDeescalationStrategies","riskResponseActions","riskChildViews"].forEach(id => $(id).value = "");
  $("riskSeverity").value = "medium";
  $("riskLikelihood").value = "medium";
  $("riskReviewDate").value = "";
  showStatus("riskStatus", "");
  modal("riskModal", true);
}

/* SAVE ACTIONS */

async function saveAiNote() {
  const yp = state.youngPeople.find(x => String(x.id) === String($("aiYoungPerson").value));
  const fd = new FormData();
  if ($("aiNoteId").value) fd.append("note_id", $("aiNoteId").value);
  fd.append("transcript", $("aiTranscript").value);
  fd.append("ai_draft", $("aiDraft").value);
  fd.append("final_note", $("aiFinalNote").value);
  fd.append("safeguarding_flag", "false");
  fd.append("safeguarding_reason", "");
  fd.append("title", $("aiFinalNote").value.split("\n")[0] || "AI Care Note");
  fd.append("template_name", "Young People Shell");
  fd.append("service_type", "Residential Care");
  fd.append("shift_type", $("aiShiftType").value);
  fd.append("record_author", "");
  fd.append("young_person_name", yp ? fullName(yp) : "");
  fd.append("record_date", $("aiRecordDate").value);
  fd.append("location_context", $("aiLocationContext").value);
  await api(API.ai.save, { method: "POST", body: fd });
  modal("aiNoteModal", false);
  await loadAiHistory();
  renderDashboard();
}

async function saveDaily() {
  const id = $("dailyNoteId").value;
  const payload = {
    young_person_id: Number($("dailyYoungPerson").value),
    note_date: $("dailyNoteDate").value,
    shift_type: $("dailyShiftType").value,
    mood: $("dailyMood").value,
    presentation: $("dailyPresentation").value,
    activities: $("dailyActivities").value,
    education_update: $("dailyEducation").value,
    health_update: $("dailyHealth").value,
    family_update: $("dailyFamily").value,
    behaviour_update: $("dailyBehaviour").value,
    young_person_voice: $("dailyVoice").value,
    positives: $("dailyPositives").value,
    actions_required: $("dailyActions").value
  };
  id ? await putJson(API.daily.update(id), payload) : await postJson(API.daily.create, payload);
  modal("dailyNoteModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveIncident() {
  const id = $("incidentId").value;
  const payload = {
    young_person_id: Number($("incidentYoungPerson").value),
    occurred_at: new Date($("incidentOccurredAt").value).toISOString(),
    incident_type: $("incidentType").value,
    severity: $("incidentSeverity").value,
    location: $("incidentLocation").value,
    description: $("incidentDescription").value,
    antecedent: $("incidentAntecedent").value,
    presentation: $("incidentPresentation").value,
    staff_response: $("incidentStaffResponse").value,
    trauma_informed_formulation: $("incidentFormulation").value,
    child_voice: $("incidentVoice").value,
    restorative_follow_up: $("incidentRestorative").value,
    staff_id: $("incidentStaffId").value ? Number($("incidentStaffId").value) : null
  };
  id ? await putJson(API.incidents.update(id), payload) : await postJson(API.incidents.create, payload);
  modal("incidentModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveHealthProfile() {
  await putJson(API.health.profileSave(state.selectedId), {
    gp_name: $("healthGpName").value,
    allergies: $("healthAllergies").value,
    diagnoses: $("healthDiagnoses").value
  });
  modal("healthProfileModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveHealthRecord() {
  const id = $("healthRecordId").value;
  const payload = {
    young_person_id: state.selectedId,
    record_type: $("healthRecordType").value,
    title: $("healthRecordTitle").value,
    summary: $("healthSummary").value,
    professional_name: $("healthProfessionalName").value,
    outcome: $("healthOutcome").value,
    follow_up_required: boolVal("healthFollowUpRequired"),
    next_action_date: $("healthNextActionDate").value || null,
    event_datetime: $("healthEventDateTime").value ? new Date($("healthEventDateTime").value).toISOString() : null,
    created_by: null
  };
  id ? await putJson(API.health.recordUpdate(id), payload) : await postJson(API.health.recordCreate, payload);
  modal("healthRecordModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveMedicationProfile() {
  const id = $("medicationProfileId").value;
  const payload = {
    young_person_id: state.selectedId,
    medication_name: $("medProfileName").value,
    dose: $("medProfileDose").value,
    route: $("medProfileRoute").value,
    frequency: $("medProfileFrequency").value,
    reason: $("medProfileReason").value,
    start_date: $("medProfileStartDate").value || null,
    end_date: $("medProfileEndDate").value || null,
    is_active: boolVal("medProfileActive")
  };
  id ? await putJson(API.health.medProfileUpdate(id), payload) : await postJson(API.health.medProfileCreate, payload);
  modal("medicationProfileModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveMedicationRecord() {
  const id = $("medicationRecordId").value;
  const payload = {
    young_person_id: state.selectedId,
    medication_name: $("medRecordName").value,
    dose: $("medRecordDose").value,
    route: $("medRecordRoute").value,
    status: $("medRecordStatusValue").value,
    error_flag: boolVal("medRecordErrorFlag"),
    scheduled_time: $("medRecordScheduledTime").value ? new Date($("medRecordScheduledTime").value).toISOString() : null,
    administered_time: $("medRecordAdministeredTime").value ? new Date($("medRecordAdministeredTime").value).toISOString() : null,
    administered_by: $("medRecordAdministeredBy").value ? Number($("medRecordAdministeredBy").value) : null
  };
  id ? await putJson(API.health.medRecordUpdate(id), payload) : await postJson(API.health.medRecordCreate, payload);
  modal("medicationRecordModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveEducationProfile() {
  await putJson(API.education.profileSave(state.selectedId), {
    school_name: $("educationSchoolName").value,
    year_group: $("educationYearGroup").value,
    education_status: $("educationStatusValue").value
  });
  modal("educationProfileModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveEducationRecord() {
  const id = $("educationRecordId").value;
  const payload = {
    young_person_id: state.selectedId,
    record_date: $("educationRecordDate").value || null,
    attendance_status: $("educationAttendanceStatus").value,
    provision_name: $("educationProvisionName").value,
    behaviour_summary: $("educationBehaviourSummary").value,
    learning_engagement: $("educationLearningEngagement").value,
    issue_raised: $("educationIssueRaised").value,
    action_taken: $("educationActionTaken").value,
    professional_involved: $("educationProfessionalInvolved").value,
    achievement_note: $("educationAchievementNote").value
  };
  id ? await putJson(API.education.update(id), payload) : await postJson(API.education.create, payload);
  modal("educationRecordModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveFamilyContact() {
  const id = $("familyContactId").value;
  const payload = {
    full_name: $("familyContactFullName").value,
    relationship_to_child: $("familyRelationship").value,
    phone_number: $("familyPhoneNumber").value,
    email: $("familyEmail").value,
    address: $("familyAddress").value,
    is_parental_responsibility_holder: boolVal("familyParentalResponsibility"),
    is_approved_contact: boolVal("familyApprovedContact"),
    contact_notes: $("familyContactNotes").value
  };
  id ? await putJson(API.family.contactUpdate(id), payload) : await postJson(API.family.contactCreate(state.selectedId), payload);
  modal("familyContactModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveFamilyRecord() {
  const id = $("familyRecordId").value;
  const payload = {
    young_person_id: state.selectedId,
    contact_datetime: $("familyContactDateTime").value ? new Date($("familyContactDateTime").value).toISOString() : null,
    contact_type: $("familyContactType").value,
    contact_person: $("familyContactPerson").value,
    supervision_level: $("familySupervisionLevel").value,
    location: $("familyLocation").value,
    pre_contact_presentation: $("familyPrePresentation").value,
    post_contact_presentation: $("familyPostPresentation").value,
    child_voice: $("familyChildVoice").value,
    concerns: $("familyConcerns").value,
    follow_up_required: boolVal("familyFollowUpRequired")
  };
  id ? await putJson(API.family.recordUpdate(id), payload) : await postJson(API.family.recordCreate, payload);
  modal("familyRecordModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveKeywork() {
  const id = $("keyworkId").value;
  const payload = {
    young_person_id: state.selectedId,
    session_date: $("keyworkSessionDate").value,
    worker_id: $("keyworkWorkerId").value ? Number($("keyworkWorkerId").value) : null,
    topic: $("keyworkTopic").value,
    purpose: $("keyworkPurpose").value,
    summary: $("keyworkSummary").value,
    child_voice: $("keyworkChildVoice").value,
    reflective_analysis: $("keyworkReflectiveAnalysis").value,
    actions_agreed: $("keyworkActionsAgreed").value,
    next_session_date: $("keyworkNextSessionDate").value || null,
    status: "draft",
    archived: false
  };
  id ? await putJson(API.keywork.update(id), payload) : await postJson(API.keywork.create, payload);
  modal("keyworkModal", false);
  await loadYoungPerson(state.selectedId);
}

async function savePlan() {
  const id = $("planId").value;
  const payload = {
    young_person_id: state.selectedId,
    plan_type: $("planType").value || "support_plan",
    title: $("planTitle").value,
    summary: $("planSummary").value,
    child_voice: $("planChildVoice").value,
    formulation: $("planFormulation").value,
    staff_guidance: $("planStaffGuidance").value,
    pace_guidance: $("planPaceGuidance").value,
    triggers: $("planTriggers").value,
    protective_factors: $("planProtectiveFactors").value,
    start_date: $("planStartDate").value || null,
    review_date: $("planReviewDate").value || null,
    owner_id: $("planOwnerId").value ? Number($("planOwnerId").value) : null,
    status: "draft",
    approval_status: "draft"
  };
  id ? await putJson(API.plans.update(id), payload) : await postJson(API.plans.create, payload);
  modal("planModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveRisk() {
  const id = $("riskId").value;
  const payload = {
    young_person_id: state.selectedId,
    category: $("riskCategory").value,
    title: $("riskTitle").value,
    concern_summary: $("riskConcernSummary").value,
    known_triggers: $("riskKnownTriggers").value,
    early_warning_signs: $("riskEarlyWarningSigns").value,
    contextual_factors: $("riskContextualFactors").value,
    current_controls: $("riskCurrentControls").value,
    deescalation_strategies: $("riskDeescalationStrategies").value,
    response_actions: $("riskResponseActions").value,
    child_views: $("riskChildViews").value,
    severity: $("riskSeverity").value,
    likelihood: $("riskLikelihood").value,
    review_date: $("riskReviewDate").value || null,
    status: "active",
    owner_id: $("riskOwnerId").value ? Number($("riskOwnerId").value) : null
  };
  id ? await putJson(API.risk.update(id), payload) : await postJson(API.risk.create, payload);
  modal("riskModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveChronologyEvent() {
  const id = $("chronologyEventId").value;
  const payload = {
    young_person_id: state.selectedId,
    event_datetime: $("chronologyEventDateTime").value ? new Date($("chronologyEventDateTime").value).toISOString() : null,
    category: $("chronologyCategory").value,
    subcategory: $("chronologySubcategory").value,
    title: $("chronologyTitle").value,
    summary: $("chronologySummary").value,
    significance: $("chronologySignificance").value || "standard",
    event_status: "recorded",
    linked_standard: $("chronologyLinkedStandard").value || null,
    linked_judgement_area: $("chronologyLinkedJudgementArea").value || null,
    auto_generated: false,
    is_visible: true
  };
  id ? await putJson(API.chronology.update(id), payload) : await postJson(API.chronology.create, payload);
  modal("chronologyEventModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveStatutoryCreate() {
  const id = $("statutoryDocumentId").value;
  const payload = {
    home_id: currentUser().home_id || null,
    document_type: $("statutoryDocumentType").value,
    title: $("statutoryTitle").value,
    description: $("statutoryDescription").value,
    issue_date: $("statutoryIssueDate").value || null,
    review_date: $("statutoryReviewDate").value || null,
    expiry_date: $("statutoryExpiryDate").value || null,
    status: $("statutoryStatusValue").value || "current",
    compliance_category: $("statutoryComplianceCategory").value || null,
    linked_standard_code: $("statutoryLinkedStandardCode").value || null,
    uploaded_by: currentUser().id || null
  };
  id ? await putJson(API.statutory.update(id), payload) : await postJson(API.statutory.create(state.selectedId), payload);
  modal("statutoryCreateModal", false);
  await loadYoungPerson(state.selectedId);
}

async function saveStatutoryUpload() {
  const fd = new FormData();
  fd.append("document_type", $("statUploadDocumentType").value);
  fd.append("title", $("statUploadTitle").value);
  fd.append("description", $("statUploadDescription").value);
  fd.append("issue_date", $("statUploadIssueDate").value);
  fd.append("review_date", $("statUploadReviewDate").value);
  fd.append("expiry_date", $("statUploadExpiryDate").value);
  fd.append("status", $("statUploadStatus").value);
  fd.append("compliance_category", $("statUploadComplianceCategory").value);
  fd.append("linked_standard_code", $("statUploadLinkedStandardCode").value);
  fd.append("uploaded_by", currentUser().id || "");
  fd.append("home_id", currentUser().home_id || "");
  fd.append("file", $("statUploadFile").files[0]);
  await api(API.statutory.upload(state.selectedId), { method: "POST", body: fd });
  modal("statutoryUploadModal", false);
  await loadYoungPerson(state.selectedId);
}

async function savePhoto() {
  const fd = new FormData();
  fd.append("photo", $("youngPersonPhotoFile").files[0]);
  await api(API.ypPhoto(state.selectedId), { method: "POST", body: fd });
  modal("photoUploadModal", false);
  await loadYoungPerson(state.selectedId);
}

/* EDIT LOADERS */

const App = {
  async editAi(id) {
    const d = await api(API.ai.one(id));
    const n = d.note;
    openAiModal();
    $("aiNoteId").value = n.id || "";
    $("aiTranscript").value = n.transcript || "";
    $("aiDraft").value = n.final_note || "";
    $("aiFinalNote").value = n.final_note || "";
    $("aiShiftType").value = n.shift_type || "";
    $("aiLocationContext").value = n.location_context || "";
    $("aiRecordDate").value = n.record_date || "";
  },

  async editDaily(id) {
    const n = await api(API.daily.get(id));
    openDailyModal();
    $("dailyNoteId").value = n.id || "";
    $("dailyYoungPerson").value = n.young_person_id;
    $("dailyNoteDate").value = toDateInput(n.note_date);
    $("dailyShiftType").value = n.shift_type || "";
    $("dailyMood").value = n.mood || "";
    $("dailyPresentation").value = n.presentation || "";
    $("dailyActivities").value = n.activities || "";
    $("dailyEducation").value = n.education_update || "";
    $("dailyHealth").value = n.health_update || "";
    $("dailyFamily").value = n.family_update || "";
    $("dailyBehaviour").value = n.behaviour_update || "";
    $("dailyVoice").value = n.young_person_voice || "";
    $("dailyPositives").value = n.positives || "";
    $("dailyActions").value = n.actions_required || "";
  },

  async editIncident(id) {
    const n = await api(API.incidents.get(id));
    openIncidentModal();
    $("incidentId").value = n.id || "";
    $("incidentYoungPerson").value = n.young_person_id;
    $("incidentOccurredAt").value = toDateTimeInput(n.occurred_at);
    $("incidentType").value = n.incident_type || "other";
    $("incidentSeverity").value = n.severity || "medium";
    $("incidentLocation").value = n.location || "";
    $("incidentStaffId").value = n.staff_id || "";
    $("incidentDescription").value = n.description || "";
    $("incidentAntecedent").value = n.antecedent || "";
    $("incidentPresentation").value = n.presentation || "";
    $("incidentStaffResponse").value = n.staff_response || "";
    $("incidentFormulation").value = n.trauma_informed_formulation || "";
    $("incidentVoice").value = n.child_voice || "";
    $("incidentRestorative").value = n.restorative_follow_up || "";
  },

  async editHealthRecord(id) {
    const n = await api(API.health.recordGet(id));
    modal("healthRecordModal", true);
    $("healthRecordId").value = n.id || "";
    $("healthRecordType").value = n.record_type || "";
    $("healthRecordTitle").value = n.title || "";
    $("healthProfessionalName").value = n.professional_name || "";
    $("healthEventDateTime").value = toDateTimeInput(n.event_datetime);
    $("healthNextActionDate").value = toDateInput(n.next_action_date);
    $("healthFollowUpRequired").value = n.follow_up_required ? "true" : "false";
    $("healthSummary").value = n.summary || "";
    $("healthOutcome").value = n.outcome || "";
  },

  async editMedicationProfile(id) {
    const n = await api(API.health.medProfileGet(id));
    modal("medicationProfileModal", true);
    $("medicationProfileId").value = n.id || "";
    $("medProfileName").value = n.medication_name || "";
    $("medProfileDose").value = n.dose || "";
    $("medProfileRoute").value = n.route || "";
    $("medProfileFrequency").value = n.frequency || "";
    $("medProfileReason").value = n.reason || "";
    $("medProfileStartDate").value = toDateInput(n.start_date);
    $("medProfileEndDate").value = toDateInput(n.end_date);
    $("medProfileActive").value = n.is_active ? "true" : "false";
  },

  async editMedicationRecord(id) {
    const n = await api(API.health.medRecordGet(id));
    modal("medicationRecordModal", true);
    $("medicationRecordId").value = n.id || "";
    $("medRecordName").value = n.medication_name || "";
    $("medRecordDose").value = n.dose || "";
    $("medRecordRoute").value = n.route || "";
    $("medRecordStatusValue").value = n.status || "";
    $("medRecordErrorFlag").value = n.error_flag ? "true" : "false";
    $("medRecordScheduledTime").value = toDateTimeInput(n.scheduled_time);
    $("medRecordAdministeredTime").value = toDateTimeInput(n.administered_time);
    $("medRecordAdministeredBy").value = n.administered_by || "";
  },

  async editEducationRecord(id) {
    const n = await api(API.education.get(id));
    modal("educationRecordModal", true);
    $("educationRecordId").value = n.id || "";
    $("educationRecordDate").value = toDateInput(n.record_date);
    $("educationAttendanceStatus").value = n.attendance_status || "";
    $("educationProvisionName").value = n.provision_name || "";
    $("educationProfessionalInvolved").value = n.professional_involved || "";
    $("educationBehaviourSummary").value = n.behaviour_summary || "";
    $("educationLearningEngagement").value = n.learning_engagement || "";
    $("educationIssueRaised").value = n.issue_raised || "";
    $("educationActionTaken").value = n.action_taken || "";
    $("educationAchievementNote").value = n.achievement_note || "";
  },

  async editFamilyContact(id) {
    const n = await api(API.family.contactGet(id));
    modal("familyContactModal", true);
    $("familyContactId").value = n.id || "";
    $("familyContactFullName").value = n.full_name || "";
    $("familyRelationship").value = n.relationship_to_child || "";
    $("familyPhoneNumber").value = n.phone_number || "";
    $("familyEmail").value = n.email || "";
    $("familyAddress").value = n.address || "";
    $("familyParentalResponsibility").value = n.is_parental_responsibility_holder ? "true" : "false";
    $("familyApprovedContact").value = n.is_approved_contact ? "true" : "false";
    $("familyContactNotes").value = n.contact_notes || "";
  },

  async editFamilyRecord(id) {
    const n = await api(API.family.recordGet(id));
    modal("familyRecordModal", true);
    $("familyRecordId").value = n.id || "";
    $("familyContactDateTime").value = toDateTimeInput(n.contact_datetime);
    $("familyContactType").value = n.contact_type || "";
    $("familyContactPerson").value = n.contact_person || "";
    $("familySupervisionLevel").value = n.supervision_level || "";
    $("familyLocation").value = n.location || "";
    $("familyPrePresentation").value = n.pre_contact_presentation || "";
    $("familyPostPresentation").value = n.post_contact_presentation || "";
    $("familyChildVoice").value = n.child_voice || "";
    $("familyConcerns").value = n.concerns || "";
    $("familyFollowUpRequired").value = n.follow_up_required ? "true" : "false";
  },

  async editKeywork(id) {
    const n = await api(API.keywork.get(id));
    modal("keyworkModal", true);
    $("keyworkId").value = n.id || "";
    $("keyworkSessionDate").value = toDateInput(n.session_date);
    $("keyworkWorkerId").value = n.worker_id || "";
    $("keyworkTopic").value = n.topic || "";
    $("keyworkPurpose").value = n.purpose || "";
    $("keyworkSummary").value = n.summary || "";
    $("keyworkChildVoice").value = n.child_voice || "";
    $("keyworkReflectiveAnalysis").value = n.reflective_analysis || "";
    $("keyworkActionsAgreed").value = n.actions_agreed || "";
    $("keyworkNextSessionDate").value = toDateInput(n.next_session_date);
  },

  async editPlan(id) {
    const n = await api(API.plans.get(id));
    modal("planModal", true);
    $("planId").value = n.id || "";
    $("planType").value = n.plan_type || "support_plan";
    $("planTitle").value = n.title || "";
    $("planStartDate").value = toDateInput(n.start_date);
    $("planReviewDate").value = toDateInput(n.review_due_at);
    $("planOwnerId").value = n.owner_id || "";
    $("planSummary").value = n.summary || "";
    $("planChildVoice").value = n.child_voice || "";
    $("planFormulation").value = n.formulation || n.presenting_need || "";
    $("planStaffGuidance").value = n.staff_guidance || n.proactive_strategies || "";
    $("planPaceGuidance").value = n.pace_guidance || "";
    $("planTriggers").value = n.triggers || "";
    $("planProtectiveFactors").value = n.protective_factors || "";
  },

  async editRisk(id) {
    const n = await api(API.risk.get(id));
    modal("riskModal", true);
    $("riskId").value = n.id || "";
    $("riskCategory").value = n.category || "";
    $("riskTitle").value = n.title || "";
    $("riskSeverity").value = n.severity || "medium";
    $("riskLikelihood").value = n.likelihood || "medium";
    $("riskReviewDate").value = toDateInput(n.review_date);
    $("riskOwnerId").value = n.owner_id || "";
    $("riskConcernSummary").value = n.concern_summary || "";
    $("riskKnownTriggers").value = n.known_triggers || "";
    $("riskEarlyWarningSigns").value = n.early_warning_signs || "";
    $("riskContextualFactors").value = n.contextual_factors || "";
    $("riskCurrentControls").value = n.current_controls || "";
    $("riskDeescalationStrategies").value = n.deescalation_strategies || "";
    $("riskResponseActions").value = n.response_actions || "";
    $("riskChildViews").value = n.child_views || "";
  },

  async editChronology(id) {
    const n = await api(API.chronology.get(id));
    modal("chronologyEventModal", true);
    $("chronologyEventId").value = n.id || "";
    $("chronologyEventDateTime").value = toDateTimeInput(n.event_datetime);
    $("chronologyCategory").value = n.category || "";
    $("chronologySubcategory").value = n.subcategory || "";
    $("chronologyTitle").value = n.title || "";
    $("chronologySummary").value = n.summary || "";
    $("chronologySignificance").value = n.significance || "standard";
    $("chronologyLinkedStandard").value = n.linked_standard || "";
    $("chronologyLinkedJudgementArea").value = n.linked_judgement_area || "";
  },

  async editStatutory(id) {
    const n = await api(API.statutory.get(id));
    modal("statutoryCreateModal", true);
    $("statutoryDocumentId").value = n.id || "";
    $("statutoryDocumentType").value = n.document_type || "";
    $("statutoryTitle").value = n.title || "";
    $("statutoryDescription").value = n.description || "";
    $("statutoryIssueDate").value = toDateInput(n.issue_date);
    $("statutoryReviewDate").value = toDateInput(n.review_date);
    $("statutoryExpiryDate").value = toDateInput(n.expiry_date);
    $("statutoryStatusValue").value = n.status || "current";
    $("statutoryComplianceCategory").value = n.compliance_category || "";
    $("statutoryLinkedStandardCode").value = n.linked_standard_code || "";
  },

  submitDaily: async (id) => { await postJson(API.daily.submit(id), {}); await loadYoungPerson(state.selectedId); },
  approveDaily: async (id) => { await postJson(API.daily.approve(id), { review_note: "Approved" }); await loadYoungPerson(state.selectedId); },
  returnDaily: async (id) => { await postJson(API.daily.return(id), { review_note: prompt("Return note") || "" }); await loadYoungPerson(state.selectedId); },
  archiveDaily: async (id) => { await postJson(API.daily.archiveOne(id), {}); await loadYoungPerson(state.selectedId); },

  submitIncident: async (id) => { await postJson(API.incidents.submit(id), {}); await loadYoungPerson(state.selectedId); },
  approveIncident: async (id) => { await postJson(API.incidents.approve(id), { review_note: "Approved" }); await loadYoungPerson(state.selectedId); },
  returnIncident: async (id) => { await postJson(API.incidents.return(id), { review_note: prompt("Return note") || "" }); await loadYoungPerson(state.selectedId); },
  archiveIncident: async (id) => { await postJson(API.incidents.archiveOne(id), {}); await loadYoungPerson(state.selectedId); },

  submitKeywork: async (id) => { await postJson(API.keywork.submit(id), {}); await loadYoungPerson(state.selectedId); },
  approveKeywork: async (id) => { await postJson(API.keywork.approve(id), { review_note: "Approved" }); await loadYoungPerson(state.selectedId); },
  returnKeywork: async (id) => { await postJson(API.keywork.return(id), { review_note: prompt("Return note") || "" }); await loadYoungPerson(state.selectedId); },
  archiveKeywork: async (id) => { await postJson(API.keywork.archive(id), {}); await loadYoungPerson(state.selectedId); },

  submitPlan: async (id) => { await postJson(API.plans.submit(id), {}); await loadYoungPerson(state.selectedId); },
  approvePlan: async (id) => { await postJson(API.plans.approve(id), {}); await loadYoungPerson(state.selectedId); },
  returnPlan: async (id) => { await postJson(API.plans.return(id), { review_note: prompt("Return note") || "" }); await loadYoungPerson(state.selectedId); },
  archivePlan: async (id) => { await postJson(API.plans.archiveOne(id), {}); await loadYoungPerson(state.selectedId); },

  approveHandover: async (id) => { await api(API.handover.approve(id), { method: "PUT" }); await loadYoungPerson(state.selectedId); },
  archiveHandover: async (id) => { await api(API.handover.archive(id), { method: "PUT" }); await loadYoungPerson(state.selectedId); }
};

async function loadRosteringWeek() {
  const homeId = $("rosteringHomeId").value;
  const weekStart = $("rosteringWeekStart").value;
  const data = await api(`${API.rostering.week}?home_id=${homeId}&week_start=${weekStart}`);
  renderRostering(data);
}

async function buildRosteringWeek() {
  await postJson(API.rostering.build, {
    home_id: Number($("rosteringHomeId").value),
    week_start: $("rosteringWeekStart").value,
    actor: "manager"
  });
  await loadRosteringWeek();
}

async function publishRosteringWeek() {
  await postJson(API.rostering.publish, {
    home_id: Number($("rosteringHomeId").value),
    week_start: $("rosteringWeekStart").value,
    actor: "manager",
    send_email: true
  });
  await loadRosteringWeek();
}

async function rebuildChronology() {
  await postJson(API.chronology.rebuild(state.selectedId), {});
  await loadYoungPerson(state.selectedId);
}

async function rebuildStandards() {
  await postJson(API.standards.rebuild(state.selectedId), {});
  await loadYoungPerson(state.selectedId);
}

async function filterChronology() {
  const params = new URLSearchParams();
  if ($("chronologyCategoryFilter").value) params.set("category", $("chronologyCategoryFilter").value);
  if ($("chronologySignificanceFilter").value) params.set("significance", $("chronologySignificanceFilter").value);
  const data = await api(API.chronology.list(state.selectedId, params.toString() ? `?${params.toString()}` : ""));
  state.chronology = data.items || [];
  renderChronology();
}

async function uploadPhotoOpen() {
  modal("photoUploadModal", true);
}

async function logout() {
  localStorage.removeItem("chos_access_token");
  localStorage.removeItem("chos_user");
  window.location.href = "/oslogin.html";
}

function bind() {
  document.querySelectorAll(".tab-btn").forEach(b => b.onclick = () => activateTab(b.dataset.tab));
  document.querySelectorAll(".close-modal").forEach(b => b.onclick = () => modal(b.dataset.close, false));
  document.querySelectorAll(".modal").forEach(m => m.onclick = (e) => { if (e.target === m) modal(m.id, false); });

  $("refreshBtn").onclick = async () => {
    await loadYoungPeople();
    if (state.selectedId) await loadYoungPerson(state.selectedId);
    await loadAiHistory();
    await loadCommandCentre();
  };

  $("logoutBtn").onclick = logout;
  $("commandCentreRefreshBtn").onclick = loadCommandCentre;
  $("openInspectionPackBtn").onclick = () => activateTab("inspection");
  $("loadInspectionPackBtn").onclick = loadInspectionPack;

  $("youngPeopleSearch").oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    renderYoungPeopleList(!q ? state.youngPeople : state.youngPeople.filter(yp =>
      fullName(yp).toLowerCase().includes(q) ||
      String(yp.placement_status || "").toLowerCase().includes(q)
    ));
  };

  $("openAiNoteBtn").onclick = openAiModal;
  $("openAiNoteBtn2").onclick = openAiModal;
  $("openDailyNoteBtn").onclick = openDailyModal;
  $("openDailyNoteBtn2").onclick = openDailyModal;
  $("openIncidentBtn").onclick = openIncidentModal;
  $("openIncidentBtn2").onclick = openIncidentModal;
  $("openPlanBtn").onclick = openPlanModal;
  $("openPlanBtn2").onclick = openPlanModal;
  $("openRiskBtn").onclick = openRiskModal;
  $("openRiskBtn2").onclick = openRiskModal;

  $("openHealthProfileBtn").onclick = () => {
    const p = state.health?.health_profile || {};
    $("healthGpName").value = p.gp_name || "";
    $("healthAllergies").value = p.allergies || "";
    $("healthDiagnoses").value = p.diagnoses || "";
    modal("healthProfileModal", true);
  };
  $("openHealthRecordBtn").onclick = () => modal("healthRecordModal", true);
  $("openHealthRecordBtn2").onclick = () => modal("healthRecordModal", true);
  $("openMedicationProfileBtn").onclick = () => modal("medicationProfileModal", true);
  $("openMedicationRecordBtn").onclick = () => modal("medicationRecordModal", true);

  $("openEducationProfileBtn").onclick = () => {
    const p = state.education?.education_profile || {};
    $("educationSchoolName").value = p.school_name || "";
    $("educationYearGroup").value = p.year_group || "";
    $("educationStatusValue").value = p.education_status || "";
    modal("educationProfileModal", true);
  };
  $("openEducationRecordBtn").onclick = () => modal("educationRecordModal", true);
  $("openEducationRecordBtn2").onclick = () => modal("educationRecordModal", true);

  $("openFamilyContactBtn").onclick = () => modal("familyContactModal", true);
  $("openFamilyRecordBtn").onclick = () => modal("familyRecordModal", true);
  $("openFamilyRecordBtn2").onclick = () => modal("familyRecordModal", true);

  $("openKeyworkBtn").onclick = () => modal("keyworkModal", true);
  $("openKeyworkBtn2").onclick = () => modal("keyworkModal", true);

  $("openChronologyEventBtn").onclick = () => modal("chronologyEventModal", true);
  $("rebuildChronologyBtn").onclick = rebuildChronology;
  $("rebuildChronologyBtn2").onclick = rebuildChronology;
  $("rebuildStandardsBtn").onclick = rebuildStandards;
  $("rebuildStandardsBtn2").onclick = rebuildStandards;
  $("applyChronologyFiltersBtn").onclick = filterChronology;

  $("openStatutoryCreateBtn").onclick = () => modal("statutoryCreateModal", true);
  $("openStatutoryUploadBtn").onclick = () => modal("statutoryUploadModal", true);

  $("generateHandoverBtn").onclick = async () => { await postJson(API.handover.generate(state.selectedId), {}); await loadYoungPerson(state.selectedId); };
  $("generateHandoverBtn2").onclick = $("generateHandoverBtn").onclick;

  $("openPhotoUploadBtn").onclick = uploadPhotoOpen;
  $("savePhotoBtn").onclick = savePhoto;

  $("generateAiBtn").onclick = async () => {
    const r = await aiGenerateFromText($("aiTranscript").value);
    $("aiDraft").value = r.note || "";
    $("aiFinalNote").value = r.note || "";
  };
  $("copyDraftBtn").onclick = () => $("aiFinalNote").value = $("aiDraft").value;
  $("polishAiBtn").onclick = async () => {
    const r = await aiPolish($("aiFinalNote").value, "Make this therapeutic, clear and suitable for children’s home recording.");
    $("aiFinalNote").value = r.text || "";
  };
  $("saveAiBtn").onclick = saveAiNote;

  $("dailyAiAssistBtn").onclick = async () => {
    const text = [
      $("dailyPresentation").value, $("dailyActivities").value, $("dailyEducation").value,
      $("dailyHealth").value, $("dailyFamily").value, $("dailyBehaviour").value,
      $("dailyVoice").value, $("dailyPositives").value, $("dailyActions").value
    ].join("\n");
    const r = await aiGenerateFromText(text);
    $("dailyAiDraft").value = r.note || "";
  };
  $("saveDailyBtn").onclick = saveDaily;

  $("incidentAiAssistBtn").onclick = async () => {
    const text = [
      $("incidentDescription").value, $("incidentAntecedent").value, $("incidentPresentation").value,
      $("incidentStaffResponse").value, $("incidentFormulation").value, $("incidentVoice").value,
      $("incidentRestorative").value
    ].join("\n");
    const r = await aiGenerateFromText(text);
    $("incidentAiDraft").value = r.note || "";
  };
  $("incidentAiPolishBtn").onclick = async () => {
    const r = await aiPolish($("incidentDescription").value, "Make this factual, professional and trauma-informed.");
    $("incidentDescription").value = r.text || "";
  };
  $("saveIncidentBtn").onclick = saveIncident;

  $("saveHealthProfileBtn").onclick = saveHealthProfile;
  $("saveHealthRecordBtn").onclick = saveHealthRecord;
  $("saveMedicationProfileBtn").onclick = saveMedicationProfile;
  $("saveMedicationRecordBtn").onclick = saveMedicationRecord;

  $("saveEducationProfileBtn").onclick = saveEducationProfile;
  $("saveEducationRecordBtn").onclick = saveEducationRecord;

  $("saveFamilyContactBtn").onclick = saveFamilyContact;
  $("saveFamilyRecordBtn").onclick = saveFamilyRecord;

  $("keyworkAiAssistBtn").onclick = async () => {
    const text = [
      $("keyworkTopic").value, $("keyworkPurpose").value, $("keyworkSummary").value,
      $("keyworkChildVoice").value, $("keyworkReflectiveAnalysis").value, $("keyworkActionsAgreed").value
    ].join("\n");
    const r = await aiGenerateFromText(text);
    $("keyworkAiDraft").value = r.note || "";
  };
  $("saveKeyworkBtn").onclick = saveKeywork;

  $("savePlanBtn").onclick = savePlan;
  $("saveRiskBtn").onclick = saveRisk;
  $("saveChronologyEventBtn").onclick = saveChronologyEvent;
  $("saveStatutoryCreateBtn").onclick = saveStatutoryCreate;
  $("saveStatutoryUploadBtn").onclick = saveStatutoryUpload;

  $("runQuickAssistantBtn").onclick = runQuickAssistant;

  $("loadRosteringBtn").onclick = loadRosteringWeek;
  $("buildRosteringWeekBtn").onclick = buildRosteringWeek;
  $("publishRosteringWeekBtn").onclick = publishRosteringWeek;
}

async function init() {
  requireAuth();
  renderUser();
  $("rosteringWeekStart").value = new Date().toISOString().slice(0, 10);

  bind();
  await Promise.all([loadYoungPeople(), loadAiHistory(), loadCommandCentre()]);
  if (state.youngPeople.length) await loadYoungPerson(state.youngPeople[0].id);
  renderRostering();
}

document.addEventListener("DOMContentLoaded", init);
window.App = App;
