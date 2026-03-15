const selector = document.getElementById("youngPersonSelector");
const summaryCards = document.getElementById("ypSummaryCards");
const alertsContainer = document.getElementById("ypAlerts");
const complianceContainer = document.getElementById("ypCompliance");
const overviewContent = document.getElementById("overviewContent");
const profileContent = document.getElementById("profileContent");

const plansPanel = document.getElementById("tab-plans");
const riskPanel = document.getElementById("tab-risk");
const incidentsPanel = document.getElementById("tab-incidents");
const healthPanel = document.getElementById("tab-health");
const educationPanel = document.getElementById("tab-education");
const familyPanel = document.getElementById("tab-family");
const keyworkPanel = document.getElementById("tab-key-work");
const chronologyPanel = document.getElementById("tab-chronology");
const compliancePanel = document.getElementById("tab-compliance");

const dailyNotesContent = document.getElementById("dailyNotesContent");
const dailyNotesCurrentCard = document.getElementById("dailyNotesCurrentCard");
const dailyNotesSearch = document.getElementById("dailyNotesSearch");
const dailyNotesDateFilter = document.getElementById("dailyNotesDateFilter");
const dailyNotesMonthFilter = document.getElementById("dailyNotesMonthFilter");
const dailyNotesYearFilter = document.getElementById("dailyNotesYearFilter");
const clearDailyNotesFiltersBtn = document.getElementById("clearDailyNotesFiltersBtn");
const dailyNotesCalendarSidebar = document.getElementById("dailyNotesCalendarSidebar");
const toggleDailyNotesHistoryBtn = document.getElementById("toggleDailyNotesHistoryBtn");
const dailyNotesHistoryWrapper = document.getElementById("dailyNotesHistoryWrapper");

const openDailyNoteModalBtn = document.getElementById("openDailyNoteModalBtn");
const dailyNoteModal = document.getElementById("dailyNoteModal");
const closeDailyNoteModalBtn = document.getElementById("closeDailyNoteModalBtn");
const cancelDailyNoteBtn = document.getElementById("cancelDailyNoteBtn");
const saveDraftDailyNoteBtn = document.getElementById("saveDraftDailyNoteBtn");
const submitDailyNoteBtn = document.getElementById("submitDailyNoteBtn");
const returnDailyNoteBtn = document.getElementById("returnDailyNoteBtn");
const approveDailyNoteBtn = document.getElementById("approveDailyNoteBtn");

const dailyNoteForm = document.getElementById("dailyNoteForm");
const dailyNoteModalTitle = document.getElementById("dailyNoteModalTitle");
const dailyNoteAiFeedback = document.getElementById("dailyNoteAiFeedback");

const dailyNoteIdInput = document.getElementById("dailyNoteId");
const dnNoteDate = document.getElementById("dnNoteDate");
const dnShiftType = document.getElementById("dnShiftType");
const dnMood = document.getElementById("dnMood");
const dnSignificance = document.getElementById("dnSignificance");
const dnYoungPersonVoice = document.getElementById("dnYoungPersonVoice");
const dnPresentation = document.getElementById("dnPresentation");
const dnEducationUpdate = document.getElementById("dnEducationUpdate");
const dnPositives = document.getElementById("dnPositives");
const dnHealthUpdate = document.getElementById("dnHealthUpdate");
const dnFamilyUpdate = document.getElementById("dnFamilyUpdate");
const dnBehaviourUpdate = document.getElementById("dnBehaviourUpdate");
const dnActivities = document.getElementById("dnActivities");
const dnActionsRequired = document.getElementById("dnActionsRequired");
const dnWorkflowStatus = document.getElementById("dnWorkflowStatus");
const dnManagerReviewComment = document.getElementById("dnManagerReviewComment");

let youngPeople = [];
let selectedYoungPerson = null;
let selectedProfile = null;
let selectedPlans = [];
let selectedRisks = [];
let selectedDailyNotes = [];
let selectedIncidents = [];
let selectedHealthRecords = [];
let selectedMedicationProfiles = [];
let selectedMedicationRecords = [];
let selectedEducationRecords = [];
let selectedFamilyRecords = [];
let selectedKeyworkSessions = [];
let selectedChronology = [];
let selectedCompliance = null;
let historyOpen = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB");
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "—";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

async function loadYoungPeople() {
  const res = await fetch("/young-people");

  if (!res.ok) {
    selector.innerHTML = `<option value="">Failed to load young people</option>`;
    return;
  }

  youngPeople = await res.json();
  selector.innerHTML = `<option value="">Select a young person</option>`;

  youngPeople.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = `${person.preferred_name || person.first_name} ${person.last_name || ""}`;
    selector.appendChild(option);
  });

  const urlParams = new URLSearchParams(window.location.search);
  const selectedId = urlParams.get("young_person_id");

  if (selectedId) {
    selector.value = selectedId;
    await loadYoungPerson(selectedId);
  }
}

async function loadYoungPerson(id) {
  if (!id) {
    resetState();
    clearDisplay();
    return;
  }

  try {
    await fetch(`/young-people/${id}/chronology/rebuild`, { method: "POST" });

    const [
      personRes,
      profileRes,
      plansRes,
      risksRes,
      dailyNotesRes,
      incidentsRes,
      healthRes,
      medicationProfilesRes,
      medicationRecordsRes,
      educationRes,
      familyRes,
      keyworkRes,
      chronologyRes,
      complianceRes,
    ] = await Promise.all([
      fetch(`/young-people/${id}`),
      fetch(`/young-people/${id}/profile`),
      fetch(`/young-people/${id}/plans`),
      fetch(`/young-people/${id}/risks`),
      fetch(`/young-people/${id}/daily-notes`),
      fetch(`/young-people/${id}/incidents`),
      fetch(`/young-people/${id}/health`),
      fetch(`/young-people/${id}/medication-profiles`),
      fetch(`/young-people/${id}/medication-records`),
      fetch(`/young-people/${id}/education`),
      fetch(`/young-people/${id}/family`),
      fetch(`/young-people/${id}/keywork`),
      fetch(`/young-people/${id}/chronology`),
      fetch(`/young-people/${id}/compliance`),
    ]);

    if (
      !personRes.ok ||
      !profileRes.ok ||
      !plansRes.ok ||
      !risksRes.ok ||
      !dailyNotesRes.ok ||
      !incidentsRes.ok ||
      !healthRes.ok ||
      !medicationProfilesRes.ok ||
      !medicationRecordsRes.ok ||
      !educationRes.ok ||
      !familyRes.ok ||
      !keyworkRes.ok ||
      !chronologyRes.ok ||
      !complianceRes.ok
    ) {
      console.error("One or more shell requests failed.");
      return;
    }

    selectedYoungPerson = await personRes.json();
    selectedProfile = await profileRes.json();
    selectedPlans = await plansRes.json();
    selectedRisks = await risksRes.json();
    selectedDailyNotes = await dailyNotesRes.json();
    selectedIncidents = await incidentsRes.json();
    selectedHealthRecords = await healthRes.json();
    selectedMedicationProfiles = await medicationProfilesRes.json();
    selectedMedicationRecords = await medicationRecordsRes.json();
    selectedEducationRecords = await educationRes.json();
    selectedFamilyRecords = await familyRes.json();
    selectedKeyworkSessions = await keyworkRes.json();
    selectedChronology = await chronologyRes.json();
    selectedCompliance = await complianceRes.json();

    renderYoungPerson();
  } catch (error) {
    console.error("Failed to load young person shell data:", error);
  }
}

