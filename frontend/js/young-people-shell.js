// ================= STATE =================
const state = {
  shell: {
    section: "command-centre"
  },
  youngPeople: [],
  selected: null,
  activeTab: "overview",
  commandCentre: null,
  timelineFilter: {
    eventType: ""
  },
  document: {
    id: null,
    type: null,
    mode: "browse",
    status: null,
    version: null,
    dirty: false
  }
};

// ================= HELPERS =================
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

const fDate = value => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
};

const fDateTime = value => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
};

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
  setTimeout(() => el.classList.add("hidden"), 3000);
}

async function j(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  return res.json();
}

function fullName(p) {
  return `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || p?.name || "Young person";
}

function riskPillClass(risk) {
  const v = String(risk || "").toLowerCase();
  if (v === "high") return "red";
  if (v === "medium") return "amber";
  return "green";
}

function sectionTitle(section) {
  return ({
    "command-centre": "Command Centre",
    "young-people": "Young People",
    "handover": "Handover",
    "manager-qa": "Manager QA"
  })[section] || "IndiCare";
}

function sectionSubtitle(section) {
  return ({
    "command-centre": "Shift-first oversight for children’s residential care",
    "young-people": "Child-centred recording, plans, risks and evidence",
    "handover": "Continuity built from recorded reality",
    "manager-qa": "Review, oversight and inspection readiness"
  })[section] || "";
}

// ================= NAVIGATION =================
function setSection(section) {
  state.shell.section = section;

  $$(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });

  $$(".section").forEach(el => {
    el.classList.toggle("active", el.id === `section-${section}`);
  });

  setText("pageTitle", sectionTitle(section));
  setText("pageSubtitle", sectionSubtitle(section));

  if (section === "command-centre") loadCommandCentre();
  if (section === "young-people") loadTab();
  if (section === "handover") renderHandoverBoard();
  if (section === "manager-qa") loadReviews();
}

function setTab(tab) {
  state.activeTab = tab;

  $$(".tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  $$(".panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-${tab}`);
  });

  loadTab();
}

// ================= DOCUMENT MODE =================
function openDocument() {
  $("browseMode")?.classList.add("hidden");
  $("documentMode")?.classList.remove("hidden");
}

function closeDocument() {
  $("documentMode")?.classList.add("hidden");
  $("browseMode")?.classList.remove("hidden");
}

function setDoc(title, meta = "—") {
  setText("docTitle", title);
  setText("docMetaLine", meta);
}

// ================= COMMAND CENTRE =================
async function loadCommandCentre() {
  try {
    const data = await j("/command-centre");
    state.commandCentre = data;

    renderCommandCentreMetrics(data.metrics || {});
    renderCommandCentreAlerts(data.alerts || []);
    renderCommandCentreTasks(data.tasks || []);
    renderCommandCentreMeds(data.meds_due || []);
    renderCommandCentreHandover(data.handover || []);
  } catch (e) {
    msg(e.message, true);
  }
}

function renderCommandCentreMetrics(metrics) {
  const cards = [
    ["Children in home", metrics.children_in_home ?? 0],
    ["High-risk alerts", metrics.high_risk_alerts ?? 0],
    ["Open safeguarding", metrics.open_safeguarding_items ?? 0],
    ["Meds due", metrics.meds_due_this_shift ?? 0],
    ["Overdue reviews", metrics.overdue_reviews ?? 0],
    ["Documents due", metrics.documents_due ?? 0],
  ];

  setHTML("commandCentreMetrics", cards.map(([label, value]) => `
    <div class="metric-card">
      <div class="metric-label">${esc(label)}</div>
      <div class="metric-value">${esc(value)}</div>
    </div>
  `).join(""));
}

function renderCommandCentreAlerts(rows) {
  setHTML("commandCentreAlerts", `
    <div class="list">
      ${rows.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.title)}</div>
          <div class="row-meta">${esc(r.young_person_name || "—")}</div>
          <div>${esc(r.detail || "")}</div>
          <div class="badges">
            <span class="pill ${r.level === "high" ? "red" : "amber"}">${esc(r.level || "info")}</span>
          </div>
        </div>
      `).join("") || `<div class="muted">No live alerts.</div>`}
    </div>
  `);
}

function renderCommandCentreTasks(rows) {
  setHTML("commandCentreTasks", `
    <div class="list">
      ${rows.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.title)}</div>
          <div class="row-meta">Due: ${esc(r.due || "—")}</div>
          <div class="badges">
            <span class="pill ${r.priority === "high" ? "red" : "blue"}">${esc(r.priority || "normal")}</span>
          </div>
        </div>
      `).join("") || `<div class="muted">No outstanding shift tasks.</div>`}
    </div>
  `);
}

