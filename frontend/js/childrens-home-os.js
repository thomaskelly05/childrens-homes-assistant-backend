const state = {
  shell: {
    section: "command-centre"
  },
  youngPeople: [],
  selectedYoungPerson: null,
  activeYoungPersonTab: "timeline",
  commandCentre: null,
  standards: [],
  judgementAreas: [],
  document: {
    id: null,
    type: null,
    mode: "browse",
    status: null,
    version: null,
    dirty: false
  }
};

const $ = id => document.getElementById(id);
const $$ = s => [...document.querySelectorAll(s)];

const arr = d => Array.isArray(d) ? d :
  Array.isArray(d?.items) ? d.items :
  Array.isArray(d?.rows) ? d.rows :
  Array.isArray(d?.data) ? d.data : [];

const esc = s => String(s ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const fDate = x => x ? new Date(x).toLocaleString("en-GB") : "—";

async function j(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

function msg(text, bad = false) {
  const el = $("statusBar");
  if (!el) return;
  el.classList.remove("hidden");
  el.innerHTML = `<span class="pill ${bad ? "red" : "green"}">${esc(text)}</span>`;
  setTimeout(() => el.classList.add("hidden"), 3000);
}

function fullName(p) {
  return `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || "Young person";
}

function setPage(title, subtitle = "") {
  $("pageTitle").textContent = title;
  $("pageSubtitle").textContent = subtitle;
}

function setShellSection(section) {
  state.shell.section = section;

  $$(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });

  $$(".section").forEach(el => el.classList.remove("active"));
  $(`section-${section}`)?.classList.add("active");

  const titles = {
    "command-centre": ["Command Centre", "Shift-first residential care recording"],
    "young-people": ["Young People", "Child-centred recording, plans and evidence"],
    "handover": ["Handover", "Continuity across shifts"],
    "incidents": ["Incidents & Safeguarding", "Joined-up help and protection workflows"],
    "plans": ["Plans & Documents", "Full document workflows, reviews and exports"],
    "reports": ["Reports & Exports", "Inspection-ready packs and operational reporting"],
    "manager-qa": ["Manager QA", "Oversight, sign-off and quality assurance"]
  };

  const [title, subtitle] = titles[section] || ["IndiCare", ""];
  setPage(title, subtitle);

  loadCurrentSection();
}

function openDocument() {
  $("browseMode")?.classList.add("hidden");
  $("documentMode")?.classList.remove("hidden");
}

function closeDocument() {
  $("documentMode")?.classList.add("hidden");
  $("browseMode")?.classList.remove("hidden");
}

function setDoc(title) {
  $("docTitle").textContent = title || "Document";
}

async function bootstrap() {
  bindEvents();
  await Promise.all([
    loadYoungPeople(),
    loadStandards(),
    loadCommandCentre(),
    loadQASection(),
    loadStaticSections()
  ]);
  setShellSection("command-centre");
}

function bindEvents() {
  $$(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => setShellSection(btn.dataset.section));
  });

  $("docBackBtn")?.addEventListener("click", closeDocument);

  $("youngPersonSelect")?.addEventListener("change", ev => {
    const id = String(ev.target.value);
    state.selectedYoungPerson = state.youngPeople.find(p => String(p.id) === id) || null;
    renderYoungPersonSummary();
    loadYoungPersonTab();
  });

  $$(".yp-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeYoungPersonTab = btn.dataset.tab;
      $$(".yp-tab").forEach(x => x.classList.toggle("active", x.dataset.tab === btn.dataset.tab));
      loadYoungPersonTab();
    });
  });
}

async function loadYoungPeople() {
  try {
    const rows = arr(await j("/young-people"));
    state.youngPeople = rows;
    state.selectedYoungPerson = rows[0] || null;
    renderYoungPeopleSelect();
    renderYoungPersonSummary();
  } catch (e) {
    msg(e.message, true);
  }
}

async function loadStandards() {
  try {
    state.standards = arr(await j("/evidence/standards"));
    state.judgementAreas = arr(await j("/evidence/judgement-areas"));
  } catch (e) {
    console.warn(e);
  }
}

function renderYoungPeopleSelect() {
  const el = $("youngPersonSelect");
  if (!el) return;

  if (!state.youngPeople.length) {
    el.innerHTML = `<option value="">No young people</option>`;
    return;
  }

  el.innerHTML = state.youngPeople.map(p => `
    <option value="${esc(p.id)}" ${String(state.selectedYoungPerson?.id) === String(p.id) ? "selected" : ""}>
      ${esc(fullName(p))}
    </option>
  `).join("");
}

function renderYoungPersonSummary() {
  const p = state.selectedYoungPerson;
  const el = $("youngPersonSummary");
  if (!el) return;

  if (!p) {
    el.innerHTML = `<div class="empty">No young person selected.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="summary-card">
      <div class="card-title">${esc(fullName(p))}</div>
      <div class="mini-meta">
        <div><strong>Placement:</strong> ${esc(p.placement_status || "—")}</div>
        <div><strong>Legal status:</strong> ${esc(p.legal_status || "—")}</div>
        <div><strong>Risk:</strong> ${esc(p.summary_risk_level || "—")}</div>
      </div>
    </div>
  `;
}

async function loadCurrentSection() {
  if (state.shell.section === "command-centre") {
    await renderCommandCentre();
  }
  if (state.shell.section === "young-people") {
    await loadYoungPersonTab();
  }
  if (state.shell.section === "manager-qa") {
    await loadQASection();
  }
}

async function loadCommandCentre() {
  try {
    state.commandCentre = await j("/command-centre");
  } catch (e) {
    console.warn(e);
  }
}

async function renderCommandCentre() {
  const el = $("section-command-centre");
  if (!el) return;

  const d = state.commandCentre;
  if (!d) {
    el.innerHTML = `<div class="empty">Unable to load command centre.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="grid cols-3">
      ${metricCard("Children in home", d.summary?.children_in_home)}
      ${metricCard("Staff on shift", d.summary?.staff_on_shift)}
      ${metricCard("High-risk alerts", d.summary?.high_risk_alerts)}
      ${metricCard("Open incidents", d.summary?.open_incidents)}
      ${metricCard("Manager reviews due", d.summary?.manager_reviews_due)}
      ${metricCard("Medication due", d.summary?.medication_due_this_shift)}
    </div>

    <div style="height:16px"></div>

    <div class="grid cols-2">
      <div class="card" style="padding:18px">
        <div class="card-title">Shift alerts</div>
        <div class="list">
          ${(d.alerts || []).map(alertCard).join("") || `<div class="empty">No alerts.</div>`}
        </div>
      </div>

      <div class="card" style="padding:18px">
        <div class="card-title">Current handover</div>
        <div class="list-item">
          <div class="list-item-title">${esc(d.handover?.title || "Handover")}</div>
          <div class="timeline-body">${esc(d.handover?.summary || "—")}</div>
          <div class="list-item-meta">Updated: ${esc(fDate(d.handover?.updated_at))}</div>
        </div>
      </div>

      <div class="card" style="padding:18px">
        <div class="card-title">Tasks</div>
        <div class="list">
          ${(d.tasks || []).map(taskCard).join("") || `<div class="empty">No tasks.</div>`}
        </div>
      </div>

      <div class="card" style="padding:18px">
        <div class="card-title">Medication due this shift</div>
        <div class="list">
          ${(d.meds_due || []).map(medCard).join("") || `<div class="empty">No medication due.</div>`}
        </div>
      </div>
    </div>
  `;
}

function metricCard(label, value) {
  return `
    <div class="card metric">
      <div class="metric-label">${esc(label)}</div>
      <div class="metric-value">${esc(value ?? "—")}</div>
    </div>
  `;
}

function alertCard(r) {
  const colour = r.level === "high" ? "red" : r.level === "medium" ? "amber" : "green";
  return `
    <div class="list-item">
      <div class="list-item-title">${esc(r.title || "Alert")}</div>
      <div class="timeline-body">${esc(r.detail || "")}</div>
      <div class="pills">
        <span class="pill ${colour}">${esc(r.level || "info")}</span>
        <span class="pill">${esc(r.young_person_name || "Home")}</span>
      </div>
    </div>
  `;
}

function taskCard(r) {
  return `
    <div class="list-item">
      <div class="list-item-title">${esc(r.title || "Task")}</div>
      <div class="list-item-meta">${esc(r.young_person_name || "Home")} • Due: ${esc(r.due || "—")}</div>
    </div>
  `;
}

function medCard(r) {
  return `
    <div class="list-item">
      <div class="list-item-title">${esc(r.young_person_name || "Young person")}</div>
      <div class="timeline-body">${esc(r.medicine || "Medicine")}</div>
      <div class="pills">
        <span class="pill">${esc(r.time_due || "—")}</span>
        <span class="pill">${esc(r.status || "—")}</span>
      </div>
    </div>
  `;
}

async function loadYoungPersonTab() {
  const p = state.selectedYoungPerson;
  if (!p) {
    $("workspaceContent").innerHTML = `<div class="empty">No young person selected.</div>`;
    return;
  }

  const titleMap = {
    timeline: "Timeline",
    overview: "Overview",
    plans: "Plans",
    risks: "Risks & Safety",
    health: "Health",
    education: "Education",
    family: "Family & Contact",
    keywork: "Key Work",
    chronology: "Chronology",
    outcomes: "Outcomes",
    reviews: "Reviews & Approvals"
  };

  $("youngPersonWorkspaceTitle").textContent = titleMap[state.activeYoungPersonTab] || "Workspace";
  renderToolbarActions();

  const loaders = {
    timeline: loadTimeline,
    overview: loadOverview,
    plans: loadPlans,
    risks: loadPlaceholder,
    health: loadPlaceholder,
    education: loadPlaceholder,
    family: loadPlaceholder,
    keywork: loadPlaceholder,
    chronology: loadPlaceholder,
    outcomes: loadPlaceholder,
    reviews: loadReviews
  };

  await loaders[state.activeYoungPersonTab]?.();
}

function renderToolbarActions() {
  const el = $("toolbarActions");
  if (!el) return;

  if (state.activeYoungPersonTab === "timeline") {
    el.innerHTML = `
      <button id="newEventBtn" class="btn primary">New event</button>
    `;
    $("newEventBtn")?.addEventListener("click", openNewEvent);
    return;
  }

  if (state.activeYoungPersonTab === "plans") {
    el.innerHTML = `
      <button id="newPlanBtn" class="btn primary">New plan</button>
    `;
    $("newPlanBtn")?.addEventListener("click", openNewPlan);
    return;
  }

  el.innerHTML = ``;
}

async function loadOverview() {
  const p = state.selectedYoungPerson;
  const el = $("workspaceContent");

  try {
    const d = await j(`/young-people/${p.id}`);
    el.innerHTML = `
      <div class="grid cols-2">
        <div class="card" style="padding:18px">
          <div class="card-title">${esc(fullName(d))}</div>
          <div class="mini-meta">
            <div><strong>Placement:</strong> ${esc(d.placement_status || "—")}</div>
            <div><strong>Legal status:</strong> ${esc(d.legal_status || "—")}</div>
            <div><strong>Summary risk:</strong> ${esc(d.summary_risk_level || "—")}</div>
            <div><strong>Social worker:</strong> ${esc(d.social_worker_name || "—")}</div>
          </div>
        </div>

        <div class="card" style="padding:18px">
          <div class="card-title">Tonight at a glance</div>
          <div class="mini-meta">
            <div><strong>Risk flags:</strong> ${esc(d.risk_flags_summary || "—")}</div>
            <div><strong>Medication due:</strong> ${esc(d.medication_due_summary || "—")}</div>
            <div><strong>Appointments:</strong> ${esc(d.appointments_summary || "—")}</div>
            <div><strong>Manager note:</strong> ${esc(d.manager_note || "—")}</div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="empty">Unable to load overview.</div>`;
  }
}

async function loadTimeline() {
  const p = state.selectedYoungPerson;
  const el = $("workspaceContent");

  try {
    const rows = arr(await j(`/events?young_person_id=${encodeURIComponent(p.id)}`));

    if (!rows.length) {
      el.innerHTML = `<div class="empty">No timeline items yet.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="timeline">
        ${rows.map(timelineCard).join("")}
      </div>
    `;

    document.querySelectorAll(".open-event").forEach(btn => {
      btn.addEventListener("click", () => openEvent(Number(btn.dataset.id)));
    });
  } catch (e) {
    el.innerHTML = `<div class="empty">Unable to load timeline.</div>`;
  }
}

function timelineCard(r) {
  return `
    <div class="timeline-item">
      <div class="timeline-top">
        <div>
          <div class="timeline-title">${esc(r.title || "Event")}</div>
          <div class="timeline-meta">${esc(r.event_type || "event")} • ${esc(fDate(r.occurred_at))}</div>
        </div>
        <div>
          <button class="btn open-event" data-id="${esc(r.id)}">Open</button>
        </div>
      </div>

      <div class="timeline-body">${esc(r.narrative || "No narrative recorded.")}</div>

      <div class="pills">
        <span class="pill">${esc(r.risk_level || "low")}</span>
        <span class="pill">${esc(r.workflow_status || "draft")}</span>
        ${(r.quality_standards || []).map(x => `<span class="pill">${esc(prettyStandard(x))}</span>`).join("")}
      </div>
    </div>
  `;
}

function prettyStandard(key) {
  return String(key || "").replaceAll("_", " ");
}

async function openNewEvent() {
  openDocument();
  setDoc("New Event");

  const standardOptions = (state.standards || []).map(s => `
    <option value="${esc(s.key)}">${esc(s.label)}</option>
  `).join("");

  const judgementOptions = (state.judgementAreas || []).map(s => `
    <option value="${esc(s.key)}">${esc(s.label)}</option>
  `).join("");

  $("docBody").innerHTML = `
    <div class="doc-grid">
      <section class="doc-main card stack">
        <div>
          <label class="label">Event type</label>
          <select id="eventType" class="input">
            <option value="daily_note">Daily note</option>
            <option value="incident">Incident</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="family_contact">Family contact</option>
            <option value="keywork">Key work</option>
            <option value="achievement">Achievement</option>
            <option value="missing_update">Missing update</option>
          </select>
        </div>

        <div>
          <label class="label">Title</label>
          <input id="eventTitle" class="input" placeholder="Short event title" />
        </div>

        <div>
          <label class="label">Narrative</label>
          <textarea id="eventNarrative" class="textarea"></textarea>
        </div>

        <div class="grid cols-2">
          <div>
            <label class="label">Antecedent / context</label>
            <textarea id="eventAntecedent" class="textarea"></textarea>
          </div>
          <div>
            <label class="label">Presentation / behaviour</label>
            <textarea id="eventPresentation" class="textarea"></textarea>
          </div>
        </div>

        <div class="grid cols-2">
          <div>
            <label class="label">Staff response</label>
            <textarea id="eventResponse" class="textarea"></textarea>
          </div>
          <div>
            <label class="label">Trauma-informed formulation</label>
            <textarea id="eventFormulation" class="textarea"></textarea>
          </div>
        </div>

        <div class="grid cols-2">
          <div>
            <label class="label">Outcome</label>
            <textarea id="eventOutcome" class="textarea"></textarea>
          </div>
          <div>
            <label class="label">Child voice</label>
            <textarea id="eventVoice" class="textarea"></textarea>
          </div>
        </div>

        <div>
          <label class="label">Restorative follow-up</label>
          <textarea id="eventFollowUp" class="textarea"></textarea>
        </div>
      </section>

      <aside class="doc-side card stack">
        <div>
          <label class="label">Risk level</label>
          <select id="eventRiskLevel" class="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label class="label">Shift</label>
          <select id="eventShiftType" class="input">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
            <option value="Waking night">Waking night</option>
          </select>
        </div>

        <div>
          <label class="label">Quality standard</label>
          <select id="eventStandard" class="input">
            <option value="">Select a standard</option>
            ${standardOptions}
          </select>
        </div>

        <div>
          <label class="label">Judgement area</label>
          <select id="eventJudgement" class="input">
            <option value="">Select a judgement area</option>
            ${judgementOptions}
          </select>
        </div>

        <label class="pill">
          <input id="eventNeedsReview" type="checkbox" />
          Requires manager review
        </label>

        <button id="createEventBtn" class="btn primary">Create event</button>
      </aside>
    </div>
  `;

  $("createEventBtn").addEventListener("click", async () => {
    try {
      const res = await j("/events", {
        method: "POST",
        body: JSON.stringify({
          young_person_id: state.selectedYoungPerson.id,
          event_type: $("eventType").value,
          title: $("eventTitle").value,
          narrative: $("eventNarrative").value,
          antecedent: $("eventAntecedent").value,
          presentation: $("eventPresentation").value,
          staff_response: $("eventResponse").value,
          trauma_informed_formulation: $("eventFormulation").value,
          outcome: $("eventOutcome").value,
          child_voice: $("eventVoice").value,
          restorative_follow_up: $("eventFollowUp").value,
          risk_level: $("eventRiskLevel").value,
          shift_type: $("eventShiftType").value,
          quality_standards: $("eventStandard").value ? [$("eventStandard").value] : [],
          judgement_areas: $("eventJudgement").value ? [$("eventJudgement").value] : [],
          requires_manager_review: $("eventNeedsReview").checked
        })
      });

      msg("Event created");
      await loadTimeline();
      openEvent(res.id);
    } catch (e) {
      msg(e.message, true);
    }
  });
}

async function openEvent(id) {
  openDocument();

  try {
    const r = await j(`/events/${id}`);
    const evidence = await j(`/evidence/record/event/${id}`);

    state.document = {
      id: r.id,
      type: "event",
      mode: "edit",
      status: r.workflow_status || "draft",
      version: 1,
      dirty: false
    };

    setDoc(r.title || "Event");

    $("docBody").innerHTML = `
      <div class="doc-meta-bar">
        <span class="pill">${esc(r.event_type || "event")}</span>
        <span class="pill">${esc(r.workflow_status || "draft")}</span>
        <span class="pill">${esc(r.risk_level || "low")}</span>
        <span class="pill">${esc(fDate(r.occurred_at))}</span>
      </div>

      <div class="doc-grid">
        <section class="doc-main card stack">
          <div>
            <label class="label">Title</label>
            <input id="eventTitleEdit" class="input" value="${esc(r.title || "")}" />
          </div>

          <div>
            <label class="label">Narrative</label>
            <textarea id="eventNarrativeEdit" class="textarea">${esc(r.narrative || "")}</textarea>
          </div>

          <div class="grid cols-2">
            <div>
              <label class="label">Antecedent / context</label>
              <textarea id="eventAntecedentEdit" class="textarea">${esc(r.antecedent || "")}</textarea>
            </div>
            <div>
              <label class="label">Presentation / behaviour</label>
              <textarea id="eventPresentationEdit" class="textarea">${esc(r.presentation || "")}</textarea>
            </div>
          </div>

          <div class="grid cols-2">
            <div>
              <label class="label">Staff response</label>
              <textarea id="eventResponseEdit" class="textarea">${esc(r.staff_response || "")}</textarea>
            </div>
            <div>
              <label class="label">Trauma-informed formulation</label>
              <textarea id="eventFormulationEdit" class="textarea">${esc(r.trauma_informed_formulation || "")}</textarea>
            </div>
          </div>

          <div class="grid cols-2">
            <div>
              <label class="label">Outcome</label>
              <textarea id="eventOutcomeEdit" class="textarea">${esc(r.outcome || "")}</textarea>
            </div>
            <div>
              <label class="label">Child voice</label>
              <textarea id="eventVoiceEdit" class="textarea">${esc(r.child_voice || "")}</textarea>
            </div>
          </div>

          <div>
            <label class="label">Restorative follow-up</label>
            <textarea id="eventFollowUpEdit" class="textarea">${esc(r.restorative_follow_up || "")}</textarea>
          </div>
        </section>

        <aside class="doc-side card stack">
          <div class="card-title">Workflow</div>
          <button id="saveEventBtn" class="btn primary">Save draft</button>
          <button id="submitEventBtn" class="btn">Submit for review</button>
          <button id="reviewEventBtn" class="btn">Manager review</button>

          <hr />

          <div class="card-title">Evidence links</div>
          <div class="mini-meta">
            ${(evidence.links || []).map(link => `
              <div><strong>${esc(link.relationship)}:</strong> ${esc(link.target_label || link.target_key || "Link")}</div>
            `).join("") || "No evidence links."}
          </div>
        </aside>
      </div>
    `;

    $("saveEventBtn").addEventListener("click", async () => {
      try {
        await j(`/events/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: $("eventTitleEdit").value,
            narrative: $("eventNarrativeEdit").value,
            antecedent: $("eventAntecedentEdit").value,
            presentation: $("eventPresentationEdit").value,
            staff_response: $("eventResponseEdit").value,
            trauma_informed_formulation: $("eventFormulationEdit").value,
            outcome: $("eventOutcomeEdit").value,
            child_voice: $("eventVoiceEdit").value,
            restorative_follow_up: $("eventFollowUpEdit").value,
            workflow_status: "draft"
          })
        });
        msg("Draft saved");
        await loadTimeline();
      } catch (e) {
        msg(e.message, true);
      }
    });

    $("submitEventBtn").addEventListener("click", async () => {
      try {
        await j(`/events/${id}`, {
          method: "PUT",
          body: JSON.stringify({ workflow_status: "submitted" })
        });
        msg("Submitted for review");
        await openEvent(id);
        await loadTimeline();
      } catch (e) {
        msg(e.message, true);
      }
    });

    $("reviewEventBtn").addEventListener("click", () => openReviewDialog("event", id, r.title));
  } catch (e) {
    msg("Unable to open event", true);
  }
}

