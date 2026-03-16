const state = {
  youngPeople: [],
  filteredYoungPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview",
  latest: {
    overview: null,
    profile: null,
    plans: [],
    risk: [],
    dailyNotes: [],
    incidents: [],
    health: null,
    education: null,
    family: null,
    chronology: [],
    monthlyReviews: [],
    standardsSummary: [],
    standardsEvidence: [],
    compliance: null,
    keywork: []
  },
  jumpComplianceFilter: "all",
  modal: {
    open: false,
    type: null,
    mode: "view",
    record: null
  }
};

const endpoints = {
  youngPeopleList: ["/young-people", "/young-people/list"],
  overview: (id) => [`/young-people/${id}`],
  profile: (id) => [`/young-people/${id}/profile`],
  plans: (id) => [`/young-people/${id}/plans`],
  risk: (id) => [`/young-people/${id}/risk`],
  daily_notes: (id) => [`/young-people/${id}/daily-notes`],
  incidents: (id) => [`/young-people/${id}/incidents`],
  health: (id) => [`/young-people/${id}/health`],
  education: (id) => [`/young-people/${id}/education`],
  family: (id) => [`/young-people/${id}/family`],
  compliance: (id) => [`/young-people/${id}/compliance`],
  chronology: (id) => `/young-people/${id}/chronology`,
  chronologyRebuild: (id) => `/young-people/${id}/chronology/rebuild`,
  keywork: (id) => `/young-people/${id}/keywork`,
  monthlyReviews: (id) => `/monthly-reviews/young-person/${id}`,
  monthlyReviewDetail: (id) => `/monthly-reviews/${id}`,
  monthlyReviewGenerate: (id, month) =>
    `/monthly-reviews/young-person/${id}/generate?review_month=${month}`,
  standardsSummary: (id) => [`/young-people/${id}/standards`],
  standardsEvidence: (id) => [`/young-people/${id}/standards/evidence`],
  standardsRebuild: (id) => `/young-people/${id}/standards/rebuild`,
  inspectionPackCreate: "/inspection-pack",
  ofstedAiReport: (id, reviewMonth = "") =>
    reviewMonth
      ? `/ofsted-ai/young-person/${id}/report?review_month=${encodeURIComponent(reviewMonth)}`
      : `/ofsted-ai/young-person/${id}/report`
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  youngPeopleList: $("youngPeopleList"),
  youngPersonSearch: $("youngPersonSearch"),
  refreshYoungPeopleBtn: $("refreshYoungPeopleBtn"),

  selectedYoungPersonName: $("selectedYoungPersonName"),
  selectedYoungPersonMeta: $("selectedYoungPersonMeta"),
  statusBar: $("statusBar"),

  stickyPersonAvatar: $("stickyPersonAvatar"),
  stickyYoungPersonName: $("stickyYoungPersonName"),
  stickyYoungPersonSummary: $("stickyYoungPersonSummary"),
  stickyDobChip: $("stickyDobChip"),
  stickyPlacementChip: $("stickyPlacementChip"),
  stickySocialWorkerChip: $("stickySocialWorkerChip"),
  stickyEducationChip: $("stickyEducationChip"),
  stickyRiskLevel: $("stickyRiskLevel"),
  stickyPlanReview: $("stickyPlanReview"),
  stickyTodayInfo: $("stickyTodayInfo"),

  reloadCurrentBtn: $("reloadCurrentBtn"),
  inspectionPackBtn: $("inspectionPackBtn"),
  headerOfstedAiBtn: $("headerOfstedAiBtn"),

  newDailyNoteBtn: $("newDailyNoteBtn"),
  newIncidentBtn: $("newIncidentBtn"),
  newKeyworkBtn: $("newKeyworkBtn"),
  newPlanBtn: $("newPlanBtn"),
  newRiskBtn: $("newRiskBtn"),

  tabNewDailyNoteBtn: $("tabNewDailyNoteBtn"),
  tabNewIncidentBtn: $("tabNewIncidentBtn"),
  tabNewKeyworkBtn: $("tabNewKeyworkBtn"),
  tabNewPlanBtn: $("tabNewPlanBtn"),
  tabNewRiskBtn: $("tabNewRiskBtn"),

  globalNewDailyNoteBtn: $("globalNewDailyNoteBtn"),
  globalNewIncidentBtn: $("globalNewIncidentBtn"),
  globalNewKeyworkBtn: $("globalNewKeyworkBtn"),
  globalNewPlanBtn: $("globalNewPlanBtn"),
  globalNewRiskBtn: $("globalNewRiskBtn"),

  overviewContent: $("overviewContent"),
  profileContent: $("profileContent"),
  plansContent: $("plansContent"),
  riskContent: $("riskContent"),
  dailyNotesContent: $("dailyNotesContent"),
  incidentsContent: $("incidentsContent"),
  healthContent: $("healthContent"),
  educationContent: $("educationContent"),
  familyContent: $("familyContent"),
  keyworkContent: $("keyworkContent"),
  chronologyContent: $("chronologyContent"),
  monthlyReviewsList: $("monthlyReviewsList"),
  monthlyReviewDetail: $("monthlyReviewDetail"),
  standardsSummary: $("standardsSummary"),
  standardsEvidenceList: $("standardsEvidenceList"),
  complianceContent: $("complianceContent"),

  overviewRecentActivityContent: $("overviewRecentActivityContent"),
  overviewActionsContent: $("overviewActionsContent"),
  overviewAlertsContent: $("overviewAlertsContent"),

  refreshDailyNotesBtn: $("refreshDailyNotesBtn"),
  dailyNoteStatusFilter: $("dailyNoteStatusFilter"),
  dailyNoteShiftFilter: $("dailyNoteShiftFilter"),
  dailyNoteSearch: $("dailyNoteSearch"),

  rebuildChronologyBtn: $("rebuildChronologyBtn"),
  monthlyReviewMonth: $("monthlyReviewMonth"),
  generateMonthlyReviewBtn: $("generateMonthlyReviewBtn"),
  monthlyOfstedAiBtn: $("monthlyOfstedAiBtn"),
  rebuildStandardsBtn: $("rebuildStandardsBtn"),
  complianceStatusFilter: $("complianceStatusFilter"),
  complianceCategoryFilter: $("complianceCategoryFilter"),

  workspaceModalTitle: $("workspaceModalTitle"),
  workspaceModalMeta: $("workspaceModalMeta"),
  workspaceModalContent: $("workspaceModalContent"),
  workspaceModalContext: $("workspaceModalContext"),
  workspaceModalVersions: $("workspaceModalVersions"),
  workspaceModalAiPanel: $("workspaceModalAiPanel"),
  workspaceModalSaveBtn: $("workspaceModalSaveBtn"),
  workspaceModalCompleteBtn: $("workspaceModalCompleteBtn"),
  workspaceModalCloseBtn: $("workspaceModalCloseBtn"),
  recordWorkspaceModal: $("recordWorkspaceModal")
};

