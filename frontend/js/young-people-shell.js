const state = {
  section: "command-centre",
  tab: "overview",
  youngPeople: [],
  selected: null,
  commandCentre: null,
  timelineCategory: ""
};

const $ = id => document.getElementById(id);
const $$ = s => [...document.querySelectorAll(s)];
const arr = d => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.rows) ? d.rows : Array.isArray(d?.data) ? d.data : [];
const esc = s => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const fmtDate = v => v ? new Date(v).toLocaleDateString("en-GB") : "—";
const fmtDateTime = v => v ? new Date(v).toLocaleString("en-GB") : "—";
const fullName = p => `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || "Young person";
const val = id => $(id)?.value ?? "";
const chk = id => !!$(id)?.checked;

async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error(`${url} failed (${res.status})`);
  return res.json();
}

function setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html; }
function setText(id, text) { const el = $(id); if (el) el.textContent = text; }

function msg(text, bad = false) {
  const el = $("statusBar");
  if (!el) return;
  el.classList.remove("hidden");
  el.innerHTML = `<span class="pill ${bad ? "red" : "green"}">${esc(text)}</span>`;
  setTimeout(() => el.classList.add("hidden"), 2500);
}

function pillClass(v) {
  v = String(v || "").toLowerCase();
  if (["high","critical","archived","escalated"].includes(v)) return "red";
  if (["medium","pending","submitted","returned","awaiting_review"].includes(v)) return "amber";
  if (["approved","reviewed","active","low","recorded"].includes(v)) return "green";
  return "blue";
}

function emptyCard(text) {
  return `<div class="card"><div class="muted">${esc(text)}</div></div>`;
}

function openDoc(title, meta, html) {
  $("browseMode")?.classList.add("hidden");
  $("documentMode")?.classList.remove("hidden");
  setText("docTitle", title || "Document");
  setText("docMetaLine", meta || "—");
  setHTML("docBody", html || "");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeDoc() {
  $("documentMode")?.classList.add("hidden");
  $("browseMode")?.classList.remove("hidden");
}

function setSection(section) {
  state.section = section;
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.section === section));
  $$(".section").forEach(s => s.classList.toggle("active", s.id === `section-${section}`));
  const titles = {
    "command-centre": ["Command Centre", "Shift-first oversight for children’s residential care"],
    "young-people": ["Young People", "Recording, reporting and chronology for residential care"],
    "handover": ["Handover", "Continuity built from recorded reality"],
    "manager-qa": ["Manager QA", "Review, oversight and inspection readiness"]
  };
  setText("pageTitle", titles[section]?.[0] || "IndiCare");
  setText("pageSubtitle", titles[section]?.[1] || "");
  if (section === "command-centre") loadCommandCentre();
  if (section === "young-people") loadTab();
  if (section === "handover") renderHandover();
  if (section === "manager-qa") loadReviews();
}

function setTab(tab) {
  state.tab = tab;
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".panel").forEach(p => p.classList.toggle("active", p.id === `tab-${tab}`));
  loadTab();
}

function renderPersonHeader() {
  const p = state.selected;
  if (!p) return;
  setText("selectedYoungPersonName", fullName(p));
  setText("selectedYoungPersonMeta", `Placement: ${p.placement_status || "—"} · Legal status: ${p.legal_status || "—"}`);
  setHTML("selectedYoungPersonBadges", `
    <span class="pill ${pillClass(p.summary_risk_level)}">Risk: ${esc(p.summary_risk_level || "—")}</span>
    <span class="pill blue">Home: ${esc(p.home_name || "Main home")}</span>
  `);
}

/* LOADERS */

async function loadYoungPeople() {
  try {
    const rows = arr(await api("/young-people"));
    state.youngPeople = rows;
    const select = $("youngPersonSelect");
    if (!select) return;
    if (!rows.length) {
      select.innerHTML = `<option>No young people</option>`;
      return;
    }
    select.innerHTML = rows.map(p => `<option value="${p.id}">${esc(fullName(p))}</option>`).join("");
    state.selected = rows[0];
    renderPersonHeader();
    loadTab();
  } catch (e) { msg(e.message, true); }
}

async function loadCommandCentre() {
  try {
    const d = await api("/command-centre");
    state.commandCentre = d;
    const m = d.summary || d.metrics || {};
    const metrics = [
      ["Children in home", m.children_in_home ?? 0],
      ["High-risk alerts", (d.alerts || []).filter(x => String(x.level).toLowerCase() === "high").length],
      ["Open safeguarding", m.open_safeguarding_items ?? 0],
      ["Meds due", (d.meds_due || []).length],
      ["Overdue reviews", m.overdue_reviews ?? 0],
      ["Documents due", m.documents_due ?? 0],
    ];
    setHTML("commandCentreMetrics", metrics.map(([k,v]) => `
      <div class="metric-card">
        <div class="metric-label">${esc(k)}</div>
        <div class="metric-value">${esc(v)}</div>
      </div>
    `).join(""));

    const renderRows = (rows, fn, empty) => `
      <div class="list">${rows.length ? rows.map(fn).join("") : `<div class="muted">${empty}</div>`}</div>
    `;

    setHTML("commandCentreAlerts", renderRows(d.alerts || [], r => `
      <div class="row-card cc-open" data-kind="alert" data-payload='${esc(JSON.stringify(r))}'>
        <div class="row-title">${esc(r.title)}</div>
        <div class="row-meta">${esc(r.young_person_name || "—")}</div>
        <div>${esc(r.detail || "")}</div>
        <div class="badges"><span class="pill ${pillClass(r.level)}">${esc(r.level || "info")}</span></div>
      </div>
    `, "No live alerts."));

    setHTML("commandCentreTasks", renderRows(d.tasks || [], r => `
      <div class="row-card cc-open" data-kind="task" data-payload='${esc(JSON.stringify(r))}'>
        <div class="row-title">${esc(r.title)}</div>
        <div class="row-meta">Due: ${esc(r.due || "—")}</div>
        <div>${esc(r.young_person_name || "")}</div>
      </div>
    `, "No outstanding shift tasks."));

    setHTML("commandCentreMeds", renderRows(d.meds_due || [], r => `
      <div class="row-card cc-open" data-kind="med" data-payload='${esc(JSON.stringify(r))}'>
        <div class="row-title">${esc(r.young_person_name || "Young person")}</div>
        <div class="row-meta">${esc(r.item || r.medicine || "Medication")} · Due ${esc(r.time_due || "—")}</div>
        <div class="badges"><span class="pill ${pillClass(r.status)}">${esc(r.status || "due")}</span></div>
      </div>
    `, "No medication due."));

    const handoverRows = arr(d.handover);
    setHTML("commandCentreHandover", renderRows(handoverRows, r => `
      <div class="row-card cc-open" data-kind="handover" data-payload='${esc(JSON.stringify(r))}'>
        <div class="row-title">${esc(r.time || "—")} · ${esc(r.title || "Handover item")}</div>
        <div>${esc(r.detail || r.summary || "")}</div>
      </div>
    `, "No handover items."));

    $$(".cc-open").forEach(el => el.onclick = () => {
      const data = JSON.parse(el.dataset.payload || "{}");
      openDoc(
        data.title || "Command Centre item",
        el.dataset.kind || "item",
        `<div class="card"><pre style="white-space:pre-wrap;margin:0;">${esc(JSON.stringify(data, null, 2))}</pre></div>`
      );
    });
  } catch (e) {
    setHTML("commandCentreMetrics", emptyCard("Command Centre failed to load."));
    setHTML("commandCentreAlerts", emptyCard("Alerts unavailable."));
    setHTML("commandCentreTasks", emptyCard("Tasks unavailable."));
    setHTML("commandCentreMeds", emptyCard("Medication unavailable."));
    setHTML("commandCentreHandover", emptyCard("Handover unavailable."));
    msg(e.message, true);
  }
}

async function loadOverview() {
  if (!state.selected) return;
  try {
    const d = await api(`/young-people/${state.selected.id}`);
    setHTML("overviewContent", `
      <div class="grid two-col">
        <div class="card">
          <h3 class="card-title">Background and current presentation</h3>
          <div class="list">
            <div class="row-card"><div class="row-title">Current risk summary</div><div>${esc(d.summary_risk || d.summary_risk_level || "No summary recorded")}</div></div>
            <div class="row-card"><div class="row-title">Key guidance for staff</div><div>${esc(d.staff_guidance || "No staff guidance recorded")}</div></div>
            <div class="row-card"><div class="row-title">De-escalation / regulation</div><div>${esc(d.de_escalation_guidance || "No de-escalation guidance recorded")}</div></div>
            <div class="row-card"><div class="row-title">Communication</div><div>${esc(d.communication_style || "No communication summary recorded")}</div></div>
            <div class="row-card"><div class="row-title">Sensory profile</div><div>${esc(d.sensory_profile || "No sensory profile recorded")}</div></div>
            <div class="row-card"><div class="row-title">Strengths</div><div>${esc(d.strengths_summary || "No strengths summary recorded")}</div></div>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Operational snapshot</h3>
          <div class="list">
            <div class="row-card"><div class="row-title">Placement status</div><div>${esc(d.placement_status || "—")}</div></div>
            <div class="row-card"><div class="row-title">Legal status</div><div>${esc(d.legal_status || "—")}</div></div>
            <div class="row-card"><div class="row-title">School / education</div><div>${esc(d.school_name || d.education_status || "No education summary")}</div></div>
            <div class="row-card"><div class="row-title">Allergies / health alerts</div><div>${esc(d.allergies || "None recorded")}</div></div>
            <div class="row-card"><div class="row-title">What matters to me</div><div>${esc(d.what_matters_to_me || "No summary")}</div></div>
          </div>
        </div>
      </div>
    `);
  } catch (e) {
    setHTML("overviewContent", emptyCard("Overview failed to load."));
    msg(e.message, true);
  }
}

async function loadTimeline() {
  if (!state.selected) return;
  try {
    const qs = new URLSearchParams();
    if (state.timelineCategory) qs.set("category", state.timelineCategory);
    const rows = arr(await api(`/young-people/${state.selected.id}/chronology?${qs.toString()}`));
    setHTML("timelineContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title || "Chronology event")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.occurred_at || r.event_datetime))} · ${esc(r.category || "event")} · ${esc(r.subcategory || "—")}</div>
            <div>${esc(r.summary || "No summary recorded.")}</div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No chronology recorded yet."));
  } catch (e) {
    setHTML("timelineContent", emptyCard("Timeline failed to load."));
    msg(e.message, true);
  }
}

async function loadDailyNotes() {
  if (!state.selected) return;
  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/daily-notes`));
    setHTML("dailyNotesContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div class="muted">Daily recording for shift staff.</div>
          <button class="btn primary" id="newDailyNoteBtn">New daily note</button>
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card open-dn" data-id="${r.id}">
            <div class="row-title">${esc(r.title || "Daily note")}</div>
            <div class="row-meta">${fmtDateTime(r.note_date || r.created_at)} · ${esc(r.shift_type || "shift")}</div>
            <div>${esc(r.summary || r.positives || r.presentation || "Daily note recorded")}</div>
            <div class="badges">
              <span class="pill ${pillClass(r.workflow_status)}">${esc(r.workflow_status || "draft")}</span>
            </div>
          </div>
        `).join("")
      }</div>` : emptyCard("No daily notes found.")}
    `);
    $("newDailyNoteBtn").onclick = openNewDailyNote;
    $$(".open-dn").forEach(el => el.onclick = () => openDailyNote(Number(el.dataset.id)));
  } catch (e) {
    setHTML("dailyNotesContent", emptyCard("Daily notes failed to load."));
  }
}

async function loadIncidents() {
  if (!state.selected) return;
  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/incidents`));
    setHTML("incidentsContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div class="muted">Incidents, safeguarding and behaviour records.</div>
          <button class="btn primary" id="newIncidentBtn">New incident</button>
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card open-inc" data-id="${r.id}">
            <div class="row-title">${esc(r.title || r.incident_type || "Incident")}</div>
            <div class="row-meta">${fmtDateTime(r.occurred_at || r.incident_datetime || r.created_at)} · ${esc(r.location || "—")}</div>
            <div>${esc(r.description || r.narrative || "Incident recorded")}</div>
            <div class="badges">
              <span class="pill ${pillClass(r.severity || r.risk_level)}">${esc(r.severity || r.risk_level || "medium")}</span>
              <span class="pill ${pillClass(r.manager_review_status || r.workflow_status)}">${esc(r.manager_review_status || r.workflow_status || "pending")}</span>
            </div>
          </div>
        `).join("")
      }</div>` : emptyCard("No incidents found.")}
    `);
    $("newIncidentBtn").onclick = openNewIncident;
    $$(".open-inc").forEach(el => el.onclick = () => openIncident(Number(el.dataset.id)));
  } catch {
    setHTML("incidentsContent", emptyCard("Incidents failed to load."));
  }
}

async function loadHealth() {
  if (!state.selected) return;
  try {
    const d = await api(`/young-people/${state.selected.id}/health`);
    const profile = d.profile || d.health_profile || {};
    const rows = arr(d.health_records || d.items);
    setHTML("healthContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div><strong>GP:</strong> ${esc(profile.gp_name || "—")} · <strong>Allergies:</strong> ${esc(profile.allergies || "—")} · <strong>Diagnoses:</strong> ${esc(profile.diagnoses || "—")}</div>
          <div class="badges">
            <button class="btn" id="editHealthProfileBtn">Edit profile</button>
            <button class="btn primary" id="newHealthRecordBtn">New health record</button>
          </div>
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card open-hr" data-id="${r.id}">
            <div class="row-title">${esc(r.title || r.record_type || "Health record")}</div>
            <div class="row-meta">${fmtDateTime(r.event_datetime || r.created_at)} · ${esc(r.professional_name || "—")}</div>
            <div>${esc(r.summary || r.outcome || "Health record")}</div>
          </div>
        `).join("")
      }</div>` : emptyCard("No health records found.")}
    `);
    $("editHealthProfileBtn").onclick = () => openHealthProfile(profile);
    $("newHealthRecordBtn").onclick = openNewHealthRecord;
    $$(".open-hr").forEach(el => el.onclick = () => openHealthRecord(Number(el.dataset.id)));
  } catch {
    setHTML("healthContent", emptyCard("Health failed to load."));
  }
}