function resetState() {
  selectedYoungPerson = null;
  selectedProfile = null;
  selectedPlans = [];
  selectedRisks = [];
  selectedDailyNotes = [];
  selectedIncidents = [];
  selectedHealthRecords = [];
  selectedMedicationProfiles = [];
  selectedMedicationRecords = [];
  selectedEducationRecords = [];
  selectedFamilyRecords = [];
  selectedKeyworkSessions = [];
  selectedChronology = [];
  selectedCompliance = null;
}

function clearDisplay() {
  summaryCards.innerHTML = "";
  alertsContainer.innerHTML = `<span class="badge muted">No alerts loaded</span>`;
  complianceContainer.innerHTML = `<span class="badge muted">No compliance data yet</span>`;
  overviewContent.innerHTML = `Select a young person to load overview data.`;
  profileContent.innerHTML = `Profile details will load here.`;

  plansPanel.innerHTML = `<div class="panel-card"><h2>Plans</h2><p>Select a young person to load plans.</p></div>`;
  riskPanel.innerHTML = `<div class="panel-card"><h2>Risk</h2><p>Select a young person to load risk assessments.</p></div>`;
  incidentsPanel.innerHTML = `<div class="panel-card"><h2>Incidents</h2><p>Select a young person to load incidents.</p></div>`;
  healthPanel.innerHTML = `<div class="panel-card"><h2>Health</h2><p>Select a young person to load health records.</p></div>`;
  educationPanel.innerHTML = `<div class="panel-card"><h2>Education</h2><p>Select a young person to load education records.</p></div>`;
  familyPanel.innerHTML = `<div class="panel-card"><h2>Family</h2><p>Select a young person to load family records.</p></div>`;
  keyworkPanel.innerHTML = `<div class="panel-card"><h2>Key Work</h2><p>Select a young person to load key work sessions.</p></div>`;
  chronologyPanel.innerHTML = `<div class="panel-card"><h2>Chronology</h2><p>Select a young person to load chronology.</p></div>`;
  compliancePanel.innerHTML = `<div class="panel-card"><h2>Compliance</h2><p>Select a young person to load compliance.</p></div>`;

  if (dailyNotesCurrentCard) {
    dailyNotesCurrentCard.innerHTML = `<h3>Today’s Working Note</h3><p>No current draft loaded.</p>`;
  }

  if (dailyNotesContent) {
    dailyNotesContent.innerHTML = `<div class="panel-card"><p>Previous daily notes will appear here when opened or searched.</p></div>`;
  }

  if (dailyNotesSearch) dailyNotesSearch.value = "";
  if (dailyNotesDateFilter) dailyNotesDateFilter.value = "";
  if (dailyNotesMonthFilter) dailyNotesMonthFilter.value = "";
  if (dailyNotesYearFilter) dailyNotesYearFilter.innerHTML = `<option value="">All years</option>`;
  if (dailyNotesCalendarSidebar) {
    dailyNotesCalendarSidebar.innerHTML = `<p class="sidebar-empty">Select a young person to load dates.</p>`;
  }
  if (dailyNotesHistoryWrapper) dailyNotesHistoryWrapper.classList.remove("open");
  if (toggleDailyNotesHistoryBtn) toggleDailyNotesHistoryBtn.textContent = "View Previous Notes";
  historyOpen = false;
}

function renderAlerts() {
  const alerts = selectedProfile?.alerts || [];

  if (!alerts.length) {
    alertsContainer.innerHTML = `<span class="badge muted">No active alerts</span>`;
    return;
  }

  alertsContainer.innerHTML = alerts
    .map((alert) => `<span class="badge alert">${escapeHtml(alert.title || "Alert")}</span>`)
    .join("");
}

function renderComplianceHeader() {
  const summary = selectedCompliance?.summary;

  if (!summary) {
    complianceContainer.innerHTML = `<span class="badge muted">No compliance data yet</span>`;
    return;
  }

  const badges = [];
  if (summary.overdue > 0) badges.push(`<span class="badge alert">${summary.overdue} overdue</span>`);
  if (summary.due_today > 0) badges.push(`<span class="badge warning">${summary.due_today} due today</span>`);
  if (summary.due_soon > 0) badges.push(`<span class="badge warning">${summary.due_soon} due soon</span>`);
  if (summary.total === 0) badges.push(`<span class="badge success">No compliance issues</span>`);

  complianceContainer.innerHTML = badges.join("") || `<span class="badge muted">No compliance items</span>`;
}

