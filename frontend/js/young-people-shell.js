const state = {
  section: "command-centre",
  tab: "overview",
  youngPeople: [],
  selected: null,
  commandCentre: null,
  timelineCategory: "",
  inspectionPack: null,
};

const ROUTES = {
  dailyNotes: (id) => `/young-people/${id}/daily-notes`,
  incidents: (id) => `/young-people/${id}/incidents`,
  health: (id) => `/young-people/${id}/health`,
  education: (id) => `/young-people/${id}/education`,
  family: (id) => `/young-people/${id}/family`,
  keywork: (id) => `/young-people/${id}/keywork`,
  plans: (id) => `/young-people/${id}/plans`,
  chronology: (id) => `/young-people/${id}/chronology`,
};

const $ = (id) => document.getElementById(id);
const $$ = (s) => [...document.querySelectorAll(s)];
const arr = (d) =>
  Array.isArray(d) ? d :
  Array.isArray(d?.items) ? d.items :
  Array.isArray(d?.rows) ? d.rows :
  Array.isArray(d?.data) ? d.data : [];

const esc = (s) => String(s ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-GB") : "—";
const fmtDateTime = (v) => v ? new Date(v).toLocaleString("en-GB") : "—";
const fullName = (p) => `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || p?.name || "Young person";

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

function val(id) {
  return $(id)?.value ?? "";
}

function checked(id) {
  return !!$(id)?.checked;
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
  if (["high", "critical", "escalated", "archived"].includes(v)) return "red";
  if (["medium", "pending", "submitted", "awaiting_review", "returned"].includes(v)) return "amber";
  if (["approved", "reviewed", "active", "low", "recorded"].includes(v)) return "green";
  return "blue";
}

function emptyCard(text) {
  return `<div class="card"><div class="muted">${esc(text)}</div></div>`;
}

function openDoc(title, meta, bodyHtml) {
  $("browseMode")?.classList.add("hidden");
  $("documentMode")?.classList.remove("hidden");
  setText("docTitle", title || "Document");
  setText("docMetaLine", meta || "—");
  setHTML("docBody", bodyHtml || "");
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

function buildInspectionSummary(chronologyRows = [], reviews = [], plans = []) {
  const standards = {};
  const judgements = {};
  chronologyRows.forEach(r => {
    if (r.linked_standard) standards[r.linked_standard] = (standards[r.linked_standard] || 0) + 1;
    if (r.linked_judgement_area) judgements[r.linked_judgement_area] = (judgements[r.linked_judgement_area] || 0) + 1;
  });
  return {
    chronologyCount: chronologyRows.length,
    reviewCount: reviews.length,
    planCount: plans.length,
    standards,
    judgements
  };
}

function evidenceBadges(row) {
  const out = [];
  if (row.significance) out.push(`<span class="pill ${pillClass(row.significance)}">${esc(row.significance)}</span>`);
  if (row.linked_standard) out.push(`<span class="pill blue">${esc(row.linked_standard.replaceAll("_", " "))}</span>`);
  if (row.linked_judgement_area) out.push(`<span class="pill blue">${esc(row.linked_judgement_area.replaceAll("_", " "))}</span>`);
  if (row.source_table) out.push(`<span class="pill blue">Source: ${esc(row.source_table)}</span>`);
  return out.join("");
}

function renderSimpleRows(rows, config = {}) {
  const {
    title = (r) => r.title || r.name || "Record",
    meta = () => "",
    body = () => "",
    badges = () => "",
    clickableClass = "",
    idField = "id"
  } = config;

  return `
    <div class="list">
      ${rows.length ? rows.map(r => `
        <div class="row-card ${clickableClass}" ${clickableClass ? `data-id="${esc(r[idField])}"` : ""}>
          <div class="row-title">${esc(title(r))}</div>
          ${meta(r) ? `<div class="row-meta">${meta(r)}</div>` : ""}
          ${body(r) ? `<div>${body(r)}</div>` : ""}
          ${badges(r) ? `<div class="badges">${badges(r)}</div>` : ""}
        </div>
      `).join("") : emptyCard("No records found.")}
    </div>
  `;
}

async function loadYoungPeople() {
  try {
    const rows = arr(await api("/young-people"));
    state.youngPeople = rows;
    const select = $("youngPersonSelect");
    if (!select) return;

    if (!rows.length) {
      select.innerHTML = `<option>No young people</option>`;
      setHTML("overviewContent", emptyCard("No young people found."));
      return;
    }

    select.innerHTML = rows.map(p => `<option value="${p.id}">${esc(fullName(p))}</option>`).join("");
    state.selected = rows[0];
    renderPersonHeader();
    loadTab();
  } catch (e) {
    console.error("loadYoungPeople failed", e);
    msg(e.message, true);
    setHTML("overviewContent", emptyCard("Young people failed to load."));
  }
}

function renderPersonHeader() {
  const p = state.selected;
  if (!p) return;

  setText("selectedYoungPersonName", fullName(p));
  setText("selectedYoungPersonMeta", `Placement: ${p.placement_status || "—"} · Legal status: ${p.legal_status || "—"}`);
  setHTML("selectedYoungPersonBadges", `
    <span class="pill ${pillClass(p.summary_risk_level)}">Risk: ${esc(p.summary_risk_level || "—")}</span>
    <span class="pill blue">Home: ${esc(p.home_name || "Main home")}</span>
    <span class="pill blue">Review due: ${esc(p.next_review_due ? fmtDate(p.next_review_due) : "—")}</span>
  `);
}

async function loadCommandCentre() {
  setHTML("commandCentreMetrics", emptyCard("Loading command centre..."));
  setHTML("commandCentreAlerts", emptyCard("Loading alerts..."));
  setHTML("commandCentreTasks", emptyCard("Loading tasks..."));
  setHTML("commandCentreMeds", emptyCard("Loading medication..."));
  setHTML("commandCentreHandover", emptyCard("Loading handover..."));

  try {
    const d = await api("/command-centre");
    state.commandCentre = d;

    const m = d.summary || d.metrics || {};
    const metrics = [
      ["Children in home", m.children_in_home ?? 0],
      ["High-risk alerts", (d.alerts || []).filter(a => String(a.level || "").toLowerCase() === "high").length],
      ["Open safeguarding", m.open_safeguarding_items ?? 0],
      ["Meds due", (d.meds_due || []).length],
      ["Overdue reviews", m.overdue_reviews ?? 0],
      ["Documents due", m.documents_due ?? 0],
    ];

    setHTML("commandCentreMetrics", metrics.map(([k, v]) => `
      <div class="metric-card">
        <div class="metric-label">${esc(k)}</div>
        <div class="metric-value">${esc(v)}</div>
      </div>
    `).join(""));

    setHTML("commandCentreAlerts", renderSimpleRows(d.alerts || [], {
      title: r => r.title,
      meta: r => esc(r.young_person_name || "—"),
      body: r => esc(r.detail || ""),
      badges: r => `<span class="pill ${pillClass(r.level)}">${esc(r.level || "info")}</span><span class="pill blue">Evidence</span>`
    }));

    setHTML("commandCentreTasks", renderSimpleRows(d.tasks || [], {
      title: r => r.title,
      meta: r => `Due: ${esc(r.due || "—")}`,
      body: r => esc(r.young_person_name || "")
    }));

    setHTML("commandCentreMeds", renderSimpleRows(d.meds_due || [], {
      title: r => r.young_person_name || "Young person",
      meta: r => `${esc(r.item || r.medicine || "Medication")} · Due ${esc(r.time_due || "—")}`,
      badges: r => `<span class="pill ${pillClass(r.status)}">${esc(r.status || "due")}</span>`
    }));

    setHTML("commandCentreHandover", renderSimpleRows(arr(d.handover), {
      title: r => `${r.time || "—"} · ${r.title || "Handover item"}`,
      body: r => esc(r.detail || "")
    }));
  } catch (e) {
    console.error("loadCommandCentre failed", e);
    msg(e.message, true);
    setHTML("commandCentreMetrics", emptyCard("Command Centre failed to load."));
    setHTML("commandCentreAlerts", emptyCard("Alerts unavailable."));
    setHTML("commandCentreTasks", emptyCard("Tasks unavailable."));
    setHTML("commandCentreMeds", emptyCard("Medication unavailable."));
    setHTML("commandCentreHandover", emptyCard("Handover unavailable."));
  }
}

async function loadOverview() {
  if (!state.selected) {
    setHTML("overviewContent", emptyCard("No young person selected."));
    return;
  }

  setHTML("overviewContent", emptyCard("Loading overview..."));

  try {
    const [d, chronologyRows, reviewRows, planRows] = await Promise.all([
      api(`/young-people/${state.selected.id}`),
      api(ROUTES.chronology(state.selected.id)).then(arr).catch(() => []),
      api(`/workflow-reviews`).then(arr).catch(() => []),
      api(ROUTES.plans(state.selected.id)).then(arr).catch(() => []),
    ]);

    const inspection = buildInspectionSummary(chronologyRows, reviewRows, planRows);
    state.inspectionPack = inspection;

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
            <div class="row-card"><div class="row-title">Allergies / health alerts</div><div>${esc(d.allergies || d.health_alerts || "None recorded")}</div></div>
            <div class="row-card"><div class="row-title">Family/contact note</div><div>${esc(d.family_contact_summary || "No current summary")}</div></div>
            <div class="row-card"><div class="row-title">What matters to me</div><div>${esc(d.what_matters_to_me || "No current summary")}</div></div>
          </div>
        </div>
      </div>

      <div class="grid two-col" style="margin-top:16px;">
        <div class="card">
          <h3 class="card-title">Inspection readiness</h3>
          <div class="list">
            <div class="row-card"><div class="row-title">Chronology entries</div><div>${esc(inspection.chronologyCount)}</div></div>
            <div class="row-card"><div class="row-title">Plans on file</div><div>${esc(inspection.planCount)}</div></div>
            <div class="row-card"><div class="row-title">Review items</div><div>${esc(inspection.reviewCount)}</div></div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">Evidence coverage</h3>
          <div class="list">
            ${Object.keys(inspection.standards).length ? Object.entries(inspection.standards).map(([k,v]) => `
              <div class="row-card">
                <div class="row-title">${esc(k.replaceAll("_", " "))}</div>
                <div>${esc(v)} linked records</div>
              </div>
            `).join("") : `<div class="row-card"><div class="muted">No standards-linked evidence yet.</div></div>`}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card-title">Inspection pack</h3>
        <div class="badges" style="margin-bottom:12px;">
          <button class="btn" id="exportChronologyBtn">Export chronology</button>
          <button class="btn" id="exportPlansBtn">Export plans</button>
          <button class="btn primary" id="openInspectionPreviewBtn">Open inspection preview</button>
        </div>
      </div>
    `);

    $("exportChronologyBtn").onclick = () => exportChronology();
    $("exportPlansBtn").onclick = () => exportPlans();
    $("openInspectionPreviewBtn").onclick = () => openInspectionPreview(d, chronologyRows, reviewRows, planRows);
  } catch (e) {
    console.error("loadOverview failed", e);
    msg(e.message, true);
    setHTML("overviewContent", emptyCard("Overview failed to load."));
  }
}

