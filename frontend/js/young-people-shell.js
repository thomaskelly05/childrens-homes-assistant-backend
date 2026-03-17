const state = {
  section: "command-centre",
  tab: "overview",
  youngPeople: [],
  selected: null,
  commandCentre: null,
  timelineCategory: "",
  inspectionPack: null,
};

const $ = (id) => document.getElementById(id);
const $$ = (s) => [...document.querySelectorAll(s)];
const arr = (d) => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-GB") : "—";
const fmtDateTime = (v) => v ? new Date(v).toLocaleString("en-GB") : "—";
const fullName = (p) => `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || p?.name || "Young person";

console.log("young-people-shell.js loaded");

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
  if (["approved", "reviewed", "active"].includes(v)) return "green";
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
    "young-people": ["Young People", "Child-centred recording, chronology and plans"],
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
  if (row.source_id) badges.push(`<span class="pill blue">Ref ${esc(row.source_id)}</span>`);
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
    console.log("command centre", d);
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

    const renderRows = (rows, mapper, empty) =>
      `<div class="list">${rows.length ? rows.map(mapper).join("") : `<div class="row-card"><div class="muted">${empty}</div></div>`}</div>`;

    setHTML("commandCentreAlerts", renderRows(d.alerts || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.title)}</div>
        <div class="row-meta">${esc(r.young_person_name || "—")}</div>
        <div>${esc(r.detail || "")}</div>
        <div class="badges">
          <span class="pill ${pillClass(r.level)}">${esc(r.level || "info")}</span>
          <span class="pill blue">Evidence</span>
        </div>
      </div>
    `, "No live alerts."));

    setHTML("commandCentreTasks", renderRows(d.tasks || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.title)}</div>
        <div class="row-meta">Due: ${esc(r.due || "—")}</div>
      </div>
    `, "No outstanding shift tasks."));

    setHTML("commandCentreMeds", renderRows(d.meds_due || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.young_person_name || "—")}</div>
        <div class="row-meta">${esc(r.item || "—")} · Due ${esc(r.time_due || "—")}</div>
      </div>
    `, "No medication due."));

    setHTML("commandCentreHandover", renderRows(d.handover || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.time || "—")} · ${esc(r.title || "Handover item")}</div>
        <div>${esc(r.detail || "")}</div>
      </div>
    `, "No handover items."));
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

    console.log("overview", d);

    const inspection = buildInspectionSummary(chronologyRows, reviewRows, planRows);
    state.inspectionPack = inspection;

    setHTML("overviewContent", `
      <div class="grid two-col">
        <div class="card">
          <h3 class="card-title">Tonight at a glance</h3>
          <div class="list">
            <div class="row-card"><div class="row-title">Current risk summary</div><div>${esc(d.summary_risk || d.summary_risk_level || "No summary recorded")}</div></div>
            <div class="row-card"><div class="row-title">Key guidance for staff</div><div>${esc(d.staff_guidance || "No staff guidance recorded")}</div></div>
            <div class="row-card"><div class="row-title">De-escalation / regulation</div><div>${esc(d.de_escalation_guidance || "No de-escalation guidance recorded")}</div></div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">Operational snapshot</h3>
          <div class="list">
            <div class="row-card"><div class="row-title">Placement status</div><div>${esc(d.placement_status || "—")}</div></div>
            <div class="row-card"><div class="row-title">Allergies / health alerts</div><div>${esc(d.health_alerts || "None recorded")}</div></div>
            <div class="row-card"><div class="row-title">Family/contact note</div><div>${esc(d.family_contact_summary || "No current summary")}</div></div>
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
    console.log("timeline", rows);

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

async function loadPlans() {
  if (!state.selected) {
    setHTML("plansContent", emptyCard("No young person selected."));
    return;
  }

  setHTML("plansContent", emptyCard("Loading plans..."));

  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/plans`));
    console.log("plans", rows);

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
    console.log("reviews", rows);

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
    plans: loadPlans,
    reviews: loadReviews
  };

  (map[state.tab] || loadOverview)();
}

document.addEventListener("DOMContentLoaded", () => {
  setHTML("commandCentreMetrics", emptyCard("Shell loaded. Waiting for data..."));
  setHTML("overviewContent", emptyCard("Select a young person to begin."));
  setHTML("timelineContent", emptyCard("Timeline will load here."));
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