function renderCommandCentreMeds(rows) {
  setHTML("commandCentreMeds", `
    <div class="list">
      ${rows.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.young_person_name)}</div>
          <div class="row-meta">${esc(r.item)} · Due ${esc(r.time_due)}</div>
          <div class="badges">
            <span class="pill amber">${esc(r.status || "due")}</span>
          </div>
        </div>
      `).join("") || `<div class="muted">No medication due.</div>`}
    </div>
  `);
}

function renderCommandCentreHandover(rows) {
  setHTML("commandCentreHandover", `
    <div class="list">
      ${rows.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.time)} · ${esc(r.title)}</div>
          <div>${esc(r.detail || "")}</div>
        </div>
      `).join("") || `<div class="muted">No handover items.</div>`}
    </div>
  `);
}

// ================= YOUNG PEOPLE =================
async function loadYoungPeople() {
  try {
    const rows = arr(await j("/young-people"));
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
    renderSelectedYoungPersonHeader();
    loadTab();
  } catch (e) {
    msg(e.message, true);
  }
}

function renderSelectedYoungPersonHeader() {
  const p = state.selected;
  if (!p) return;

  setText("selectedYoungPersonName", fullName(p));
  setText(
    "selectedYoungPersonMeta",
    `Placement: ${p.placement_status || "—"} · Legal status: ${p.legal_status || "—"}`
  );

  setHTML("selectedYoungPersonBadges", `
    <span class="pill ${riskPillClass(p.summary_risk_level)}">Risk: ${esc(p.summary_risk_level || "—")}</span>
    <span class="pill blue">Home: ${esc(p.home_name || "Main home")}</span>
    <span class="pill">Review due: ${esc(p.next_review_due ? fDate(p.next_review_due) : "—")}</span>
  `);
}

async function loadOverview() {
  try {
    const d = await j(`/young-people/${state.selected.id}`);

    setHTML("overviewContent", `
      <div class="grid two-col">
        <div class="card">
          <h3 class="card-title">Tonight at a glance</h3>
          <div class="list">
            <div class="row-card">
              <div class="row-title">Current risk summary</div>
              <div>${esc(d.summary_risk || d.summary_risk_level || "No summary recorded")}</div>
            </div>
            <div class="row-card">
              <div class="row-title">Key guidance for staff</div>
              <div>${esc(d.staff_guidance || "No staff guidance recorded")}</div>
            </div>
            <div class="row-card">
              <div class="row-title">De-escalation / regulation</div>
              <div>${esc(d.de_escalation_guidance || "No de-escalation guidance recorded")}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">Operational snapshot</h3>
          <div class="list">
            <div class="row-card">
              <div class="row-title">Placement status</div>
              <div>${esc(d.placement_status || "—")}</div>
            </div>
            <div class="row-card">
              <div class="row-title">Allergies / health alerts</div>
              <div>${esc(d.health_alerts || "None recorded")}</div>
            </div>
            <div class="row-card">
              <div class="row-title">Family/contact note</div>
              <div>${esc(d.family_contact_summary || "No current summary")}</div>
            </div>
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
    const type = state.timelineFilter.eventType;
    const qs = new URLSearchParams({ young_person_id: state.selected.id });
    if (type) qs.set("event_type", type);

    const rows = arr(await j(`/events?${qs.toString()}`));

    setHTML("timelineContent", `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card open-event" data-id="${r.id}">
            <div class="row-title">${esc(r.title)}</div>
            <div class="row-meta">
              ${esc(fDateTime(r.occurred_at))} · ${esc(r.event_type)} · Status: ${esc(r.workflow_status || "draft")}
            </div>
            <div>${esc(r.narrative || "No narrative recorded.")}</div>
            <div class="badges">
              <span class="pill ${riskPillClass(r.risk_level)}">Risk: ${esc(r.risk_level || "—")}</span>
              ${(r.quality_standards || []).map(s => `<span class="pill blue">${esc(s.replaceAll("_", " "))}</span>`).join("")}
            </div>
          </div>
        `).join("") || `<div class="card"><div class="muted">No events recorded yet.</div></div>`}
      </div>
    `);

    $$(".open-event").forEach(el => {
      el.addEventListener("click", () => openEvent(Number(el.dataset.id)));
    });
  } catch (e) {
    msg(e.message, true);
  }
}