async function loadTimeline() {
  if (!state.selected) {
    setHTML("timelineContent", emptyCard("No young person selected."));
    return;
  }

  setHTML("timelineContent", emptyCard("Loading timeline..."));

  try {
    const qs = new URLSearchParams();
    if (state.timelineCategory) qs.set("category", state.timelineCategory);

    const rows = arr(await api(`/young-people/${state.selected.id}/chronology?${qs.toString()}`));

    setHTML("timelineContent", `
      <div class="list">
        ${rows.length ? rows.map(r => `
          <div class="row-card">
            <div class="row-title">${esc(r.title || "Chronology event")}</div>
            <div class="row-meta">${esc(fmtDateTime(r.occurred_at || r.event_datetime))} · ${esc(r.category || "event")} · ${esc(r.subcategory || "—")}</div>
            <div>${esc(r.summary || "No summary recorded.")}</div>
            <div class="badges">
              ${evidenceBadges(r)}
              <button class="btn open-chronology-evidence" data-id="${r.id}" style="padding:7px 10px;">Evidence</button>
            </div>
          </div>
        `).join("") : emptyCard("No chronology recorded yet.")}
      </div>
    `);

    $$(".open-chronology-evidence").forEach(btn => {
      btn.onclick = () => {
        const row = rows.find(x => Number(x.id) === Number(btn.dataset.id));
        if (row) openEvidencePreview(row);
      };
    });
  } catch (e) {
    console.error("loadTimeline failed", e);
    msg(e.message, true);
    setHTML("timelineContent", emptyCard("Timeline failed to load."));
  }
}