function renderPlans() {
  if (!selectedPlans.length) {
    plansPanel.innerHTML = `<div class="panel-card"><h2>Plans</h2><p>No support plans recorded yet.</p></div>`;
    return;
  }

  plansPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedPlans.map((plan) => `
        <div class="panel-card">
          <h2>${escapeHtml(plan.title || "Support plan")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Type</div><div class="profile-value">${escapeHtml(plan.plan_type || "—")}</div>
            <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(plan.status || "—")}</div>
            <div class="profile-label">Start date</div><div class="profile-value">${formatDate(plan.start_date)}</div>
            <div class="profile-label">Review date</div><div class="profile-value">${formatDate(plan.review_date)}</div>
            <div class="profile-label">Owner</div><div class="profile-value">${plan.owner_first_name ? escapeHtml(`${plan.owner_first_name} ${plan.owner_last_name || ""}`.trim()) : "—"}</div>
            <div class="profile-label">Presenting need</div><div class="profile-value">${escapeHtml(plan.presenting_need || "—")}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(plan.summary || "—")}</div>
            <div class="profile-label">PACE guidance</div><div class="profile-value">${escapeHtml(plan.pace_guidance || "—")}</div>
            <div class="profile-label">Triggers</div><div class="profile-value">${escapeHtml(plan.triggers || "—")}</div>
            <div class="profile-label">Protective factors</div><div class="profile-value">${escapeHtml(plan.protective_factors || "—")}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRisks() {
  if (!selectedRisks.length) {
    riskPanel.innerHTML = `<div class="panel-card"><h2>Risk</h2><p>No risk assessments recorded yet.</p></div>`;
    return;
  }

  riskPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedRisks.map((risk) => `
        <div class="panel-card">
          <h2>${escapeHtml(risk.title || "Risk assessment")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Category</div><div class="profile-value">${escapeHtml(risk.category || "—")}</div>
            <div class="profile-label">Severity</div><div class="profile-value">${escapeHtml(risk.severity || "—")}</div>
            <div class="profile-label">Likelihood</div><div class="profile-value">${escapeHtml(risk.likelihood || "—")}</div>
            <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(risk.status || "—")}</div>
            <div class="profile-label">Review date</div><div class="profile-value">${formatDate(risk.review_date)}</div>
            <div class="profile-label">Owner</div><div class="profile-value">${risk.owner_first_name ? escapeHtml(`${risk.owner_first_name} ${risk.owner_last_name || ""}`.trim()) : "—"}</div>
            <div class="profile-label">Concern summary</div><div class="profile-value">${escapeHtml(risk.concern_summary || "—")}</div>
            <div class="profile-label">Known triggers</div><div class="profile-value">${escapeHtml(risk.known_triggers || "—")}</div>
            <div class="profile-label">Early warning signs</div><div class="profile-value">${escapeHtml(risk.early_warning_signs || "—")}</div>
            <div class="profile-label">Current controls</div><div class="profile-value">${escapeHtml(risk.current_controls || "—")}</div>
            <div class="profile-label">De-escalation</div><div class="profile-value">${escapeHtml(risk.deescalation_strategies || "—")}</div>
            <div class="profile-label">Response actions</div><div class="profile-value">${escapeHtml(risk.response_actions || "—")}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function getDailyNoteStatusBadgeClass(status) {
  const value = (status || "").toLowerCase();
  if (value === "approved") return "badge success";
  if (value === "submitted") return "badge warning";
  if (value === "returned") return "badge alert";
  return "badge muted";
}

function getCurrentDraftNote() {
  const today = new Date().toISOString().split("T")[0];

  const todaysDraft = selectedDailyNotes.find((note) => {
    const noteDate = note.note_date ? note.note_date.split("T")[0] : "";
    return noteDate === today && (note.workflow_status || "draft") === "draft";
  });

  if (todaysDraft) return todaysDraft;

  return selectedDailyNotes.find((note) => (note.workflow_status || "draft") === "draft") || null;
}

function renderCurrentDraftCard() {
  if (!dailyNotesCurrentCard) return;

  const draft = getCurrentDraftNote();

  if (!draft) {
    dailyNotesCurrentCard.innerHTML = `
      <h3>Today’s Working Note</h3>
      <p>No draft note is currently open.</p>
      <div class="current-note-actions">
        <button class="btn" id="startDraftFromCardBtn">Start Today’s Note</button>
      </div>
    `;

    document.getElementById("startDraftFromCardBtn")?.addEventListener("click", () => {
      openDailyNoteModal();
    });
    return;
  }

  dailyNotesCurrentCard.innerHTML = `
    <h3>Today’s Working Note</h3>
    <p><strong>${escapeHtml(draft.shift_type || "Shift note")}</strong> — ${formatDate(draft.note_date)}</p>

    <div class="current-note-status-row">
      <span class="${getDailyNoteStatusBadgeClass(draft.workflow_status || "draft")}">${escapeHtml(draft.workflow_status || "draft")}</span>
      <span class="badge muted">${escapeHtml(draft.significance || "standard")}</span>
    </div>

    <div class="daily-note-summary-grid" style="margin-top: 14px;">
      ${renderDailyNoteSummaryItem("Views, wishes and feelings", draft.young_person_voice)}
      ${renderDailyNoteSummaryItem("Behaviour and regulation", draft.behaviour_update)}
      ${renderDailyNoteSummaryItem("Actions / follow-up", draft.actions_required)}
      ${draft.manager_review_comment ? renderDailyNoteSummaryItem("Manager comment", draft.manager_review_comment) : ""}
    </div>

    <div class="current-note-actions">
      <button class="btn" id="continueDraftBtn">Continue Draft</button>
      <button class="btn secondary" id="submitDraftFromCardBtn">Submit for Review</button>
    </div>
  `;

  document.getElementById("continueDraftBtn")?.addEventListener("click", () => {
    openDailyNoteModal(draft);
  });

  document.getElementById("submitDraftFromCardBtn")?.addEventListener("click", async () => {
    await updateDailyNoteWorkflow(draft, "submitted");
  });
}

function getHistoricalNotes() {
  return selectedDailyNotes.filter((note) => (note.workflow_status || "draft") !== "draft");
}

function groupDailyNotesByYearMonthDay(notes) {
  const grouped = {};

  notes.forEach((note) => {
    const rawDate = note.note_date || "";
    const dateOnly = rawDate ? rawDate.split("T")[0] : "Unknown";
    const year = dateOnly !== "Unknown" ? dateOnly.slice(0, 4) : "Unknown";
    const month = dateOnly !== "Unknown" ? dateOnly.slice(0, 7) : "Unknown";
    const day = dateOnly;

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = {};
    if (!grouped[year][month][day]) grouped[year][month][day] = [];

    grouped[year][month][day].push(note);
  });

  return grouped;
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === "Unknown") return "Unknown month";
  const date = new Date(`${monthKey}-01`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatDayLabel(dayKey) {
  if (!dayKey || dayKey === "Unknown") return "Unknown date";
  const date = new Date(dayKey);
  if (Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderDailyNoteSummaryItem(label, value) {
  if (!value) return "";
  return `
    <div class="daily-note-summary-item">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function renderDailyNoteCard(note) {
  return `
    <div class="daily-note-card">
      <div class="daily-note-card-top">
        <div>
          <h4>${escapeHtml(note.shift_type || "Shift note")}</h4>
          <div class="daily-note-meta">
            ${escapeHtml(note.author_first_name ? `${note.author_first_name} ${note.author_last_name || ""}`.trim() : "Unknown author")}
          </div>
        </div>

        <div class="badge-row">
          <span class="${getDailyNoteStatusBadgeClass(note.workflow_status || "draft")}">${escapeHtml(note.workflow_status || "draft")}</span>
          <span class="badge muted">${escapeHtml(note.significance || "standard")}</span>
        </div>
      </div>

      <div class="daily-note-summary-grid">
        ${renderDailyNoteSummaryItem("Views, wishes and feelings", note.young_person_voice)}
        ${renderDailyNoteSummaryItem("Relationships / presentation", note.presentation)}
        ${renderDailyNoteSummaryItem("Education", note.education_update)}
        ${renderDailyNoteSummaryItem("Enjoyment and achievement", note.positives)}
        ${renderDailyNoteSummaryItem("Health and wellbeing", note.health_update)}
        ${renderDailyNoteSummaryItem("Family / identity", note.family_update)}
        ${renderDailyNoteSummaryItem("Behaviour and regulation", note.behaviour_update)}
        ${renderDailyNoteSummaryItem("Activities / routines", note.activities)}
        ${renderDailyNoteSummaryItem("Actions / follow-up", note.actions_required)}
        ${note.manager_review_comment ? renderDailyNoteSummaryItem("Manager comment", note.manager_review_comment) : ""}
      </div>

      <div class="daily-note-actions">
        <button class="btn secondary edit-daily-note-btn" data-id="${note.id}">Open</button>
        ${note.workflow_status === "submitted" ? `<button class="btn secondary approve-daily-note-btn" data-id="${note.id}">Approve</button>` : ""}
        ${note.workflow_status === "submitted" ? `<button class="btn secondary return-daily-note-btn" data-id="${note.id}">Send Back</button>` : ""}
      </div>
    </div>
  `;
}

function populateDailyNotesYearFilter(notes) {
  if (!dailyNotesYearFilter) return;

  const currentValue = dailyNotesYearFilter.value;
  const years = [...new Set(
    notes
      .map((note) => (note.note_date ? note.note_date.split("T")[0].slice(0, 4) : ""))
      .filter(Boolean)
  )].sort((a, b) => Number(b) - Number(a));

  dailyNotesYearFilter.innerHTML =
    `<option value="">All years</option>` +
    years.map((year) => `<option value="${year}">${year}</option>`).join("");

  if (years.includes(currentValue)) {
    dailyNotesYearFilter.value = currentValue;
  }
}

function renderCalendarSidebar(notes) {
  if (!dailyNotesCalendarSidebar) return;

  if (!notes.length) {
    dailyNotesCalendarSidebar.innerHTML = `<p class="sidebar-empty">No dates available.</p>`;
    return;
  }

  const uniqueDates = [...new Set(
    notes
      .map((note) => (note.note_date ? note.note_date.split("T")[0] : ""))
      .filter(Boolean)
  )].sort((a, b) => new Date(b) - new Date(a));

  dailyNotesCalendarSidebar.innerHTML = uniqueDates
    .map((dateValue) => `
      <button type="button" class="calendar-date-item" data-date="${dateValue}">
        ${escapeHtml(formatDayLabel(dateValue))}
      </button>
    `)
    .join("");

  document.querySelectorAll(".calendar-date-item").forEach((button) => {
    button.addEventListener("click", () => {
      if (dailyNotesDateFilter) {
        dailyNotesDateFilter.value = button.dataset.date || "";
        if (dailyNotesHistoryWrapper) dailyNotesHistoryWrapper.classList.add("open");
        if (toggleDailyNotesHistoryBtn) toggleDailyNotesHistoryBtn.textContent = "Hide Previous Notes";
        historyOpen = true;
        renderDailyNotes();
      }
    });
  });
}

function wireDailyNoteButtons() {
  document.querySelectorAll(".edit-daily-note-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const note = selectedDailyNotes.find((item) => item.id === id);
      if (!note) return;
      openDailyNoteModal(note);
    });
  });

  document.querySelectorAll(".approve-daily-note-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      const note = selectedDailyNotes.find((item) => item.id === id);
      if (!note) return;
      await updateDailyNoteWorkflow(note, "approved");
    });
  });

  document.querySelectorAll(".return-daily-note-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      const note = selectedDailyNotes.find((item) => item.id === id);
      if (!note) return;
      openDailyNoteModal(note);
      if (dnWorkflowStatus) dnWorkflowStatus.value = "returned";
    });
  });
}

function renderDailyNotes() {
  renderCurrentDraftCard();

  const historicalNotes = getHistoricalNotes();

  if (!historicalNotes.length) {
    dailyNotesContent.innerHTML = `<div class="panel-card"><p>No previous daily notes recorded yet.</p></div>`;
    populateDailyNotesYearFilter([]);
    renderCalendarSidebar(selectedDailyNotes);
    return;
  }

  populateDailyNotesYearFilter(historicalNotes);
  renderCalendarSidebar(selectedDailyNotes);

  const searchTerm = (dailyNotesSearch?.value || "").trim().toLowerCase();
  const selectedDate = dailyNotesDateFilter?.value || "";
  const selectedMonth = dailyNotesMonthFilter?.value || "";
  const selectedYear = dailyNotesYearFilter?.value || "";

  const filteredNotes = historicalNotes.filter((note) => {
    const noteDateRaw = note.note_date || "";
    const noteDate = noteDateRaw ? noteDateRaw.split("T")[0] : "";
    const noteMonth = noteDate ? noteDate.slice(0, 7) : "";
    const noteYear = noteDate ? noteDate.slice(0, 4) : "";

    const searchableText = [
      note.shift_type,
      note.mood,
      note.presentation,
      note.activities,
      note.education_update,
      note.health_update,
      note.family_update,
      note.behaviour_update,
      note.young_person_voice,
      note.positives,
      note.actions_required,
      note.significance,
      note.author_first_name,
      note.author_last_name,
      note.manager_review_comment,
      note.workflow_status,
    ].join(" ").toLowerCase();

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
    const matchesDate = !selectedDate || noteDate === selectedDate;
    const matchesMonth = !selectedMonth || noteMonth === selectedMonth;
    const matchesYear = !selectedYear || noteYear === selectedYear;

    return matchesSearch && matchesDate && matchesMonth && matchesYear;
  });

  if (!filteredNotes.length) {
    dailyNotesContent.innerHTML = `<div class="panel-card"><p>No previous daily notes match the selected filters.</p></div>`;
    return;
  }

  const grouped = groupDailyNotesByYearMonthDay(filteredNotes);

  dailyNotesContent.innerHTML = Object.keys(grouped)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => {
      const months = grouped[year];

      return `
        <div class="daily-notes-year-block">
          <h3 class="daily-notes-group-title">${escapeHtml(year)}</h3>

          ${Object.keys(months)
            .sort((a, b) => new Date(`${b}-01`) - new Date(`${a}-01`))
            .map((monthKey) => {
              const days = months[monthKey];
              const monthLabel = formatMonthLabel(monthKey);

              return `
                <div class="daily-notes-month-block">
                  <h4 class="daily-notes-month-title">${escapeHtml(monthLabel)}</h4>

                  ${Object.keys(days)
                    .sort((a, b) => new Date(b) - new Date(a))
                    .map((dayKey) => {
                      const notesForDay = days[dayKey];
                      const dayLabel = formatDayLabel(dayKey);

                      return `
                        <div class="daily-notes-day-block">
                          <h5 class="daily-notes-day-title">${escapeHtml(dayLabel)}</h5>
                          <div class="daily-note-list">
                            ${notesForDay.map((note) => renderDailyNoteCard(note)).join("")}
                          </div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    })
    .join("");

  wireDailyNoteButtons();
}

function renderIncidents() {
  if (!selectedIncidents.length) {
    incidentsPanel.innerHTML = `<div class="panel-card"><h2>Incidents</h2><p>No incidents recorded yet.</p></div>`;
    return;
  }

  incidentsPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedIncidents.map((incident) => `
        <div class="panel-card">
          <h2>${escapeHtml(incident.incident_type || "Incident")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Date/time</div><div class="profile-value">${formatDateTime(incident.incident_datetime || incident.created_at)}</div>
            <div class="profile-label">Severity</div><div class="profile-value">${escapeHtml(incident.severity || "—")}</div>
            <div class="profile-label">Location</div><div class="profile-value">${escapeHtml(incident.location || "—")}</div>
            <div class="profile-label">Antecedent</div><div class="profile-value">${escapeHtml(incident.antecedent || "—")}</div>
            <div class="profile-label">Description</div><div class="profile-value">${escapeHtml(incident.description || "—")}</div>
            <div class="profile-label">Staff response</div><div class="profile-value">${escapeHtml(incident.staff_response || "—")}</div>
            <div class="profile-label">Child response</div><div class="profile-value">${escapeHtml(incident.child_response || "—")}</div>
            <div class="profile-label">Outcome</div><div class="profile-value">${escapeHtml(incident.outcome || "—")}</div>
            <div class="profile-label">Injury</div><div class="profile-value">${incident.injury_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Damage</div><div class="profile-value">${incident.property_damage_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Police involved</div><div class="profile-value">${incident.police_involved ? "Yes" : "No"}</div>
            <div class="profile-label">Safeguarding</div><div class="profile-value">${incident.safeguarding_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Manager review</div><div class="profile-value">${escapeHtml(incident.manager_review_status || "—")}</div>
            <div class="profile-label">Follow-up required</div><div class="profile-value">${incident.follow_up_required ? "Yes" : "No"}</div>
            <div class="profile-label">Staff</div><div class="profile-value">${incident.staff_first_name ? escapeHtml(`${incident.staff_first_name} ${incident.staff_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderHealth() {
  const healthCards = [];
  const medicationCards = [];

  if (selectedHealthRecords.length) {
    healthCards.push(
      ...selectedHealthRecords.map((record) => `
        <div class="panel-card">
          <h2>${escapeHtml(record.title || "Health record")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Type</div><div class="profile-value">${escapeHtml(record.record_type || "—")}</div>
            <div class="profile-label">Event date/time</div><div class="profile-value">${formatDateTime(record.event_datetime)}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(record.summary || "—")}</div>
            <div class="profile-label">Professional</div><div class="profile-value">${escapeHtml(record.professional_name || "—")}</div>
            <div class="profile-label">Outcome</div><div class="profile-value">${escapeHtml(record.outcome || "—")}</div>
            <div class="profile-label">Follow-up required</div><div class="profile-value">${record.follow_up_required ? "Yes" : "No"}</div>
            <div class="profile-label">Next action date</div><div class="profile-value">${formatDate(record.next_action_date)}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? escapeHtml(`${record.created_by_first_name} ${record.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `)
    );
  }

  if (selectedMedicationProfiles.length) {
    medicationCards.push(
      ...selectedMedicationProfiles.map((profile) => `
        <div class="panel-card">
          <h2>${escapeHtml(profile.medication_name || "Medication profile")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Dosage</div><div class="profile-value">${escapeHtml(profile.dosage || "—")}</div>
            <div class="profile-label">Route</div><div class="profile-value">${escapeHtml(profile.route || "—")}</div>
            <div class="profile-label">Frequency</div><div class="profile-value">${escapeHtml(profile.frequency || "—")}</div>
            <div class="profile-label">PRN guidance</div><div class="profile-value">${escapeHtml(profile.prn_guidance || "—")}</div>
            <div class="profile-label">Prescribed by</div><div class="profile-value">${escapeHtml(profile.prescribed_by || "—")}</div>
            <div class="profile-label">Start date</div><div class="profile-value">${formatDate(profile.start_date)}</div>
            <div class="profile-label">End date</div><div class="profile-value">${formatDate(profile.end_date)}</div>
            <div class="profile-label">Active</div><div class="profile-value">${profile.is_active ? "Yes" : "No"}</div>
            <div class="profile-label">Notes</div><div class="profile-value">${escapeHtml(profile.notes || "—")}</div>
          </div>
        </div>
      `)
    );
  }

  if (selectedMedicationRecords.length) {
    medicationCards.push(
      ...selectedMedicationRecords.map((record) => `
        <div class="panel-card">
          <h2>${escapeHtml(record.medication_name || "Medication record")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Scheduled time</div><div class="profile-value">${formatDateTime(record.scheduled_time)}</div>
            <div class="profile-label">Administered time</div><div class="profile-value">${formatDateTime(record.administered_time)}</div>
            <div class="profile-label">Dose</div><div class="profile-value">${escapeHtml(record.dose || "—")}</div>
            <div class="profile-label">Route</div><div class="profile-value">${escapeHtml(record.route || "—")}</div>
            <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(record.status || "—")}</div>
            <div class="profile-label">Refusal reason</div><div class="profile-value">${escapeHtml(record.refusal_reason || "—")}</div>
            <div class="profile-label">Omission reason</div><div class="profile-value">${escapeHtml(record.omission_reason || "—")}</div>
            <div class="profile-label">Error flag</div><div class="profile-value">${record.error_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Error details</div><div class="profile-value">${escapeHtml(record.error_details || "—")}</div>
            <div class="profile-label">Manager review</div><div class="profile-value">${escapeHtml(record.manager_review_status || "—")}</div>
            <div class="profile-label">Administered by</div><div class="profile-value">${record.administered_by_first_name ? escapeHtml(`${record.administered_by_first_name} ${record.administered_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `)
    );
  }

  if (!healthCards.length && !medicationCards.length) {
    healthPanel.innerHTML = `<div class="panel-card"><h2>Health</h2><p>No health or medication records recorded yet.</p></div>`;
    return;
  }

  healthPanel.innerHTML = `<div class="panel-grid">${healthCards.join("")}${medicationCards.join("")}</div>`;
}

function renderEducation() {
  if (!selectedEducationRecords.length) {
    educationPanel.innerHTML = `<div class="panel-card"><h2>Education</h2><p>No education records recorded yet.</p></div>`;
    return;
  }

  educationPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedEducationRecords.map((record) => `
        <div class="panel-card">
          <h2>${formatDate(record.record_date)} • ${escapeHtml(record.provision_name || "Education record")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Attendance</div><div class="profile-value">${escapeHtml(record.attendance_status || "—")}</div>
            <div class="profile-label">Provision</div><div class="profile-value">${escapeHtml(record.provision_name || "—")}</div>
            <div class="profile-label">Behaviour</div><div class="profile-value">${escapeHtml(record.behaviour_summary || "—")}</div>
            <div class="profile-label">Engagement</div><div class="profile-value">${escapeHtml(record.learning_engagement || "—")}</div>
            <div class="profile-label">Issue raised</div><div class="profile-value">${escapeHtml(record.issue_raised || "—")}</div>
            <div class="profile-label">Action taken</div><div class="profile-value">${escapeHtml(record.action_taken || "—")}</div>
            <div class="profile-label">Professional involved</div><div class="profile-value">${escapeHtml(record.professional_involved || "—")}</div>
            <div class="profile-label">Achievement</div><div class="profile-value">${escapeHtml(record.achievement_note || "—")}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? escapeHtml(`${record.created_by_first_name} ${record.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFamily() {
  if (!selectedFamilyRecords.length) {
    familyPanel.innerHTML = `<div class="panel-card"><h2>Family</h2><p>No family contact records recorded yet.</p></div>`;
    return;
  }

  familyPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedFamilyRecords.map((record) => `
        <div class="panel-card">
          <h2>${escapeHtml(record.contact_person || "Family contact")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Date/time</div><div class="profile-value">${formatDateTime(record.contact_datetime)}</div>
            <div class="profile-label">Contact type</div><div class="profile-value">${escapeHtml(record.contact_type || "—")}</div>
            <div class="profile-label">Supervision</div><div class="profile-value">${escapeHtml(record.supervision_level || "—")}</div>
            <div class="profile-label">Location</div><div class="profile-value">${escapeHtml(record.location || "—")}</div>
            <div class="profile-label">Pre-contact presentation</div><div class="profile-value">${escapeHtml(record.pre_contact_presentation || "—")}</div>
            <div class="profile-label">Post-contact presentation</div><div class="profile-value">${escapeHtml(record.post_contact_presentation || "—")}</div>
            <div class="profile-label">Child voice</div><div class="profile-value">${escapeHtml(record.child_voice || "—")}</div>
            <div class="profile-label">Concerns</div><div class="profile-value">${escapeHtml(record.concerns || "—")}</div>
            <div class="profile-label">Follow-up required</div><div class="profile-value">${record.follow_up_required ? "Yes" : "No"}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? escapeHtml(`${record.created_by_first_name} ${record.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderKeywork() {
  if (!selectedKeyworkSessions.length) {
    keyworkPanel.innerHTML = `<div class="panel-card"><h2>Key Work</h2><p>No key work sessions recorded yet.</p></div>`;
    return;
  }

  keyworkPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedKeyworkSessions.map((session) => `
        <div class="panel-card">
          <h2>${escapeHtml(session.topic || "Key work session")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Session date</div><div class="profile-value">${formatDate(session.session_date)}</div>
            <div class="profile-label">Worker</div><div class="profile-value">${session.worker_first_name ? escapeHtml(`${session.worker_first_name} ${session.worker_last_name || ""}`.trim()) : "—"}</div>
            <div class="profile-label">Purpose</div><div class="profile-value">${escapeHtml(session.purpose || "—")}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(session.summary || "—")}</div>
            <div class="profile-label">Child voice</div><div class="profile-value">${escapeHtml(session.child_voice || "—")}</div>
            <div class="profile-label">Reflective analysis</div><div class="profile-value">${escapeHtml(session.reflective_analysis || "—")}</div>
            <div class="profile-label">Actions agreed</div><div class="profile-value">${escapeHtml(session.actions_agreed || "—")}</div>
            <div class="profile-label">Next session date</div><div class="profile-value">${formatDate(session.next_session_date)}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderChronology() {
  if (!selectedChronology.length) {
    chronologyPanel.innerHTML = `<div class="panel-card"><h2>Chronology</h2><p>No chronology events recorded yet.</p></div>`;
    return;
  }

  chronologyPanel.innerHTML = `
    <div class="panel-grid" style="grid-template-columns: 1fr;">
      ${selectedChronology.map((event) => `
        <div class="panel-card">
          <h2>${escapeHtml(event.title || "Chronology event")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Date/time</div><div class="profile-value">${formatDateTime(event.event_datetime)}</div>
            <div class="profile-label">Category</div><div class="profile-value">${escapeHtml(event.category || "—")}</div>
            <div class="profile-label">Subcategory</div><div class="profile-value">${escapeHtml(event.subcategory || "—")}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(event.summary || "—")}</div>
            <div class="profile-label">Significance</div><div class="profile-value">${escapeHtml(event.significance || "—")}</div>
            <div class="profile-label">Source table</div><div class="profile-value">${escapeHtml(event.source_table || "—")}</div>
            <div class="profile-label">Auto generated</div><div class="profile-value">${event.auto_generated ? "Yes" : "No"}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${event.created_by_first_name ? escapeHtml(`${event.created_by_first_name} ${event.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCompliance() {
  const summary = selectedCompliance?.summary;
  const items = selectedCompliance?.items || [];

  if (!summary) {
    compliancePanel.innerHTML = `<div class="panel-card"><h2>Compliance</h2><p>No compliance data available.</p></div>`;
    return;
  }

  const summaryHtml = `
    <div class="panel-grid">
      <div class="panel-card"><h2>Overdue</h2><p>${summary.overdue ?? 0}</p></div>
      <div class="panel-card"><h2>Due Today</h2><p>${summary.due_today ?? 0}</p></div>
      <div class="panel-card"><h2>Due Soon</h2><p>${summary.due_soon ?? 0}</p></div>
      <div class="panel-card"><h2>Completed</h2><p>${summary.completed ?? 0}</p></div>
    </div>
  `;

  const itemsHtml = items.length
    ? `
      <div class="panel-grid" style="margin-top: 16px; grid-template-columns: 1fr;">
        ${items.map((item) => `
          <div class="panel-card">
            <h2>${escapeHtml(item.record_type || "Compliance item")}</h2>
            <div class="profile-grid">
              <div class="profile-label">Section</div><div class="profile-value">${escapeHtml(item.section || "—")}</div>
              <div class="profile-label">Title</div><div class="profile-value">${escapeHtml(item.title || "—")}</div>
              <div class="profile-label">Due date</div><div class="profile-value">${formatDate(item.due_date)}</div>
              <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(item.status || "—")}</div>
              <div class="profile-label">Notes</div><div class="profile-value">${escapeHtml(item.notes || "—")}</div>
            </div>
          </div>
        `).join("")}
      </div>
    `
    : `<div class="panel-card" style="margin-top: 16px;"><h2>Compliance</h2><p>No compliance items found.</p></div>`;

  compliancePanel.innerHTML = summaryHtml + itemsHtml;
}

function renderYoungPerson() {
  if (!selectedYoungPerson) return;

  summaryCards.innerHTML = `
    <div class="summary-card">
      <div class="label">Preferred Name</div>
      <div class="value">${escapeHtml(selectedYoungPerson.preferred_name || selectedYoungPerson.first_name || "—")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Age</div>
      <div class="value">${calculateAge(selectedYoungPerson.date_of_birth)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Home</div>
      <div class="value">${escapeHtml(selectedYoungPerson.home_name || "—")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Placement</div>
      <div class="value">${escapeHtml(selectedYoungPerson.placement_status || "—")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Risk</div>
      <div class="value">${escapeHtml(selectedYoungPerson.summary_risk_level || "—")}</div>
    </div>
  `;

  renderAlerts();
  renderComplianceHeader();

  overviewContent.innerHTML = `
    <div class="profile-grid">
      <div class="profile-label">Full name</div><div class="profile-value">${escapeHtml(`${selectedYoungPerson.first_name || ""} ${selectedYoungPerson.last_name || ""}`.trim() || "—")}</div>
      <div class="profile-label">Preferred name</div><div class="profile-value">${escapeHtml(selectedYoungPerson.preferred_name || "—")}</div>
      <div class="profile-label">Date of birth</div><div class="profile-value">${formatDate(selectedYoungPerson.date_of_birth)}</div>
      <div class="profile-label">Admission date</div><div class="profile-value">${formatDate(selectedYoungPerson.admission_date)}</div>
      <div class="profile-label">Discharge date</div><div class="profile-value">${formatDate(selectedYoungPerson.discharge_date)}</div>
      <div class="profile-label">Gender</div><div class="profile-value">${escapeHtml(selectedYoungPerson.gender || "—")}</div>
      <div class="profile-label">Ethnicity</div><div class="profile-value">${escapeHtml(selectedYoungPerson.ethnicity || "—")}</div>
      <div class="profile-label">NHS number</div><div class="profile-value">${escapeHtml(selectedYoungPerson.nhs_number || "—")}</div>
      <div class="profile-label">Local ID</div><div class="profile-value">${escapeHtml(selectedYoungPerson.local_id_number || "—")}</div>
      <div class="profile-label">Keyworker</div><div class="profile-value">${selectedYoungPerson.keyworker_first_name ? escapeHtml(`${selectedYoungPerson.keyworker_first_name} ${selectedYoungPerson.keyworker_last_name || ""}`.trim()) : "—"}</div>
    </div>
  `;

  const legal = selectedProfile?.legal_statuses?.[0];
  const education = selectedProfile?.education_profile;
  const health = selectedProfile?.health_profile;
  const communication = selectedProfile?.communication_profile;
  const identity = selectedProfile?.identity_profile;
  const contacts = selectedProfile?.contacts || [];

  profileContent.innerHTML = `
    <div class="panel-grid">
      <div class="panel-card">
        <h2>Legal Status</h2>
        <div class="profile-grid">
          <div class="profile-label">Legal status</div><div class="profile-value">${escapeHtml(legal?.legal_status || "—")}</div>
          <div class="profile-label">Order type</div><div class="profile-value">${escapeHtml(legal?.order_type || "—")}</div>
          <div class="profile-label">Order details</div><div class="profile-value">${escapeHtml(legal?.order_details || "—")}</div>
          <div class="profile-label">Delegated authority</div><div class="profile-value">${escapeHtml(legal?.delegated_authority_details || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Education</h2>
        <div class="profile-grid">
          <div class="profile-label">School</div><div class="profile-value">${escapeHtml(education?.school_name || "—")}</div>
          <div class="profile-label">Year group</div><div class="profile-value">${escapeHtml(education?.year_group || "—")}</div>
          <div class="profile-label">SEN status</div><div class="profile-value">${escapeHtml(education?.sen_status || "—")}</div>
          <div class="profile-label">PEP status</div><div class="profile-value">${escapeHtml(education?.pep_status || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Health</h2>
        <div class="profile-grid">
          <div class="profile-label">GP</div><div class="profile-value">${escapeHtml(health?.gp_name || "—")}</div>
          <div class="profile-label">Allergies</div><div class="profile-value">${escapeHtml(health?.allergies || "—")}</div>
          <div class="profile-label">Diagnoses</div><div class="profile-value">${escapeHtml(health?.diagnoses || "—")}</div>
          <div class="profile-label">Mental health</div><div class="profile-value">${escapeHtml(health?.mental_health_summary || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Communication</h2>
        <div class="profile-grid">
          <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(communication?.neurodiversity_summary || "—")}</div>
          <div class="profile-label">Style</div><div class="profile-value">${escapeHtml(communication?.communication_style || "—")}</div>
          <div class="profile-label">What helps</div><div class="profile-value">${escapeHtml(communication?.what_helps || "—")}</div>
          <div class="profile-label">Avoid</div><div class="profile-value">${escapeHtml(communication?.what_to_avoid || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Identity</h2>
        <div class="profile-grid">
          <div class="profile-label">Culture</div><div class="profile-value">${escapeHtml(identity?.cultural_identity || "—")}</div>
          <div class="profile-label">Language</div><div class="profile-value">${escapeHtml(identity?.first_language || "—")}</div>
          <div class="profile-label">Interests</div><div class="profile-value">${escapeHtml(identity?.interests || "—")}</div>
          <div class="profile-label">Strengths</div><div class="profile-value">${escapeHtml(identity?.strengths_summary || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Contacts</h2>
        ${
          contacts.length
            ? contacts.map((contact) => `
              <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                <strong>${escapeHtml(contact.full_name || "Contact")}</strong><br>
                <span>${escapeHtml(contact.relationship_to_young_person || "—")}</span><br>
                <span>${escapeHtml(contact.phone || "—")}</span><br>
                <span>${escapeHtml(contact.supervision_level || "—")}</span>
              </div>
            `).join("")
            : "<p>No contacts recorded.</p>"
        }
      </div>
    </div>
  `;

  renderPlans();
  renderRisks();
  renderDailyNotes();
  renderIncidents();
  renderHealth();
  renderEducation();
  renderFamily();
  renderKeywork();
  renderChronology();
  renderCompliance();
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      buttons.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      const targetPanel = document.getElementById(`tab-${tab}`);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });
}

function resetDailyNoteForm() {
  dailyNoteForm?.reset();
  if (dailyNoteIdInput) dailyNoteIdInput.value = "";
  if (dnSignificance) dnSignificance.value = "standard";
  if (dnWorkflowStatus) dnWorkflowStatus.value = "draft";
  if (dailyNoteModalTitle) dailyNoteModalTitle.textContent = "Add Daily Note";
  if (dailyNoteAiFeedback) {
    dailyNoteAiFeedback.textContent = "AI review output will appear here once connected.";
  }
}

function openDailyNoteModal(note = null) {
  if (!dailyNoteModal) return;

  resetDailyNoteForm();

  if (note) {
    if (dailyNoteModalTitle) dailyNoteModalTitle.textContent = "Edit Daily Note";
    if (dailyNoteIdInput) dailyNoteIdInput.value = note.id || "";
    if (dnNoteDate) dnNoteDate.value = note.note_date ? note.note_date.split("T")[0] : "";
    if (dnShiftType) dnShiftType.value = note.shift_type || "";
    if (dnMood) dnMood.value = note.mood || "";
    if (dnSignificance) dnSignificance.value = note.significance || "standard";
    if (dnYoungPersonVoice) dnYoungPersonVoice.value = note.young_person_voice || "";
    if (dnPresentation) dnPresentation.value = note.presentation || "";
    if (dnEducationUpdate) dnEducationUpdate.value = note.education_update || "";
    if (dnPositives) dnPositives.value = note.positives || "";
    if (dnHealthUpdate) dnHealthUpdate.value = note.health_update || "";
    if (dnFamilyUpdate) dnFamilyUpdate.value = note.family_update || "";
    if (dnBehaviourUpdate) dnBehaviourUpdate.value = note.behaviour_update || "";
    if (dnActivities) dnActivities.value = note.activities || "";
    if (dnActionsRequired) dnActionsRequired.value = note.actions_required || "";
    if (dnWorkflowStatus) dnWorkflowStatus.value = note.workflow_status || "draft";
    if (dnManagerReviewComment) dnManagerReviewComment.value = note.manager_review_comment || "";
  } else if (dnNoteDate) {
    dnNoteDate.value = new Date().toISOString().split("T")[0];
  }

  dailyNoteModal.classList.remove("hidden");
}

function closeDailyNoteModal() {
  if (!dailyNoteModal) return;
  dailyNoteModal.classList.add("hidden");
  resetDailyNoteForm();
}

function buildDailyNotePayload(statusOverride = null) {
  return {
    young_person_id: selectedYoungPerson?.id,
    home_id: selectedYoungPerson?.home_id ?? null,
    note_date: dnNoteDate?.value || null,
    shift_type: dnShiftType?.value || null,
    mood: dnMood?.value?.trim() || null,
    presentation: dnPresentation?.value?.trim() || null,
    activities: dnActivities?.value?.trim() || null,
    education_update: dnEducationUpdate?.value?.trim() || null,
    health_update: dnHealthUpdate?.value?.trim() || null,
    family_update: dnFamilyUpdate?.value?.trim() || null,
    behaviour_update: dnBehaviourUpdate?.value?.trim() || null,
    young_person_voice: dnYoungPersonVoice?.value?.trim() || null,
    positives: dnPositives?.value?.trim() || null,
    actions_required: dnActionsRequired?.value?.trim() || null,
    significance: dnSignificance?.value || "standard",
    workflow_status: statusOverride || dnWorkflowStatus?.value || "draft",
    manager_review_comment: dnManagerReviewComment?.value?.trim() || null,
    author_id: null,
  };
}

async function persistDailyNote(statusOverride = null) {
  if (!selectedYoungPerson) {
    alert("Please select a young person first.");
    return;
  }

  const existingId = dailyNoteIdInput?.value?.trim();
  const payload = buildDailyNotePayload(statusOverride);

  const url = existingId ? `/young-people/daily-notes/${existingId}` : "/young-people/daily-notes";
  const method = existingId ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to save daily note");
  }

  closeDailyNoteModal();
  await loadYoungPerson(selectedYoungPerson.id);
}

async function saveDailyNote(event) {
  event.preventDefault();

  try {
    await persistDailyNote();
  } catch (error) {
    console.error("Failed to save daily note:", error);
    alert("Unable to save daily note. Please check your backend and try again.");
  }
}

async function updateDailyNoteWorkflow(note, newStatus) {
  try {
    const payload = {
      workflow_status: newStatus,
      manager_review_comment: newStatus === "returned"
        ? "Please review and update this note."
        : note.manager_review_comment || null,
    };

    const response = await fetch(`/young-people/daily-notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to update note workflow");
    }

    await loadYoungPerson(selectedYoungPerson.id);
  } catch (error) {
    console.error(error);
    alert("Unable to update note workflow.");
  }
}

function setupAiHelperButtons() {
  document.querySelectorAll(".ai-tool-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.aiAction || "improve";
      const targetId = button.dataset.target;
      const target = targetId ? document.getElementById(targetId) : null;

      if (!target) return;

      const original = target.value?.trim();
      if (!original) {
        if (dailyNoteAiFeedback) {
          dailyNoteAiFeedback.textContent = "Write something in the field first, then use AI support.";
        }
        return;
      }

      if (dailyNoteAiFeedback) {
        dailyNoteAiFeedback.textContent = `AI "${action}" support will connect here. This is ready to link to your IndiCare assistant.`;
      }
    });
  });

  document.querySelectorAll(".ai-full-review-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const reviewType = button.dataset.aiReview || "review";
      if (dailyNoteAiFeedback) {
        dailyNoteAiFeedback.textContent = `Full-note AI review "${reviewType}" will appear here once connected to your assistant.`;
      }
    });
  });
}

selector?.addEventListener("change", async (e) => {
  await loadYoungPerson(e.target.value);
});

document.getElementById("backToListBtn")?.addEventListener("click", () => {
  window.location.href = "/young-people-page";
});

document.getElementById("editYoungPersonBtn")?.addEventListener("click", () => {
  window.location.href = "/young-people-page";
});

openDailyNoteModalBtn?.addEventListener("click", () => {
  const currentDraft = getCurrentDraftNote();
  openDailyNoteModal(currentDraft || null);
});

closeDailyNoteModalBtn?.addEventListener("click", closeDailyNoteModal);
cancelDailyNoteBtn?.addEventListener("click", closeDailyNoteModal);
dailyNoteForm?.addEventListener("submit", saveDailyNote);

saveDraftDailyNoteBtn?.addEventListener("click", async () => {
  try {
    await persistDailyNote("draft");
  } catch (error) {
    console.error(error);
    alert("Unable to save draft.");
  }
});

submitDailyNoteBtn?.addEventListener("click", async () => {
  try {
    await persistDailyNote("submitted");
  } catch (error) {
    console.error(error);
    alert("Unable to submit note for review.");
  }
});

approveDailyNoteBtn?.addEventListener("click", async () => {
  try {
    await persistDailyNote("approved");
  } catch (error) {
    console.error(error);
    alert("Unable to approve note.");
  }
});

returnDailyNoteBtn?.addEventListener("click", async () => {
  try {
    await persistDailyNote("returned");
  } catch (error) {
    console.error(error);
    alert("Unable to return note for amendments.");
  }
});

dailyNoteModal?.addEventListener("click", (event) => {
  if (event.target === dailyNoteModal) {
    closeDailyNoteModal();
  }
});

dailyNotesSearch?.addEventListener("input", () => {
  if (dailyNotesHistoryWrapper) dailyNotesHistoryWrapper.classList.add("open");
  if (toggleDailyNotesHistoryBtn) toggleDailyNotesHistoryBtn.textContent = "Hide Previous Notes";
  historyOpen = true;
  renderDailyNotes();
});

dailyNotesDateFilter?.addEventListener("change", () => {
  if (dailyNotesHistoryWrapper) dailyNotesHistoryWrapper.classList.add("open");
  if (toggleDailyNotesHistoryBtn) toggleDailyNotesHistoryBtn.textContent = "Hide Previous Notes";
  historyOpen = true;
  renderDailyNotes();
});

dailyNotesMonthFilter?.addEventListener("change", () => {
  if (dailyNotesHistoryWrapper) dailyNotesHistoryWrapper.classList.add("open");
  if (toggleDailyNotesHistoryBtn) toggleDailyNotesHistoryBtn.textContent = "Hide Previous Notes";
  historyOpen = true;
  renderDailyNotes();
});

dailyNotesYearFilter?.addEventListener("change", () => {
  if (dailyNotesHistoryWrapper) dailyNotesHistoryWrapper.classList.add("open");
  if (toggleDailyNotesHistoryBtn) toggleDailyNotesHistoryBtn.textContent = "Hide Previous Notes";
  historyOpen = true;
  renderDailyNotes();
});

clearDailyNotesFiltersBtn?.addEventListener("click", () => {
  if (dailyNotesSearch) dailyNotesSearch.value = "";
  if (dailyNotesDateFilter) dailyNotesDateFilter.value = "";
  if (dailyNotesMonthFilter) dailyNotesMonthFilter.value = "";
  if (dailyNotesYearFilter) dailyNotesYearFilter.value = "";
  renderDailyNotes();
});

toggleDailyNotesHistoryBtn?.addEventListener("click", () => {
  historyOpen = !historyOpen;
  if (historyOpen) {
    dailyNotesHistoryWrapper?.classList.add("open");
    toggleDailyNotesHistoryBtn.textContent = "Hide Previous Notes";
  } else {
    dailyNotesHistoryWrapper?.classList.remove("open");
    toggleDailyNotesHistoryBtn.textContent = "View Previous Notes";
  }
});

async function init() {
  setupTabs();
  setupAiHelperButtons();
  clearDisplay();
  await loadYoungPeople();
}

init();
