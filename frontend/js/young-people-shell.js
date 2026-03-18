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
const arr = d =>
  Array.isArray(d) ? d :
  Array.isArray(d?.items) ? d.items :
  Array.isArray(d?.rows) ? d.rows :
  Array.isArray(d?.data) ? d.data : [];

const esc = s => String(s ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

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

function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function msg(text, bad = false) {
  const el = $("statusBar");
  if (!el) return;
  el.classList.remove("hidden");
  el.innerHTML = `<span class="pill ${bad ? "red" : "green"}">${esc(text)}</span>`;
  setTimeout(() => el.classList.add("hidden"), 2500);
}

function pillClass(v) {
  v = String(v || "").toLowerCase();
  if (["high", "critical", "archived", "escalated"].includes(v)) return "red";
  if (["medium", "pending", "submitted", "returned", "awaiting_review"].includes(v)) return "amber";
  if (["approved", "reviewed", "active", "low", "recorded"].includes(v)) return "green";
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
    "manager-qa": ["Manager QA", "Review, oversight and inspection readiness"],
    "staff": ["Staff", "Supervision, meetings and health & safety"]
  };

  setText("pageTitle", titles[section]?.[0] || "IndiCare");
  setText("pageSubtitle", titles[section]?.[1] || "");

  if (section === "command-centre") loadCommandCentre();
  if (section === "young-people") {
    if (["staff-home", "supervision", "team-meetings", "health-safety"].includes(state.tab)) state.tab = "overview";
    loadTab();
  }
  if (section === "handover") renderHandover();
  if (section === "manager-qa") loadReviews();
  if (section === "staff") {
    if (!["staff-home", "supervision", "team-meetings", "health-safety"].includes(state.tab)) state.tab = "staff-home";
    loadTab();
  }
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

async function loadYoungPeople() {
  try {
    const rows = arr(await api("/young-people/"));
    state.youngPeople = rows;

    const select = $("youngPersonSelect");
    if (!select) return;

    if (!rows.length) {
      select.innerHTML = `<option>No young people</option>`;
      return;
    }

    select.innerHTML = rows.map(p => `
      <option value="${p.id}">${esc(fullName(p))}</option>
    `).join("");

    state.selected = rows[0];
    renderPersonHeader();
    loadTab();
  } catch (e) {
    msg("Failed to load young people", true);
    console.error(e);
  }
}

async function loadCommandCentre() {
  try {
    const d = await api("/command-centre");
    state.commandCentre = d;
    const m = d.summary || d.metrics || {};

    const metrics = [
      ["Children in home", m.children_in_home ?? 0],
      ["High-risk alerts", (d.alerts || []).filter(x => String(x.level || "").toLowerCase() === "high").length],
      ["Open safeguarding", m.open_safeguarding_items ?? 0],
      ["Meds due", (d.meds_due || []).length],
      ["Overdue reviews", m.overdue_reviews ?? 0],
      ["Documents due", m.documents_due ?? 0]
    ];

    setHTML("commandCentreMetrics", metrics.map(([k, v]) => `
      <div class="metric-card">
        <div class="metric-label">${esc(k)}</div>
        <div class="metric-value">${esc(v)}</div>
      </div>
    `).join(""));

    const renderRows = (rows, fn, empty) => `
      <div class="list">${rows.length ? rows.map(fn).join("") : `<div class="muted">${empty}</div>`}</div>
    `;

    setHTML("commandCentreAlerts", renderRows(d.alerts || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.title)}</div>
        <div class="row-meta">${esc(r.young_person_name || "—")}</div>
        <div>${esc(r.detail || "")}</div>
        <div class="badges"><span class="pill ${pillClass(r.level)}">${esc(r.level || "info")}</span></div>
      </div>
    `, "No live alerts."));

    setHTML("commandCentreTasks", renderRows(d.tasks || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.title)}</div>
        <div class="row-meta">Due: ${esc(r.due || "—")}</div>
        <div>${esc(r.young_person_name || "")}</div>
      </div>
    `, "No outstanding shift tasks."));

    setHTML("commandCentreMeds", renderRows(d.meds_due || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.young_person_name || "Young person")}</div>
        <div class="row-meta">${esc(r.item || r.medicine || "Medication")} · Due ${esc(r.time_due || "—")}</div>
        <div class="badges"><span class="pill ${pillClass(r.status)}">${esc(r.status || "due")}</span></div>
      </div>
    `, "No medication due."));

    const handoverRows = arr(d.handover);
    setHTML("commandCentreHandover", renderRows(handoverRows, r => `
      <div class="row-card">
        <div class="row-title">${esc(r.time || "—")} · ${esc(r.title || "Handover item")}</div>
        <div>${esc(r.detail || r.summary || "")}</div>
      </div>
    `, "No handover items."));
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
            <div class="row-title">Daily note</div>
            <div class="row-meta">${fmtDateTime(r.note_date || r.created_at)} · ${esc(r.shift_type || "shift")}</div>
            <div>${esc(r.positives || r.presentation || r.behaviour_update || "Daily note recorded")}</div>
            <div class="badges"><span class="pill ${pillClass(r.workflow_status)}">${esc(r.workflow_status || "draft")}</span></div>
          </div>
        `).join("")
      }</div>` : emptyCard("No daily notes found.")}
    `);

    $("newDailyNoteBtn").onclick = openNewDailyNote;
    $$(".open-dn").forEach(el => el.onclick = () => openDailyNote(Number(el.dataset.id)));
  } catch {
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
    const profile = arr(d.health_profile)[0] || d.health_profile || {};
    const rows = arr(d.health_records);

    setHTML("healthContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div><strong>GP:</strong> ${esc(profile.gp_name || "—")} · <strong>Allergies:</strong> ${esc(profile.allergies || "—")} · <strong>Diagnoses:</strong> ${esc(profile.diagnoses || "—")}</div>
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title || r.record_type || "Health record")}</div>
            <div class="row-meta">${fmtDateTime(r.event_datetime || r.created_at)} · ${esc(r.professional_name || "—")}</div>
            <div>${esc(r.summary || r.outcome || "Health record")}</div>
          </div>
        `).join("")
      }</div>` : emptyCard("No health records found.")}
    `);
  } catch {
    setHTML("healthContent", emptyCard("Health failed to load."));
  }
}

async function loadEducation() {
  if (!state.selected) return;
  try {
    const d = await api(`/young-people/${state.selected.id}/education`);
    const profile = arr(d.education_profile)[0] || d.education_profile || {};
    const rows = arr(d.education_records);

    setHTML("educationContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div><strong>School:</strong> ${esc(profile.school_name || "—")} · <strong>Year group:</strong> ${esc(profile.year_group || "—")} · <strong>Status:</strong> ${esc(profile.education_status || "—")}</div>
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.provision_name || "Education record")}</div>
            <div class="row-meta">${fmtDate(r.record_date || r.created_at)} · ${esc(r.attendance_status || "—")}</div>
            <div>${esc(r.achievement_note || r.behaviour_summary || r.learning_engagement || "Education update")}</div>
          </div>
        `).join("")
      }</div>` : emptyCard("No education records found.")}
    `);
  } catch {
    setHTML("educationContent", emptyCard("Education failed to load."));
  }
}