document.addEventListener("DOMContentLoaded", () => {
  setDefaultMonthlyReviewMonth();
  bindEvents();
  loadYoungPeople();
});

function bindEvents() {
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  on(els.youngPersonSearch, "input", handleSearch);
  on(els.refreshYoungPeopleBtn, "click", loadYoungPeople);
  on(els.reloadCurrentBtn, "click", reloadCurrentRecord);

  on(els.inspectionPackBtn, "click", createInspectionPackJob);
  on(els.headerOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));
  on(els.monthlyOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));

  bindNewDocButton(els.globalNewDailyNoteBtn, "daily_note");
  bindNewDocButton(els.globalNewIncidentBtn, "incident");
  bindNewDocButton(els.globalNewKeyworkBtn, "keywork");
  bindNewDocButton(els.globalNewPlanBtn, "plan");
  bindNewDocButton(els.globalNewRiskBtn, "risk");

  bindNewDocButton(els.newDailyNoteBtn, "daily_note");
  bindNewDocButton(els.newIncidentBtn, "incident");
  bindNewDocButton(els.newKeyworkBtn, "keywork");
  bindNewDocButton(els.newPlanBtn, "plan");
  bindNewDocButton(els.newRiskBtn, "risk");

  bindNewDocButton(els.tabNewDailyNoteBtn, "daily_note");
  bindNewDocButton(els.tabNewIncidentBtn, "incident");
  bindNewDocButton(els.tabNewKeyworkBtn, "keywork");
  bindNewDocButton(els.tabNewPlanBtn, "plan");
  bindNewDocButton(els.tabNewRiskBtn, "risk");

  on(els.refreshDailyNotesBtn, "click", () => {
    if (state.selectedYoungPerson) loadDailyNotes(state.selectedYoungPerson.id);
  });

  on(els.dailyNoteStatusFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteShiftFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteSearch, "input", renderDailyNotesListFromState);

  on(els.rebuildChronologyBtn, "click", rebuildChronology);
  on(els.generateMonthlyReviewBtn, "click", generateMonthlyReview);
  on(els.rebuildStandardsBtn, "click", rebuildStandardsLinks);
  on(els.complianceStatusFilter, "change", rerenderComplianceFromState);
  on(els.complianceCategoryFilter, "change", rerenderComplianceFromState);

  on(els.workspaceModalCloseBtn, "click", closeWorkspaceModal);
  on(els.workspaceModalSaveBtn, "click", () => {
    showStatus(`${formatLabel(state.modal.type || "document")} save wiring comes next.`);
  });
  on(els.workspaceModalCompleteBtn, "click", () => {
    showStatus(`${formatLabel(state.modal.type || "document")} complete wiring comes next.`);
  });

  on(els.recordWorkspaceModal, "click", (event) => {
    if (event.target === els.recordWorkspaceModal) closeWorkspaceModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modal.open) closeWorkspaceModal();
  });
}

function bindNewDocButton(el, type) {
  on(el, "click", () => openNewDocument(type));
}

function on(el, event, handler) {
  if (el) el.addEventListener(event, handler);
}

function setDefaultMonthlyReviewMonth() {
  if (!els.monthlyReviewMonth) return;
  const now = new Date();
  els.monthlyReviewMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedReviewMonthParam() {
  return els.monthlyReviewMonth?.value ? `${els.monthlyReviewMonth.value}-01` : "";
}

/* -------------------- API -------------------- */

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) message = data.detail;
    } catch (_error) {}
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : null;
}

async function fetchFromCandidates(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No endpoint returned data");
}

/* -------------------- State load -------------------- */

async function loadYoungPeople() {
  try {
    showStatus("Loading young people...");
    const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.youngPeopleList));

    state.youngPeople = rows;
    state.filteredYoungPeople = [...rows];

    renderYoungPeopleList();

    if (!state.selectedYoungPerson && rows.length) {
      await selectYoungPerson(rows[0]);
    } else if (state.selectedYoungPerson) {
      const refreshed = rows.find((row) => Number(row.id) === Number(state.selectedYoungPerson.id));
      if (refreshed) {
        state.selectedYoungPerson = refreshed;
        renderYoungPeopleList();
        updateSelectedPersonHeader();
        updateStickyHeader();
      }
    }

    showStatus("Young people loaded.");
  } catch (error) {
    if (els.youngPeopleList) {
      els.youngPeopleList.innerHTML = `
        <div class="empty-state">
          Could not load young people.
          <br />
          <small>${escapeHtml(error.message)}</small>
        </div>
      `;
    }
    showStatus(`Could not load young people: ${error.message}`, true);
  }
}

async function selectYoungPerson(person) {
  state.selectedYoungPerson = person;
  state.latest = {
    overview: null,
    profile: null,
    plans: [],
    risk: [],
    dailyNotes: [],
    incidents: [],
    health: null,
    education: null,
    family: null,
    chronology: [],
    monthlyReviews: [],
    standardsSummary: [],
    standardsEvidence: [],
    compliance: null,
    keywork: []
  };

  closeWorkspaceModal();
  renderYoungPeopleList();
  updateSelectedPersonHeader();
  updateStickyHeader();

  await loadActionBarData();
  await loadActiveTabData();
}