async function loadPlans() {
  try {
    const rows = arr(await j(`/young-people/${state.selected.id}/plans`));

    setHTML("plansContent", `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card open-plan" data-id="${r.id}">
            <div class="row-title">${esc(r.title || "Untitled plan")}</div>
            <div class="row-meta">
              ${esc(r.plan_type || "Plan")} · Status: ${esc(r.status || "draft")} · Version ${esc(r.version_no || 1)}
            </div>
            <div>${esc(r.summary || "No summary recorded.")}</div>
          </div>
        `).join("") || `<div class="card"><div class="muted">No plans found.</div></div>`}
      </div>
    `);

    $$(".open-plan").forEach(el => {
      el.addEventListener("click", () => openPlan(Number(el.dataset.id)));
    });
  } catch (e) {
    msg(e.message, true);
  }
}

async function loadReviews() {
  try {
    const rows = arr(await j("/workflow-reviews"));

    setHTML("reviewsContent", `
      <div class="list">
        ${rows.map(r => `
          <div class="row-card open-review" data-id="${r.id}">
            <div class="row-title">${esc(r.record_type)} review · ${esc(r.young_person_name || "—")}</div>
            <div class="row-meta">Status: ${esc(r.status)} · Submitted: ${esc(fDateTime(r.submitted_at))}</div>
            <div>${esc(r.review_note || "Awaiting manager decision.")}</div>
            <div class="badges">
              <span class="pill ${r.status === "awaiting_review" ? "amber" : "blue"}">${esc(r.status)}</span>
            </div>
          </div>
        `).join("") || `<div class="card"><div class="muted">No review items.</div></div>`}
      </div>
    `);

    setHTML("managerQaContent", $("reviewsContent").innerHTML);

    $$(".open-review").forEach(el => {
      el.addEventListener("click", () => openReview(Number(el.dataset.id)));
    });
  } catch (e) {
    msg(e.message, true);
  }
}

function renderHandoverBoard() {
  const handover = state.commandCentre?.handover || [];

  setHTML("handoverBoard", `
    <div class="list">
      ${handover.map(r => `
        <div class="row-card">
          <div class="row-title">${esc(r.time)} · ${esc(r.title)}</div>
          <div>${esc(r.detail || "")}</div>
        </div>
      `).join("") || `<div class="muted">No handover items available.</div>`}
    </div>
  `);
}

// ================= EVENT DOCUMENT =================
async function openEvent(id) {
  try {
    openDocument();

    const r = await j(`/events/${id}`);

    state.document = {
      id: r.id,
      type: "event",
      mode: "edit",
      status: r.workflow_status || "draft",
      version: 1,
      dirty: false
    };

    setDoc(r.title || "Event", `${r.event_type || "event"} · Status: ${r.workflow_status || "draft"}`);

    setHTML("docBody", `
      <div class="doc-meta-bar">
        <span class="pill">${esc(r.event_type || "event")}</span>
        <span class="pill">${esc(r.workflow_status || "draft")}</span>
        <span class="pill ${riskPillClass(r.risk_level)}">Risk: ${esc(r.risk_level || "—")}</span>
      </div>

      <div class="doc-grid">
        <section class="card">
          <label class="label">Title</label>
          <input id="eventTitle" class="input" value="${esc(r.title || "")}" />

          <label class="label">Narrative</label>
          <textarea id="eventNarrative" class="textarea">${esc(r.narrative || "")}</textarea>

          <label class="label">Antecedent / context</label>
          <textarea id="eventAntecedent" class="textarea">${esc(r.antecedent || "")}</textarea>

          <label class="label">Presentation / behaviour</label>
          <textarea id="eventPresentation" class="textarea">${esc(r.presentation || "")}</textarea>

          <label class="label">Staff response</label>
          <textarea id="eventStaffResponse" class="textarea">${esc(r.staff_response || "")}</textarea>

          <label class="label">Trauma-informed formulation</label>
          <textarea id="eventFormulation" class="textarea">${esc(r.trauma_informed_formulation || "")}</textarea>

          <label class="label">Outcome</label>
          <textarea id="eventOutcome" class="textarea">${esc(r.outcome || "")}</textarea>

          <label class="label">Child voice</label>
          <textarea id="eventChildVoice" class="textarea">${esc(r.child_voice || "")}</textarea>

          <label class="label">Restorative follow-up</label>
          <textarea id="eventRestorative" class="textarea">${esc(r.restorative_follow_up || "")}</textarea>
        </section>

        <aside class="card doc-side">
          <div class="card-title">Workflow</div>

          <label class="label">Risk level</label>
          <select id="eventRiskLevel" class="input">
            <option value="">Not set</option>
            <option value="low" ${r.risk_level === "low" ? "selected" : ""}>Low</option>
            <option value="medium" ${r.risk_level === "medium" ? "selected" : ""}>Medium</option>
            <option value="high" ${r.risk_level === "high" ? "selected" : ""}>High</option>
          </select>

          <label class="label">Quality standards</label>
          <div class="badges" id="qualityStandardsPicker">
            ${[
              "quality_and_purpose_of_care",
              "wishes_and_feelings",
              "education",
              "enjoyment_and_achievement",
              "health_and_wellbeing",
              "positive_relationships",
              "protection_of_children",
              "leadership_and_management",
              "care_planning"
            ].map(k => `
              <label class="pill">
                <input type="checkbox" class="qs-check" value="${k}" ${(r.quality_standards || []).includes(k) ? "checked" : ""}/>
                ${esc(k.replaceAll("_", " "))}
              </label>
            `).join("")}
          </div>

          <button id="saveEventBtn" class="btn primary">Save draft</button>
          <button id="submitEventBtn" class="btn">Submit for review</button>
          <button id="approveEventBtn" class="btn">Approve</button>

          <hr />

          <div class="mini-meta">
            <div><strong>Occurred:</strong> ${esc(fDateTime(r.occurred_at))}</div>
            <div><strong>Shift:</strong> ${esc(r.shift_type || "—")}</div>
            <div><strong>Manager review:</strong> ${r.requires_manager_review ? "Required" : "Not required"}</div>
            <div><strong>Updated:</strong> ${esc(fDateTime(r.updated_at))}</div>
          </div>
        </aside>
      </div>
    `);

    $("saveEventBtn").onclick = async () => {
      await j(`/events/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: $("eventTitle").value,
          narrative: $("eventNarrative").value,
          antecedent: $("eventAntecedent").value,
          presentation: $("eventPresentation").value,
          staff_response: $("eventStaffResponse").value,
          trauma_informed_formulation: $("eventFormulation").value,
          outcome: $("eventOutcome").value,
          child_voice: $("eventChildVoice").value,
          restorative_follow_up: $("eventRestorative").value,
          risk_level: $("eventRiskLevel").value || null,
          quality_standards: $$(".qs-check:checked").map(x => x.value)
        })
      });
      msg("Event saved");
      loadTimeline();
      openEvent(id);
    };

    $("submitEventBtn").onclick = async () => {
      await j(`/events/${id}/submit`, { method: "POST" });
      msg("Event submitted for review");
      loadTimeline();
      openEvent(id);
    };

    $("approveEventBtn").onclick = async () => {
      await j(`/events/${id}/approve`, { method: "POST" });
      msg("Event approved");
      loadTimeline();
      openEvent(id);
    };
  } catch (e) {
    msg(e.message, true);
  }
}