function openReviewDialog(recordType, recordId, title) {
  openDocument();
  setDoc(`Manager Review — ${title || recordType}`);

  $("docBody").innerHTML = `
    <div class="doc-grid">
      <section class="doc-main card stack">
        <div class="card-title">Manager review</div>

        <div>
          <label class="label">Decision</label>
          <select id="reviewDecision" class="input">
            <option value="approved">Approve</option>
            <option value="returned">Return for amendment</option>
            <option value="escalated">Escalate</option>
          </select>
        </div>

        <div>
          <label class="label">Review note</label>
          <textarea id="reviewNote" class="textarea"></textarea>
        </div>
      </section>

      <aside class="doc-side card stack">
        <label class="pill"><input id="reviewChildVoice" type="checkbox" /> Child voice captured</label>
        <label class="pill"><input id="reviewTraumaInformed" type="checkbox" /> Trauma-informed and proportionate</label>
        <label class="pill"><input id="reviewActionsRequired" type="checkbox" /> Further actions required</label>
        <label class="pill"><input id="reviewExternal" type="checkbox" /> External notification required</label>

        <button id="submitReviewBtn" class="btn primary">Submit review</button>
      </aside>
    </div>
  `;

  $("submitReviewBtn").addEventListener("click", async () => {
    try {
      await j("/workflow/review", {
        method: "POST",
        body: JSON.stringify({
          record_type: recordType,
          record_id: recordId,
          decision: $("reviewDecision").value,
          review_note: $("reviewNote").value,
          child_voice_captured: $("reviewChildVoice").checked,
          trauma_informed: $("reviewTraumaInformed").checked,
          actions_required: $("reviewActionsRequired").checked,
          requires_external_notification: $("reviewExternal").checked
        })
      });

      if (recordType === "event") {
        await j(`/events/${recordId}`, {
          method: "PUT",
          body: JSON.stringify({
            workflow_status: $("reviewDecision").value === "approved" ? "approved" :
              $("reviewDecision").value === "returned" ? "returned" : "in_review"
          })
        });
      }

      msg("Review submitted");
      await loadTimeline();
      closeDocument();
    } catch (e) {
      msg(e.message, true);
    }
  });
}