async function loadDailyNotes() {
  if (!state.selected) return;
  setHTML("dailyNotesContent", emptyCard("Loading daily notes..."));
  try {
    const rows = arr(await api(ROUTES.dailyNotes(state.selected.id)));
    setHTML("dailyNotesContent", renderSimpleRows(rows, {
      title: r => r.title || "Daily note",
      meta: r => `${fmtDateTime(r.note_date || r.recorded_at || r.created_at)} · ${esc(r.shift_type || "shift")}`,
      body: r => esc(r.summary || r.positives || r.presentation || r.behaviour_update || "Daily note recorded"),
      badges: r => `
        <span class="pill ${pillClass(r.significance || r.workflow_status)}">${esc(r.significance || r.workflow_status || "recorded")}</span>
        <span class="pill ${pillClass(r.workflow_status)}">${esc(r.workflow_status || "draft")}</span>
      `,
      clickableClass: "open-daily-note"
    }));
    $$(".open-daily-note").forEach(el => el.onclick = () => openDailyNote(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadDailyNotes failed", e);
    setHTML("dailyNotesContent", emptyCard("Daily notes failed to load."));
  }
}

async function loadIncidents() {
  if (!state.selected) return;
  setHTML("incidentsContent", emptyCard("Loading incidents..."));
  try {
    const rows = arr(await api(ROUTES.incidents(state.selected.id)));
    setHTML("incidentsContent", renderSimpleRows(rows, {
      title: r => r.title || r.incident_type || "Incident",
      meta: r => `${fmtDateTime(r.occurred_at || r.incident_datetime || r.created_at)} · ${esc(r.location || "—")}`,
      body: r => esc(r.description || r.narrative || r.follow_up_required || "Incident recorded"),
      badges: r => `
        <span class="pill ${pillClass(r.severity || r.risk_level)}">${esc(r.severity || r.risk_level || "medium")}</span>
        <span class="pill ${pillClass(r.manager_review_status || r.workflow_status)}">${esc(r.manager_review_status || r.workflow_status || "pending")}</span>
      `,
      clickableClass: "open-incident"
    }));
    $$(".open-incident").forEach(el => el.onclick = () => openIncident(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadIncidents failed", e);
    setHTML("incidentsContent", emptyCard("Incidents failed to load."));
  }
}

async function loadHealth() {
  if (!state.selected) return;
  setHTML("healthContent", emptyCard("Loading health..."));
  try {
    const data = await api(ROUTES.health(state.selected.id));
    const rows = arr(data.health_records || data.items);
    const profile = data.profile || data.health_profile || {};
    setHTML("healthContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div>
            <strong>GP:</strong> ${esc(profile.gp_name || "—")} ·
            <strong>Allergies:</strong> ${esc(profile.allergies || "—")} ·
            <strong>Diagnoses:</strong> ${esc(profile.diagnoses || "—")}
          </div>
          <div class="badges">
            <button class="btn" id="editHealthProfileBtn">Edit profile</button>
            <button class="btn primary" id="newHealthRecordBtn">New health record</button>
          </div>
        </div>
      </div>
      ${renderSimpleRows(rows, {
        title: r => r.title || r.record_type || "Health record",
        meta: r => `${fmtDateTime(r.event_datetime || r.occurred_at || r.created_at)} · ${esc(r.professional_name || "—")}`,
        body: r => esc(r.summary || r.outcome || "Health record"),
        badges: r => r.follow_up_required ? `<span class="pill amber">Follow-up required</span>` : `<span class="pill green">Recorded</span>`,
        clickableClass: "open-health-record"
      })}
    `);
    $("editHealthProfileBtn").onclick = () => openHealthProfile(profile);
    $("newHealthRecordBtn").onclick = () => openNewHealthRecord();
    $$(".open-health-record").forEach(el => el.onclick = () => openHealthRecord(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadHealth failed", e);
    setHTML("healthContent", emptyCard("Health failed to load."));
  }
}

async function loadEducation() {
  if (!state.selected) return;
  setHTML("educationContent", emptyCard("Loading education..."));
  try {
    const data = await api(ROUTES.education(state.selected.id));
    const rows = arr(data.education_records || data.items);
    const profile = data.profile || data.education_profile || {};
    setHTML("educationContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div>
            <strong>School:</strong> ${esc(profile.school_name || "—")} ·
            <strong>Year group:</strong> ${esc(profile.year_group || "—")} ·
            <strong>Status:</strong> ${esc(profile.education_status || "—")}
          </div>
          <div class="badges">
            <button class="btn" id="editEducationProfileBtn">Edit profile</button>
            <button class="btn primary" id="newEducationRecordBtn">New education record</button>
          </div>
        </div>
      </div>
      ${renderSimpleRows(rows, {
        title: r => r.provision_name || r.school_name || "Education record",
        meta: r => `${fmtDate(r.record_date || r.created_at)} · ${esc(r.attendance_status || r.education_status || "—")}`,
        body: r => esc(r.achievement_note || r.behaviour_summary || r.learning_engagement || r.summary || "Education update"),
        clickableClass: "open-education-record"
      })}
    `);
    $("editEducationProfileBtn").onclick = () => openEducationProfile(profile);
    $("newEducationRecordBtn").onclick = () => openNewEducationRecord();
    $$(".open-education-record").forEach(el => el.onclick = () => openEducationRecord(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadEducation failed", e);
    setHTML("educationContent", emptyCard("Education failed to load."));
  }
}

async function loadFamily() {
  if (!state.selected) return;
  setHTML("familyContent", emptyCard("Loading family..."));
  try {
    const data = await api(ROUTES.family(state.selected.id));
    const contacts = arr(data.contacts);
    const rows = arr(data.family_contact_records || data.items);
    setHTML("familyContent", `
      <div class="grid two-col">
        <div class="card">
          <div class="card-title-row">
            <h3 class="card-title">Contacts</h3>
            <button class="btn primary" id="newFamilyContactBtn">New contact</button>
          </div>
          ${renderSimpleRows(contacts, {
            title: r => r.full_name || "Contact",
            meta: r => `${esc(r.relationship_to_child || "—")} · Approved: ${r.is_approved_contact ? "Yes" : "No"}`,
            body: r => esc(r.phone_number || r.email || r.contact_notes || ""),
            clickableClass: "open-family-contact"
          })}
        </div>
        <div class="card">
          <div class="card-title-row">
            <h3 class="card-title">Contact records</h3>
            <button class="btn primary" id="newFamilyRecordBtn">New record</button>
          </div>
          ${renderSimpleRows(rows, {
            title: r => r.contact_person || r.title || "Family contact",
            meta: r => `${fmtDateTime(r.contact_datetime || r.occurred_at || r.created_at)} · ${esc(r.contact_type || "contact")}`,
            body: r => esc(r.child_voice || r.post_contact_presentation || r.concerns || r.summary || "Family contact recorded"),
            badges: r => r.follow_up_required ? `<span class="pill amber">Follow-up required</span>` : "",
            clickableClass: "open-family-record"
          })}
        </div>
      </div>
    `);
    $("newFamilyContactBtn").onclick = () => openNewFamilyContact();
    $("newFamilyRecordBtn").onclick = () => openNewFamilyRecord();
    $$(".open-family-contact").forEach(el => el.onclick = () => openFamilyContact(Number(el.dataset.id)));
    $$(".open-family-record").forEach(el => el.onclick = () => openFamilyRecord(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadFamily failed", e);
    setHTML("familyContent", emptyCard("Family failed to load."));
  }
}

async function loadKeywork() {
  if (!state.selected) return;
  setHTML("keyworkContent", emptyCard("Loading key work..."));
  try {
    const rows = arr(await api(ROUTES.keywork(state.selected.id)));
    setHTML("keyworkContent", `
      <div class="card toolbar-card">
        <div class="toolbar">
          <div class="muted">Reflective work, child voice and agreed actions.</div>
          <button class="btn primary" id="newKeyworkBtn">New key work</button>
        </div>
      </div>
      ${renderSimpleRows(rows, {
        title: r => r.topic || r.title || "Key work session",
        meta: r => `${fmtDate(r.session_date || r.created_at)} · ${esc(r.worker_name || "—")}`,
        body: r => esc(r.summary || r.child_voice || r.reflective_analysis || "Key work session recorded"),
        badges: r => `
          <span class="pill ${pillClass(r.status || r.workflow_status)}">${esc(r.status || r.workflow_status || "draft")}</span>
        `,
        clickableClass: "open-keywork"
      })}
    `);
    $("newKeyworkBtn").onclick = () => openNewKeywork();
    $$(".open-keywork").forEach(el => el.onclick = () => openKeywork(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadKeywork failed", e);
    setHTML("keyworkContent", emptyCard("Key work failed to load."));
  }
}

async function loadPlans() {
  if (!state.selected) {
    setHTML("plansContent", emptyCard("No young person selected."));
    return;
  }

  setHTML("plansContent", emptyCard("Loading plans..."));

  try {
    const rows = arr(await api(ROUTES.plans(state.selected.id)));
    setHTML("plansContent", `
      <div class="list">
        ${rows.length ? rows.map(r => `
          <div class="row-card open-plan" data-id="${r.id}">
            <div class="row-title">${esc(r.title || "Untitled plan")}</div>
            <div class="row-meta">${esc(r.plan_type || "Plan")} · Status: ${esc(r.status || "draft")} · Version ${esc(r.version_no || 1)}</div>
            <div>${esc(r.summary || "No summary recorded.")}</div>
            <div class="badges">
              <span class="pill ${pillClass(r.status)}">${esc(r.status || "draft")}</span>
              <span class="pill blue">Inspection evidence</span>
            </div>
          </div>
        `).join("") : emptyCard("No plans found.")}
      </div>
    `);
    $$(".open-plan").forEach(el => el.onclick = () => openPlan(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadPlans failed", e);
    msg(e.message, true);
    setHTML("plansContent", emptyCard("Plans failed to load."));
  }
}

async function loadReviews() {
  setHTML("reviewsContent", emptyCard("Loading reviews..."));
  setHTML("managerQaContent", emptyCard("Loading reviews..."));

  try {
    const rows = arr(await api("/workflow-reviews"));
    const html = `
      <div class="list">
        ${rows.length ? rows.map(r => `
          <div class="row-card open-review" data-id="${r.id}">
            <div class="row-title">${esc(r.record_type)} review · ${esc(r.young_person_name || "—")}</div>
            <div class="row-meta">Status: ${esc(r.status)} · Submitted: ${esc(fmtDateTime(r.submitted_at))}</div>
            <div>${esc(r.review_note || "Awaiting manager decision.")}</div>
            <div class="badges">
              <span class="pill ${pillClass(r.status)}">${esc(r.status)}</span>
              ${!r.child_voice_captured ? `<span class="pill amber">Child voice missing</span>` : ""}
              ${!r.trauma_informed ? `<span class="pill amber">Reflective review needed</span>` : ""}
            </div>
          </div>
        `).join("") : emptyCard("No review items.")}
      </div>
    `;
    setHTML("reviewsContent", html);
    setHTML("managerQaContent", html);
    $$(".open-review").forEach(el => el.onclick = () => openReview(Number(el.dataset.id)));
  } catch (e) {
    console.error("loadReviews failed", e);
    msg(e.message, true);
    setHTML("reviewsContent", emptyCard("Review queue unavailable."));
    setHTML("managerQaContent", emptyCard("Review queue unavailable."));
  }
}

function renderHandover() {
  const rows = arr(state.commandCentre?.handover);
  setHTML("handoverBoard", `
    <div class="list">
      ${rows.length ? rows.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.time || "—")} · ${esc(r.title || "Handover item")}</div>
          <div>${esc(r.detail || "")}</div>
        </div>
      `).join("") : emptyCard("No handover items available.")}
    </div>
  `);
}

/* =========================
   DAILY NOTES
========================= */

async function openDailyNote(id) {
  try {
    const r = await api(`/young-people/daily-notes/${id}`);
    openDoc(
      r.title || "Daily note",
      `${fmtDateTime(r.note_date || r.recorded_at || r.created_at)} · ${r.shift_type || "shift"} · ${r.workflow_status || "draft"}`,
      `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Note date</label>
          <input id="dnNoteDate" class="input" value="${esc(r.note_date || "")}">
          <label class="label">Shift type</label>
          <input id="dnShiftType" class="input" value="${esc(r.shift_type || "")}">
          <label class="label">Mood</label>
          <input id="dnMood" class="input" value="${esc(r.mood || "")}">
          <label class="label">Presentation</label>
          <textarea id="dnPresentation" class="textarea">${esc(r.presentation || "")}</textarea>
          <label class="label">Activities</label>
          <textarea id="dnActivities" class="textarea">${esc(r.activities || "")}</textarea>
          <label class="label">Education update</label>
          <textarea id="dnEducation" class="textarea">${esc(r.education_update || "")}</textarea>
          <label class="label">Health update</label>
          <textarea id="dnHealth" class="textarea">${esc(r.health_update || "")}</textarea>
          <label class="label">Family update</label>
          <textarea id="dnFamily" class="textarea">${esc(r.family_update || "")}</textarea>
          <label class="label">Behaviour update</label>
          <textarea id="dnBehaviour" class="textarea">${esc(r.behaviour_update || "")}</textarea>
          <label class="label">Child voice</label>
          <textarea id="dnVoice" class="textarea">${esc(r.child_voice || r.young_person_voice || "")}</textarea>
          <label class="label">Positives</label>
          <textarea id="dnPositives" class="textarea">${esc(r.positives || "")}</textarea>
          <label class="label">Actions required</label>
          <textarea id="dnActions" class="textarea">${esc(r.actions_required || "")}</textarea>
        </section>
        <aside class="card doc-side">
          <div class="card-title">Workflow</div>
          <label class="label">Significance</label>
          <select id="dnSignificance" class="input">
            <option value="">Standard</option>
            <option value="low" ${r.significance === "low" ? "selected" : ""}>Low</option>
            <option value="standard" ${r.significance === "standard" ? "selected" : ""}>Standard</option>
            <option value="medium" ${r.significance === "medium" ? "selected" : ""}>Medium</option>
            <option value="high" ${r.significance === "high" ? "selected" : ""}>High</option>
          </select>
          <label class="label">Manager comment</label>
          <textarea id="dnManagerComment" class="textarea">${esc(r.manager_review_comment || "")}</textarea>
          <button id="saveDailyNoteBtn" class="btn primary">Save</button>
          <button id="submitDailyNoteBtn" class="btn">Submit</button>
          <button id="approveDailyNoteBtn" class="btn">Approve</button>
          <button id="returnDailyNoteBtn" class="btn">Return</button>
          <button id="archiveDailyNoteBtn" class="btn">Archive</button>
        </aside>
      </div>
      `
    );

    $("saveDailyNoteBtn").onclick = async () => {
      await api(`/young-people/daily-notes/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          note_date: val("dnNoteDate"),
          shift_type: val("dnShiftType"),
          mood: val("dnMood"),
          presentation: val("dnPresentation"),
          activities: val("dnActivities"),
          education_update: val("dnEducation"),
          health_update: val("dnHealth"),
          family_update: val("dnFamily"),
          behaviour_update: val("dnBehaviour"),
          child_voice: val("dnVoice"),
          positives: val("dnPositives"),
          actions_required: val("dnActions"),
          significance: val("dnSignificance") || null,
          manager_review_comment: val("dnManagerComment")
        })
      });
      msg("Daily note saved");
      loadDailyNotes();
      openDailyNote(id);
    };

    $("submitDailyNoteBtn").onclick = async () => {
      await api(`/young-people/daily-notes/${id}/submit`, { method: "POST" });
      msg("Daily note submitted");
      loadDailyNotes();
      openDailyNote(id);
    };

    $("approveDailyNoteBtn").onclick = async () => {
      await api(`/young-people/daily-notes/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ review_note: val("dnManagerComment") })
      });
      msg("Daily note approved");
      loadDailyNotes();
      openDailyNote(id);
    };

    $("returnDailyNoteBtn").onclick = async () => {
      await api(`/young-people/daily-notes/${id}/return`, {
        method: "POST",
        body: JSON.stringify({ review_note: val("dnManagerComment") })
      });
      msg("Daily note returned");
      loadDailyNotes();
      openDailyNote(id);
    };

    $("archiveDailyNoteBtn").onclick = async () => {
      await api(`/young-people/daily-notes/${id}/archive`, { method: "POST" });
      msg("Daily note archived");
      closeDoc();
      loadDailyNotes();
    };
  } catch (e) {
    console.error("openDailyNote failed", e);
    msg(e.message, true);
  }
}

function openNewDailyNote() {
  openDoc("New daily note", "Record shift information", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Note date</label>
        <input id="newDnNoteDate" class="input" placeholder="YYYY-MM-DD or ISO datetime">
        <label class="label">Shift type</label>
        <input id="newDnShiftType" class="input" placeholder="day / evening / waking_night">
        <label class="label">Mood</label>
        <input id="newDnMood" class="input">
        <label class="label">Presentation</label>
        <textarea id="newDnPresentation" class="textarea"></textarea>
        <label class="label">Activities</label>
        <textarea id="newDnActivities" class="textarea"></textarea>
        <label class="label">Education update</label>
        <textarea id="newDnEducation" class="textarea"></textarea>
        <label class="label">Health update</label>
        <textarea id="newDnHealth" class="textarea"></textarea>
        <label class="label">Family update</label>
        <textarea id="newDnFamily" class="textarea"></textarea>
        <label class="label">Behaviour update</label>
        <textarea id="newDnBehaviour" class="textarea"></textarea>
        <label class="label">Child voice</label>
        <textarea id="newDnVoice" class="textarea"></textarea>
        <label class="label">Positives</label>
        <textarea id="newDnPositives" class="textarea"></textarea>
        <label class="label">Actions required</label>
        <textarea id="newDnActions" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <label class="label">Significance</label>
        <select id="newDnSignificance" class="input">
          <option value="">Standard</option>
          <option value="low">Low</option>
          <option value="standard">Standard</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button id="createDailyNoteBtn" class="btn primary">Create daily note</button>
      </aside>
    </div>
  `);

  $("createDailyNoteBtn").onclick = async () => {
    const res = await api(`/young-people/daily-notes`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        note_date: val("newDnNoteDate"),
        shift_type: val("newDnShiftType"),
        mood: val("newDnMood"),
        presentation: val("newDnPresentation"),
        activities: val("newDnActivities"),
        education_update: val("newDnEducation"),
        health_update: val("newDnHealth"),
        family_update: val("newDnFamily"),
        behaviour_update: val("newDnBehaviour"),
        child_voice: val("newDnVoice"),
        positives: val("newDnPositives"),
        actions_required: val("newDnActions"),
        significance: val("newDnSignificance") || null
      })
    });
    msg("Daily note created");
    loadDailyNotes();
    openDailyNote(res.id);
  };
}

/* =========================
   INCIDENTS
========================= */

async function openIncident(id) {
  try {
    const r = await api(`/young-people/incidents/${id}`);
    openDoc(
      r.title || "Incident",
      `${fmtDateTime(r.occurred_at || r.incident_datetime || r.created_at)} · ${r.workflow_status || "pending"}`,
      `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Incident type</label>
          <input id="incType" class="input" value="${esc(r.incident_type || "")}">
          <label class="label">Occurred at</label>
          <input id="incOccurred" class="input" value="${esc(r.occurred_at || r.incident_datetime || "")}">
          <label class="label">Location</label>
          <input id="incLocation" class="input" value="${esc(r.location || "")}">
          <label class="label">Description</label>
          <textarea id="incDescription" class="textarea">${esc(r.description || r.narrative || "")}</textarea>
          <label class="label">Antecedent</label>
          <textarea id="incAntecedent" class="textarea">${esc(r.antecedent || "")}</textarea>
          <label class="label">Presentation</label>
          <textarea id="incPresentation" class="textarea">${esc(r.presentation || "")}</textarea>
          <label class="label">Staff response</label>
          <textarea id="incStaffResponse" class="textarea">${esc(r.staff_response || "")}</textarea>
          <label class="label">Trauma-informed formulation</label>
          <textarea id="incFormulation" class="textarea">${esc(r.trauma_informed_formulation || "")}</textarea>
          <label class="label">Child voice</label>
          <textarea id="incChildVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
          <label class="label">Outcome / follow-up</label>
          <textarea id="incOutcome" class="textarea">${esc(r.outcome || r.follow_up_required || "")}</textarea>
          <label class="label">Manager review comment</label>
          <textarea id="incManagerComment" class="textarea">${esc(r.manager_review_comment || "")}</textarea>
        </section>
        <aside class="card doc-side">
          <label class="label">Severity</label>
          <select id="incSeverity" class="input">
            <option value="low" ${r.severity === "low" ? "selected" : ""}>Low</option>
            <option value="medium" ${r.severity === "medium" ? "selected" : ""}>Medium</option>
            <option value="high" ${r.severity === "high" ? "selected" : ""}>High</option>
            <option value="critical" ${r.severity === "critical" ? "selected" : ""}>Critical</option>
          </select>
          <button id="saveIncidentBtn" class="btn primary">Save</button>
          <button id="submitIncidentBtn" class="btn">Submit</button>
          <button id="approveIncidentBtn" class="btn">Approve</button>
          <button id="returnIncidentBtn" class="btn">Return</button>
          <button id="archiveIncidentBtn" class="btn">Archive</button>
          <button id="exportIncidentBtn" class="btn">Export</button>
        </aside>
      </div>
      `
    );

    $("saveIncidentBtn").onclick = async () => {
      await api(`/young-people/incidents/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          incident_type: val("incType"),
          occurred_at: val("incOccurred"),
          location: val("incLocation"),
          narrative: val("incDescription"),
          antecedent: val("incAntecedent"),
          presentation: val("incPresentation"),
          staff_response: val("incStaffResponse"),
          trauma_informed_formulation: val("incFormulation"),
          child_voice: val("incChildVoice"),
          outcome: val("incOutcome"),
          manager_review_comment: val("incManagerComment"),
          severity: val("incSeverity")
        })
      });
      msg("Incident saved");
      loadIncidents();
      openIncident(id);
    };

    $("submitIncidentBtn").onclick = async () => {
      await api(`/young-people/incidents/${id}/submit`, { method: "POST" });
      msg("Incident submitted");
      loadIncidents();
      openIncident(id);
    };

    $("approveIncidentBtn").onclick = async () => {
      await api(`/young-people/incidents/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ review_note: val("incManagerComment") })
      });
      msg("Incident approved");
      loadIncidents();
      openIncident(id);
    };

    $("returnIncidentBtn").onclick = async () => {
      await api(`/young-people/incidents/${id}/return`, {
        method: "POST",
        body: JSON.stringify({ review_note: val("incManagerComment") })
      });
      msg("Incident returned");
      loadIncidents();
      openIncident(id);
    };

    $("archiveIncidentBtn").onclick = async () => {
      await api(`/young-people/incidents/${id}/archive`, { method: "POST" });
      msg("Incident archived");
      closeDoc();
      loadIncidents();
    };

    $("exportIncidentBtn").onclick = () => window.open(`/young-people/incidents/${id}/export`, "_blank");
  } catch (e) {
    console.error("openIncident failed", e);
    msg(e.message, true);
  }
}

function openNewIncident() {
  openDoc("New incident", "Create safeguarding / behaviour record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Incident type</label>
        <input id="newIncType" class="input">
        <label class="label">Occurred at</label>
        <input id="newIncOccurred" class="input" placeholder="ISO datetime">
        <label class="label">Location</label>
        <input id="newIncLocation" class="input">
        <label class="label">Description</label>
        <textarea id="newIncDescription" class="textarea"></textarea>
        <label class="label">Antecedent</label>
        <textarea id="newIncAntecedent" class="textarea"></textarea>
        <label class="label">Presentation</label>
        <textarea id="newIncPresentation" class="textarea"></textarea>
        <label class="label">Staff response</label>
        <textarea id="newIncStaffResponse" class="textarea"></textarea>
        <label class="label">Trauma-informed formulation</label>
        <textarea id="newIncFormulation" class="textarea"></textarea>
        <label class="label">Child voice</label>
        <textarea id="newIncChildVoice" class="textarea"></textarea>
        <label class="label">Outcome / follow-up</label>
        <textarea id="newIncOutcome" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <label class="label">Severity</label>
        <select id="newIncSeverity" class="input">
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button id="createIncidentBtn" class="btn primary">Create incident</button>
      </aside>
    </div>
  `);

  $("createIncidentBtn").onclick = async () => {
    const res = await api(`/young-people/incidents`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        incident_type: val("newIncType"),
        occurred_at: val("newIncOccurred"),
        location: val("newIncLocation"),
        narrative: val("newIncDescription"),
        antecedent: val("newIncAntecedent"),
        presentation: val("newIncPresentation"),
        staff_response: val("newIncStaffResponse"),
        trauma_informed_formulation: val("newIncFormulation"),
        child_voice: val("newIncChildVoice"),
        outcome: val("newIncOutcome"),
        severity: val("newIncSeverity")
      })
    });
    msg("Incident created");
    loadIncidents();
    openIncident(res.id);
  };
}

/* =========================
   HEALTH
========================= */

function openHealthProfile(profile = {}) {
  openDoc("Health profile", "Edit current health profile", `
    <div class="card">
      <label class="label">GP name</label>
      <input id="hpGp" class="input" value="${esc(profile.gp_name || "")}">
      <label class="label">Allergies</label>
      <textarea id="hpAllergies" class="textarea">${esc(profile.allergies || "")}</textarea>
      <label class="label">Diagnoses</label>
      <textarea id="hpDiagnoses" class="textarea">${esc(profile.diagnoses || "")}</textarea>
      <div class="badges">
        <button id="saveHealthProfileBtn" class="btn primary">Save health profile</button>
      </div>
    </div>
  `);

  $("saveHealthProfileBtn").onclick = async () => {
    await api(`/young-people/${state.selected.id}/health/profile`, {
      method: "PUT",
      body: JSON.stringify({
        gp_name: val("hpGp"),
        allergies: val("hpAllergies"),
        diagnoses: val("hpDiagnoses")
      })
    });
    msg("Health profile saved");
    closeDoc();
    loadHealth();
    loadOverview();
  };
}

async function openHealthRecord(id) {
  try {
    const r = await api(`/young-people/health-records/${id}`);
    openDoc(
      r.title || "Health record",
      `${fmtDateTime(r.event_datetime || r.occurred_at || r.created_at)} · ${r.record_type || "health"}`,
      `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Record type</label>
          <input id="hrType" class="input" value="${esc(r.record_type || "")}">
          <label class="label">Title</label>
          <input id="hrTitle" class="input" value="${esc(r.title || "")}">
          <label class="label">Summary</label>
          <textarea id="hrSummary" class="textarea">${esc(r.summary || "")}</textarea>
          <label class="label">Professional name</label>
          <input id="hrProfessional" class="input" value="${esc(r.professional_name || "")}">
          <label class="label">Outcome</label>
          <textarea id="hrOutcome" class="textarea">${esc(r.outcome || "")}</textarea>
          <label class="label">Next action date</label>
          <input id="hrNextAction" class="input" value="${esc(r.next_action_date || "")}">
          <label class="label">Event datetime</label>
          <input id="hrEventDt" class="input" value="${esc(r.event_datetime || "")}">
        </section>
        <aside class="card doc-side">
          <label class="pill"><input type="checkbox" id="hrFollowUp" ${r.follow_up_required ? "checked" : ""}> Follow-up required</label>
          <button id="saveHealthRecordBtn" class="btn primary">Save</button>
        </aside>
      </div>
      `
    );

    $("saveHealthRecordBtn").onclick = async () => {
      await api(`/young-people/health-records/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          record_type: val("hrType"),
          title: val("hrTitle"),
          summary: val("hrSummary"),
          professional_name: val("hrProfessional"),
          outcome: val("hrOutcome"),
          next_action_date: val("hrNextAction"),
          event_datetime: val("hrEventDt"),
          follow_up_required: checked("hrFollowUp")
        })
      });
      msg("Health record saved");
      loadHealth();
      openHealthRecord(id);
    };
  } catch (e) {
    console.error("openHealthRecord failed", e);
    msg(e.message, true);
  }
}