async function loadFamily() {
  if (!state.selected) return;
  try {
    const d = await api(`/young-people/${state.selected.id}/family`);
    const contacts = arr(d.contacts);
    const rows = arr(d.family_contact_records);

    setHTML("familyContent", `
      <div class="grid two-col">
        <div class="card">
          <h3 class="card-title">Contacts</h3>
          ${contacts.length ? `<div class="list">${
            contacts.map(r => `
              <div class="row-card">
                <div class="row-title">${esc(r.full_name || "Contact")}</div>
                <div class="row-meta">${esc(r.relationship_to_child || "—")} · Approved: ${r.is_approved_contact ? "Yes" : "No"}</div>
                <div>${esc(r.phone_number || r.email || r.contact_notes || "")}</div>
              </div>
            `).join("")
          }</div>` : emptyCard("No contacts found.")}
        </div>
        <div class="card">
          <h3 class="card-title">Contact records</h3>
          ${rows.length ? `<div class="list">${
            rows.map(r => `
              <div class="row-card">
                <div class="row-title">${esc(r.contact_person || "Family contact")}</div>
                <div class="row-meta">${fmtDateTime(r.contact_datetime || r.created_at)} · ${esc(r.contact_type || "contact")}</div>
                <div>${esc(r.child_voice || r.post_contact_presentation || r.concerns || "Family contact recorded")}</div>
              </div>
            `).join("")
          }</div>` : emptyCard("No family contact records found.")}
        </div>
      </div>
    `);
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
        </div>
      </div>
      ${rows.length ? `<div class="list">${
        rows.map(r => `
          <div class="row-card open-kw" data-id="${r.id}">
            <div class="row-title">${esc(r.topic || "Key work session")}</div>
            <div class="row-meta">${fmtDate(r.session_date || r.created_at)}</div>
            <div>${esc(r.summary || r.child_voice || r.reflective_analysis || "Key work session recorded")}</div>
            <div class="badges"><span class="pill ${pillClass(r.status || r.workflow_status)}">${esc(r.status || r.workflow_status || "draft")}</span></div>
          </div>
        `).join("")
      }</div>` : emptyCard("No key work found.")}
    `);

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
            <div class="row-meta">${esc(r.plan_type || "Plan")} · Status: ${esc(r.status || "draft")}</div>
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

async function loadArchive() {
  if (!state.selected) return;
  try {
    const [daily, incidents, plans, keywork] = await Promise.all([
      api(`/young-people/${state.selected.id}/daily-notes/archive`).catch(() => ({ items: [] })),
      api(`/young-people/${state.selected.id}/incidents/archive`).catch(() => ({ items: [] })),
      api(`/young-people/${state.selected.id}/plans/archive`).catch(() => ({ items: [] })),
      api(`/young-people/${state.selected.id}/keywork/archive`).catch(() => ({ items: [] }))
    ]);

    const items = [
      ...arr(daily).map(x => ({ ...x, kind: "Daily note", title: x.title || "Daily note", meta: x.note_date || x.created_at })),
      ...arr(incidents).map(x => ({ ...x, kind: "Incident", title: x.title || x.incident_type || "Incident", meta: x.occurred_at || x.incident_datetime || x.created_at })),
      ...arr(plans).map(x => ({ ...x, kind: "Plan", title: x.title || "Plan", meta: x.updated_at || x.created_at })),
      ...arr(keywork).map(x => ({ ...x, kind: "Key work", title: x.topic || "Key work", meta: x.session_date || x.created_at }))
    ].sort((a, b) => new Date(b.meta || 0) - new Date(a.meta || 0));

    setHTML("archiveContent", items.length ? `
      <div class="list">
        ${items.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title)}</div>
            <div class="row-meta">${esc(r.kind)} · ${esc(fmtDateTime(r.meta))}</div>
            <div>${esc(r.summary || r.description || r.child_voice || r.positives || "Archived record")}</div>
            <div class="badges">
              <span class="pill red">Archived</span>
              <span class="pill blue">Viewable</span>
            </div>
          </div>
        `).join("")}
      </div>
    ` : emptyCard("No archived records found."));
  } catch {
    setHTML("archiveContent", emptyCard("Archive failed to load."));
  }
}