async function loadActionBarData() {
  if (!state.selectedYoungPerson) return;
  const id = state.selectedYoungPerson.id;

  try {
    const [profile, plans, risk, dailyNotes, incidents, education, compliance] = await Promise.all([
      fetchFromCandidates(endpoints.profile(id)).catch(() => null),
      fetchFromCandidates(endpoints.plans(id)).catch(() => []),
      fetchFromCandidates(endpoints.risk(id)).catch(() => []),
      fetchFromCandidates(endpoints.daily_notes(id)).catch(() => []),
      fetchFromCandidates(endpoints.incidents(id)).catch(() => []),
      fetchFromCandidates(endpoints.education(id)).catch(() => null),
      fetchFromCandidates(endpoints.compliance(id)).catch(() => null)
    ]);

    state.latest.profile = profile;
    state.latest.plans = normaliseArrayResponse(plans);
    state.latest.risk = normaliseArrayResponse(risk);
    state.latest.dailyNotes = normaliseArrayResponse(dailyNotes);
    state.latest.incidents = normaliseArrayResponse(incidents);
    state.latest.education = education;
    state.latest.compliance = compliance;

    updateStickyHeader();
  } catch (_error) {}
}

function setActiveTab(tabName) {
  state.activeTab = tabName;

  $$(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  $$(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  loadActiveTabData();
}

async function reloadCurrentRecord() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  await loadActionBarData();
  await loadActiveTabData();
}

const tabLoaders = {
  overview: loadOverview,
  profile: loadProfile,
  plans: loadPlans,
  risk: loadRisk,
  daily_notes: loadDailyNotes,
  incidents: loadIncidents,
  health: loadHealth,
  education: loadEducation,
  family: loadFamily,
  keywork: loadKeywork,
  chronology: loadChronology,
  monthly_reviews: loadMonthlyReviews,
  standards: loadStandards,
  compliance: loadCompliance
};

async function loadActiveTabData() {
  if (!state.selectedYoungPerson) return;
  const loader = tabLoaders[state.activeTab];
  if (!loader) return;

  try {
    await loader(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(error.message, true);
  }
}

/* -------------------- Header -------------------- */

function renderYoungPeopleList() {
  if (!els.youngPeopleList) return;

  if (!state.filteredYoungPeople.length) {
    els.youngPeopleList.innerHTML = `<div class="empty-state">No young people found.</div>`;
    return;
  }

  els.youngPeopleList.innerHTML = state.filteredYoungPeople.map((person) => {
    const active = Number(state.selectedYoungPerson?.id) === Number(person.id) ? "active" : "";
    return `
      <div class="young-person-card ${active}" data-id="${person.id}">
        <h4>${escapeHtml(getFullName(person))}</h4>
        <p>${escapeHtml(person.placement_status ? `Status: ${person.placement_status}` : `ID: ${person.id}`)}</p>
      </div>
    `;
  }).join("");

  $$(".young-person-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const personId = Number(card.dataset.id);
      const person = state.youngPeople.find((row) => Number(row.id) === personId);
      if (person) await selectYoungPerson(person);
    });
  });
}

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();
  state.filteredYoungPeople = state.youngPeople.filter((person) => {
    const name = `${person.first_name || ""} ${person.last_name || ""} ${person.preferred_name || ""}`.toLowerCase();
    return name.includes(term);
  });
  renderYoungPeopleList();
}

function updateSelectedPersonHeader() {
  if (!state.selectedYoungPerson) {
    setText(els.selectedYoungPersonName, "Select a young person");
    setText(els.selectedYoungPersonMeta, "No record loaded");
    return;
  }

  const person = state.selectedYoungPerson;
  const bits = [`ID: ${person.id}`];
  if (person.date_of_birth) bits.push(`DOB: ${formatDate(person.date_of_birth)}`);
  if (person.placement_status) bits.push(`Status: ${person.placement_status}`);
  if (person.summary_risk_level) bits.push(`Risk: ${person.summary_risk_level}`);

  setText(els.selectedYoungPersonName, getFullName(person));
  setText(els.selectedYoungPersonMeta, bits.join(" | "));
}

function updateStickyHeader() {
  const person = state.selectedYoungPerson;

  if (!person) {
    setText(els.stickyPersonAvatar, "YP");
    setText(els.stickyYoungPersonName, "No young person selected");
    setText(els.stickyYoungPersonSummary, "Select a young person to load the workspace");
    setText(els.stickyDobChip, "DOB: —");
    setText(els.stickyPlacementChip, "Placement: —");
    setText(els.stickySocialWorkerChip, "SW: —");
    setText(els.stickyEducationChip, "Education: —");
    setText(els.stickyRiskLevel, "Risk: —");
    setText(els.stickyPlanReview, "Plan review: —");
    setText(els.stickyTodayInfo, "Today I need to know: —");
    return;
  }

  const profile = state.latest.profile || {};
  const yp = profile.young_person || person;
  const alerts = Array.isArray(profile.alerts) ? profile.alerts : [];
  const activePlan = state.latest.plans.find((row) => String(row.status || "").toLowerCase() === "active");
  const educationProfile = Array.isArray(state.latest.education?.education_profile)
    ? state.latest.education.education_profile[0]
    : null;

  setText(els.stickyPersonAvatar, getInitials(person));
  setText(els.stickyYoungPersonName, getFullName(person));
  setText(
    els.stickyYoungPersonSummary,
    `${yp.placement_status || "Placement not recorded"}${yp.legal_status ? ` • ${yp.legal_status}` : ""}`
  );
  setText(els.stickyDobChip, `DOB: ${yp.date_of_birth ? formatDate(yp.date_of_birth) : "—"}`);
  setText(els.stickyPlacementChip, `Placement: ${yp.placement_status || "—"}`);
  setText(els.stickySocialWorkerChip, `SW: ${yp.social_worker_name || yp.social_worker || "—"}`);
  setText(els.stickyEducationChip, `Education: ${yp.school_name || educationProfile?.school_name || yp.education_status || "—"}`);
  setText(els.stickyRiskLevel, `Risk: ${yp.summary_risk_level || "—"}`);
  setText(els.stickyPlanReview, `Plan review: ${activePlan?.review_date ? formatDate(activePlan.review_date) : "—"}`);
  setText(els.stickyTodayInfo, `Today I need to know: ${alerts[0]?.title || alerts[0]?.description || "No live alert"}`);
}