function openNewHealthRecord() {
  openDoc("New health record", "Record health information", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Record type</label>
        <input id="newHrType" class="input">
        <label class="label">Title</label>
        <input id="newHrTitle" class="input">
        <label class="label">Summary</label>
        <textarea id="newHrSummary" class="textarea"></textarea>
        <label class="label">Professional name</label>
        <input id="newHrProfessional" class="input">
        <label class="label">Outcome</label>
        <textarea id="newHrOutcome" class="textarea"></textarea>
        <label class="label">Next action date</label>
        <input id="newHrNextAction" class="input">
        <label class="label">Event datetime</label>
        <input id="newHrEventDt" class="input">
      </section>
      <aside class="card doc-side">
        <label class="pill"><input type="checkbox" id="newHrFollowUp"> Follow-up required</label>
        <button id="createHealthRecordBtn" class="btn primary">Create health record</button>
      </aside>
    </div>
  `);

  $("createHealthRecordBtn").onclick = async () => {
    const res = await api(`/young-people/health-records`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        record_type: val("newHrType"),
        title: val("newHrTitle"),
        summary: val("newHrSummary"),
        professional_name: val("newHrProfessional"),
        outcome: val("newHrOutcome"),
        next_action_date: val("newHrNextAction"),
        event_datetime: val("newHrEventDt"),
        follow_up_required: checked("newHrFollowUp")
      })
    });
    msg("Health record created");
    loadHealth();
    openHealthRecord(res.id);
  };
}

/* =========================
   EDUCATION
========================= */

function openEducationProfile(profile = {}) {
  openDoc("Education profile", "Edit current education profile", `
    <div class="card">
      <label class="label">School name</label>
      <input id="epSchool" class="input" value="${esc(profile.school_name || "")}">
      <label class="label">Year group</label>
      <input id="epYear" class="input" value="${esc(profile.year_group || "")}">
      <label class="label">Education status</label>
      <input id="epStatus" class="input" value="${esc(profile.education_status || "")}">
      <div class="badges">
        <button id="saveEducationProfileBtn" class="btn primary">Save education profile</button>
      </div>
    </div>
  `);

  $("saveEducationProfileBtn").onclick = async () => {
    await api(`/young-people/${state.selected.id}/education/profile`, {
      method: "PUT",
      body: JSON.stringify({
        school_name: val("epSchool"),
        year_group: val("epYear"),
        education_status: val("epStatus")
      })
    });
    msg("Education profile saved");
    closeDoc();
    loadEducation();
    loadOverview();
  };
}

async function openEducationRecord(id) {
  try {
    const r = await api(`/young-people/education-records/${id}`);
    openDoc(
      r.title || "Education record",
      `${fmtDate(r.record_date || r.occurred_at || r.created_at)} · ${r.attendance_status || "—"}`,
      `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Record date</label>
          <input id="erDate" class="input" value="${esc(r.record_date || "")}">
          <label class="label">Attendance status</label>
          <input id="erAttendance" class="input" value="${esc(r.attendance_status || "")}">
          <label class="label">Provision name</label>
          <input id="erProvision" class="input" value="${esc(r.provision_name || "")}">
          <label class="label">Behaviour summary</label>
          <textarea id="erBehaviour" class="textarea">${esc(r.behaviour_summary || "")}</textarea>
          <label class="label">Learning engagement</label>
          <textarea id="erEngagement" class="textarea">${esc(r.learning_engagement || "")}</textarea>
          <label class="label">Issue raised</label>
          <textarea id="erIssue" class="textarea">${esc(r.issue_raised || "")}</textarea>
          <label class="label">Action taken</label>
          <textarea id="erAction" class="textarea">${esc(r.action_taken || "")}</textarea>
          <label class="label">Professional involved</label>
          <input id="erProfessional" class="input" value="${esc(r.professional_involved || "")}">
          <label class="label">Achievement note</label>
          <textarea id="erAchievement" class="textarea">${esc(r.achievement_note || "")}</textarea>
        </section>
        <aside class="card doc-side">
          <button id="saveEducationRecordBtn" class="btn primary">Save</button>
        </aside>
      </div>
      `
    );

    $("saveEducationRecordBtn").onclick = async () => {
      await api(`/young-people/education-records/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          record_date: val("erDate"),
          attendance_status: val("erAttendance"),
          provision_name: val("erProvision"),
          behaviour_summary: val("erBehaviour"),
          learning_engagement: val("erEngagement"),
          issue_raised: val("erIssue"),
          action_taken: val("erAction"),
          professional_involved: val("erProfessional"),
          achievement_note: val("erAchievement")
        })
      });
      msg("Education record saved");
      loadEducation();
      openEducationRecord(id);
    };
  } catch (e) {
    console.error("openEducationRecord failed", e);
    msg(e.message, true);
  }
}