async function loadEducation() {
  if (!state.selected) return;
  try {
    const d = await api(`/young-people/${state.selected.id}/education`);
    const profile = d.profile || d.education_profile || {};
    const rows = arr(d.education_records || d.items);
    setHTML("educationContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div><strong>School:</strong> ${esc(profile.school_name || "—")} · <strong>Year group:</strong> ${esc(profile.year_group || "—")} · <strong>Status:</strong> ${esc(profile.education_status || "—")}</div>
          <div class="badges">
            <button class="btn" id="editEducationProfileBtn">Edit profile</button>
            <button class="btn primary" id="newEducationRecordBtn">New education record</button>
          </div>
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card open-er" data-id="${r.id}">
            <div class="row-title">${esc(r.provision_name || "Education record")}</div>
            <div class="row-meta">${fmtDate(r.record_date || r.created_at)} · ${esc(r.attendance_status || "—")}</div>
            <div>${esc(r.achievement_note || r.behaviour_summary || r.learning_engagement || "Education update")}</div>
          </div>
        `).join("")
      }</div>` : emptyCard("No education records found.")}
    `);
    $("editEducationProfileBtn").onclick = () => openEducationProfile(profile);
    $("newEducationRecordBtn").onclick = openNewEducationRecord;
    $$(".open-er").forEach(el => el.onclick = () => openEducationRecord(Number(el.dataset.id)));
  } catch {
    setHTML("educationContent", emptyCard("Education failed to load."));
  }
}

async function loadFamily() {
  if (!state.selected) return;
  try {
    const d = await api(`/young-people/${state.selected.id}/family`);
    const contacts = arr(d.contacts);
    const rows = arr(d.family_contact_records || d.items);
    setHTML("familyContent", `
      <div class="grid two-col">
        <div class="card">
          <div class="card-title-row">
            <h3 class="card-title">Contacts</h3>
            <button class="btn primary" id="newFamilyContactBtn">New contact</button>
          </div>
          ${contacts.length ? `<div class="list">${
            contacts.map(r => `
              <div class="row-card open-fc" data-id="${r.id}">
                <div class="row-title">${esc(r.full_name || "Contact")}</div>
                <div class="row-meta">${esc(r.relationship_to_child || "—")} · Approved: ${r.is_approved_contact ? "Yes" : "No"}</div>
                <div>${esc(r.phone_number || r.email || r.contact_notes || "")}</div>
              </div>
            `).join("")
          }</div>` : emptyCard("No contacts found.")}
        </div>
        <div class="card">
          <div class="card-title-row">
            <h3 class="card-title">Contact records</h3>
            <button class="btn primary" id="newFamilyRecordBtn">New record</button>
          </div>
          ${rows.length ? `<div class="list">${
            rows.map(r => `
              <div class="row-card open-fr" data-id="${r.id}">
                <div class="row-title">${esc(r.contact_person || "Family contact")}</div>
                <div class="row-meta">${fmtDateTime(r.contact_datetime || r.created_at)} · ${esc(r.contact_type || "contact")}</div>
                <div>${esc(r.child_voice || r.post_contact_presentation || r.concerns || "Family contact recorded")}</div>
              </div>
            `).join("")
          }</div>` : emptyCard("No family contact records found.")}
        </div>
      </div>
    `);
    $("newFamilyContactBtn").onclick = openNewFamilyContact;
    $("newFamilyRecordBtn").onclick = openNewFamilyRecord;
    $$(".open-fc").forEach(el => el.onclick = () => openFamilyContact(Number(el.dataset.id)));
    $$(".open-fr").forEach(el => el.onclick = () => openFamilyRecord(Number(el.dataset.id)));
  } catch {
    setHTML("familyContent", emptyCard("Family failed to load."));
  }
}

async function loadKeywork() {
  if (!state.selected) return;
  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/keywork`));
    setHTML("keyworkContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div class="muted">Reflective work, child voice and agreed actions.</div>
          <button class="btn primary" id="newKeyworkBtn">New key work</button>
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card open-kw" data-id="${r.id}">
            <div class="row-title">${esc(r.topic || "Key work session")}</div>
            <div class="row-meta">${fmtDate(r.session_date || r.created_at)} · ${esc(r.worker_name || "—")}</div>
            <div>${esc(r.summary || r.child_voice || r.reflective_analysis || "Key work session recorded")}</div>
            <div class="badges"><span class="pill ${pillClass(r.status || r.workflow_status)}">${esc(r.status || r.workflow_status || "draft")}</span></div>
          </div>
        `).join("")
      }</div>` : emptyCard("No key work found.")}
    `);
    $("newKeyworkBtn").onclick = openNewKeywork;
    $$(".open-kw").forEach(el => el.onclick = () => openKeywork(Number(el.dataset.id)));
  } catch {
    setHTML("keyworkContent", emptyCard("Key work failed to load."));
  }
}

async function loadPlans() {
  if (!state.selected) return;
  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/plans`));
    setHTML("plansContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card open-plan" data-id="${r.id}">
            <div class="row-title">${esc(r.title || "Untitled plan")}</div>
            <div class="row-meta">${esc(r.plan_type || "Plan")} · Status: ${esc(r.status || "draft")} · Version ${esc(r.version_no || 1)}</div>
            <div>${esc(r.summary || "No summary recorded.")}</div>
            <div class="badges"><span class="pill ${pillClass(r.status)}">${esc(r.status || "draft")}</span></div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No plans found."));
    $$(".open-plan").forEach(el => el.onclick = () => openPlan(Number(el.dataset.id)));
  } catch {
    setHTML("plansContent", emptyCard("Plans failed to load."));
  }
}

async function loadReviews() {
  try {
    const rows = arr(await api("/workflow-reviews"));
    const html = rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card open-review" data-id="${r.id}">
            <div class="row-title">${esc(r.record_type)} review · ${esc(r.young_person_name || "—")}</div>
            <div class="row-meta">Status: ${esc(r.status)} · Submitted: ${esc(fmtDateTime(r.submitted_at))}</div>
            <div>${esc(r.review_note || "Awaiting manager decision.")}</div>
            <div class="badges"><span class="pill ${pillClass(r.status)}">${esc(r.status)}</span></div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No review items.");
    setHTML("reviewsContent", html);
    setHTML("managerQaContent", html);
    $$(".open-review").forEach(el => el.onclick = () => openReview(Number(el.dataset.id)));
  } catch {
    setHTML("reviewsContent", emptyCard("Review queue unavailable."));
    setHTML("managerQaContent", emptyCard("Review queue unavailable."));
  }
}