async function loadStaffHome() {
  setHTML("staffHomeContent", `
    <div class="grid two-col">
      <div class="card">
        <h3 class="card-title">Staff workspace</h3>
        <div class="list">
          <div class="row-card"><div class="row-title">Supervision</div><div>Reflective supervision and support.</div></div>
          <div class="row-card"><div class="row-title">Team meetings</div><div>Minutes, actions and follow-up.</div></div>
          <div class="row-card"><div class="row-title">Health and safety</div><div>Checks, audits and environment records.</div></div>
        </div>
      </div>
    </div>
  `);
}

async function loadSupervision() {
  try {
    const rows = arr(await api("/supervision"));
    setHTML("supervisionContent", rows.length ? `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card">
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
    const rows = arr(await api("/documents?category=team_meeting"));
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
    const rows = arr(await api("/documents?category=health_safety"));
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
      </aside>
    </div>
  `);

  $("savePlanBtn").onclick = async () => {
    await api(`/young-people/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: val("planTitle"),
        summary: val("planSummary"),
        child_voice: val("planVoice"),
        staff_guidance: val("planStaff"),
        formulation: val("planForm")
      })
    });
    msg("Plan saved");
    loadPlans();
    openPlan(id);
  };

  $("submitPlanBtn").onclick = async () => {
    await api(`/young-people/plans/${id}/submit`, { method: "POST" });
    msg("Plan submitted");
    loadPlans();
    openPlan(id);
  };

  $("approvePlanBtn").onclick = async () => {
    await api(`/young-people/plans/${id}/approve`, { method: "POST" });
    msg("Plan approved");
    loadPlans();
    openPlan(id);
  };
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
    const res = await api(`/young-people/plans`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        title: val("newPlanTitle"),
        summary: val("newPlanSummary"),
        child_voice: val("newPlanVoice"),
        staff_guidance: val("newPlanStaff"),
        formulation: val("newPlanForm")
      })
    });
    msg("Plan created");
    loadPlans();
    openPlan(res.id);
  };
}

async function openDailyNote(id) {
  const r = await api(`/young-people/daily-notes/${id}`);
  openDoc("Daily note", `${fmtDateTime(r.note_date || r.created_at)} · ${r.workflow_status || "draft"}`, `
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
        <button id="saveDnBtn" class="btn primary">Save</button>
      </aside>
    </div>
  `);

  $("saveDnBtn").onclick = async () => {
    await api(`/young-people/daily-notes/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        note_date: val("dnDate"),
        shift_type: val("dnShift"),
        mood: val("dnMood"),
        presentation: val("dnPresentation"),
        activities: val("dnActivities"),
        education_update: val("dnEducation"),
        health_update: val("dnHealth"),
        family_update: val("dnFamily"),
        behaviour_update: val("dnBehaviour"),
        young_person_voice: val("dnVoice"),
        positives: val("dnPositives"),
        actions_required: val("dnActions")
      })
    });
    msg("Daily note saved");
    loadDailyNotes();
    openDailyNote(id);
  };
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
    const res = await api(`/young-people/daily-notes`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        note_date: val("newDnDate"),
        shift_type: val("newDnShift"),
        mood: val("newDnMood"),
        presentation: val("newDnPresentation"),
        activities: val("newDnActivities"),
        education_update: val("newDnEducation"),
        health_update: val("newDnHealth"),
        family_update: val("newDnFamily"),
        behaviour_update: val("newDnBehaviour"),
        young_person_voice: val("newDnVoice"),
        positives: val("newDnPositives"),
        actions_required: val("newDnActions")
      })
    });
    msg("Daily note created");
    loadDailyNotes();
    openDailyNote(res.id);
  };
}