async function loadPlans() {
  const p = state.selectedYoungPerson;
  const el = $("workspaceContent");

  try {
    const rows = arr(await j(`/young-people/${p.id}/plans`));

    if (!rows.length) {
      el.innerHTML = `<div class="empty">No plans recorded yet.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="list">
        ${rows.map(planCard).join("")}
      </div>
    `;

    document.querySelectorAll(".open-plan").forEach(btn => {
      btn.addEventListener("click", () => openPlan(btn.dataset.id));
    });
  } catch (e) {
    el.innerHTML = `<div class="empty">Unable to load plans.</div>`;
  }
}

function planCard(r) {
  return `
    <div class="list-item">
      <div class="timeline-top">
        <div>
          <div class="list-item-title">${esc(r.title || "Plan")}</div>
          <div class="list-item-meta">
            ${esc(r.plan_type || "plan")} •
            ${esc(r.status || "draft")} •
            Version ${esc(r.version_no || 1)}
          </div>
        </div>
        <div>
          <button class="btn open-plan" data-id="${esc(r.id)}">Open</button>
        </div>
      </div>
    </div>
  `;
}

async function openNewPlan() {
  openDocument();
  setDoc("New Plan");

  $("docBody").innerHTML = `
    <div class="doc-grid">
      <section class="doc-main card stack">
        <div>
          <label class="label">Title</label>
          <input id="title" class="input" placeholder="Plan title" />
        </div>

        <div>
          <label class="label">Summary</label>
          <textarea id="summary" class="textarea"></textarea>
        </div>

        <div>
          <label class="label">Child’s views, wishes and feelings</label>
          <textarea id="childVoice" class="textarea"></textarea>
        </div>

        <div>
          <label class="label">What staff should do</label>
          <textarea id="staffGuidance" class="textarea"></textarea>
        </div>

        <div>
          <label class="label">Trauma-informed formulation</label>
          <textarea id="formulation" class="textarea"></textarea>
        </div>
      </section>

      <aside class="doc-side card stack">
        <div>
          <label class="label">Plan type</label>
          <select id="planType" class="input">
            <option value="care_plan">Care plan</option>
            <option value="safer_care_plan">Safer care plan</option>
            <option value="risk_management_plan">Risk management plan</option>
            <option value="health_plan">Health plan</option>
            <option value="education_support_plan">Education support plan</option>
          </select>
        </div>

        <button id="createPlanBtn" class="btn primary">Create plan</button>
      </aside>
    </div>
  `;

  $("createPlanBtn").addEventListener("click", async () => {
    try {
      const res = await j("/young-people/plans", {
        method: "POST",
        body: JSON.stringify({
          young_person_id: state.selectedYoungPerson.id,
          title: $("title").value,
          summary: $("summary").value,
          child_voice: $("childVoice").value,
          staff_guidance: $("staffGuidance").value,
          formulation: $("formulation").value,
          plan_type: $("planType").value
        })
      });

      msg("Plan created");
      await loadPlans();
      await openPlan(res.id);
    } catch (e) {
      msg(e.message, true);
    }
  });
}

async function openPlan(id) {
  openDocument();

  try {
    const r = await j(`/young-people/plans/${id}`);

    state.document = {
      id: r.id,
      type: "plan",
      mode: "edit",
      status: r.status || "draft",
      version: r.version_no || 1,
      dirty: false
    };

    setDoc(r.title || "Plan");

    $("docBody").innerHTML = `
      <div class="doc-meta-bar">
        <span class="pill">${esc(r.plan_type || "Plan")}</span>
        <span class="pill">${esc(r.status || "draft")}</span>
        <span class="pill">Version ${esc(r.version_no || 1)}</span>
        <span class="pill">Review due: ${esc(r.review_due_at ? fDate(r.review_due_at) : "—")}</span>
      </div>

      <div class="doc-grid">
        <section class="doc-main card stack">
          <div>
            <label class="label">Title</label>
            <input id="planTitle" class="input" value="${esc(r.title || "")}" />
          </div>

          <div>
            <label class="label">Summary</label>
            <textarea id="planSummary" class="textarea">${esc(r.summary || "")}</textarea>
          </div>

          <div>
            <label class="label">Child’s views, wishes and feelings</label>
            <textarea id="planVoice" class="textarea">${esc(r.child_voice || "")}</textarea>
          </div>

          <div>
            <label class="label">What staff should do</label>
            <textarea id="planStaffGuidance" class="textarea">${esc(r.staff_guidance || "")}</textarea>
          </div>

          <div>
            <label class="label">Trauma-informed formulation</label>
            <textarea id="planFormulation" class="textarea">${esc(r.formulation || "")}</textarea>
          </div>
        </section>

        <aside class="doc-side card stack">
          <div class="card-title">Workflow</div>
          <button id="savePlan" class="btn primary">Save draft</button>
          <button id="submitPlan" class="btn">Submit for review</button>
          <button id="approvePlan" class="btn">Approve</button>
          <button id="exportPlan" class="btn">Export PDF</button>

          <hr />

          <div class="mini-meta">
            <div><strong>Status:</strong> ${esc(r.status || "draft")}</div>
            <div><strong>Owner:</strong> ${esc(r.owner_name || "—")}</div>
            <div><strong>Reviewer:</strong> ${esc(r.reviewer_name || "—")}</div>
            <div><strong>Updated:</strong> ${esc(r.updated_at ? fDate(r.updated_at) : "—")}</div>
          </div>
        </aside>
      </div>
    `;

    $("savePlan").addEventListener("click", async () => {
      try {
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
        msg("Draft saved");
        await loadPlans();
      } catch (e) {
        msg(e.message, true);
      }
    });

    $("submitPlan").addEventListener("click", async () => {
      try {
        await j(`/young-people/plans/${id}/submit`, { method: "POST" });
        msg("Submitted for review");
        await openPlan(id);
        await loadPlans();
      } catch (e) {
        msg(e.message, true);
      }
    });

    $("approvePlan").addEventListener("click", async () => {
      try {
        await j(`/young-people/plans/${id}/approve`, { method: "POST" });
        msg("Approved");
        await openPlan(id);
        await loadPlans();
      } catch (e) {
        msg(e.message, true);
      }
    });

    $("exportPlan").addEventListener("click", async () => {
      window.open(`/young-people/plans/${id}/export`, "_blank");
    });
  } catch (e) {
    msg("Unable to open plan", true);
  }
}

async function loadReviews() {
  const el = $("workspaceContent");

  try {
    const rows = arr(await j("/workflow/queue"));

    if (!rows.length) {
      el.innerHTML = `<div class="empty">No reviews due.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="list">
        ${rows.map(r => `
          <div class="list-item">
            <div class="list-item-title">${esc(r.title || "Review item")}</div>
            <div class="list-item-meta">
              ${esc(r.young_person_name || "Young person")} • ${esc(r.priority || "normal")} • ${esc(r.status || "open")}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="empty">Unable to load review queue.</div>`;
  }
}

async function loadPlaceholder() {
  $("workspaceContent").innerHTML = `
    <div class="empty">
      This section is ready for connection to your existing module routes.
    </div>
  `;
}

async function loadQASection() {
  const el = $("section-manager-qa");
  if (!el) return;

  try {
    const d = await j("/qa/dashboard");
    el.innerHTML = `
      <div class="grid cols-3">
        ${metricCard("Open reviews", d.summary?.open_reviews)}
        ${metricCard("Overdue documents", d.summary?.overdue_documents)}
        ${metricCard("Missing signatures", d.summary?.missing_signatures)}
        ${metricCard("Medication exceptions", d.summary?.medication_exceptions)}
        ${metricCard("Incident follow-ups due", d.summary?.incident_followups_due)}
      </div>

      <div style="height:16px"></div>

      <div class="card" style="padding:18px">
        <div class="card-title">Quality assurance items</div>
        <div class="list">
          ${(d.items || []).map(item => `
            <div class="list-item">
              <div class="list-item-title">${esc(item.title)}</div>
              <div class="list-item-meta">${esc(item.young_person_name || "Home")} • ${esc(item.status || "open")}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="empty">Unable to load manager QA dashboard.</div>`;
  }
}

async function loadStaticSections() {
  $("section-handover").innerHTML = `<div class="empty">Handover view can now be wired to your existing handover routes.</div>`;
  $("section-incidents").innerHTML = `<div class="empty">Incidents & safeguarding workspace can now be wired to your existing incident and risk routes.</div>`;
  $("section-plans").innerHTML = `<div class="empty">Plans & documents view can now be wired to documents, workflows and exports.</div>`;
  $("section-reports").innerHTML = `<div class="empty">Reports & exports view can now be wired to Ofsted packs, reports and CSV/PDF exports.</div>`;
}

document.addEventListener("DOMContentLoaded", bootstrap);