async function openNewEvent() {
  try {
    openDocument();
    setDoc("New event", "Create a joined-up residential care record");

    setHTML("docBody", `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Event type</label>
          <select id="newEventType" class="input">
            <option value="daily_note">Daily note</option>
            <option value="incident">Incident</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="contact">Contact</option>
            <option value="keywork">Key work</option>
            <option value="missing_update">Missing update</option>
            <option value="achievement">Achievement</option>
          </select>

          <label class="label">Title</label>
          <input id="newEventTitle" class="input" placeholder="Short clear title" />

          <label class="label">Narrative</label>
          <textarea id="newEventNarrative" class="textarea"></textarea>

          <label class="label">Antecedent / context</label>
          <textarea id="newEventAntecedent" class="textarea"></textarea>

          <label class="label">Staff response</label>
          <textarea id="newEventStaffResponse" class="textarea"></textarea>

          <label class="label">Child voice</label>
          <textarea id="newEventChildVoice" class="textarea"></textarea>

          <label class="label">Outcome</label>
          <textarea id="newEventOutcome" class="textarea"></textarea>
        </section>

        <aside class="card doc-side">
          <div class="card-title">Workflow</div>

          <label class="label">Risk level</label>
          <select id="newEventRisk" class="input">
            <option value="">Not set</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <label class="label">Quality standards</label>
          <div class="badges">
            ${[
              "quality_and_purpose_of_care",
              "wishes_and_feelings",
              "education",
              "enjoyment_and_achievement",
              "health_and_wellbeing",
              "positive_relationships",
              "protection_of_children",
              "leadership_and_management",
              "care_planning"
            ].map(k => `
              <label class="pill">
                <input type="checkbox" class="new-qs-check" value="${k}" />
                ${esc(k.replaceAll("_", " "))}
              </label>
            `).join("")}
          </div>

          <label class="pill">
            <input type="checkbox" id="newEventNeedsReview" />
            Requires manager review
          </label>

          <button id="createEventSubmitBtn" class="btn primary">Create event</button>
        </aside>
      </div>
    `);

    $("createEventSubmitBtn").onclick = async () => {
      const res = await j("/events", {
        method: "POST",
        body: JSON.stringify({
          young_person_id: state.selected.id,
          event_type: $("newEventType").value,
          title: $("newEventTitle").value,
          narrative: $("newEventNarrative").value,
          antecedent: $("newEventAntecedent").value,
          staff_response: $("newEventStaffResponse").value,
          child_voice: $("newEventChildVoice").value,
          outcome: $("newEventOutcome").value,
          risk_level: $("newEventRisk").value || null,
          requires_manager_review: $("newEventNeedsReview").checked,
          quality_standards: $$(".new-qs-check:checked").map(x => x.value),
          workflow_status: "draft"
        })
      });

      msg("Event created");
      loadTimeline();
      openEvent(res.id);
    };
  } catch (e) {
    msg(e.message, true);
  }
}

