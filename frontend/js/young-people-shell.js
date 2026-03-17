const state = {
  section: "command-centre",
  tab: "overview",
  youngPeople: [],
  selected: null,
  commandCentre: null,
  timelineCategory: "",
};

const $ = (id) => document.getElementById(id);
const $$ = (s) => [...document.querySelectorAll(s)];
const arr = (d) => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
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
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
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
  if (v === "high" || v === "critical") return "red";
  if (v === "medium" || v === "pending" || v === "submitted") return "amber";
  return "blue";
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
  } catch (e) {
    msg(e.message, true);
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
  try {
    const d = await api("/command-centre");
    state.commandCentre = d;

    const metrics = [
      ["Children in home", d.metrics?.children_in_home ?? 0],
      ["High-risk alerts", d.metrics?.high_risk_alerts ?? 0],
      ["Open safeguarding", d.metrics?.open_safeguarding_items ?? 0],
      ["Meds due", d.metrics?.meds_due_this_shift ?? 0],
      ["Overdue reviews", d.metrics?.overdue_reviews ?? 0],
      ["Documents due", d.metrics?.documents_due ?? 0],
    ];

    setHTML("commandCentreMetrics", metrics.map(([k, v]) => `
      <div class="metric-card"><div class="metric-label">${esc(k)}</div><div class="metric-value">${esc(v)}</div></div>
    `).join(""));

    const renderRows = (rows, mapper, empty) => `
      <div class="list">${rows.length ? rows.map(mapper).join("") : `<div class="muted">${empty}</div>`}</div>
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
        <div class="badges"><span class="pill ${pillClass(r.priority)}">${esc(r.priority || "normal")}</span></div>
      </div>
    `, "No outstanding shift tasks."));

    setHTML("commandCentreMeds", renderRows(d.meds_due || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.young_person_name)}</div>
        <div class="row-meta">${esc(r.item)} · Due ${esc(r.time_due)}</div>
        <div class="badges"><span class="pill amber">${esc(r.status || "due")}</span></div>
      </div>
    `, "No medication due."));

    setHTML("commandCentreHandover", renderRows(d.handover || [], r => `
      <div class="row-card">
        <div class="row-title">${esc(r.time)} · ${esc(r.title)}</div>
        <div>${esc(r.detail || "")}</div>
      </div>
    `, "No handover items."));
  } catch (e) {
    msg(e.message, true);
  }
}

async function loadOverview() {
  try {
    const d = await api(`/young-people/${state.selected.id}`);
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
    `);
  } catch (e) {
    msg(e.message, true);
  }
}

async function loadTimeline() {
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
              <span class="pill ${pillClass(r.significance)}">${esc(r.significance || "standard")}</span>
              ${r.linked_standard ? `<span class="pill blue">${esc(r.linked_standard.replaceAll("_", " "))}</span>` : ""}
              ${r.linked_judgement_area ? `<span class="pill blue">${esc(r.linked_judgement_area.replaceAll("_", " "))}</span>` : ""}
            </div>
          </div>
        `).join("") : `<div class="card"><div class="muted">No chronology recorded yet.</div></div>`}
      </div>
    `);
  } catch (e) {
    msg(e.message, true);
  }
}

async function loadPlans() {
  try {
    const rows = arr(await api(`/young-people/${state.selected.id}/plans`));
    setHTML("plansContent", `
      <div class="list">
        ${rows.length ? rows.map(r => `
          <div class="row-card open-plan" data-id="${r.id}">
            <div class="row-title">${esc(r.title || "Untitled plan")}</div>
            <div class="row-meta">${esc(r.plan_type || "Plan")} · Status: ${esc(r.status || "draft")} · Version ${esc(r.version_no || 1)}</div>
            <div>${esc(r.summary || "No summary recorded.")}</div>
          </div>
        `).join("") : `<div class="card"><div class="muted">No plans found.</div></div>`}
      </div>
    `);
    $$(".open-plan").forEach(el => el.onclick = () => openPlan(Number(el.dataset.id)));
  } catch (e) {
    msg(e.message, true);
  }
}

async function loadReviews() {
  try {
    const rows = arr(await api("/workflow-reviews"));
    const html = `
      <div class="list">
        ${rows.length ? rows.map(r => `
          <div class="row-card open-review" data-id="${r.id}">
            <div class="row-title">${esc(r.record_type)} review · ${esc(r.young_person_name || "—")}</div>
            <div class="row-meta">Status: ${esc(r.status)} · Submitted: ${esc(fmtDateTime(r.submitted_at))}</div>
            <div>${esc(r.review_note || "Awaiting manager decision.")}</div>
            <div class="badges"><span class="pill ${pillClass(r.status)}">${esc(r.status)}</span></div>
          </div>
        `).join("") : `<div class="card"><div class="muted">No review items.</div></div>`}
      </div>
    `;
    setHTML("reviewsContent", html);
    setHTML("managerQaContent", html);
    $$(".open-review").forEach(el => el.onclick = () => openReview(Number(el.dataset.id)));
  } catch (e) {
    msg(e.message, true);
  }
}

function renderHandover() {
  const rows = state.commandCentre?.handover || [];
  setHTML("handoverBoard", `
    <div class="list">
      ${rows.length ? rows.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.time)} · ${esc(r.title)}</div>
          <div>${esc(r.detail || "")}</div>
        </div>
      `).join("") : `<div class="muted">No handover items available.</div>`}
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
        <span class="pill">${esc(r.status || "draft")}</span>
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
  } catch (e) {
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
    msg(e.message, true);
  }
}

function loadTab() {
  if (!state.selected) return;
  renderPersonHeader();
  ({ overview: loadOverview, timeline: loadTimeline, plans: loadPlans, reviews: loadReviews }[state.tab] || loadOverview)();
}

document.addEventListener("DOMContentLoaded", () => {
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