async function openIncident(id) {
  const r = await api(`/young-people/incidents/${id}`);
  openDoc(r.title || "Incident", `${fmtDateTime(r.occurred_at || r.created_at)} · ${r.workflow_status || "pending"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Incident type</label><input id="incType" class="input" value="${esc(r.incident_type || "")}">
        <label class="label">Occurred at</label><input id="incOccurred" class="input" value="${esc(r.occurred_at || r.incident_datetime || "")}">
        <label class="label">Location</label><input id="incLocation" class="input" value="${esc(r.location || "")}">
        <label class="label">Description</label><textarea id="incDescription" class="textarea">${esc(r.description || r.narrative || "")}</textarea>
        <label class="label">Outcome / follow-up</label><textarea id="incOutcome" class="textarea">${esc(r.outcome || r.follow_up_required || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <label class="label">Severity</label>
        <select id="incSeverity" class="input">
          ${["low", "medium", "high", "critical"].map(x => `<option value="${x}" ${String(r.severity || "medium") === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <button id="saveIncBtn" class="btn primary">Save</button>
      </aside>
    </div>
  `);

  $("saveIncBtn").onclick = async () => {
    await api(`/young-people/incidents/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        incident_type: val("incType"),
        occurred_at: val("incOccurred"),
        location: val("incLocation"),
        narrative: val("incDescription"),
        outcome: val("incOutcome"),
        severity: val("incSeverity")
      })
    });
    msg("Incident saved");
    loadIncidents();
    openIncident(id);
  };
}