function openNewEducationRecord() {
  openDoc("New education record", "Record school / education update", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Record date</label>
        <input id="newErDate" class="input">
        <label class="label">Attendance status</label>
        <input id="newErAttendance" class="input">
        <label class="label">Provision name</label>
        <input id="newErProvision" class="input">
        <label class="label">Behaviour summary</label>
        <textarea id="newErBehaviour" class="textarea"></textarea>
        <label class="label">Learning engagement</label>
        <textarea id="newErEngagement" class="textarea"></textarea>
        <label class="label">Issue raised</label>
        <textarea id="newErIssue" class="textarea"></textarea>
        <label class="label">Action taken</label>
        <textarea id="newErAction" class="textarea"></textarea>
        <label class="label">Professional involved</label>
        <input id="newErProfessional" class="input">
        <label class="label">Achievement note</label>
        <textarea id="newErAchievement" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <button id="createEducationRecordBtn" class="btn primary">Create education record</button>
      </aside>
    </div>
  `);

  $("createEducationRecordBtn").onclick = async () => {
    const res = await api(`/young-people/education-records`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        record_date: val("newErDate"),
        attendance_status: val("newErAttendance"),
        provision_name: val("newErProvision"),
        behaviour_summary: val("newErBehaviour"),
        learning_engagement: val("newErEngagement"),
        issue_raised: val("newErIssue"),
        action_taken: val("newErAction"),
        professional_involved: val("newErProfessional"),
        achievement_note: val("newErAchievement")
      })
    });
    msg("Education record created");
    loadEducation();
    openEducationRecord(res.id);
  };
}

/* =========================
   FAMILY
========================= */

async function openFamilyContact(id) {
  try {
    const r = await api(`/young-people/family/contacts/${id}`);
    openDoc(
      r.full_name || "Family contact",
      `${r.relationship_to_child || "relationship unknown"}`,
      `
      <div class="card">
        <label class="label">Full name</label>
        <input id="fcName" class="input" value="${esc(r.full_name || "")}">
        <label class="label">Relationship to child</label>
        <input id="fcRelationship" class="input" value="${esc(r.relationship_to_child || "")}">
        <label class="label">Phone number</label>
        <input id="fcPhone" class="input" value="${esc(r.phone_number || "")}">
        <label class="label">Email</label>
        <input id="fcEmail" class="input" value="${esc(r.email || "")}">
        <label class="label">Address</label>
        <textarea id="fcAddress" class="textarea">${esc(r.address || "")}</textarea>
        <label class="label">Contact notes</label>
        <textarea id="fcNotes" class="textarea">${esc(r.contact_notes || "")}</textarea>
        <label class="pill"><input type="checkbox" id="fcPR" ${r.is_parental_responsibility_holder ? "checked" : ""}> Parental responsibility holder</label>
        <label class="pill"><input type="checkbox" id="fcApproved" ${r.is_approved_contact ? "checked" : ""}> Approved contact</label>
        <div class="badges">
          <button id="saveFamilyContactBtn" class="btn primary">Save contact</button>
        </div>
      </div>
      `
    );

    $("saveFamilyContactBtn").onclick = async () => {
      await api(`/young-people/family/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: val("fcName"),
          relationship_to_child: val("fcRelationship"),
          phone_number: val("fcPhone"),
          email: val("fcEmail"),
          address: val("fcAddress"),
          contact_notes: val("fcNotes"),
          is_parental_responsibility_holder: checked("fcPR"),
          is_approved_contact: checked("fcApproved")
        })
      });
      msg("Family contact saved");
      loadFamily();
      openFamilyContact(id);
    };
  } catch (e) {
    console.error("openFamilyContact failed", e);
    msg(e.message, true);
  }
}

