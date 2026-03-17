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
};

const $ = (id) => document.getElementById(id);
const $$ = (s) => [...document.querySelectorAll(s)];
const arr = (d) => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.rows) ? d.rows : Array.isArray(d?.data) ? d.data : [];
const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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

function msg(text, bad = false) {
  const el = $("statusBar");
  if (!el) return;
  el.classList.remove("hidden");
  el.innerHTML = `<span class="pill ${bad ? "red" : "green"}">${esc(text)}</span>`;
  setTimeout(() => el.classList.add("hidden"), 2500);
}

function pillClass(v) {
  v = String(v || "").toLowerCase();
  if (["high", "critical", "escalated"].includes(v)) return "red";
  if (["medium", "pending", "submitted", "awaiting_review", "returned"].includes(v)) return "amber";
  if (["approved", "reviewed", "active", "low"].includes(v)) return "green";
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

function evidenceBadges(row) {
  const badges = [];
  if (row.significance) badges.push(`<span class="pill ${pillClass(row.significance)}">${esc(row.significance)}</span>`);
  if (row.linked_standard) badges.push(`<span class="pill blue">${esc(row.linked_standard.replaceAll("_", " "))}</span>`);
  if (row.linked_judgement_area) badges.push(`<span class="pill blue">${esc(row.linked_judgement_area.replaceAll("_", " "))}</span>`);
  if (row.source_table) badges.push(`<span class="pill blue">Source: ${esc(row.source_table)}</span>`);
  return badges.join("");
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

    setHTML("commandCentreHandover", renderSimpleRows(d.handover || [], {
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
      api(`/young-people/${state.selected.id}/chronology`).then(arr).catch(() => []),
      api(`/workflow-reviews`).then(arr).catch(() => []),
      api(`/young-people/${state.selected.id}/plans`).then(arr).catch(() => []),
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
            <div class="row-card"><div class="row-title">Allergies / health alerts</div><div>${esc(d.health_alerts || "None recorded")}</div></div>
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
      btn.onclick = async () => {
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

async function loadCollectionPanel(url, targetId, config) {
  if (!state.selected) {
    setHTML(targetId, emptyCard("No young person selected."));
    return;
  }

  setHTML(targetId, emptyCard("Loading..."));

  try {
    const rows = arr(await api(url));
    setHTML(targetId, renderSimpleRows(rows, config));
  } catch (e) {
    console.error(`loadCollectionPanel failed for ${url}`, e);
    setHTML(targetId, emptyCard("This section is not available yet."));
  }
}

async function loadDailyNotes() {
  return loadCollectionPanel(ROUTES.dailyNotes(state.selected.id), "dailyNotesContent", {
    title: r => r.title || "Daily note",
    meta: r => fmtDateTime(r.note_date || r.recorded_at || r.created_at),
    body: r => esc(r.summary || r.positives || r.presentation || r.behaviour_update || "Daily note recorded"),
    badges: r => `<span class="pill ${pillClass(r.significance || r.status)}">${esc(r.significance || r.status || "recorded")}</span>`
  });
}

async function loadIncidents() {
  try {
    const rows = arr(await api(ROUTES.incidents(state.selected.id)));
    setHTML("incidentsContent", renderSimpleRows(rows, {
      title: r => r.title || r.incident_type || "Incident",
      meta: r => `${fmtDateTime(r.occurred_at || r.incident_datetime || r.created_at)} · ${esc(r.location || "—")}`,
      body: r => esc(r.description || r.narrative || r.follow_up_required || "Incident recorded"),
      badges: r => `<span class="pill ${pillClass(r.severity || r.risk_level)}">${esc(r.severity || r.risk_level || "medium")}</span><span class="pill ${pillClass(r.manager_review_status || r.workflow_status)}">${esc(r.manager_review_status || r.workflow_status || "pending")}</span>`
    }));
  } catch (e) {
    console.error("loadIncidents failed", e);
    setHTML("incidentsContent", emptyCard("Incidents failed to load."));
  }
}

async function loadHealth() {
  return loadCollectionPanel(ROUTES.health(state.selected.id), "healthContent", {
    title: r => r.title || r.record_type || "Health record",
    meta: r => fmtDateTime(r.event_datetime || r.recorded_at || r.created_at),
    body: r => esc(r.summary || r.notes || r.outcome || "Health record"),
    badges: r => r.follow_up_required ? `<span class="pill amber">Follow-up required</span>` : `<span class="pill green">Recorded</span>`
  });
}

async function loadEducation() {
  return loadCollectionPanel(ROUTES.education(state.selected.id), "educationContent", {
    title: r => r.provision_name || r.school_name || "Education record",
    meta: r => `${fmtDate(r.record_date || r.created_at)} · ${esc(r.attendance_status || r.education_status || "—")}`,
    body: r => esc(r.achievement_note || r.behaviour_summary || r.learning_engagement || r.summary || "Education update")
  });
}

async function loadFamily() {
  return loadCollectionPanel(ROUTES.family(state.selected.id), "familyContent", {
    title: r => r.contact_person || r.title || "Family contact",
    meta: r => `${fmtDateTime(r.contact_datetime || r.created_at)} · ${esc(r.contact_type || "contact")}`,
    body: r => esc(r.child_voice || r.post_contact_presentation || r.concerns || r.summary || "Family contact recorded"),
    badges: r => r.follow_up_required ? `<span class="pill amber">Follow-up required</span>` : ""
  });
}

async function loadKeywork() {
  return loadCollectionPanel(ROUTES.keywork(state.selected.id), "keyworkContent", {
    title: r => r.topic || r.title || "Key work session",
    meta: r => fmtDate(r.session_date || r.created_at),
    body: r => esc(r.summary || r.child_voice || r.reflective_analysis || "Key work session recorded")
  });
}

async function loadPlans() {
  if (!state.selected) {
    setHTML("plansContent", emptyCard("No young person selected."));
    return;
  }

  setHTML("plansContent", emptyCard("Loading plans..."));

  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/plans`));

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
  const rows = state.commandCentre?.handover || [];
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
          title: $("planTitle").value,
          summary: $("planSummary").value,
          child_voice: $("planVoice").value,
          staff_guidance: $("planStaffGuidance").value,
          formulation: $("planFormulation").value
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
      const res = await api("/young-people/plans", {
        method: "POST",
        body: JSON.stringify({
          young_person_id: state.selected.id,
          title: $("newPlanTitle").value,
          summary: $("newPlanSummary").value,
          child_voice: $("newPlanVoice").value,
          staff_guidance: $("newPlanStaffGuidance").value,
          formulation: $("newPlanFormulation").value
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
          review_note: $("reviewNote").value,
          child_voice_captured: $("reviewChildVoice").checked,
          trauma_informed: $("reviewTraumaInformed").checked,
          actions_required: $("reviewActionsRequired").checked,
          requires_external_notification: $("reviewExternal").checked
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
          ${Object.keys(pack.standards).length ? Object.entries(pack.standards).map(([k,v]) => `
            <div>${esc(k.replaceAll("_", " "))}: ${esc(v)}</div>
          `).join("") : `<div class="muted">No standards-linked evidence yet.</div>`}
        </div>

        <div class="row-card">
          <div class="row-title">Judgement areas</div>
          ${Object.keys(pack.judgements).length ? Object.entries(pack.judgements).map(([k,v]) => `
            <div>${esc(k.replaceAll("_", " "))}: ${esc(v)}</div>
          `).join("") : `<div class="muted">No judgement-area links yet.</div>`}
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
    const rows = arr(await api(`/young-people/${state.selected.id}/chronology`));
    const text = rows.map(r => [
      `${r.title || "Chronology event"}`,
      `${fmtDateTime(r.occurred_at || r.event_datetime)} · ${r.category || "event"} · ${r.subcategory || "—"}`,
      `${r.summary || ""}`,
      `${r.linked_standard || ""} ${r.linked_judgement_area || ""}`.trim()
    ].join("\n")).join("\n\n---\n\n");

    const blob = new Blob([text || "No chronology entries."], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (e) {
    console.error("exportChronology failed", e);
    msg("Chronology export failed", true);
  }
}

async function exportPlans() {
  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/plans`));
    const text = rows.map(r => [
      `${r.title || "Plan"}`,
      `${r.plan_type || "Plan"} · ${r.status || "draft"} · Version ${r.version_no || 1}`,
      `${r.summary || ""}`
    ].join("\n")).join("\n\n---\n\n");

    const blob = new Blob([text || "No plans found."], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
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
  setHTML("dailyNotesContent", emptyCard("Daily notes will load here."));
  setHTML("incidentsContent", emptyCard("Incidents will load here."));
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

  setSection("command-centre");
  loadYoungPeople();
  loadCommandCentre();
});