// ================= PLAN DOCUMENT =================
async function openPlan(id) {
  try {
    openDocument();

    const r = await j(`/young-people/plans/${id}`);

    state.document = {
      id: r.id,
      type: "plan",
      mode: "edit",
      status: r.status || "draft",
      version: r.version_no || 1,
      dirty: false
    };

    setDoc(r.title || "Plan", `${r.plan_type || "Plan"} · Status: ${r.status || "draft"} · Version ${r.version_no || 1}`);

    setHTML("docBody", `
      <div class="doc-meta-bar">
        <span class="pill">${esc(r.plan_type || "Plan")}</span>
        <span class="pill">${esc(r.status || "draft")}</span>
        <span class="pill">Version ${esc(r.version_no || 1)}</span>
        <span class="pill">Review due: ${esc(r.review_due_at ? fDate(r.review_due_at) : "—")}</span>
      </div>

      <div class="doc-grid">
        <section class="card">
          <label class="label">Title</label>
          <input id="planTitle" class="input" value="${esc(r.title || "")}" />

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
          <button id="submitPlanBtn" class="btn">Submit for review</button>
          <button id="approvePlanBtn" class="btn">Approve</button>
          <button id="exportPlanBtn" class="btn">Export PDF</button>

          <hr />

          <div class="mini-meta">
            <div><strong>Owner:</strong> ${esc(r.owner_name || "—")}</div>
            <div><strong>Reviewer:</strong> ${esc(r.reviewer_name || "—")}</div>
            <div><strong>Updated:</strong> ${esc(r.updated_at ? fDateTime(r.updated_at) : "—")}</div>
          </div>
        </aside>
      </div>
    `);

    $("savePlanBtn").onclick = async () => {
      await j(`/young-people/plans/${id}`, {
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
      const endpoint = `/young-people/plans/${id}/submit`;
      await j(endpoint, { method: "POST" });
      msg("Plan submitted for review");
      loadPlans();
      openPlan(id);
    };

    $("approvePlanBtn").onclick = async () => {
      const endpoint = `/young-people/plans/${id}/approve`;
      await j(endpoint, { method: "POST" });
      msg("Plan approved");
      loadPlans();
      openPlan(id);
    };

    $("exportPlanBtn").onclick = () => {
      window.open(`/young-people/plans/${id}/export`, "_blank");
    };
  } catch (e) {
    msg(e.message, true);
  }
}

async function openNewPlan() {
  try {
    openDocument();
    setDoc("New plan", "Create a child-centred working document");

    setHTML("docBody", `
      <div class="doc-grid">
        <section class="card">
          <label class="label">Title</label>
          <input id="newPlanTitle" class="input" placeholder="Plan title" />

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
      const res = await j("/young-people/plans", {
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
    };
  } catch (e) {
    msg(e.message, true);
  }
}

// ================= REVIEW DOCUMENT =================
async function openReview(id) {
  try {
    openDocument();

    const r = await j(`/workflow-reviews/${id}`);

    setDoc(
      `${r.record_type} review`,
      `${r.young_person_name || "—"} · Status: ${r.status}`
    );

    setHTML("docBody", `
      <div class="doc-grid">
        <section class="card">
          <div class="row-card">
            <div class="row-title">Current review note</div>
            <div>${esc(r.review_note || "No note recorded")}</div>
          </div>

          <label class="label">Manager decision note</label>
          <textarea id="reviewNote" class="textarea">${esc(r.review_note || "")}</textarea>

          <label class="pill">
            <input type="checkbox" id="reviewChildVoice" ${r.child_voice_captured ? "checked" : ""}/>
            Child voice captured
          </label>

          <label class="pill">
            <input type="checkbox" id="reviewTraumaInformed" ${r.trauma_informed ? "checked" : ""}/>
            Trauma-informed response evident
          </label>

          <label class="pill">
            <input type="checkbox" id="reviewActionsRequired" ${r.actions_required ? "checked" : ""}/>
            Actions required
          </label>

          <label class="pill">
            <input type="checkbox" id="reviewExternal" ${r.requires_external_notification ? "checked" : ""}/>
            External notification required
          </label>
        </section>

        <aside class="card doc-side">
          <div class="card-title">Decision</div>
          <button class="btn primary" id="approveReviewBtn">Approve</button>
          <button class="btn" id="returnReviewBtn">Return</button>
          <button class="btn" id="escalateReviewBtn">Escalate</button>

          <hr />

          <div class="mini-meta">
            <div><strong>Record type:</strong> ${esc(r.record_type)}</div>
            <div><strong>Record id:</strong> ${esc(r.record_id)}</div>
            <div><strong>Submitted:</strong> ${esc(fDateTime(r.submitted_at))}</div>
            <div><strong>Reviewed:</strong> ${esc(fDateTime(r.reviewed_at))}</div>
          </div>
        </aside>
      </div>
    `);

    const submitDecision = async (decision) => {
      await j(`/workflow-reviews/${id}/decision`, {
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

    $("approveReviewBtn").onclick = () => submitDecision("approved");
    $("returnReviewBtn").onclick = () => submitDecision("returned");
    $("escalateReviewBtn").onclick = () => submitDecision("escalated");
  } catch (e) {
    msg(e.message, true);
  }
}

// ================= LOAD TAB =================
function loadTab() {
  if (!state.selected) return;

  renderSelectedYoungPersonHeader();

  const map = {
    overview: loadOverview,
    timeline: loadTimeline,
    plans: loadPlans,
    reviews: loadReviews
  };

  map[state.activeTab]?.();
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  $$(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => setSection(btn.dataset.section));
  });

  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  $("youngPersonSelect")?.addEventListener("change", (e) => {
    const id = Number(e.target.value);
    state.selected = state.youngPeople.find(p => Number(p.id) === id) || null;
    renderSelectedYoungPersonHeader();
    loadTab();
  });

  $("timelineEventType")?.addEventListener("change", (e) => {
    state.timelineFilter.eventType = e.target.value;
    loadTimeline();
  });

  $("docBackBtn")?.addEventListener("click", closeDocument);
  $("plansOpenCreateBtn")?.addEventListener("click", openNewPlan);
  $("newPlanBtn")?.addEventListener("click", openNewPlan);
  $("createEventBtn")?.addEventListener("click", openNewEvent);
  $("quickEventBtn")?.addEventListener("click", () => {
    setSection("young-people");
    setTab("timeline");
    openNewEvent();
  });

  setSection("command-centre");
  loadYoungPeople();
  loadCommandCentre();
});