function openNewFamilyContact() {
  openDoc("New family contact", "Add contact details", `
    <div class="card">
      <label class="label">Full name</label>
      <input id="newFcName" class="input">
      <label class="label">Relationship to child</label>
      <input id="newFcRelationship" class="input">
      <label class="label">Phone number</label>
      <input id="newFcPhone" class="input">
      <label class="label">Email</label>
      <input id="newFcEmail" class="input">
      <label class="label">Address</label>
      <textarea id="newFcAddress" class="textarea"></textarea>
      <label class="label">Contact notes</label>
      <textarea id="newFcNotes" class="textarea"></textarea>
      <label class="pill"><input type="checkbox" id="newFcPR"> Parental responsibility holder</label>
      <label class="pill"><input type="checkbox" id="newFcApproved"> Approved contact</label>
      <div class="badges">
        <button id="createFamilyContactBtn" class="btn primary">Create contact</button>
      </div>
    </div>
  `);

  $("createFamilyContactBtn").onclick = async () => {
    await api(`/young-people/${state.selected.id}/family/contacts`, {
      method: "POST",
      body: JSON.stringify({
        full_name: val("newFcName"),
        relationship_to_child: val("newFcRelationship"),
        phone_number: val("newFcPhone"),
        email: val("newFcEmail"),
        address: val("newFcAddress"),
        contact_notes: val("newFcNotes"),
        is_parental_responsibility_holder: checked("newFcPR"),
        is_approved_contact: checked("newFcApproved")
      })
    });
    msg("Family contact created");
    closeDoc();
    loadFamily();
  };
}

async function openFamilyRecord(id) {
  try {
    const r = await api(`/young-people/family/records/${id}`);
    openDoc(
      r.contact_person || "Family contact record",
      `${fmtDateTime(r.contact_datetime || r.occurred_at || r.created_at)} · ${r.contact_type || "contact"}`,
      `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Contact datetime</label>
          <input id="frDatetime" class="input" value="${esc(r.contact_datetime || "")}">
          <label class="label">Contact type</label>
          <input id="frType" class="input" value="${esc(r.contact_type || "")}">
          <label class="label">Contact person</label>
          <input id="frPerson" class="input" value="${esc(r.contact_person || "")}">
          <label class="label">Supervision level</label>
          <input id="frSupervision" class="input" value="${esc(r.supervision_level || "")}">
          <label class="label">Location</label>
          <input id="frLocation" class="input" value="${esc(r.location || "")}">
          <label class="label">Pre-contact presentation</label>
          <textarea id="frPre" class="textarea">${esc(r.pre_contact_presentation || "")}</textarea>
          <label class="label">Post-contact presentation</label>
          <textarea id="frPost" class="textarea">${esc(r.post_contact_presentation || "")}</textarea>
          <label class="label">Child voice</label>
          <textarea id="frVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
          <label class="label">Concerns</label>
          <textarea id="frConcerns" class="textarea">${esc(r.concerns || "")}</textarea>
        </section>
        <aside class="card doc-side">
          <label class="pill"><input type="checkbox" id="frFollowUp" ${r.follow_up_required ? "checked" : ""}> Follow-up required</label>
          <button id="saveFamilyRecordBtn" class="btn primary">Save</button>
        </aside>
      </div>
      `
    );

    $("saveFamilyRecordBtn").onclick = async () => {
      await api(`/young-people/family/records/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          contact_datetime: val("frDatetime"),
          contact_type: val("frType"),
          contact_person: val("frPerson"),
          supervision_level: val("frSupervision"),
          location: val("frLocation"),
          pre_contact_presentation: val("frPre"),
          post_contact_presentation: val("frPost"),
          child_voice: val("frVoice"),
          concerns: val("frConcerns"),
          follow_up_required: checked("frFollowUp")
        })
      });
      msg("Family contact record saved");
      loadFamily();
      openFamilyRecord(id);
    };
  } catch (e) {
    console.error("openFamilyRecord failed", e);
    msg(e.message, true);
  }
}

function openNewFamilyRecord() {
  openDoc("New family contact record", "Record family / contact event", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Contact datetime</label>
        <input id="newFrDatetime" class="input">
        <label class="label">Contact type</label>
        <input id="newFrType" class="input">
        <label class="label">Contact person</label>
        <input id="newFrPerson" class="input">
        <label class="label">Supervision level</label>
        <input id="newFrSupervision" class="input">
        <label class="label">Location</label>
        <input id="newFrLocation" class="input">
        <label class="label">Pre-contact presentation</label>
        <textarea id="newFrPre" class="textarea"></textarea>
        <label class="label">Post-contact presentation</label>
        <textarea id="newFrPost" class="textarea"></textarea>
        <label class="label">Child voice</label>
        <textarea id="newFrVoice" class="textarea"></textarea>
        <label class="label">Concerns</label>
        <textarea id="newFrConcerns" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <label class="pill"><input type="checkbox" id="newFrFollowUp"> Follow-up required</label>
        <button id="createFamilyRecordBtn" class="btn primary">Create record</button>
      </aside>
    </div>
  `);

  $("createFamilyRecordBtn").onclick = async () => {
    const res = await api(`/young-people/family/records`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        contact_datetime: val("newFrDatetime"),
        contact_type: val("newFrType"),
        contact_person: val("newFrPerson"),
        supervision_level: val("newFrSupervision"),
        location: val("newFrLocation"),
        pre_contact_presentation: val("newFrPre"),
        post_contact_presentation: val("newFrPost"),
        child_voice: val("newFrVoice"),
        concerns: val("newFrConcerns"),
        follow_up_required: checked("newFrFollowUp")
      })
    });
    msg("Family record created");
    loadFamily();
    openFamilyRecord(res.id);
  };
}

/* =========================
   KEYWORK
========================= */