function openNewIncident() {
  openDoc("New incident", "Create incident", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Incident type</label><input id="newIncType" class="input">
        <label class="label">Occurred at</label><input id="newIncOccurred" class="input">
        <label class="label">Location</label><input id="newIncLocation" class="input">
        <label class="label">Description</label><textarea id="newIncDescription" class="textarea"></textarea>
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
    const res = await api(`/young-people/incidents`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        incident_type: val("newIncType"),
        occurred_at: val("newIncOccurred"),
        location: val("newIncLocation"),
        narrative: val("newIncDescription"),
        outcome: val("newIncOutcome"),
        severity: val("newIncSeverity")
      })
    });
    msg("Incident created");
    loadIncidents();
    openIncident(res.id);
  };
}

async function openKeywork(id) {
  const r = await api(`/young-people/keywork/${id}`);
  openDoc(r.topic || "Key work session", `${fmtDate(r.session_date || r.created_at)} · ${r.status || "draft"}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Session date</label><input id="kwDate" class="input" value="${esc(r.session_date || "")}">
        <label class="label">Topic</label><input id="kwTopic" class="input" value="${esc(r.topic || "")}">
        <label class="label">Purpose</label><textarea id="kwPurpose" class="textarea">${esc(r.purpose || "")}</textarea>
        <label class="label">Summary</label><textarea id="kwSummary" class="textarea">${esc(r.summary || "")}</textarea>
        <label class="label">Child voice</label><textarea id="kwVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
        <label class="label">Reflective analysis</label><textarea id="kwReflective" class="textarea">${esc(r.reflective_analysis || "")}</textarea>
        <label class="label">Actions agreed</label><textarea id="kwActions" class="textarea">${esc(r.actions_agreed || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <button id="saveKwBtn" class="btn primary">Save</button>
      </aside>
    </div>
  `);

  $("saveKwBtn").onclick = async () => {
    await api(`/young-people/keywork/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        session_date: val("kwDate"),
        topic: val("kwTopic"),
        purpose: val("kwPurpose"),
        summary: val("kwSummary"),
        child_voice: val("kwVoice"),
        reflective_analysis: val("kwReflective"),
        actions_agreed: val("kwActions")
      })
    });
    msg("Key work saved");
    loadKeywork();
    openKeywork(id);
  };
}

async function openReview(id) {
  const r = await api(`/workflow-reviews/${id}`);
  openDoc(`${r.record_type} review`, `${r.young_person_name || "—"} · ${r.status}`, `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Manager decision note</label>
        <textarea id="reviewNote" class="textarea">${esc(r.review_note || "")}</textarea>
      </section>
      <aside class="card doc-side">
        <button id="approveReviewBtn" class="btn primary">Approve</button>
        <button id="returnReviewBtn" class="btn">Return</button>
        <button id="escalateReviewBtn" class="btn">Escalate</button>
      </aside>
    </div>
  `);

  const decide = async decision => {
    await api(`/workflow-reviews/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        review_note: val("reviewNote")
      })
    });
    msg(`Review ${decision}`);
    loadReviews();
    openReview(id);
  };

  $("approveReviewBtn").onclick = () => decide("approved");
  $("returnReviewBtn").onclick = () => decide("returned");
  $("escalateReviewBtn").onclick = () => decide("escalated");
}

function loadTab() {
  if (state.section === "staff") {
    ({
      "staff-home": loadStaffHome,
      supervision: loadSupervision,
      "team-meetings": loadTeamMeetings,
      "health-safety": loadHealthSafetyChecks
    }[state.tab] || loadStaffHome)();
    return;
  }

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
    reviews: loadReviews,
    archive: loadArchive
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