/* -------------------- Loaders -------------------- */

async function loadOverview(id) {
  renderLoading(els.overviewContent, "Loading overview...");
  renderLoading(els.overviewRecentActivityContent, "Loading recent activity...");
  renderLoading(els.overviewActionsContent, "Loading actions...");
  renderLoading(els.overviewAlertsContent, "Loading alerts...");

  const data = await fetchFromCandidates(endpoints.overview(id));
  state.latest.overview = data;

  const activePlans = state.latest.plans.filter((row) => String(row.status || "").toLowerCase() === "active");
  const activeRisks = state.latest.risk.filter((row) => String(row.status || "").toLowerCase() === "active");
  const alerts = Array.isArray(state.latest.profile?.alerts) ? state.latest.profile.alerts : [];
  const dueItems = Array.isArray(state.latest.compliance?.compliance_items)
    ? state.latest.compliance.compliance_items.filter((item) => item.compliance_status !== "ok")
    : [];

  els.overviewContent.innerHTML = `
    ${renderKeyValueCards([
      ["Placement Status", data?.placement_status],
      ["Risk Level", data?.summary_risk_level],
      ["Legal Status", data?.legal_status],
      ["School", data?.school_name],
      ["GP", data?.gp_name],
      ["What Matters", data?.what_matters_to_me]
    ])}
  `;

  els.overviewRecentActivityContent.innerHTML = `
    ${renderDocumentCards(state.latest.dailyNotes.slice(0, 5), "daily_note", {
      title: (row) => `${formatDate(row.note_date)} • ${stringifyValue(row.shift_type)}`,
      meta: (row) => stringifyValue(row.workflow_status),
      summary: (row) =>
        getDailyNoteField(row, ["what_happened", "main_events"]) ||
        getDailyNoteField(row, ["what_happened", "presentation"]) ||
        "No summary"
    })}
  `;

  els.overviewActionsContent.innerHTML = `
    ${renderKeyValueCards([
      ["Active Plans", activePlans.length],
      ["Active Risks", activeRisks.length],
      ["Due Actions", dueItems.length]
    ])}
  `;

  els.overviewAlertsContent.innerHTML = alerts.length
    ? renderSimpleList(alerts.map((row) => row.title || row.description || "Alert"))
    : `<div class="empty-state">No alerts.</div>`;
}

async function loadProfile(id) {
  renderLoading(els.profileContent, "Loading profile...");
  const data = await fetchFromCandidates(endpoints.profile(id));
  state.latest.profile = data;
  updateStickyHeader();

  els.profileContent.innerHTML = [
    renderObjectSection("Young Person", data?.young_person || {}, [
      "id",
      "first_name",
      "last_name",
      "preferred_name",
      "date_of_birth",
      "gender",
      "ethnicity",
      "local_id_number",
      "placement_status",
      "summary_risk_level"
    ]),
    renderArraySection("Legal Status", data?.legal_status || [], [
      "legal_status",
      "order_type",
      "order_details",
      "effective_from",
      "effective_to",
      "is_current"
    ]),
    renderArraySection("Communication Profile", data?.communication_profile || [], [
      "neurodiversity_summary",
      "communication_style",
      "sensory_profile",
      "processing_needs",
      "what_helps"
    ]),
    renderArraySection("Identity Profile", data?.identity_profile || [], [
      "interests",
      "strengths_summary",
      "what_matters_to_me"
    ]),
    renderArraySection("Alerts", data?.alerts || [], [
      "alert_type",
      "title",
      "description",
      "severity",
      "review_date"
    ])
  ].join("");
}