async function openKeywork(id) {
  try {
    const r = await api(`/young-people/keywork/${id}`);
    openDoc(
      r.topic || r.title || "Key work session",
      `${fmtDate(r.session_date || r.created_at)} · ${r.status || r.workflow_status || "draft"}`,
      `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Session date</label>
          <input id="kwDate" class="input" value="${esc(r.session_date || "")}">
          <label class="label">Topic</label>
          <input id="kwTopic" class="input" value="${esc(r.topic || "")}">
          <label class="label">Purpose</label>
          <textarea id="kwPurpose" class="textarea">${esc(r.purpose || "")}</textarea>
          <label class="label">Summary</label>
          <textarea id="kwSummary" class="textarea">${esc(r.summary || "")}</textarea>
          <label class="label">Child voice</label>
          <textarea id="kwVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
          <label class="label">Reflective analysis</label>
          <textarea id="kwReflective" class="textarea">${esc(r.reflective_analysis || "")}</textarea>
          <label class="label">Actions agreed</label>
          <textarea id="kwActions" class="textarea">${esc(r.actions_agreed || "")}</textarea>
          <label class="label">Next session date</label>
          <input id="kwNextDate" class="input" value="${esc(r.next_session_date || "")}">
          <label class="label">Manager review comment</label>
          <textarea id="kwManagerComment" class="textarea">${esc(r.manager_review_comment || "")}</textarea>
        </section>
        <aside class="card doc-side">
          <button id="saveKeyworkBtn" class="btn primary">Save</button>
          <button id="submitKeyworkBtn" class="btn">Submit</button>
          <button id="approveKeyworkBtn" class="btn">Approve</button>
          <button id="returnKeyworkBtn" class="btn">Return</button>
          <button id="archiveKeyworkBtn" class="btn">Archive</button>
        </aside>
      </div>
      `
    );

    $("saveKeyworkBtn").onclick = async () => {
      await api(`/young-people/keywork/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          session_date: val("kwDate"),
          topic: val("kwTopic"),
          purpose: val("kwPurpose"),
          summary: val("kwSummary"),
          child_voice: val("kwVoice"),
          reflective_analysis: val("kwReflective"),
          actions_agreed: val("kwActions"),
          next_session_date: val("kwNextDate"),
          manager_review_comment: val("kwManagerComment")
        })
      });
      msg("Key work saved");
      loadKeywork();
      openKeywork(id);
    };

    $("submitKeyworkBtn").onclick = async () => {
      await api(`/young-people/keywork/${id}/submit`, { method: "POST" });
      msg("Key work submitted");
      loadKeywork();
      openKeywork(id);
    };

    $("approveKeyworkBtn").onclick = async () => {
      await api(`/young-people/keywork/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ review_note: val("kwManagerComment") })
      });
      msg("Key work approved");
      loadKeywork();
      openKeywork(id);
    };

    $("returnKeyworkBtn").onclick = async () => {
      await api(`/young-people/keywork/${id}/return`, {
        method: "POST",
        body: JSON.stringify({ review_note: val("kwManagerComment") })
      });
      msg("Key work returned");
      loadKeywork();
      openKeywork(id);
    };

    $("archiveKeyworkBtn").onclick = async () => {
      await api(`/young-people/keywork/${id}/archive`, { method: "POST" });
      msg("Key work archived");
      closeDoc();
      loadKeywork();
    };
  } catch (e) {
    console.error("openKeywork failed", e);
    msg(e.message, true);
  }
}

function openNewKeywork() {
  openDoc("New key work session", "Reflective direct work record", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Session date</label>
        <input id="newKwDate" class="input">
        <label class="label">Topic</label>
        <input id="newKwTopic" class="input">
        <label class="label">Purpose</label>
        <textarea id="newKwPurpose" class="textarea"></textarea>
        <label class="label">Summary</label>
        <textarea id="newKwSummary" class="textarea"></textarea>
        <label class="label">Child voice</label>
        <textarea id="newKwVoice" class="textarea"></textarea>
        <label class="label">Reflective analysis</label>
        <textarea id="newKwReflective" class="textarea"></textarea>
        <label class="label">Actions agreed</label>
        <textarea id="newKwActions" class="textarea"></textarea>
        <label class="label">Next session date</label>
        <input id="newKwNextDate" class="input">
      </section>
      <aside class="card doc-side">
        <button id="createKeyworkBtn" class="btn primary">Create key work</button>
      </aside>
    </div>
  `);

  $("createKeyworkBtn").onclick = async () => {
    const res = await api(`/young-people/keywork`, {
      method: "POST",
      body: JSON.stringify({
        young_person_id: state.selected.id,
        session_date: val("newKwDate"),
        topic: val("newKwTopic"),
        purpose: val("newKwPurpose"),
        summary: val("newKwSummary"),
        child_voice: val("newKwVoice"),
        reflective_analysis: val("newKwReflective"),
        actions_agreed: val("newKwActions"),
        next_session_date: val("newKwNextDate")
      })
    });
    msg("Key work created");
    loadKeywork();
    openKeywork(res.id);
  };
}

/* =========================
   PLANS / REVIEWS / EVIDENCE
========================= */

async function openPlan(id) {
  try {
    const r = await api(`/young-people/plans/${id}`);
    openDoc(
      r.title || "Plan",
      `${r.plan_type || "Plan"} · Status: ${r.status || "draft"} · Version ${r.version_no || 1}`,
      `
      <div class="doc-meta-bar">
        <span class="pill">${esc(r.plan_type || "Plan")}</span>
        <span class="pill ${pillClass(r.status)}">${esc(r.status || "draft")}</span>
        <span class="pill">Review due: ${esc(r.review_due_at ? fmtDate(r.review_due_at) : "—")}</span>
      </div>
      <div class="doc-grid">
        <section class="card">
          <label class="label">Title</label>
          <input id="planTitle" class="input" value="${esc(r.title || "")}">
          <label class="label">Summary</label>
          <textarea id="planSummary" class="textarea">${esc(r.summary || "")}</textarea>
          <label class="label">Child’s views, wishes and feelings</label>
          <textarea id="planVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
          <label class="label">What staff should do</label>
          <textarea id="planStaffGuidance" class="textarea">${esc(r.staff_guidance || "")}</textarea>
          <label class="label">Trauma-informed formulation</label>
          <textarea id="planFormulation" class="textarea">${esc(r.formulation || "")}</textarea>
        </section>
        <aside class="card doc-side">
          <div class="card-title">Workflow</div>
          <button id="savePlanBtn" class="btn primary">Save draft</button>
          <button id="submitPlanBtn" class="btn">Submit</button>
          <button id="approvePlanBtn" class="btn">Approve</button>
          <button id="exportPlanBtn" class="btn">Export</button>
          <button id="planEvidenceBtn" class="btn">Evidence preview</button>
          <hr>
          <div class="mini-meta">
            <div><strong>Owner:</strong> ${esc(r.owner_name || "—")}</div>
            <div><strong>Updated:</strong> ${esc(fmtDateTime(r.updated_at))}</div>
          </div>
        </aside>
      </div>
      `
    );

    $("savePlanBtn").onclick = async () => {
      await api(`/young-people/plans/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: val("planTitle"),
          summary: val("planSummary"),
          child_voice: val("planVoice"),
          staff_guidance: val("planStaffGuidance"),
          formulation: val("planFormulation")
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

    $("exportPlanBtn").onclick = () => window.open(`/young-people/plans/${id}/export`, "_blank");

    $("planEvidenceBtn").onclick = () => {
      openEvidencePreview({
        title: r.title,
        summary: r.summary,
        linked_standard: "care_planning",
        linked_judgement_area: "leadership_and_management",
        source_table: "support_plans",
        source_id: r.id,
        significance: r.status || "draft"
      });
    };
  } catch (e) {
    console.error("openPlan failed", e);
    msg(e.message, true);
  }
}

function openNewPlan() {
  openDoc("New plan", "Create a child-centred working document", `
    <div class="doc-grid">
      <section class="card">
        <label class="label">Title</label>
        <input id="newPlanTitle" class="input">
        <label class="label">Summary</label>
        <textarea id="newPlanSummary" class="textarea"></textarea>
        <label class="label">Child’s views, wishes and feelings</label>
        <textarea id="newPlanVoice" class="textarea"></textarea>
        <label class="label">What staff should do</label>
        <textarea id="newPlanStaffGuidance" class="textarea"></textarea>
        <label class="label">Trauma-informed formulation</label>
        <textarea id="newPlanFormulation" class="textarea"></textarea>
      </section>
      <aside class="card doc-side">
        <div class="card-title">Workflow</div>
        <button id="createPlanBtn" class="btn primary">Create plan</button>
      </aside>
    </div>
  `);

  $("createPlanBtn").onclick = async () => {
    try {
      const res = await api(`/young-people/plans`, {
        method: "POST",
        body: JSON.stringify({
          young_person_id: state.selected.id,
          title: val("newPlanTitle"),
          summary: val("newPlanSummary"),
          child_voice: val("newPlanVoice"),
          staff_guidance: val("newPlanStaffGuidance"),
          formulation: val("newPlanFormulation")
        })
      });
      msg("Plan created");
      loadPlans();
      openPlan(res.id);
    } catch (e) {
      console.error("openNewPlan failed", e);
      msg(e.message, true);
    }
  };
}