function renderHandover() {
  const rows = arr(state.commandCentre?.handover);
  setHTML("handoverBoard", rows.length ? `
    <div class="list">
      ${rows.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.time || "—")} · ${esc(r.title || "Handover item")}</div>
          <div>${esc(r.detail || r.summary || "")}</div>
        </div>
      `).join("")}
    </div>
  ` : emptyCard("No handover items available."));
}

/* OPENERS */

async function openPlan(id) {
  const r = await api(`/young-people/plans/${id}`);
  openDoc(r.title || "Plan", `${r.plan_type || "Plan"} · ${r.status || "draft"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Title</label><input id="planTitle" class="input" value="${esc(r.title || "")}">
        <label class="label">Summary</label><textarea id="planSummary" class="textarea">${esc(r.summary || "")}</textarea>
        <label class="label">Child voice</label><textarea id="planVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
        <label class="label">Staff guidance</label><textarea id="planStaff" class="textarea">${esc(r.staff_guidance || "")}</textarea>
        <label class="label">Formulation</label><textarea id="planForm" class="textarea">${esc(r.formulation || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <button id="savePlanBtn" class="btn primary">Save</button>
        <button id="submitPlanBtn" class="btn">Submit</button>
        <button id="approvePlanBtn" class="btn">Approve</button>
        <button id="exportPlanBtn" class="btn">Export</button>
      </aside>
    </div>
  `);
  $("savePlanBtn").onclick = async () => {
    await api(`/young-people/plans/${id}`, { method:"PUT", body:JSON.stringify({
      title: val("planTitle"), summary: val("planSummary"), child_voice: val("planVoice"),
      staff_guidance: val("planStaff"), formulation: val("planForm")
    })});
    msg("Plan saved"); loadPlans(); openPlan(id);
  };
  $("submitPlanBtn").onclick = async () => { await api(`/young-people/plans/${id}/submit`, { method:"POST" }); msg("Plan submitted"); loadPlans(); openPlan(id); };
  $("approvePlanBtn").onclick = async () => { await api(`/young-people/plans/${id}/approve`, { method:"POST" }); msg("Plan approved"); loadPlans(); openPlan(id); };
  $("exportPlanBtn").onclick = () => window.open(`/young-people/plans/${id}/export`, "_blank");
}

function openNewPlan() {
  openDoc("New plan", "Create plan", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Title</label><input id="newPlanTitle" class="input">
        <label class="label">Summary</label><textarea id="newPlanSummary" class="textarea"></textarea>
        <label class="label">Child voice</label><textarea id="newPlanVoice" class="textarea"></textarea>
        <label class="label">Staff guidance</label><textarea id="newPlanStaff" class="textarea"></textarea>
        <label class="label">Formulation</label><textarea id="newPlanForm" class="textarea"></textarea>
      </section>
      <aside class="card doc-side"><button id="createPlanBtn" class="btn primary">Create plan</button></aside>
    </div>
  `);
  $("createPlanBtn").onclick = async () => {
    const res = await api(`/young-people/plans`, { method:"POST", body:JSON.stringify({
      young_person_id: state.selected.id, title: val("newPlanTitle"), summary: val("newPlanSummary"),
      child_voice: val("newPlanVoice"), staff_guidance: val("newPlanStaff"), formulation: val("newPlanForm")
    })});
    msg("Plan created"); loadPlans(); openPlan(res.id);
  };
}

async function openDailyNote(id) {
  const r = await api(`/young-people/daily-notes/${id}`);
  openDoc(r.title || "Daily note", `${fmtDateTime(r.note_date || r.created_at)} · ${r.workflow_status || "draft"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Note date</label><input id="dnDate" class="input" value="${esc(r.note_date || "")}">
        <label class="label">Shift type</label><input id="dnShift" class="input" value="${esc(r.shift_type || "")}">
        <label class="label">Mood</label><input id="dnMood" class="input" value="${esc(r.mood || "")}">
        <label class="label">Presentation</label><textarea id="dnPresentation" class="textarea">${esc(r.presentation || "")}</textarea>
        <label class="label">Activities</label><textarea id="dnActivities" class="textarea">${esc(r.activities || "")}</textarea>
        <label class="label">Education update</label><textarea id="dnEducation" class="textarea">${esc(r.education_update || "")}</textarea>
        <label class="label">Health update</label><textarea id="dnHealth" class="textarea">${esc(r.health_update || "")}</textarea>
        <label class="label">Family update</label><textarea id="dnFamily" class="textarea">${esc(r.family_update || "")}</textarea>
        <label class="label">Behaviour update</label><textarea id="dnBehaviour" class="textarea">${esc(r.behaviour_update || "")}</textarea>
        <label class="label">Child voice</label><textarea id="dnVoice" class="textarea">${esc(r.child_voice || r.young_person_voice || "")}</textarea>
        <label class="label">Positives</label><textarea id="dnPositives" class="textarea">${esc(r.positives || "")}</textarea>
        <label class="label">Actions required</label><textarea id="dnActions" class="textarea">${esc(r.actions_required || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <label class="label">Manager comment</label><textarea id="dnComment" class="textarea">${esc(r.manager_review_comment || "")}</textarea>
        <button id="saveDnBtn" class="btn primary">Save</button>
        <button id="submitDnBtn" class="btn">Submit</button>
        <button id="approveDnBtn" class="btn">Approve</button>
        <button id="returnDnBtn" class="btn">Return</button>
        <button id="archiveDnBtn" class="btn">Archive</button>
      </aside>
    </div>
  `);
  $("saveDnBtn").onclick = async () => {
    await api(`/young-people/daily-notes/${id}`, { method:"PUT", body:JSON.stringify({
      note_date: val("dnDate"), shift_type: val("dnShift"), mood: val("dnMood"),
      presentation: val("dnPresentation"), activities: val("dnActivities"), education_update: val("dnEducation"),
      health_update: val("dnHealth"), family_update: val("dnFamily"), behaviour_update: val("dnBehaviour"),
      child_voice: val("dnVoice"), positives: val("dnPositives"), actions_required: val("dnActions"),
      manager_review_comment: val("dnComment")
    })});
    msg("Daily note saved"); loadDailyNotes(); openDailyNote(id);
  };
  $("submitDnBtn").onclick = async () => { await api(`/young-people/daily-notes/${id}/submit`, { method:"POST" }); msg("Daily note submitted"); loadDailyNotes(); openDailyNote(id); };
  $("approveDnBtn").onclick = async () => { await api(`/young-people/daily-notes/${id}/approve`, { method:"POST", body:JSON.stringify({ review_note: val("dnComment") }) }); msg("Daily note approved"); loadDailyNotes(); openDailyNote(id); };
  $("returnDnBtn").onclick = async () => { await api(`/young-people/daily-notes/${id}/return`, { method:"POST", body:JSON.stringify({ review_note: val("dnComment") }) }); msg("Daily note returned"); loadDailyNotes(); openDailyNote(id); };
  $("archiveDnBtn").onclick = async () => { await api(`/young-people/daily-notes/${id}/archive`, { method:"POST" }); msg("Daily note archived"); closeDoc(); loadDailyNotes(); };
}

function openNewDailyNote() {
  openDoc("New daily note", "Create daily note", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Note date</label><input id="newDnDate" class="input">
        <label class="label">Shift type</label><input id="newDnShift" class="input">
        <label class="label">Mood</label><input id="newDnMood" class="input">
        <label class="label">Presentation</label><textarea id="newDnPresentation" class="textarea"></textarea>
        <label class="label">Activities</label><textarea id="newDnActivities" class="textarea"></textarea>
        <label class="label">Education update</label><textarea id="newDnEducation" class="textarea"></textarea>
        <label class="label">Health update</label><textarea id="newDnHealth" class="textarea"></textarea>
        <label class="label">Family update</label><textarea id="newDnFamily" class="textarea"></textarea>
        <label class="label">Behaviour update</label><textarea id="newDnBehaviour" class="textarea"></textarea>
        <label class="label">Child voice</label><textarea id="newDnVoice" class="textarea"></textarea>
        <label class="label">Positives</label><textarea id="newDnPositives" class="textarea"></textarea>
        <label class="label">Actions required</label><textarea id="newDnActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side"><button id="createDnBtn" class="btn primary">Create daily note</button></aside>
    </div>
  `);
  $("createDnBtn").onclick = async () => {
    const res = await api(`/young-people/daily-notes`, { method:"POST", body:JSON.stringify({
      young_person_id: state.selected.id, note_date: val("newDnDate"), shift_type: val("newDnShift"),
      mood: val("newDnMood"), presentation: val("newDnPresentation"), activities: val("newDnActivities"),
      education_update: val("newDnEducation"), health_update: val("newDnHealth"), family_update: val("newDnFamily"),
      behaviour_update: val("newDnBehaviour"), child_voice: val("newDnVoice"), positives: val("newDnPositives"),
      actions_required: val("newDnActions")
    })});
    msg("Daily note created"); loadDailyNotes(); openDailyNote(res.id);
  };
}

async function openIncident(id) {
  const r = await api(`/young-people/incidents/${id}`);
  openDoc(r.title || "Incident", `${fmtDateTime(r.occurred_at || r.created_at)} · ${r.workflow_status || "pending"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Incident type</label>
        <select id="incType" class="input">
          ${["Missing from placement","Physical aggression","Verbal aggression","Self-harm concern","Safeguarding concern","Absconding","Property damage","Physical intervention","Other"].map(x => `<option ${String(r.incident_type||"").toLowerCase()===x.toLowerCase()?"selected":""}>${x}</option>`).join("")}
        </select>
        <label class="label">Occurred at</label><input id="incOccurred" class="input" value="${esc(r.occurred_at || r.incident_datetime || "")}">
        <label class="label">Location</label><input id="incLocation" class="input" value="${esc(r.location || "")}">
        <label class="label">Description</label><textarea id="incDescription" class="textarea">${esc(r.description || r.narrative || "")}</textarea>
        <label class="label">Antecedent</label><textarea id="incAntecedent" class="textarea">${esc(r.antecedent || "")}</textarea>
        <label class="label">Presentation</label><textarea id="incPresentation" class="textarea">${esc(r.presentation || "")}</textarea>
        <label class="label">Staff response</label><textarea id="incResponse" class="textarea">${esc(r.staff_response || "")}</textarea>
        <label class="label">Trauma-informed formulation</label><textarea id="incFormulation" class="textarea">${esc(r.trauma_informed_formulation || "")}</textarea>
        <label class="label">Child voice</label><textarea id="incVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
        <label class="label">Outcome / follow-up</label><textarea id="incOutcome" class="textarea">${esc(r.outcome || r.follow_up_required || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <label class="label">Severity</label>
        <select id="incSeverity" class="input">
          ${["low","medium","high","critical"].map(x => `<option value="${x}" ${String(r.severity||"medium")===x?"selected":""}>${x[0].toUpperCase()+x.slice(1)}</option>`).join("")}
        </select>
        <label class="label">Manager comment</label><textarea id="incComment" class="textarea">${esc(r.manager_review_comment || "")}</textarea>
        <button id="saveIncBtn" class="btn primary">Save</button>
        <button id="submitIncBtn" class="btn">Submit</button>
        <button id="approveIncBtn" class="btn">Approve</button>
        <button id="returnIncBtn" class="btn">Return</button>
        <button id="archiveIncBtn" class="btn">Archive</button>
        <button id="exportIncBtn" class="btn">Export</button>
      </aside>
    </div>
  `);
  $("saveIncBtn").onclick = async () => {
    await api(`/young-people/incidents/${id}`, { method:"PUT", body:JSON.stringify({
      incident_type: val("incType"), occurred_at: val("incOccurred"), location: val("incLocation"),
      narrative: val("incDescription"), antecedent: val("incAntecedent"), presentation: val("incPresentation"),
      staff_response: val("incResponse"), trauma_informed_formulation: val("incFormulation"),
      child_voice: val("incVoice"), outcome: val("incOutcome"), severity: val("incSeverity"),
      manager_review_comment: val("incComment")
    })});
    msg("Incident saved"); loadIncidents(); openIncident(id);
  };
  $("submitIncBtn").onclick = async () => { await api(`/young-people/incidents/${id}/submit`, { method:"POST" }); msg("Incident submitted"); loadIncidents(); openIncident(id); };
  $("approveIncBtn").onclick = async () => { await api(`/young-people/incidents/${id}/approve`, { method:"POST", body:JSON.stringify({ review_note: val("incComment") }) }); msg("Incident approved"); loadIncidents(); openIncident(id); };
  $("returnIncBtn").onclick = async () => { await api(`/young-people/incidents/${id}/return`, { method:"POST", body:JSON.stringify({ review_note: val("incComment") }) }); msg("Incident returned"); loadIncidents(); openIncident(id); };
  $("archiveIncBtn").onclick = async () => { await api(`/young-people/incidents/${id}/archive`, { method:"POST" }); msg("Incident archived"); closeDoc(); loadIncidents(); };
  $("exportIncBtn").onclick = () => window.open(`/young-people/incidents/${id}/export`, "_blank");
}

function openNewIncident() {
  openDoc("New incident", "Create incident", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Incident type</label>
        <select id="newIncType" class="input">
          ${["Missing from placement","Physical aggression","Verbal aggression","Self-harm concern","Safeguarding concern","Absconding","Property damage","Physical intervention","Other"].map(x => `<option>${x}</option>`).join("")}
        </select>
        <label class="label">Occurred at</label><input id="newIncOccurred" class="input">
        <label class="label">Location</label><input id="newIncLocation" class="input">
        <label class="label">Description</label><textarea id="newIncDescription" class="textarea"></textarea>
        <label class="label">Antecedent</label><textarea id="newIncAntecedent" class="textarea"></textarea>
        <label class="label">Presentation</label><textarea id="newIncPresentation" class="textarea"></textarea>
        <label class="label">Staff response</label><textarea id="newIncResponse" class="textarea"></textarea>
        <label class="label">Trauma-informed formulation</label><textarea id="newIncFormulation" class="textarea"></textarea>
        <label class="label">Child voice</label><textarea id="newIncVoice" class="textarea"></textarea>
        <label class="label">Outcome / follow-up</label><textarea id="newIncOutcome" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <label class="label">Severity</label>
        <select id="newIncSeverity" class="input"><option>medium</option><option>low</option><option>high</option><option>critical</option></select>
        <button id="createIncBtn" class="btn primary">Create incident</button>
      </aside>
    </div>
  `);
  $("createIncBtn").onclick = async () => {
    const res = await api(`/young-people/incidents`, { method:"POST", body:JSON.stringify({
      young_person_id: state.selected.id, incident_type: val("newIncType"), occurred_at: val("newIncOccurred"),
      location: val("newIncLocation"), narrative: val("newIncDescription"), antecedent: val("newIncAntecedent"),
      presentation: val("newIncPresentation"), staff_response: val("newIncResponse"),
      trauma_informed_formulation: val("newIncFormulation"), child_voice: val("newIncVoice"),
      outcome: val("newIncOutcome"), severity: val("newIncSeverity")
    })});
    msg("Incident created"); loadIncidents(); openIncident(res.id);
  };
}

function openHealthProfile(p = {}) {
  openDoc("Health profile", "Edit health profile", `
    <div class="card">
      <label class="label">GP name</label><input id="hpGp" class="input" value="${esc(p.gp_name || "")}">
      <label class="label">Allergies</label><textarea id="hpAllergies" class="textarea">${esc(p.allergies || "")}</textarea>
      <label class="label">Diagnoses</label><textarea id="hpDiagnoses" class="textarea">${esc(p.diagnoses || "")}</textarea>
      <div class="badges"><button id="saveHpBtn" class="btn primary">Save health profile</button></div>
    </div>
  `);
  $("saveHpBtn").onclick = async () => {
    await api(`/young-people/${state.selected.id}/health/profile`, { method:"PUT", body:JSON.stringify({
      gp_name: val("hpGp"), allergies: val("hpAllergies"), diagnoses: val("hpDiagnoses")
    })});
    msg("Health profile saved"); closeDoc(); loadHealth(); loadOverview();
  };
}

async function openHealthRecord(id) {
  const r = await api(`/young-people/health-records/${id}`);
  openDoc(r.title || "Health record", `${fmtDateTime(r.event_datetime || r.created_at)} · ${r.record_type || "health"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Record type</label><input id="hrType" class="input" value="${esc(r.record_type || "")}">
        <label class="label">Title</label><input id="hrTitle" class="input" value="${esc(r.title || "")}">
        <label class="label">Summary</label><textarea id="hrSummary" class="textarea">${esc(r.summary || "")}</textarea>
        <label class="label">Professional name</label><input id="hrPro" class="input" value="${esc(r.professional_name || "")}">
        <label class="label">Outcome</label><textarea id="hrOutcome" class="textarea">${esc(r.outcome || "")}</textarea>
        <label class="label">Next action date</label><input id="hrNext" class="input" value="${esc(r.next_action_date || "")}">
        <label class="label">Event datetime</label><input id="hrDt" class="input" value="${esc(r.event_datetime || "")}">
      </section>
      <aside class="card doc-side">
        <label class="pill"><input type="checkbox" id="hrFollow" ${r.follow_up_required ? "checked" : ""}> Follow-up required</label>
        <button id="saveHrBtn" class="btn primary">Save</button>
      </aside>
    </div>
  `);
  $("saveHrBtn").onclick = async () => {
    await api(`/young-people/health-records/${id}`, { method:"PUT", body:JSON.stringify({
      record_type: val("hrType"), title: val("hrTitle"), summary: val("hrSummary"),
      professional_name: val("hrPro"), outcome: val("hrOutcome"), next_action_date: val("hrNext"),
      event_datetime: val("hrDt"), follow_up_required: chk("hrFollow")
    })});
    msg("Health record saved"); loadHealth(); openHealthRecord(id);
  };
}

function openNewHealthRecord() {
  openDoc("New health record", "Create health record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Record type</label><input id="newHrType" class="input">
        <label class="label">Title</label><input id="newHrTitle" class="input">
        <label class="label">Summary</label><textarea id="newHrSummary" class="textarea"></textarea>
        <label class="label">Professional name</label><input id="newHrPro" class="input">
        <label class="label">Outcome</label><textarea id="newHrOutcome" class="textarea"></textarea>
        <label class="label">Next action date</label><input id="newHrNext" class="input">
        <label class="label">Event datetime</label><input id="newHrDt" class="input">
      </section>
      <aside class="card doc-side">
        <label class="pill"><input type="checkbox" id="newHrFollow"> Follow-up required</label>
        <button id="createHrBtn" class="btn primary">Create health record</button>
      </aside>
    </div>
  `);
  $("createHrBtn").onclick = async () => {
    const res = await api(`/young-people/health-records`, { method:"POST", body:JSON.stringify({
      young_person_id: state.selected.id, record_type: val("newHrType"), title: val("newHrTitle"),
      summary: val("newHrSummary"), professional_name: val("newHrPro"), outcome: val("newHrOutcome"),
      next_action_date: val("newHrNext"), event_datetime: val("newHrDt"), follow_up_required: chk("newHrFollow")
    })});
    msg("Health record created"); loadHealth(); openHealthRecord(res.id);
  };
}

function openEducationProfile(p = {}) {
  openDoc("Education profile", "Edit education profile", `
    <div class="card">
      <label class="label">School name</label><input id="epSchool" class="input" value="${esc(p.school_name || "")}">
      <label class="label">Year group</label><input id="epYear" class="input" value="${esc(p.year_group || "")}">
      <label class="label">Education status</label><input id="epStatus" class="input" value="${esc(p.education_status || "")}">
      <div class="badges"><button id="saveEpBtn" class="btn primary">Save education profile</button></div>
    </div>
  `);
  $("saveEpBtn").onclick = async () => {
    await api(`/young-people/${state.selected.id}/education/profile`, { method:"PUT", body:JSON.stringify({
      school_name: val("epSchool"), year_group: val("epYear"), education_status: val("epStatus")
    })});
    msg("Education profile saved"); closeDoc(); loadEducation(); loadOverview();
  };
}

async function openEducationRecord(id) {
  const r = await api(`/young-people/education-records/${id}`);
  openDoc(r.title || "Education record", `${fmtDate(r.record_date || r.created_at)} · ${r.attendance_status || "—"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Record date</label><input id="erDate" class="input" value="${esc(r.record_date || "")}">
        <label class="label">Attendance status</label><input id="erAttendance" class="input" value="${esc(r.attendance_status || "")}">
        <label class="label">Provision name</label><input id="erProvision" class="input" value="${esc(r.provision_name || "")}">
        <label class="label">Behaviour summary</label><textarea id="erBehaviour" class="textarea">${esc(r.behaviour_summary || "")}</textarea>
        <label class="label">Learning engagement</label><textarea id="erEngagement" class="textarea">${esc(r.learning_engagement || "")}</textarea>
        <label class="label">Issue raised</label><textarea id="erIssue" class="textarea">${esc(r.issue_raised || "")}</textarea>
        <label class="label">Action taken</label><textarea id="erAction" class="textarea">${esc(r.action_taken || "")}</textarea>
        <label class="label">Professional involved</label><input id="erPro" class="input" value="${esc(r.professional_involved || "")}">
        <label class="label">Achievement note</label><textarea id="erAchievement" class="textarea">${esc(r.achievement_note || "")}</textarea>
      </section>
      <aside class="card doc-side"><button id="saveErBtn" class="btn primary">Save</button></aside>
    </div>
  `);
  $("saveErBtn").onclick = async () => {
    await api(`/young-people/education-records/${id}`, { method:"PUT", body:JSON.stringify({
      record_date: val("erDate"), attendance_status: val("erAttendance"), provision_name: val("erProvision"),
      behaviour_summary: val("erBehaviour"), learning_engagement: val("erEngagement"), issue_raised: val("erIssue"),
      action_taken: val("erAction"), professional_involved: val("erPro"), achievement_note: val("erAchievement")
    })});
    msg("Education record saved"); loadEducation(); openEducationRecord(id);
  };
}

function openNewEducationRecord() {
  openDoc("New education record", "Create education record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Record date</label><input id="newErDate" class="input">
        <label class="label">Attendance status</label><input id="newErAttendance" class="input">
        <label class="label">Provision name</label><input id="newErProvision" class="input">
        <label class="label">Behaviour summary</label><textarea id="newErBehaviour" class="textarea"></textarea>
        <label class="label">Learning engagement</label><textarea id="newErEngagement" class="textarea"></textarea>
        <label class="label">Issue raised</label><textarea id="newErIssue" class="textarea"></textarea>
        <label class="label">Action taken</label><textarea id="newErAction" class="textarea"></textarea>
        <label class="label">Professional involved</label><input id="newErPro" class="input">
        <label class="label">Achievement note</label><textarea id="newErAchievement" class="textarea"></textarea>
      </section>
      <aside class="card doc-side"><button id="createErBtn" class="btn primary">Create education record</button></aside>
    </div>
  `);
  $("createErBtn").onclick = async () => {
    const res = await api(`/young-people/education-records`, { method:"POST", body:JSON.stringify({
      young_person_id: state.selected.id, record_date: val("newErDate"), attendance_status: val("newErAttendance"),
      provision_name: val("newErProvision"), behaviour_summary: val("newErBehaviour"), learning_engagement: val("newErEngagement"),
      issue_raised: val("newErIssue"), action_taken: val("newErAction"), professional_involved: val("newErPro"),
      achievement_note: val("newErAchievement")
    })});
    msg("Education record created"); loadEducation(); openEducationRecord(res.id);
  };
}

async function openFamilyContact(id) {
  const r = await api(`/young-people/family/contacts/${id}`);
  openDoc(r.full_name || "Family contact", r.relationship_to_child || "relationship", `
    <div class="card">
      <label class="label">Full name</label><input id="fcName" class="input" value="${esc(r.full_name || "")}">
      <label class="label">Relationship to child</label><input id="fcRel" class="input" value="${esc(r.relationship_to_child || "")}">
      <label class="label">Phone number</label><input id="fcPhone" class="input" value="${esc(r.phone_number || "")}">
      <label class="label">Email</label><input id="fcEmail" class="input" value="${esc(r.email || "")}">
      <label class="label">Address</label><textarea id="fcAddress" class="textarea">${esc(r.address || "")}</textarea>
      <label class="label">Notes</label><textarea id="fcNotes" class="textarea">${esc(r.contact_notes || "")}</textarea>
      <label class="pill"><input type="checkbox" id="fcPR" ${r.is_parental_responsibility_holder ? "checked" : ""}> Parental responsibility holder</label>
      <label class="pill"><input type="checkbox" id="fcApproved" ${r.is_approved_contact ? "checked" : ""}> Approved contact</label>
      <div class="badges"><button id="saveFcBtn" class="btn primary">Save contact</button></div>
    </div>
  `);
  $("saveFcBtn").onclick = async () => {
    await api(`/young-people/family/contacts/${id}`, { method:"PUT", body:JSON.stringify({
      full_name: val("fcName"), relationship_to_child: val("fcRel"), phone_number: val("fcPhone"),
      email: val("fcEmail"), address: val("fcAddress"), contact_notes: val("fcNotes"),
      is_parental_responsibility_holder: chk("fcPR"), is_approved_contact: chk("fcApproved")
    })});
    msg("Family contact saved"); loadFamily(); openFamilyContact(id);
  };
}

function openNewFamilyContact() {
  openDoc("New family contact", "Create family contact", `
    <div class="card">
      <label class="label">Full name</label><input id="newFcName" class="input">
      <label class="label">Relationship to child</label><input id="newFcRel" class="input">
      <label class="label">Phone number</label><input id="newFcPhone" class="input">
      <label class="label">Email</label><input id="newFcEmail" class="input">
      <label class="label">Address</label><textarea id="newFcAddress" class="textarea"></textarea>
      <label class="label">Notes</label><textarea id="newFcNotes" class="textarea"></textarea>
      <label class="pill"><input type="checkbox" id="newFcPR"> Parental responsibility holder</label>
      <label class="pill"><input type="checkbox" id="newFcApproved"> Approved contact</label>
      <div class="badges"><button id="createFcBtn" class="btn primary">Create contact</button></div>
    </div>
  `);
  $("createFcBtn").onclick = async () => {
    await api(`/young-people/${state.selected.id}/family/contacts`, { method:"POST", body:JSON.stringify({
      full_name: val("newFcName"), relationship_to_child: val("newFcRel"), phone_number: val("newFcPhone"),
      email: val("newFcEmail"), address: val("newFcAddress"), contact_notes: val("newFcNotes"),
      is_parental_responsibility_holder: chk("newFcPR"), is_approved_contact: chk("newFcApproved")
    })});
    msg("Family contact created"); closeDoc(); loadFamily();
  };
}

async function openFamilyRecord(id) {
  const r = await api(`/young-people/family/records/${id}`);
  openDoc(r.contact_person || "Family contact record", `${fmtDateTime(r.contact_datetime || r.created_at)} · ${r.contact_type || "contact"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Contact datetime</label><input id="frDate" class="input" value="${esc(r.contact_datetime || "")}">
        <label class="label">Contact type</label><input id="frType" class="input" value="${esc(r.contact_type || "")}">
        <label class="label">Contact person</label><input id="frPerson" class="input" value="${esc(r.contact_person || "")}">
        <label class="label">Supervision level</label><input id="frSupervision" class="input" value="${esc(r.supervision_level || "")}">
        <label class="label">Location</label><input id="frLocation" class="input" value="${esc(r.location || "")}">
        <label class="label">Pre-contact presentation</label><textarea id="frPre" class="textarea">${esc(r.pre_contact_presentation || "")}</textarea>
        <label class="label">Post-contact presentation</label><textarea id="frPost" class="textarea">${esc(r.post_contact_presentation || "")}</textarea>
        <label class="label">Child voice</label><textarea id="frVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
        <label class="label">Concerns</label><textarea id="frConcerns" class="textarea">${esc(r.concerns || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <label class="pill"><input type="checkbox" id="frFollow" ${r.follow_up_required ? "checked" : ""}> Follow-up required</label>
        <button id="saveFrBtn" class="btn primary">Save</button>
      </aside>
    </div>
  `);
  $("saveFrBtn").onclick = async () => {
    await api(`/young-people/family/records/${id}`, { method:"PUT", body:JSON.stringify({
      contact_datetime: val("frDate"), contact_type: val("frType"), contact_person: val("frPerson"),
      supervision_level: val("frSupervision"), location: val("frLocation"), pre_contact_presentation: val("frPre"),
      post_contact_presentation: val("frPost"), child_voice: val("frVoice"), concerns: val("frConcerns"),
      follow_up_required: chk("frFollow")
    })});
    msg("Family record saved"); loadFamily(); openFamilyRecord(id);
  };
}

function openNewFamilyRecord() {
  openDoc("New family record", "Create family contact record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Contact datetime</label><input id="newFrDate" class="input">
        <label class="label">Contact type</label><input id="newFrType" class="input">
        <label class="label">Contact person</label><input id="newFrPerson" class="input">
        <label class="label">Supervision level</label><input id="newFrSupervision" class="input">
        <label class="label">Location</label><input id="newFrLocation" class="input">
        <label class="label">Pre-contact presentation</label><textarea id="newFrPre" class="textarea"></textarea>
        <label class="label">Post-contact presentation</label><textarea id="newFrPost" class="textarea"></textarea>
        <label class="label">Child voice</label><textarea id="newFrVoice" class="textarea"></textarea>
        <label class="label">Concerns</label><textarea id="newFrConcerns" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <label class="pill"><input type="checkbox" id="newFrFollow"> Follow-up required</label>
        <button id="createFrBtn" class="btn primary">Create record</button>
      </aside>
    </div>
  `);
  $("createFrBtn").onclick = async () => {
    const res = await api(`/young-people/family/records`, { method:"POST", body:JSON.stringify({
      young_person_id: state.selected.id, contact_datetime: val("newFrDate"), contact_type: val("newFrType"),
      contact_person: val("newFrPerson"), supervision_level: val("newFrSupervision"), location: val("newFrLocation"),
      pre_contact_presentation: val("newFrPre"), post_contact_presentation: val("newFrPost"),
      child_voice: val("newFrVoice"), concerns: val("newFrConcerns"), follow_up_required: chk("newFrFollow")
    })});
    msg("Family record created"); loadFamily(); openFamilyRecord(res.id);
  };
}

async function openKeywork(id) {
  const r = await api(`/young-people/keywork/${id}`);
  openDoc(r.topic || "Key work session", `${fmtDate(r.session_date || r.created_at)} · ${r.status || r.workflow_status || "draft"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Session date</label><input id="kwDate" class="input" value="${esc(r.session_date || "")}">
        <label class="label">Topic</label><input id="kwTopic" class="input" value="${esc(r.topic || "")}">
        <label class="label">Purpose</label><textarea id="kwPurpose" class="textarea">${esc(r.purpose || "")}</textarea>
        <label class="label">Summary</label><textarea id="kwSummary" class="textarea">${esc(r.summary || "")}</textarea>
        <label class="label">Child voice</label><textarea id="kwVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
        <label class="label">Reflective analysis</label><textarea id="kwReflective" class="textarea">${esc(r.reflective_analysis || "")}</textarea>
        <label class="label">Actions agreed</label><textarea id="kwActions" class="textarea">${esc(r.actions_agreed || "")}</textarea>
        <label class="label">Next session date</label><input id="kwNext" class="input" value="${esc(r.next_session_date || "")}">
        <label class="label">Manager comment</label><textarea id="kwComment" class="textarea">${esc(r.manager_review_comment || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <button id="saveKwBtn" class="btn primary">Save</button>
        <button id="submitKwBtn" class="btn">Submit</button>
        <button id="approveKwBtn" class="btn">Approve</button>
        <button id="returnKwBtn" class="btn">Return</button>
        <button id="archiveKwBtn" class="btn">Archive</button>
      </aside>
    </div>
  `);
  $("saveKwBtn").onclick = async () => {
    await api(`/young-people/keywork/${id}`, { method:"PUT", body:JSON.stringify({
      session_date: val("kwDate"), topic: val("kwTopic"), purpose: val("kwPurpose"), summary: val("kwSummary"),
      child_voice: val("kwVoice"), reflective_analysis: val("kwReflective"), actions_agreed: val("kwActions"),
      next_session_date: val("kwNext"), manager_review_comment: val("kwComment")
    })});
    msg("Key work saved"); loadKeywork(); openKeywork(id);
  };
  $("submitKwBtn").onclick = async () => { await api(`/young-people/keywork/${id}/submit`, { method:"POST" }); msg("Key work submitted"); loadKeywork(); openKeywork(id); };
  $("approveKwBtn").onclick = async () => { await api(`/young-people/keywork/${id}/approve`, { method:"POST", body:JSON.stringify({ review_note: val("kwComment") }) }); msg("Key work approved"); loadKeywork(); openKeywork(id); };
  $("returnKwBtn").onclick = async () => { await api(`/young-people/keywork/${id}/return`, { method:"POST", body:JSON.stringify({ review_note: val("kwComment") }) }); msg("Key work returned"); loadKeywork(); openKeywork(id); };
  $("archiveKwBtn").onclick = async () => { await api(`/young-people/keywork/${id}/archive`, { method:"POST" }); msg("Key work archived"); closeDoc(); loadKeywork(); };
}

function openNewKeywork() {
  openDoc("New key work", "Create key work session", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Session date</label><input id="newKwDate" class="input">
        <label class="label">Topic</label><input id="newKwTopic" class="input">
        <label class="label">Purpose</label><textarea id="newKwPurpose" class="textarea"></textarea>
        <label class="label">Summary</label><textarea id="newKwSummary" class="textarea"></textarea>
        <label class="label">Child voice</label><textarea id="newKwVoice" class="textarea"></textarea>
        <label class="label">Reflective analysis</label><textarea id="newKwReflective" class="textarea"></textarea>
        <label class="label">Actions agreed</label><textarea id="newKwActions" class="textarea"></textarea>
        <label class="label">Next session date</label><input id="newKwNext" class="input">
      </section>
      <aside class="card doc-side"><button id="createKwBtn" class="btn primary">Create key work</button></aside>
    </div>
  `);
  $("createKwBtn").onclick = async () => {
    const res = await api(`/young-people/keywork`, { method:"POST", body:JSON.stringify({
      young_person_id: state.selected.id, session_date: val("newKwDate"), topic: val("newKwTopic"),
      purpose: val("newKwPurpose"), summary: val("newKwSummary"), child_voice: val("newKwVoice"),
      reflective_analysis: val("newKwReflective"), actions_agreed: val("newKwActions"), next_session_date: val("newKwNext")
    })});
    msg("Key work created"); loadKeywork(); openKeywork(res.id);
  };
}

async function openReview(id) {
  const r = await api(`/workflow-reviews/${id}`);
  openDoc(`${r.record_type} review`, `${r.young_person_name || "—"} · ${r.status}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Manager decision note</label><textarea id="reviewNote" class="textarea">${esc(r.review_note || "")}</textarea>
        <label class="pill"><input type="checkbox" id="reviewChildVoice" ${r.child_voice_captured ? "checked" : ""}> Child voice captured</label>
        <label class="pill"><input type="checkbox" id="reviewTrauma" ${r.trauma_informed ? "checked" : ""}> Trauma-informed response evident</label>
        <label class="pill"><input type="checkbox" id="reviewActions" ${r.actions_required ? "checked" : ""}> Actions required</label>
        <label class="pill"><input type="checkbox" id="reviewExternal" ${r.requires_external_notification ? "checked" : ""}> External notification required</label>
      </section>
      <aside class="card doc-side">
        <button id="approveReviewBtn" class="btn primary">Approve</button>
        <button id="returnReviewBtn" class="btn">Return</button>
        <button id="escalateReviewBtn" class="btn">Escalate</button>
      </aside>
    </div>
  `);
  const decide = async decision => {
    await api(`/workflow-reviews/${id}/decision`, { method:"POST", body:JSON.stringify({
      decision, review_note: val("reviewNote"), child_voice_captured: chk("reviewChildVoice"),
      trauma_informed: chk("reviewTrauma"), actions_required: chk("reviewActions"),
      requires_external_notification: chk("reviewExternal")
    })});
    msg(`Review ${decision}`); loadReviews(); openReview(id);
  };
  $("approveReviewBtn").onclick = () => decide("approved");
  $("returnReviewBtn").onclick = () => decide("returned");
  $("escalateReviewBtn").onclick = () => decide("escalated");
}

function loadTab() {
  if (!state.selected) return;
  renderPersonHeader();
  ({
    overview: loadOverview,
    timeline: loadTimeline,
    "daily-notes": loadDailyNotes,
    incidents: loadIncidents,
    health: loadHealth,
    education: loadEducation,
    family: loadFamily,
    keywork: loadKeywork,
    plans: loadPlans,
    reviews: loadReviews
  }[state.tab] || loadOverview)();
}

document.addEventListener("DOMContentLoaded", () => {
  $$(".nav-btn").forEach(btn => btn.onclick = () => setSection(btn.dataset.section));
  $$(".tab").forEach(btn => btn.onclick = () => setTab(btn.dataset.tab));

  $("youngPersonSelect")?.addEventListener("change", e => {
    state.selected = state.youngPeople.find(p => Number(p.id) === Number(e.target.value)) || null;
    loadTab();
  });

  $("timelineEventType")?.addEventListener("change", e => {
    state.timelineCategory = e.target.value;
    loadTimeline();
  });

  $("docBackBtn")?.addEventListener("click", closeDoc);
  $("newPlanBtn")?.addEventListener("click", openNewPlan);
  $("plansOpenCreateBtn")?.addEventListener("click", openNewPlan);
  $("quickEventBtn")?.addEventListener("click", () => {
    setSection("young-people");
    setTab("timeline");
  });

  setSection("command-centre");
  loadYoungPeople();
  loadCommandCentre();
});

/* =========================
   PART 2 — ARCHIVE + STAFF
========================= */

async function safeGet(url, fallback = []) {
  try {
    return await api(url);
  } catch {
    return fallback;
  }
}

async function loadArchive() {
  if (!state.selected) return;
  try {
    const [daily, incidents, plans, keywork] = await Promise.all([
      safeGet(`/young-people/${state.selected.id}/daily-notes/archive`, []),
      safeGet(`/young-people/${state.selected.id}/incidents/archive`, []),
      safeGet(`/young-people/${state.selected.id}/plans/archive`, []),
      safeGet(`/young-people/${state.selected.id}/keywork/archive`, []),
    ]);

    const items = [
      ...arr(daily).map(x => ({ ...x, _kind: "daily-note", _title: x.title || "Daily note", _meta: x.note_date || x.created_at })),
      ...arr(incidents).map(x => ({ ...x, _kind: "incident", _title: x.title || x.incident_type || "Incident", _meta: x.occurred_at || x.incident_datetime || x.created_at })),
      ...arr(plans).map(x => ({ ...x, _kind: "plan", _title: x.title || "Plan", _meta: x.updated_at || x.created_at })),
      ...arr(keywork).map(x => ({ ...x, _kind: "keywork", _title: x.topic || "Key work", _meta: x.session_date || x.created_at }))
    ].sort((a, b) => new Date(b._meta || 0) - new Date(a._meta || 0));

    setHTML("archiveContent", items.length ? `
      <div class="list">
        ${items.map(r => `
          <div class="row-card open-archive" data-kind="${esc(r._kind)}" data-id="${r.id}">
            <div class="row-title">${esc(r._title)}</div>
            <div class="row-meta">${esc(r._kind)} · ${esc(fmtDateTime(r._meta))}</div>
            <div>${esc(r.summary || r.description || r.child_voice || r.positives || "Archived record")}</div>
            <div class="badges">
              <span class="pill red">Archived</span>
              <span class="pill blue">Viewable</span>
            </div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No archived records found."));

    $$(".open-archive").forEach(el => {
      el.onclick = () => {
        const kind = el.dataset.kind;
        const id = Number(el.dataset.id);
        if (kind === "daily-note") openDailyNote(id);
        if (kind === "incident") openIncident(id);
        if (kind === "plan") openPlan(id);
        if (kind === "keywork") openKeywork(id);
      };
    });
  } catch (e) {
    setHTML("archiveContent", emptyCard("Archive failed to load."));
    msg(e.message, true);
  }
}

async function loadStaffHome() {
  setHTML("staffHomeContent", `
    <div class="grid two-col">
      <div class="card">
        <h3 class="card-title">Staff workspace</h3>
        <div class="list">
          <div class="row-card"><div class="row-title">Supervision</div><div>Record and review reflective supervision.</div></div>
          <div class="row-card"><div class="row-title">Team meetings</div><div>Minutes, actions and follow-up.</div></div>
          <div class="row-card"><div class="row-title">Health and safety</div><div>Checks, audits and environment records.</div></div>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Quick actions</h3>
        <div class="badges">
          <button class="btn primary" id="newSupervisionBtn">New supervision</button>
          <button class="btn" id="newMeetingBtn">New team meeting</button>
          <button class="btn" id="newHsBtn">New H&amp;S check</button>
        </div>
      </div>
    </div>
  `);

  $("newSupervisionBtn").onclick = openNewSupervision;
  $("newMeetingBtn").onclick = openNewTeamMeeting;
  $("newHsBtn").onclick = openNewHealthSafetyCheck;
}

async function loadSupervision() {
  try {
    const rows = arr(await safeGet(`/supervision`, []));
    setHTML("supervisionContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card open-supervision" data-id="${r.id}">
            <div class="row-title">${esc(r.staff_name || r.supervisee_name || "Supervision record")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.session_date || r.created_at))}</div>
            <div>${esc(r.summary || r.notes || "Supervision recorded")}</div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No supervision records found."));
  } catch {
    setHTML("supervisionContent", emptyCard("Supervision unavailable."));
  }
}

async function loadTeamMeetings() {
  try {
    const rows = arr(await safeGet(`/documents?category=team_meeting`, []));
    setHTML("teamMeetingsContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title || "Team meeting")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.meeting_date || r.created_at))}</div>
            <div>${esc(r.summary || "Meeting notes recorded")}</div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No team meetings found."));
  } catch {
    setHTML("teamMeetingsContent", emptyCard("Team meetings unavailable."));
  }
}

async function loadHealthSafetyChecks() {
  try {
    const rows = arr(await safeGet(`/documents?category=health_safety`, []));
    setHTML("healthSafetyContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title || "Health and safety check")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.check_date || r.created_at))}</div>
            <div>${esc(r.summary || "Health and safety record")}</div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No health and safety checks found."));
  } catch {
    setHTML("healthSafetyContent", emptyCard("Health and safety checks unavailable."));
  }
}

/* =========================
   STAFF DOCUMENT OPENERS
========================= */

function openNewSupervision() {
  openDoc("New supervision", "Reflective supervision record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Staff member</label><input id="supStaff" class="input">
        <label class="label">Session date</label><input id="supDate" class="input">
        <label class="label">Agenda</label><textarea id="supAgenda" class="textarea"></textarea>
        <label class="label">Discussion</label><textarea id="supDiscussion" class="textarea"></textarea>
        <label class="label">Actions agreed</label><textarea id="supActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="createSupervisionBtn" class="btn primary">Save supervision</button>
      </aside>
    </div>
  `);

  $("createSupervisionBtn").onclick = async () => {
    try {
      await api(`/supervision`, {
        method: "POST",
        body: JSON.stringify({
          staff_name: val("supStaff"),
          session_date: val("supDate"),
          agenda: val("supAgenda"),
          discussion: val("supDiscussion"),
          actions_agreed: val("supActions")
        })
      });
      msg("Supervision saved");
      closeDoc();
      loadSupervision();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

function openNewTeamMeeting() {
  openDoc("New team meeting", "Team meeting notes", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Meeting title</label><input id="tmTitle" class="input">
        <label class="label">Meeting date</label><input id="tmDate" class="input">
        <label class="label">Attendees</label><textarea id="tmAttendees" class="textarea"></textarea>
        <label class="label">Discussion</label><textarea id="tmDiscussion" class="textarea"></textarea>
        <label class="label">Actions</label><textarea id="tmActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="createMeetingBtn" class="btn primary">Save meeting</button>
      </aside>
    </div>
  `);

  $("createMeetingBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "team_meeting",
          title: val("tmTitle"),
          meeting_date: val("tmDate"),
          attendees: val("tmAttendees"),
          summary: val("tmDiscussion"),
          actions: val("tmActions")
        })
      });
      msg("Team meeting saved");
      closeDoc();
      loadTeamMeetings();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

function openNewHealthSafetyCheck() {
  openDoc("New health and safety check", "Residential environment / safety record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Check title</label><input id="hsTitle" class="input" value="Health and safety check">
        <label class="label">Check date</label><input id="hsDate" class="input">
        <label class="label">Area checked</label><input id="hsArea" class="input" placeholder="Kitchen / fire exits / bedrooms / garden">
        <label class="label">Findings</label><textarea id="hsFindings" class="textarea"></textarea>
        <label class="label">Actions required</label><textarea id="hsActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="createHsBtn" class="btn primary">Save check</button>
      </aside>
    </div>
  `);

  $("createHsBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "health_safety",
          title: val("hsTitle"),
          check_date: val("hsDate"),
          area_checked: val("hsArea"),
          summary: val("hsFindings"),
          actions: val("hsActions")
        })
      });
      msg("Health and safety check saved");
      closeDoc();
      loadHealthSafetyChecks();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   PATCH EXISTING LOADTAB
========================= */

const _oldLoadTab = loadTab;
loadTab = function () {
  if (!state.selected && state.section === "young-people") return;

  if (state.section === "staff") {
    const staffTab = state.tab || "staff-home";
    ({
      "staff-home": loadStaffHome,
      supervision: loadSupervision,
      "team-meetings": loadTeamMeetings,
      "health-safety": loadHealthSafetyChecks
    }[staffTab] || loadStaffHome)();
    return;
  }

  if (state.section === "young-people" && state.tab === "archive") {
    renderPersonHeader();
    loadArchive();
    return;
  }

  _oldLoadTab();
};

/* =========================
   PART 2 — ARCHIVE + STAFF
========================= */

async function safeGet(url, fallback = []) {
  try {
    return await api(url);
  } catch {
    return fallback;
  }
}

async function loadArchive() {
  if (!state.selected) return;
  try {
    const [daily, incidents, plans, keywork] = await Promise.all([
      safeGet(`/young-people/${state.selected.id}/daily-notes/archive`, []),
      safeGet(`/young-people/${state.selected.id}/incidents/archive`, []),
      safeGet(`/young-people/${state.selected.id}/plans/archive`, []),
      safeGet(`/young-people/${state.selected.id}/keywork/archive`, []),
    ]);

    const items = [
      ...arr(daily).map(x => ({ ...x, _kind: "daily-note", _title: x.title || "Daily note", _meta: x.note_date || x.created_at })),
      ...arr(incidents).map(x => ({ ...x, _kind: "incident", _title: x.title || x.incident_type || "Incident", _meta: x.occurred_at || x.incident_datetime || x.created_at })),
      ...arr(plans).map(x => ({ ...x, _kind: "plan", _title: x.title || "Plan", _meta: x.updated_at || x.created_at })),
      ...arr(keywork).map(x => ({ ...x, _kind: "keywork", _title: x.topic || "Key work", _meta: x.session_date || x.created_at }))
    ].sort((a, b) => new Date(b._meta || 0) - new Date(a._meta || 0));

    setHTML("archiveContent", items.length ? `
      <div class="list">
        ${items.map(r => `
          <div class="row-card open-archive" data-kind="${esc(r._kind)}" data-id="${r.id}">
            <div class="row-title">${esc(r._title)}</div>
            <div class="row-meta">${esc(r._kind)} · ${esc(fmtDateTime(r._meta))}</div>
            <div>${esc(r.summary || r.description || r.child_voice || r.positives || "Archived record")}</div>
            <div class="badges">
              <span class="pill red">Archived</span>
              <span class="pill blue">Viewable</span>
            </div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No archived records found."));

    $$(".open-archive").forEach(el => {
      el.onclick = () => {
        const kind = el.dataset.kind;
        const id = Number(el.dataset.id);
        if (kind === "daily-note") openDailyNote(id);
        if (kind === "incident") openIncident(id);
        if (kind === "plan") openPlan(id);
        if (kind === "keywork") openKeywork(id);
      };
    });
  } catch (e) {
    setHTML("archiveContent", emptyCard("Archive failed to load."));
    msg(e.message, true);
  }
}

async function loadStaffHome() {
  setHTML("staffHomeContent", `
    <div class="grid two-col">
      <div class="card">
        <h3 class="card-title">Staff workspace</h3>
        <div class="list">
          <div class="row-card"><div class="row-title">Supervision</div><div>Record and review reflective supervision.</div></div>
          <div class="row-card"><div class="row-title">Team meetings</div><div>Minutes, actions and follow-up.</div></div>
          <div class="row-card"><div class="row-title">Health and safety</div><div>Checks, audits and environment records.</div></div>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Quick actions</h3>
        <div class="badges">
          <button class="btn primary" id="newSupervisionBtn">New supervision</button>
          <button class="btn" id="newMeetingBtn">New team meeting</button>
          <button class="btn" id="newHsBtn">New H&amp;S check</button>
        </div>
      </div>
    </div>
  `);

  $("newSupervisionBtn").onclick = openNewSupervision;
  $("newMeetingBtn").onclick = openNewTeamMeeting;
  $("newHsBtn").onclick = openNewHealthSafetyCheck;
}

async function loadSupervision() {
  try {
    const rows = arr(await safeGet(`/supervision`, []));
    setHTML("supervisionContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card open-supervision" data-id="${r.id}">
            <div class="row-title">${esc(r.staff_name || r.supervisee_name || "Supervision record")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.session_date || r.created_at))}</div>
            <div>${esc(r.summary || r.notes || "Supervision recorded")}</div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No supervision records found."));
  } catch {
    setHTML("supervisionContent", emptyCard("Supervision unavailable."));
  }
}

async function loadTeamMeetings() {
  try {
    const rows = arr(await safeGet(`/documents?category=team_meeting`, []));
    setHTML("teamMeetingsContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title || "Team meeting")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.meeting_date || r.created_at))}</div>
            <div>${esc(r.summary || "Meeting notes recorded")}</div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No team meetings found."));
  } catch {
    setHTML("teamMeetingsContent", emptyCard("Team meetings unavailable."));
  }
}

async function loadHealthSafetyChecks() {
  try {
    const rows = arr(await safeGet(`/documents?category=health_safety`, []));
    setHTML("healthSafetyContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title || "Health and safety check")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.check_date || r.created_at))}</div>
            <div>${esc(r.summary || "Health and safety record")}</div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No health and safety checks found."));
  } catch {
    setHTML("healthSafetyContent", emptyCard("Health and safety checks unavailable."));
  }
}

/* =========================
   STAFF DOCUMENT OPENERS
========================= */

function openNewSupervision() {
  openDoc("New supervision", "Reflective supervision record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Staff member</label><input id="supStaff" class="input">
        <label class="label">Session date</label><input id="supDate" class="input">
        <label class="label">Agenda</label><textarea id="supAgenda" class="textarea"></textarea>
        <label class="label">Discussion</label><textarea id="supDiscussion" class="textarea"></textarea>
        <label class="label">Actions agreed</label><textarea id="supActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="createSupervisionBtn" class="btn primary">Save supervision</button>
      </aside>
    </div>
  `);

  $("createSupervisionBtn").onclick = async () => {
    try {
      await api(`/supervision`, {
        method: "POST",
        body: JSON.stringify({
          staff_name: val("supStaff"),
          session_date: val("supDate"),
          agenda: val("supAgenda"),
          discussion: val("supDiscussion"),
          actions_agreed: val("supActions")
        })
      });
      msg("Supervision saved");
      closeDoc();
      loadSupervision();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

function openNewTeamMeeting() {
  openDoc("New team meeting", "Team meeting notes", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Meeting title</label><input id="tmTitle" class="input">
        <label class="label">Meeting date</label><input id="tmDate" class="input">
        <label class="label">Attendees</label><textarea id="tmAttendees" class="textarea"></textarea>
        <label class="label">Discussion</label><textarea id="tmDiscussion" class="textarea"></textarea>
        <label class="label">Actions</label><textarea id="tmActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="createMeetingBtn" class="btn primary">Save meeting</button>
      </aside>
    </div>
  `);

  $("createMeetingBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "team_meeting",
          title: val("tmTitle"),
          meeting_date: val("tmDate"),
          attendees: val("tmAttendees"),
          summary: val("tmDiscussion"),
          actions: val("tmActions")
        })
      });
      msg("Team meeting saved");
      closeDoc();
      loadTeamMeetings();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

function openNewHealthSafetyCheck() {
  openDoc("New health and safety check", "Residential environment / safety record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Check title</label><input id="hsTitle" class="input" value="Health and safety check">
        <label class="label">Check date</label><input id="hsDate" class="input">
        <label class="label">Area checked</label><input id="hsArea" class="input" placeholder="Kitchen / fire exits / bedrooms / garden">
        <label class="label">Findings</label><textarea id="hsFindings" class="textarea"></textarea>
        <label class="label">Actions required</label><textarea id="hsActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="createHsBtn" class="btn primary">Save check</button>
      </aside>
    </div>
  `);

  $("createHsBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "health_safety",
          title: val("hsTitle"),
          check_date: val("hsDate"),
          area_checked: val("hsArea"),
          summary: val("hsFindings"),
          actions: val("hsActions")
        })
      });
      msg("Health and safety check saved");
      closeDoc();
      loadHealthSafetyChecks();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   PATCH EXISTING LOADTAB
========================= */

const _oldLoadTab = loadTab;
loadTab = function () {
  if (!state.selected && state.section === "young-people") return;

  if (state.section === "staff") {
    const staffTab = state.tab || "staff-home";
    ({
      "staff-home": loadStaffHome,
      supervision: loadSupervision,
      "team-meetings": loadTeamMeetings,
      "health-safety": loadHealthSafetyChecks
    }[staffTab] || loadStaffHome)();
    return;
  }

  if (state.section === "young-people" && state.tab === "archive") {
    renderPersonHeader();
    loadArchive();
    return;
  }

  _oldLoadTab();
};

/* =========================
   PART 4 — SMART ACTIONS
========================= */

function openSimpleInfo(title, meta, fields = {}) {
  openDoc(title, meta, `
    <div class="card">
      <div class="list">
        ${Object.entries(fields).map(([k, v]) => `
          <div class="row-card">
            <div class="row-title">${esc(k)}</div>
            <div>${esc(v ?? "—")}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `);
}

function wireCommandCentreCards() {
  $$(".cc-open").forEach(el => {
    el.onclick = () => {
      const kind = el.dataset.kind;
      const data = JSON.parse(el.dataset.payload || "{}");

      if (kind === "alert") {
        if (/missing/i.test(data.title || "")) return openNewIncidentWithType("Missing from placement");
        if (/risk/i.test(data.title || "")) {
          setSection("young-people");
          return setTab("plans");
        }
        return openSimpleInfo("Alert", "Command Centre alert", data);
      }

      if (kind === "task") {
        if (/health/i.test(data.title || "")) {
          setSection("young-people");
          setTab("health");
          return openNewHealthRecord();
        }
        if (/incident/i.test(data.title || "")) {
          setSection("young-people");
          return setTab("incidents");
        }
        return openSimpleInfo("Task", "Command Centre task", data);
      }

      if (kind === "med") {
        setSection("young-people");
        setTab("health");
        return openSimpleInfo("Medication due", "Health / medication prompt", data);
      }

      if (kind === "handover") {
        setSection("handover");
        return openSimpleInfo(data.title || "Handover item", "Shift handover", data);
      }

      openSimpleInfo("Command Centre item", kind, data);
    };
  });
}

const _oldLoadCommandCentre = loadCommandCentre;
loadCommandCentre = async function () {
  await _oldLoadCommandCentre();
  wireCommandCentreCards();
};

/* =========================
   PART 4 — ARCHIVE HELPERS
========================= */

function addArchiveButton(buttonId, endpoint, successMessage, afterFn) {
  const btn = $(buttonId);
  if (!btn) return;
  btn.onclick = async () => {
    await api(endpoint, { method: "POST" });
    msg(successMessage);
    closeDoc();
    afterFn?.();
    if (state.tab === "archive") loadArchive();
  };
};

/* =========================
   PART 4 — INCIDENT HELPERS
========================= */

function openNewIncidentWithType(typeValue = "Other") {
  openNewIncident();
  requestAnimationFrame(() => {
    const el = $("newIncType");
    if (el) el.value = typeValue;
  });
}

const _oldOpenIncident = openIncident;
openIncident = async function (id) {
  await _oldOpenIncident(id);

  const aside = document.querySelector("#documentMode .doc-side");
  if (!aside) return;

  const extra = document.createElement("div");
  extra.className = "badges";
  extra.innerHTML = `
    <button id="openPhysicalInterventionBtn" class="btn">Physical intervention</button>
    <button id="openBodyMapBtn" class="btn">Body map</button>
  `;
  aside.appendChild(extra);

  $("openPhysicalInterventionBtn").onclick = () => openPhysicalIntervention(id);
  $("openBodyMapBtn").onclick = () => openBodyMap(id);

  addArchiveButton("archiveIncBtn", `/young-people/incidents/${id}/archive`, "Incident archived", () => {
    loadIncidents();
    loadArchive();
  });
};

const _oldOpenNewIncident = openNewIncident;
openNewIncident = function () {
  _oldOpenNewIncident();

  const aside = document.querySelector("#documentMode .doc-side");
  if (!aside) return;

  const block = document.createElement("div");
  block.className = "badges";
  block.innerHTML = `
    <button id="newPhysicalInterventionBtn" class="btn">Physical intervention form</button>
    <button id="newBodyMapBtn" class="btn">Body map form</button>
  `;
  aside.appendChild(block);

  $("newPhysicalInterventionBtn").onclick = () => openPhysicalIntervention();
  $("newBodyMapBtn").onclick = () => openBodyMap();
};

function openPhysicalIntervention(incidentId = null) {
  openDoc("Physical intervention form", incidentId ? `Linked to incident ${incidentId}` : "Standalone record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Date and time</label>
        <input id="piDateTime" class="input">
        <label class="label">Type of intervention</label>
        <input id="piType" class="input" placeholder="Single person hold / guiding / breakaway">
        <label class="label">Reason intervention was required</label>
        <textarea id="piReason" class="textarea"></textarea>
        <label class="label">De-escalation tried first</label>
        <textarea id="piDeEsc" class="textarea"></textarea>
        <label class="label">Duration</label>
        <input id="piDuration" class="input" placeholder="e.g. 2 minutes">
        <label class="label">Young person presentation after intervention</label>
        <textarea id="piOutcome" class="textarea"></textarea>
        <label class="label">Staff involved</label>
        <textarea id="piStaff" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="savePiBtn" class="btn primary">Save form</button>
      </aside>
    </div>
  `);

  $("savePiBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "physical_intervention",
          incident_id: incidentId,
          title: "Physical intervention form",
          event_datetime: val("piDateTime"),
          intervention_type: val("piType"),
          reason: val("piReason"),
          de_escalation_attempted: val("piDeEsc"),
          duration: val("piDuration"),
          outcome: val("piOutcome"),
          staff_involved: val("piStaff"),
          summary: val("piReason")
        })
      });
      msg("Physical intervention form saved");
      closeDoc();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

function openBodyMap(incidentId = null) {
  openDoc("Body map form", incidentId ? `Linked to incident ${incidentId}` : "Standalone record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Date and time</label>
        <input id="bmDateTime" class="input">
        <label class="label">Observed marks / injuries</label>
        <textarea id="bmObserved" class="textarea"></textarea>
        <label class="label">Location on body</label>
        <textarea id="bmLocation" class="textarea" placeholder="e.g. left forearm, right shoulder"></textarea>
        <label class="label">Young person explanation</label>
        <textarea id="bmVoice" class="textarea"></textarea>
        <label class="label">Immediate action taken</label>
        <textarea id="bmAction" class="textarea"></textarea>
        <label class="label">Professional / manager informed</label>
        <textarea id="bmInformed" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="saveBmBtn" class="btn primary">Save body map</button>
      </aside>
    </div>
  `);

  $("saveBmBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "body_map",
          incident_id: incidentId,
          title: "Body map form",
          event_datetime: val("bmDateTime"),
          observed_marks: val("bmObserved"),
          body_location: val("bmLocation"),
          child_voice: val("bmVoice"),
          action_taken: val("bmAction"),
          informed: val("bmInformed"),
          summary: val("bmObserved")
        })
      });
      msg("Body map saved");
      closeDoc();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   PART 4 — DAILY NOTE / KEYWORK / PLAN ARCHIVE
========================= */

const _oldOpenDailyNote = openDailyNote;
openDailyNote = async function (id) {
  await _oldOpenDailyNote(id);
  addArchiveButton("archiveDnBtn", `/young-people/daily-notes/${id}/archive`, "Daily note archived", () => {
    loadDailyNotes();
    loadArchive();
  });
};

const _oldOpenKeywork = openKeywork;
openKeywork = async function (id) {
  await _oldOpenKeywork(id);
  addArchiveButton("archiveKwBtn", `/young-people/keywork/${id}/archive`, "Key work archived", () => {
    loadKeywork();
    loadArchive();
  });
};

const _oldOpenPlan = openPlan;
openPlan = async function (id) {
  await _oldOpenPlan(id);

  const aside = document.querySelector("#documentMode .doc-side");
  if (!aside || $("archivePlanBtn")) return;

  const btn = document.createElement("button");
  btn.id = "archivePlanBtn";
  btn.className = "btn";
  btn.textContent = "Archive";
  aside.appendChild(btn);

  btn.onclick = async () => {
    await api(`/young-people/plans/${id}/archive`, { method: "POST" });
    msg("Plan archived");
    closeDoc();
    loadPlans();
    loadArchive();
  };
};

/* =========================
   PART 4 — HEALTH & SAFETY DAILY CHECK
========================= */

function openDailyHealthSafetyChecklist() {
  openDoc("Daily health and safety checklist", "Residential environment daily check", `
    <div class="doc-grid">
      <section class="card">
        <label class="pill"><input type="checkbox" id="hsFireExits"> Fire exits clear</label>
        <label class="pill"><input type="checkbox" id="hsKitchen"> Kitchen safe and checked</label>
        <label class="pill"><input type="checkbox" id="hsMed"> Medication storage checked</label>
        <label class="pill"><input type="checkbox" id="hsBedrooms"> Bedrooms / communal areas safe</label>
        <label class="pill"><input type="checkbox" id="hsGarden"> Garden / outside space checked</label>
        <label class="pill"><input type="checkbox" id="hsHazards"> No unaddressed hazards identified</label>
        <label class="label">Issues identified</label>
        <textarea id="hsIssues" class="textarea"></textarea>
        <label class="label">Actions taken</label>
        <textarea id="hsActionsDaily" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="saveDailyHsBtn" class="btn primary">Save checklist</button>
      </aside>
    </div>
  `);

  $("saveDailyHsBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "health_safety_daily_check",
          title: "Daily health and safety checklist",
          fire_exits_clear: chk("hsFireExits"),
          kitchen_checked: chk("hsKitchen"),
          medication_storage_checked: chk("hsMed"),
          bedrooms_checked: chk("hsBedrooms"),
          garden_checked: chk("hsGarden"),
          no_unaddressed_hazards: chk("hsHazards"),
          issues_identified: val("hsIssues"),
          actions: val("hsActionsDaily"),
          summary: val("hsIssues") || "Daily health and safety checklist completed"
        })
      });
      msg("Daily checklist saved");
      closeDoc();
      loadHealthSafetyChecks();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   PART 4 — QUICK MENU EXTENSION
========================= */

const _oldBindQuickMenu = bindQuickMenu;
bindQuickMenu = function () {
  _oldBindQuickMenu();

  $("quickDailyHsCheck")?.addEventListener("click", () => {
    toggleQuickMenu(false);
    setSection("staff");
    setTab("health-safety");
    openDailyHealthSafetyChecklist();
  });
};

/* =========================
   PART 5 — USER + HANDOVER + EXTRA FORMS
========================= */

/* =========================
   REAL USER NAME (if backend exists)
========================= */

async function loadCurrentUser() {
  try {
    const u = await api("/me");
    const name = u.first_name || u.name || "team";
    setWelcome(name);
  } catch {
    setWelcome("team");
  }
}

/* =========================
   HANDOVER BUILDER
========================= */

function openNewHandover() {
  openDoc("New handover entry", "Shift handover", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Time</label>
        <input id="hoTime" class="input">
        <label class="label">Title</label>
        <input id="hoTitle" class="input">
        <label class="label">Details</label>
        <textarea id="hoDetails" class="textarea"></textarea>
        <label class="label">Priority</label>
        <select id="hoPriority" class="input">
          <option>low</option>
          <option>medium</option>
          <option>high</option>
        </select>
      </section>
      <aside class="card doc-side">
        <button id="createHandoverBtn" class="btn primary">Add to handover</button>
      </aside>
    </div>
  `);

  $("createHandoverBtn").onclick = async () => {
    try {
      await api(`/handover`, {
        method: "POST",
        body: JSON.stringify({
          time: val("hoTime"),
          title: val("hoTitle"),
          detail: val("hoDetails"),
          priority: val("hoPriority")
        })
      });
      msg("Added to handover");
      closeDoc();
      loadCommandCentre();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   MISSING FROM CARE FOLLOW-UP
========================= */

function openMissingFromCareFollowUp() {
  openDoc("Missing from care follow-up", "Return home interview / follow-up", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Date returned</label>
        <input id="mfcDate" class="input">
        <label class="label">Where they were</label>
        <textarea id="mfcWhere" class="textarea"></textarea>
        <label class="label">Who they were with</label>
        <textarea id="mfcWho" class="textarea"></textarea>
        <label class="label">Child voice</label>
        <textarea id="mfcVoice" class="textarea"></textarea>
        <label class="label">Risks identified</label>
        <textarea id="mfcRisks" class="textarea"></textarea>
        <label class="label">Actions taken</label>
        <textarea id="mfcActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="saveMfcBtn" class="btn primary">Save follow-up</button>
      </aside>
    </div>
  `);

  $("saveMfcBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "missing_from_care",
          title: "Missing from care follow-up",
          return_date: val("mfcDate"),
          where_was_child: val("mfcWhere"),
          who_with: val("mfcWho"),
          child_voice: val("mfcVoice"),
          risks: val("mfcRisks"),
          actions: val("mfcActions"),
          summary: val("mfcRisks")
        })
      });
      msg("Follow-up saved");
      closeDoc();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   FIRE DRILL RECORD
========================= */

function openFireDrillForm() {
  openDoc("Fire drill record", "Health & safety compliance", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Date</label>
        <input id="fdDate" class="input">
        <label class="label">Time</label>
        <input id="fdTime" class="input">
        <label class="label">Staff involved</label>
        <textarea id="fdStaff" class="textarea"></textarea>
        <label class="label">Young people present</label>
        <textarea id="fdYP" class="textarea"></textarea>
        <label class="label">Outcome</label>
        <textarea id="fdOutcome" class="textarea"></textarea>
        <label class="label">Issues identified</label>
        <textarea id="fdIssues" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="saveFdBtn" class="btn primary">Save fire drill</button>
      </aside>
    </div>
  `);

  $("saveFdBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "fire_drill",
          title: "Fire drill record",
          date: val("fdDate"),
          time: val("fdTime"),
          staff: val("fdStaff"),
          young_people: val("fdYP"),
          outcome: val("fdOutcome"),
          issues: val("fdIssues"),
          summary: val("fdOutcome")
        })
      });
      msg("Fire drill saved");
      closeDoc();
      loadHealthSafetyChecks();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   MEDICATION AUDIT
========================= */

function openMedicationAudit() {
  openDoc("Medication audit", "Medication compliance check", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Date</label>
        <input id="maDate" class="input">
        <label class="label">Medication checked</label>
        <textarea id="maMeds" class="textarea"></textarea>
        <label class="label">Issues identified</label>
        <textarea id="maIssues" class="textarea"></textarea>
        <label class="label">Actions taken</label>
        <textarea id="maActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="saveMaBtn" class="btn primary">Save audit</button>
      </aside>
    </div>
  `);

  $("saveMaBtn").onclick = async () => {
    try {
      await api(`/documents`, {
        method: "POST",
        body: JSON.stringify({
          category: "medication_audit",
          title: "Medication audit",
          date: val("maDate"),
          medications_checked: val("maMeds"),
          issues: val("maIssues"),
          actions: val("maActions"),
          summary: val("maIssues")
        })
      });
      msg("Medication audit saved");
      closeDoc();
      loadHealthSafetyChecks();
    } catch (e) {
      msg(e.message, true);
    }
  };
}

/* =========================
   EXTEND QUICK MENU
========================= */

const _oldBindQuickMenu2 = bindQuickMenu;
bindQuickMenu = function () {
  _oldBindQuickMenu2();

  $("quickHandover")?.onclick = () => {
    toggleQuickMenu(false);
    openNewHandover();
  };

  $("quickMissing")?.onclick = () => {
    toggleQuickMenu(false);
    openMissingFromCareFollowUp();
  };

  $("quickFireDrill")?.onclick = () => {
    toggleQuickMenu(false);
    openFireDrillForm();
  };

  $("quickMedAudit")?.onclick = () => {
    toggleQuickMenu(false);
    openMedicationAudit();
  };
};

/* =========================
   INIT PATCH FINAL
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadCurrentUser();
});