async function loadPlans(id) {
  renderLoading(els.plansContent, "Loading plans...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.plans(id)));
  state.latest.plans = rows;
  updateStickyHeader();

  els.plansContent.innerHTML = renderDocumentCards(rows, "plan", {
    title: (row) => row.title || row.plan_type || "Plan",
    meta: (row) => `${stringifyValue(row.status)} • ${row.review_date ? formatDate(row.review_date) : "No review date"}`,
    summary: (row) => row.presenting_need || row.summary || "No summary"
  });
}

async function loadRisk(id) {
  renderLoading(els.riskContent, "Loading risk...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.risk(id)));
  state.latest.risk = rows;
  updateStickyHeader();

  els.riskContent.innerHTML = renderDocumentCards(rows, "risk", {
    title: (row) => row.title || row.category || "Risk assessment",
    meta: (row) => `${stringifyValue(row.severity)} • ${row.review_date ? formatDate(row.review_date) : "No review date"}`,
    summary: (row) => row.concern_summary || "No summary"
  });
}

async function loadDailyNotes(id) {
  renderLoading(els.dailyNotesContent, "Loading daily notes...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.daily_notes(id)));
  state.latest.dailyNotes = rows;
  renderDailyNotesListFromState();
}

function renderDailyNotesListFromState() {
  let rows = [...state.latest.dailyNotes];

  const statusFilter = els.dailyNoteStatusFilter?.value || "all";
  const shiftFilter = els.dailyNoteShiftFilter?.value || "all";
  const term = (els.dailyNoteSearch?.value || "").trim().toLowerCase();

  if (statusFilter !== "all") {
    rows = rows.filter((row) => String(row.workflow_status || "").toLowerCase() === statusFilter);
  }

  if (shiftFilter !== "all") {
    rows = rows.filter((row) => String(row.shift_type || "").toLowerCase() === shiftFilter);
  }

  if (term) {
    rows = rows.filter((row) => {
      const text = [
        row.note_date,
        row.shift_type,
        row.workflow_status,
        getDailyNoteField(row, ["what_happened", "main_events"]),
        getDailyNoteField(row, ["what_happened", "presentation"]),
        getDailyNoteField(row, ["young_person_voice", "voice"])
      ].join(" ").toLowerCase();
      return text.includes(term);
    });
  }

  els.dailyNotesContent.innerHTML = renderDocumentCards(rows, "daily_note", {
    title: (row) => `${formatDate(row.note_date)} • ${stringifyValue(row.shift_type)}`,
    meta: (row) => `${stringifyValue(row.workflow_status)} • ${row.author_first_name || ""}`.trim(),
    summary: (row) =>
      getDailyNoteField(row, ["what_happened", "main_events"]) ||
      getDailyNoteField(row, ["what_happened", "presentation"]) ||
      row.presentation ||
      "No summary"
  });
}

async function loadIncidents(id) {
  renderLoading(els.incidentsContent, "Loading incidents...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.incidents(id)));
  state.latest.incidents = rows;

  els.incidentsContent.innerHTML = renderDocumentCards(rows, "incident", {
    title: (row) => row.incident_type || "Incident",
    meta: (row) => `${row.incident_datetime ? formatDateTime(row.incident_datetime) : "No date"} • ${stringifyValue(row.severity)}`,
    summary: (row) => row.description || "No summary"
  });
}

async function loadHealth(id) {
  renderLoading(els.healthContent, "Loading health...");
  const data = await fetchFromCandidates(endpoints.health(id));
  state.latest.health = data;

  const records = [
    ...(data?.health_records || []).map((row) => ({ ...row, _doc_type: "health_record" })),
    ...(data?.medication_records || []).map((row) => ({ ...row, _doc_type: "medication_record" }))
  ];

  els.healthContent.innerHTML = renderDocumentCards(records, "health", {
    title: (row) => row.title || row.record_type || row.medication_name || "Health record",
    meta: (row) => row.event_datetime ? formatDateTime(row.event_datetime) : row.scheduled_time ? formatDateTime(row.scheduled_time) : "No date",
    summary: (row) => row.summary || row.outcome || row.status || "No summary"
  });
}

async function loadEducation(id) {
  renderLoading(els.educationContent, "Loading education...");
  const data = await fetchFromCandidates(endpoints.education(id));
  state.latest.education = data;
  updateStickyHeader();

  els.educationContent.innerHTML = renderDocumentCards(data?.education_records || [], "education", {
    title: (row) => row.provision_name || "Education record",
    meta: (row) => `${row.record_date ? formatDate(row.record_date) : "No date"} • ${stringifyValue(row.attendance_status)}`,
    summary: (row) => row.behaviour_summary || row.learning_engagement || row.achievement_note || "No summary"
  });
}

async function loadFamily(id) {
  renderLoading(els.familyContent, "Loading family...");
  const data = await fetchFromCandidates(endpoints.family(id));
  state.latest.family = data;

  els.familyContent.innerHTML = renderDocumentCards(data?.family_contact_records || [], "family", {
    title: (row) => row.contact_person || "Family record",
    meta: (row) => `${row.contact_datetime ? formatDateTime(row.contact_datetime) : "No date"} • ${stringifyValue(row.contact_type)}`,
    summary: (row) => row.child_voice || row.concerns || row.post_contact_presentation || "No summary"
  });
}

async function loadKeywork(id) {
  renderLoading(els.keyworkContent, "Loading key work...");
  const rows = normaliseArrayResponse(await fetchJson(endpoints.keywork(id)));
  state.latest.keywork = rows;

  els.keyworkContent.innerHTML = renderDocumentCards(rows, "keywork", {
    title: (row) => row.topic || "Key work session",
    meta: (row) => `${row.session_date ? formatDate(row.session_date) : "No date"} • ${row.worker_first_name || ""}`.trim(),
    summary: (row) => row.summary || row.purpose || "No summary"
  });
}

async function loadChronology(id) {
  renderLoading(els.chronologyContent, "Loading chronology...");
  const rows = normaliseArrayResponse(await fetchJson(endpoints.chronology(id)));
  state.latest.chronology = rows;

  els.chronologyContent.innerHTML = renderTableSection("Chronology", rows, [
    "event_datetime",
    "category",
    "subcategory",
    "title",
    "summary",
    "significance",
    "source_table"
  ], true);
}

async function loadMonthlyReviews(id) {
  renderLoading(els.monthlyReviewsList, "Loading monthly reviews...");
  const rows = await fetchJson(endpoints.monthlyReviews(id));
  state.latest.monthlyReviews = rows || [];

  if (!rows?.length) {
    els.monthlyReviewsList.innerHTML = `<div class="empty-state">No monthly reviews yet.</div>`;
    els.monthlyReviewDetail.innerHTML = `<div class="empty-state">Select a review to view details.</div>`;
    return;
  }

  els.monthlyReviewsList.innerHTML = renderDocumentCards(rows, "monthly_review", {
    title: (row) => row.review_title || "Monthly review",
    meta: (row) => `${row.review_month ? formatDate(row.review_month) : "No month"} • ${stringifyValue(row.status)}`,
    summary: (row) => row.summary_of_month || row.progress_summary || "Open to view detail"
  });
}

async function loadStandards(id) {
  renderLoading(els.standardsSummary, "Loading standards...");
  renderLoading(els.standardsEvidenceList, "Loading evidence...");

  const [summary, evidence] = await Promise.all([
    fetchFromCandidates(endpoints.standardsSummary(id)),
    fetchFromCandidates(endpoints.standardsEvidence(id))
  ]);

  state.latest.standardsSummary = summary || [];
  state.latest.standardsEvidence = evidence || [];

  renderStandardsSummary(summary);
  renderStandardsEvidence(evidence);
}

async function loadCompliance(id) {
  renderLoading(els.complianceContent, "Loading compliance...");
  const data = await fetchFromCandidates(endpoints.compliance(id));
  state.latest.compliance = data;

  if (state.jumpComplianceFilter !== "all" && els.complianceStatusFilter) {
    els.complianceStatusFilter.value = state.jumpComplianceFilter;
    state.jumpComplianceFilter = "all";
  }

  rerenderComplianceFromState();
}

/* -------------------- Modal -------------------- */

function openNewDocument(type) {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  openWorkspaceModal({
    type,
    mode: "create",
    title: modalTitle(type, "create"),
    meta: getFullName(state.selectedYoungPerson),
    record: null
  });
}

function openExistingDocument(type, record) {
  openWorkspaceModal({
    type,
    mode: "edit",
    title: modalTitle(type, "edit"),
    meta: getFullName(state.selectedYoungPerson),
    record
  });
}

function openWorkspaceModal({ type, mode, title, meta, record }) {
  state.modal.open = true;
  state.modal.type = type;
  state.modal.mode = mode;
  state.modal.record = record;

  els.recordWorkspaceModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  setText(els.workspaceModalTitle, title);
  setText(els.workspaceModalMeta, meta);

  els.workspaceModalContent.innerHTML = renderModalMain(type, mode, record);
  els.workspaceModalContext.innerHTML = renderModalContext(type, record);
  els.workspaceModalVersions.innerHTML = renderModalVersions(type, record);
  els.workspaceModalAiPanel.innerHTML = renderModalAi(type);

  setText(els.workspaceModalSaveBtn, mode === "create" ? "Create Draft" : "Save");
  setText(els.workspaceModalCompleteBtn, mode === "create" ? "Create & Complete" : "Complete");
}

function closeWorkspaceModal() {
  state.modal.open = false;
  state.modal.type = null;
  state.modal.mode = "view";
  state.modal.record = null;

  if (els.recordWorkspaceModal) {
    els.recordWorkspaceModal.classList.add("hidden");
  }

  document.body.style.overflow = "";
}

function renderModalMain(type, mode, record) {
  if (type === "ofsted_ai_report") {
    return renderDrawerValue(record);
  }

  if (mode === "create") {
    return renderNewDocumentTemplate(type);
  }

  return renderDrawerValue(record);
}

function renderNewDocumentTemplate(type) {
  const text = {
    daily_note: ["Basic context", "What happened today", "PACE reflection", "Young person voice", "Actions required"],
    incident: ["Incident overview", "What happened before", "What happened during", "Staff response", "Learning and follow-up"],
    keywork: ["Session details", "Topic and purpose", "Summary", "Child voice", "Actions agreed"],
    plan: ["Plan basics", "Presenting need", "Child voice", "Strategies", "Review details"],
    risk: ["Risk basics", "Concern summary", "Triggers", "Response guidance", "Review details"],
    health: ["Health record details", "Event summary", "Professional advice", "Follow-up"],
    education: ["Education record details", "Attendance", "Engagement", "Barriers", "Next steps"],
    family: ["Family record details", "Contact summary", "Child voice", "Concerns", "Follow-up"]
  };

  const items = text[type] || ["Document details"];

  return `
    <div class="record-list">
      ${items.map((item) => `<div class="record-card"><h4>${escapeHtml(item)}</h4></div>`).join("")}
    </div>
  `;
}

function renderModalContext(type, record) {
  const rows = [];

  if (state.selectedYoungPerson) {
    rows.push(`Young person: ${getFullName(state.selectedYoungPerson)}`);
    rows.push(`Placement: ${stringifyValue(state.selectedYoungPerson.placement_status)}`);
    rows.push(`Risk level: ${stringifyValue(state.selectedYoungPerson.summary_risk_level)}`);
  }

  if (record?.status) rows.push(`Status: ${record.status}`);
  if (record?.review_date) rows.push(`Review date: ${formatDate(record.review_date)}`);
  if (record?.severity) rows.push(`Severity: ${record.severity}`);
  if (record?.workflow_status) rows.push(`Workflow: ${record.workflow_status}`);

  return rows.length ? renderSimpleList(rows) : `<div class="empty-state">No context.</div>`;
}

function renderModalVersions(type, record) {
  if (type === "daily_note" && record?.version_number) {
    return renderSimpleList([`Current version: ${record.version_number}`]);
  }

  return `<div class="empty-state">No versions yet.</div>`;
}

function renderModalAi(type) {
  const map = {
    daily_note: ["Rewrite more therapeutically", "Extract child voice", "Suggest standards links"],
    plan: ["Suggest support strategies", "Summarise child voice", "Suggest standards links"],
    risk: ["Summarise concern", "Suggest relational wording", "Highlight review points"],
    incident: ["Summarise incident", "Identify learning", "Suggest follow-up"],
    keywork: ["Summarise session", "Extract actions", "Highlight themes"]
  };

  return renderSimpleList(map[type] || ["AI actions will appear here."]);
}

function modalTitle(type, mode) {
  const create = {
    daily_note: "New Daily Note",
    incident: "New Incident",
    keywork: "New Key Work Session",
    plan: "New Support Plan",
    risk: "New Risk Assessment",
    health: "New Health Record",
    education: "New Education Record",
    family: "New Family Record"
  };

  const edit = {
    daily_note: "Daily Note",
    incident: "Incident Record",
    keywork: "Key Work Session",
    plan: "Support Plan",
    risk: "Risk Assessment",
    health: "Health Record",
    education: "Education Record",
    family: "Family Record",
    monthly_review: "Monthly Review",
    ofsted_ai_report: "AI OFSTED Report"
  };

  return mode === "create" ? (create[type] || "New Document") : (edit[type] || "Document");
}

/* -------------------- Render helpers -------------------- */

function renderDocumentCards(rows, type, config) {
  if (!rows?.length) {
    return `<div class="empty-state">No records found.</div>`;
  }

  const html = `
    <div class="record-list">
      ${rows.map((row) => `
        <button
          class="record-card js-open-document"
          type="button"
          data-doc-type="${escapeHtml(type)}"
          data-record='${escapeHtml(JSON.stringify(row))}'
        >
          <h4>${escapeHtml(config.title(row))}</h4>
          <div class="record-meta">${escapeHtml(config.meta(row))}</div>
          <div class="record-summary">${escapeHtml(trimText(config.summary(row), 180))}</div>
        </button>
      `).join("")}
    </div>
  `;

  queueMicrotask(bindDocumentCards);
  return html;
}

function bindDocumentCards() {
  $$(".js-open-document").forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.docType;
      const record = parseRecord(btn.dataset.record);
      if (!record) return;

      if (type === "monthly_review") {
        if (record.id) openMonthlyReviewDetail(record.id);
        return;
      }

      openExistingDocument(type, record);
    };
  });
}

function renderKeyValueCards(entries) {
  const rows = entries.filter(([, value]) => hasValue(value));
  if (!rows.length) return `<div class="empty-state">No information.</div>`;

  return `
    <div class="record-list">
      ${rows.map(([label, value]) => `
        <div class="record-card">
          <h4>${escapeHtml(label)}</h4>
          <div class="record-summary">${escapeHtml(stringifyValue(value))}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSimpleList(items) {
  if (!items?.length) return `<div class="empty-state">No information.</div>`;
  return `
    <div class="record-list">
      ${items.map((item) => `<div class="record-card"><div class="record-summary">${escapeHtml(item)}</div></div>`).join("")}
    </div>
  `;
}

function renderObjectSection(title, record, keys) {
  if (!record || typeof record !== "object" || !Object.keys(record).length) {
    return `
      <div class="panel">
        <div class="panel-header"><h3>${escapeHtml(title)}</h3></div>
        <div class="empty-state">No data found.</div>
      </div>
    `;
  }

  const pickedKeys = (keys || Object.keys(record)).filter((key) => key in record && hasValue(record[key]));

  if (!pickedKeys.length) {
    return `
      <div class="panel">
        <div class="panel-header"><h3>${escapeHtml(title)}</h3></div>
        <div class="empty-state">No data found.</div>
      </div>
    `;
  }

  return `
    <div class="panel">
      <div class="panel-header"><h3>${escapeHtml(title)}</h3></div>
      <table class="data-table key-value">
        <tbody>
          ${pickedKeys.map((key) => `
            <tr>
              <th>${escapeHtml(formatLabel(key))}</th>
              <td>${escapeHtml(formatFieldValue(key, record[key]))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderArraySection(title, rows, preferredColumns) {
  return `
    <div class="panel">
      <div class="panel-header"><h3>${escapeHtml(title)}</h3></div>
      ${renderTableSection(title, normaliseArrayResponse(rows), preferredColumns, false)}
    </div>
  `;
}

function renderTableSection(_title, rows, preferredColumns = null, addViewButton = false) {
  if (!rows?.length) return `<div class="empty-state">No records found.</div>`;

  const columns = preferredColumns?.length
    ? preferredColumns.filter((col) => rows.some((row) => col in row))
    : Object.keys(rows[0]).slice(0, 8);

  return `
    <table class="data-table">
      <thead>
        <tr>
          ${columns.map((col) => `<th>${escapeHtml(formatLabel(col))}</th>`).join("")}
          ${addViewButton ? "<th>Open</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${columns.map((col) => `<td>${renderTableCell(col, row[col])}</td>`).join("")}
            ${addViewButton ? `<td><button class="btn btn-secondary js-open-table-record" data-record='${escapeHtml(JSON.stringify(row))}'>Open</button></td>` : ""}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderTableCell(key, value) {
  if (key === "compliance_status") return renderStatusPill(value);
  if (key === "severity") return renderSeverityPill(value);
  if (key === "workflow_status") return renderStatusPill(value);
  if (key === "status") return renderStatusPill(value);
  return escapeHtml(formatFieldValue(key, value));
}

function renderStandardsSummary(rows) {
  if (!rows?.length) {
    els.standardsSummary.innerHTML = `<div class="empty-state">No standards data found.</div>`;
    return;
  }

  els.standardsSummary.innerHTML = renderTableSection("Standards", rows, [
    "code",
    "short_label",
    "linked_record_count"
  ]);
}

function renderStandardsEvidence(rows) {
  if (!rows?.length) {
    els.standardsEvidenceList.innerHTML = `<div class="empty-state">No evidence linked yet.</div>`;
    return;
  }

  els.standardsEvidenceList.innerHTML = renderTableSection("Evidence", rows, [
    "standard_code",
    "source_table",
    "source_id",
    "evidence_strength",
    "rationale",
    "created_at"
  ]);
}

function rerenderComplianceFromState() {
  const data = state.latest.compliance;
  if (!data) {
    els.complianceContent.innerHTML = `<div class="empty-state">No compliance data found.</div>`;
    return;
  }

  const statusFilter = els.complianceStatusFilter?.value || "all";
  const categoryFilter = els.complianceCategoryFilter?.value || "all";

  let items = Array.isArray(data.compliance_items) ? data.compliance_items : [];

  if (statusFilter !== "all") {
    items = items.filter((item) => item.compliance_status === statusFilter);
  }

  if (categoryFilter !== "all") {
    items = items.filter((item) => item.compliance_type === categoryFilter);
  }

  els.complianceContent.innerHTML = renderTableSection("Compliance", items, [
    "compliance_status",
    "title",
    "due_date",
    "status",
    "approval_status",
    "created_at"
  ]);
}

async function openMonthlyReviewDetail(reviewId) {
  renderLoading(els.monthlyReviewDetail, "Loading review...");
  const data = await fetchJson(endpoints.monthlyReviewDetail(reviewId));

  els.monthlyReviewDetail.innerHTML = [
    renderObjectSection("Review Summary", data?.review || {}, [
      "review_title",
      "review_month",
      "status",
      "summary_of_month",
      "progress_summary",
      "child_voice_summary",
      "concerns_and_risks",
      "education_summary",
      "health_summary",
      "family_summary",
      "keywork_summary",
      "behaviour_summary",
      "achievements_summary",
      "actions_for_next_month",
      "manager_analysis"
    ]),
    renderArraySection("Linked Evidence", data?.record_links || [], [
      "source_table",
      "source_id",
      "link_reason",
      "created_at"
    ]),
    renderArraySection("Standards Summary", data?.standards || [], [
      "standard_code",
      "standard_short_label",
      "evidence_count",
      "narrative_summary"
    ]),
    renderArraySection("Actions", data?.actions || [], [
      "action_text",
      "action_owner_id",
      "due_date",
      "status"
    ])
  ].join("");
}

function renderLoading(el, text) {
  if (el) el.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function renderStatusPill(value) {
  return `<span class="status-pill ${statusClass(value)}">${escapeHtml(stringifyValue(value))}</span>`;
}

function renderSeverityPill(value) {
  const lower = String(value || "").toLowerCase();
  let cls = "status-grey";
  if (lower === "high") cls = "status-red";
  else if (lower === "medium") cls = "status-amber";
  else if (lower === "low") cls = "status-green";
  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

/* -------------------- Other actions -------------------- */

async function rebuildChronology() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    await fetchJson(endpoints.chronologyRebuild(state.selectedYoungPerson.id), {
      method: "POST"
    });
    showStatus("Chronology rebuilt successfully.");
    await loadChronology(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(`Could not rebuild chronology: ${error.message}`, true);
  }
}

async function generateMonthlyReview() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  if (!els.monthlyReviewMonth?.value) {
    showStatus("Please choose a month first.", true);
    return;
  }

  const reviewMonth = `${els.monthlyReviewMonth.value}-01`;

  try {
    const result = await fetchJson(
      endpoints.monthlyReviewGenerate(state.selectedYoungPerson.id, reviewMonth),
      { method: "POST" }
    );

    showStatus("Monthly review generated successfully.");
    await loadMonthlyReviews(state.selectedYoungPerson.id);

    if (result?.monthly_review_id) {
      await openMonthlyReviewDetail(result.monthly_review_id);
    }
  } catch (error) {
    showStatus(`Could not generate monthly review: ${error.message}`, true);
  }
}

async function rebuildStandardsLinks() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    await fetchJson(endpoints.standardsRebuild(state.selectedYoungPerson.id), {
      method: "POST"
    });
    showStatus("Standards links rebuilt successfully.");
    await loadStandards(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(`Could not rebuild standards links: ${error.message}`, true);
  }
}

async function loadOfstedAiReport(reviewMonth = "") {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    showStatus("Generating AI OFSTED report...");
    const report = await fetchJson(endpoints.ofstedAiReport(state.selectedYoungPerson.id, reviewMonth));

    openWorkspaceModal({
      type: "ofsted_ai_report",
      mode: "view",
      title: "AI OFSTED Report",
      meta: getFullName(state.selectedYoungPerson),
      record: report
    });

    showStatus("AI OFSTED report loaded.");
  } catch (error) {
    showStatus(`Could not load AI OFSTED report: ${error.message}`, true);
  }
}

async function createInspectionPackJob() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    const result = await fetchJson(endpoints.inspectionPackCreate, {
      method: "POST",
      body: JSON.stringify({
        scope_type: "young_person",
        scope_id: state.selectedYoungPerson.id,
        pack_type: "ofsted",
        requested_by: 1
      })
    });

    showStatus(`Inspection pack job created${result?.id ? ` (#${result.id})` : ""}.`);
  } catch (error) {
    showStatus(`Could not create inspection pack job: ${error.message}`, true);
  }
}

/* -------------------- Utilities -------------------- */

function getDailyNoteField(row, path) {
  let current = row?.content_json || row || {};
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = current[key];
  }
  return current ?? null;
}

function parseRecord(value) {
  try {
    return JSON.parse(unescapeHtml(value));
  } catch (_error) {
    return null;
  }
}

function normaliseArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getFullName(person) {
  const preferred = person.preferred_name ? ` (${person.preferred_name})` : "";
  const name = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  return name ? `${name}${preferred}` : `Young Person #${person.id}`;
}

function getInitials(person) {
  const parts = [person?.first_name, person?.last_name].filter(Boolean);
  return parts.length ? parts.map((part) => part.charAt(0).toUpperCase()).slice(0, 2).join("") : "YP";
}

function setText(el, value) {
  if (el) el.textContent = String(value);
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatFieldValue(key, value) {
  if (!hasValue(value)) return "—";

  const dateKeys = [
    "date_of_birth",
    "created_at",
    "updated_at",
    "event_datetime",
    "incident_datetime",
    "session_date",
    "note_date",
    "record_date",
    "admission_date",
    "discharge_date",
    "review_date",
    "review_month",
    "start_date",
    "next_session_date",
    "contact_datetime",
    "effective_from",
    "effective_to",
    "scheduled_time",
    "administered_time",
    "approved_at",
    "returned_at",
    "submitted_at",
    "next_action_date",
    "due_date",
    "generated_at"
  ];

  if (dateKeys.includes(key)) {
    const dateOnlyKeys = [
      "date_of_birth",
      "session_date",
      "note_date",
      "record_date",
      "admission_date",
      "discharge_date",
      "review_date",
      "review_month",
      "start_date",
      "next_session_date",
      "effective_from",
      "effective_to",
      "next_action_date",
      "due_date"
    ];

    return dateOnlyKeys.includes(key) ? formatDate(value) : formatDateTime(value);
  }

  return typeof value === "boolean" ? (value ? "Yes" : "No") : stringifyValue(value);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function trimText(value, max = 180) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function statusClass(value) {
  const lower = String(value || "").toLowerCase();
  if (["overdue", "high", "returned"].includes(lower)) return "status-red";
  if (["due_soon", "medium", "pending"].includes(lower)) return "status-amber";
  if (["ok", "active", "approved", "reviewed", "complete", "open"].includes(lower)) return "status-green";
  if (["submitted", "completed", "amended", "info"].includes(lower)) return "status-blue";
  return "status-grey";
}

function unescapeHtml(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showStatus(message, isError = false) {
  if (!els.statusBar) return;

  els.statusBar.textContent = message;
  els.statusBar.classList.remove("hidden", "error");

  if (isError) {
    els.statusBar.classList.add("error");
  }

  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => {
    els.statusBar.classList.add("hidden");
  }, 4000);
}