async function openReview(id) {
  try {
    const r = await api(`/workflow-reviews/${id}`);
    openDoc(`${r.record_type} review`, `${r.young_person_name || "—"} · Status: ${r.status}`, `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Manager decision note</label>
          <textarea id="reviewNote" class="textarea">${esc(r.review_note || "")}</textarea>
          <label class="pill"><input type="checkbox" id="reviewChildVoice" ${r.child_voice_captured ? "checked" : ""}> Child voice captured</label>
          <label class="pill"><input type="checkbox" id="reviewTraumaInformed" ${r.trauma_informed ? "checked" : ""}> Trauma-informed response evident</label>
          <label class="pill"><input type="checkbox" id="reviewActionsRequired" ${r.actions_required ? "checked" : ""}> Actions required</label>
          <label class="pill"><input type="checkbox" id="reviewExternal" ${r.requires_external_notification ? "checked" : ""}> External notification required</label>
        </section>
        <aside class="card doc-side">
          <div class="card-title">Decision</div>
          <button id="approveReviewBtn" class="btn primary">Approve</button>
          <button id="returnReviewBtn" class="btn">Return</button>
          <button id="escalateReviewBtn" class="btn">Escalate</button>
        </aside>
      </div>
    `);

    const decide = async (decision) => {
      await api(`/workflow-reviews/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          review_note: val("reviewNote"),
          child_voice_captured: checked("reviewChildVoice"),
          trauma_informed: checked("reviewTraumaInformed"),
          actions_required: checked("reviewActionsRequired"),
          requires_external_notification: checked("reviewExternal")
        })
      });
      msg(`Review ${decision}`);
      loadReviews();
      openReview(id);
    };

    $("approveReviewBtn").onclick = () => decide("approved");
    $("returnReviewBtn").onclick = () => decide("returned");
    $("escalateReviewBtn").onclick = () => decide("escalated");
  } catch (e) {
    console.error("openReview failed", e);
    msg(e.message, true);
  }
}

function openEvidencePreview(row) {
  openDoc(
    `${row.title || "Evidence item"} — Evidence preview`,
    `${row.source_table || "record"} · Ref ${row.source_id || "—"}`,
    `
    <div class="doc-grid">
      <section class="card">
        <div class="row-card">
          <div class="row-title">Summary</div>
          <div>${esc(row.summary || "No summary recorded.")}</div>
        </div>

        <div class="row-card">
          <div class="row-title">Inspection linkage</div>
          <div class="badges">
            ${row.linked_standard ? `<span class="pill blue">${esc(row.linked_standard.replaceAll("_", " "))}</span>` : ""}
            ${row.linked_judgement_area ? `<span class="pill blue">${esc(row.linked_judgement_area.replaceAll("_", " "))}</span>` : ""}
            <span class="pill ${pillClass(row.significance)}">${esc(row.significance || "standard")}</span>
          </div>
        </div>
      </section>

      <aside class="card doc-side">
        <div class="card-title">Evidence metadata</div>
        <div class="mini-meta">
          <div><strong>Source table:</strong> ${esc(row.source_table || "—")}</div>
          <div><strong>Source id:</strong> ${esc(row.source_id || "—")}</div>
          <div><strong>Occurred:</strong> ${esc(fmtDateTime(row.occurred_at || row.event_datetime))}</div>
          <div><strong>Category:</strong> ${esc(row.category || "—")}</div>
          <div><strong>Subcategory:</strong> ${esc(row.subcategory || "—")}</div>
        </div>
      </aside>
    </div>
    `
  );
}

function openInspectionPreview(profile, chronologyRows, reviewRows, planRows) {
  const pack = buildInspectionSummary(chronologyRows, reviewRows, planRows);
  openDoc(
    `${fullName(profile)} — Inspection preview`,
    `Inspection-ready evidence summary`,
    `
    <div class="doc-grid">
      <section class="card">
        <div class="row-card">
          <div class="row-title">Child profile</div>
          <div>${esc(fullName(profile))}</div>
          <div class="row-meta">Placement: ${esc(profile.placement_status || "—")} · Legal status: ${esc(profile.legal_status || "—")}</div>
        </div>
        <div class="row-card">
          <div class="row-title">Pack contents</div>
          <div>Chronology entries: ${esc(pack.chronologyCount)}</div>
          <div>Plans: ${esc(pack.planCount)}</div>
          <div>Reviews: ${esc(pack.reviewCount)}</div>
        </div>
        <div class="row-card">
          <div class="row-title">Quality standards evidence</div>
          ${Object.keys(pack.standards).length ? Object.entries(pack.standards).map(([k,v]) => `<div>${esc(k.replaceAll("_", " "))}: ${esc(v)}</div>`).join("") : `<div class="muted">No standards-linked evidence yet.</div>`}
        </div>
        <div class="row-card">
          <div class="row-title">Judgement areas</div>
          ${Object.keys(pack.judgements).length ? Object.entries(pack.judgements).map(([k,v]) => `<div>${esc(k.replaceAll("_", " "))}: ${esc(v)}</div>`).join("") : `<div class="muted">No judgement-area links yet.</div>`}
        </div>
      </section>
      <aside class="card doc-side">
        <div class="card-title">Export actions</div>
        <button class="btn" id="inspectionExportChronologyBtn">Export chronology</button>
        <button class="btn" id="inspectionExportPlansBtn">Export plans</button>
        <button class="btn primary" id="inspectionPrintBtn">Print / Save PDF</button>
      </aside>
    </div>
    `
  );
  $("inspectionExportChronologyBtn").onclick = () => exportChronology();
  $("inspectionExportPlansBtn").onclick = () => exportPlans();
  $("inspectionPrintBtn").onclick = () => window.print();
}

async function exportChronology() {
  try {
    const rows = arr(await api(ROUTES.chronology(state.selected.id)));
    const text = rows.map(r => [
      `${r.title || "Chronology event"}`,
      `${fmtDateTime(r.occurred_at || r.event_datetime)} · ${r.category || "event"} · ${r.subcategory || "—"}`,
      `${r.summary || ""}`,
      `${r.linked_standard || ""} ${r.linked_judgement_area || ""}`.trim()
    ].join("\n")).join("\n\n---\n\n");

    const blob = new Blob([text || "No chronology entries."], { type: "text/plain;charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  } catch (e) {
    console.error("exportChronology failed", e);
    msg("Chronology export failed", true);
  }
}

async function exportPlans() {
  try {
    const rows = arr(await api(ROUTES.plans(state.selected.id)));
    const text = rows.map(r => [
      `${r.title || "Plan"}`,
      `${r.plan_type || "Plan"} · ${r.status || "draft"} · Version ${r.version_no || 1}`,
      `${r.summary || ""}`
    ].join("\n")).join("\n\n---\n\n");

    const blob = new Blob([text || "No plans found."], { type: "text/plain;charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  } catch (e) {
    console.error("exportPlans failed", e);
    msg("Plan export failed", true);
  }
}

function loadTab() {
  if (!state.selected) return;
  renderPersonHeader();

  const map = {
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
  };

  (map[state.tab] || loadOverview)();
}

document.addEventListener("DOMContentLoaded", () => {
  setHTML("commandCentreMetrics", emptyCard("Shell loaded. Waiting for data..."));
  setHTML("overviewContent", emptyCard("Select a young person to begin."));
  setHTML("timelineContent", emptyCard("Timeline will load here."));
  setHTML("dailyNotesContent", `
    <div class="card toolbar-card">
      <div class="toolbar">
        <div class="muted">Daily recording for shift staff.</div>
        <button class="btn primary" id="newDailyNoteBtn">New daily note</button>
      </div>
    </div>
    ${emptyCard("Daily notes will load here.")}
  `);
  setHTML("incidentsContent", `
    <div class="card toolbar-card">
      <div class="toolbar">
        <div class="muted">Incidents, safeguarding and behaviour records.</div>
        <button class="btn primary" id="newIncidentBtn">New incident</button>
      </div>
    </div>
    ${emptyCard("Incidents will load here.")}
  `);
  setHTML("healthContent", emptyCard("Health records will load here."));
  setHTML("educationContent", emptyCard("Education records will load here."));
  setHTML("familyContent", emptyCard("Family records will load here."));
  setHTML("keyworkContent", emptyCard("Key work sessions will load here."));
  setHTML("plansContent", emptyCard("Plans will load here."));
  setHTML("reviewsContent", emptyCard("Reviews will load here."));
  setHTML("managerQaContent", emptyCard("Manager QA will load here."));

  $$(".nav-btn").forEach(btn => btn.onclick = () => setSection(btn.dataset.section));
  $$(".tab").forEach(btn => btn.onclick = () => setTab(btn.dataset.tab));

  $("youngPersonSelect")?.addEventListener("change", (e) => {
    state.selected = state.youngPeople.find(p => Number(p.id) === Number(e.target.value)) || null;
    loadTab();
  });

  $("timelineEventType")?.addEventListener("change", (e) => {
    state.timelineCategory = e.target.value;
    loadTimeline();
  });

  $("docBackBtn")?.addEventListener("click", closeDoc);
  $("plansOpenCreateBtn")?.addEventListener("click", openNewPlan);
  $("newPlanBtn")?.addEventListener("click", openNewPlan);
  $("quickEventBtn")?.addEventListener("click", () => {
    setSection("young-people");
    setTab("timeline");
  });

  document.body.addEventListener("click", (e) => {
    if (e.target?.id === "newDailyNoteBtn") openNewDailyNote();
    if (e.target?.id === "newIncidentBtn") openNewIncident();
  });

  setSection("command-centre");
  loadYoungPeople();
  loadCommandCentre();
});
