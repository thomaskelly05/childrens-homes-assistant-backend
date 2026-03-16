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
    compliance: null,
    chronology: [],
    monthlyReviews: []
  },

  modal: {
    open: false,
    type: null,
    mode: "view",
    record: null
  },

  jumpComplianceFilter: "all"
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
  monthlyReviews: (id) => `/monthly-reviews/young-person/${id}`,
  monthlyReviewDetail: (id) => `/monthly-reviews/${id}`,

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

  globalNewDailyNoteBtn: $("globalNewDailyNoteBtn"),
  globalNewIncidentBtn: $("globalNewIncidentBtn"),
  globalNewKeyworkBtn: $("globalNewKeyworkBtn"),
  globalNewPlanBtn: $("globalNewPlanBtn"),
  globalNewRiskBtn: $("globalNewRiskBtn"),

  reloadCurrentBtn: $("reloadCurrentBtn"),
  inspectionPackBtn: $("inspectionPackBtn"),
  headerOfstedAiBtn: $("headerOfstedAiBtn"),
  monthlyOfstedAiBtn: $("monthlyOfstedAiBtn"),

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

  overviewContent: $("overviewContent"),
  overviewRecentActivityContent: $("overviewRecentActivityContent"),
  overviewActionsContent: $("overviewActionsContent"),
  overviewAlertsContent: $("overviewAlertsContent"),

  profileContent: $("profileContent"),
  plansContent: $("plansContent"),
  riskContent: $("riskContent"),
  dailyNotesContent: $("dailyNotesContent"),
  incidentsContent: $("incidentsContent"),
  healthContent: $("healthContent"),
  educationContent: $("educationContent"),
  familyContent: $("familyContent"),
  chronologyContent: $("chronologyContent"),
  monthlyReviewsList: $("monthlyReviewsList"),
  monthlyReviewDetail: $("monthlyReviewDetail"),
  standardsSummary: $("standardsSummary"),
  standardsEvidenceList: $("standardsEvidenceList"),
  complianceContent: $("complianceContent"),
  handoverListContent: $("handoverListContent"),
  supervisionListContent: $("supervisionListContent"),
  keyworkList: $("keyworkList"),

  newPlanBtn: $("newPlanBtn"),
  newRiskBtn: $("newRiskBtn"),
  newDailyNoteBtn: $("newDailyNoteBtn"),
  refreshDailyNotesBtn: $("refreshDailyNotesBtn"),
  newIncidentBtn: $("newIncidentBtn"),
  newHealthRecordBtn: $("newHealthRecordBtn"),
  newEducationRecordBtn: $("newEducationRecordBtn"),
  newFamilyRecordBtn: $("newFamilyRecordBtn"),
  newKeyworkBtn: $("newKeyworkBtn"),
  newHandoverBtn: $("newHandoverBtn"),
  newSupervisionBtn: $("newSupervisionBtn"),

  dailyNoteStatusFilter: $("dailyNoteStatusFilter"),
  dailyNoteShiftFilter: $("dailyNoteShiftFilter"),
  dailyNoteSearch: $("dailyNoteSearch"),

  rebuildChronologyBtn: $("rebuildChronologyBtn"),
  monthlyReviewMonth: $("monthlyReviewMonth"),
  generateMonthlyReviewBtn: $("generateMonthlyReviewBtn"),
  rebuildStandardsBtn: $("rebuildStandardsBtn"),
  complianceStatusFilter: $("complianceStatusFilter"),
  complianceCategoryFilter: $("complianceCategoryFilter"),

  recordWorkspaceModal: $("recordWorkspaceModal"),
  workspaceModalTitle: $("workspaceModalTitle"),
  workspaceModalMeta: $("workspaceModalMeta"),
  workspaceModalContent: $("workspaceModalContent"),
  workspaceModalContext: $("workspaceModalContext"),
  workspaceModalVersions: $("workspaceModalVersions"),
  workspaceModalAiPanel: $("workspaceModalAiPanel"),
  workspaceModalSaveBtn: $("workspaceModalSaveBtn"),
  workspaceModalCompleteBtn: $("workspaceModalCompleteBtn"),
  workspaceModalCloseBtn: $("workspaceModalCloseBtn"),

  recordDetailDrawer: $("recordDetailDrawer"),
  recordDetailContent: $("recordDetailContent"),
  closeDrawerBtn: $("closeDrawerBtn")
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

  $$(".sidebar-nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.jumpTab;
      if (tab) setActiveTab(tab);
    });
  });

  on(els.youngPersonSearch, "input", handleSearch);
  on(els.refreshYoungPeopleBtn, "click", loadYoungPeople);
  on(els.reloadCurrentBtn, "click", reloadCurrentRecord);

  on(els.inspectionPackBtn, "click", createInspectionPackJob);
  on(els.headerOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));
  on(els.monthlyOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));

  on(els.globalNewDailyNoteBtn, "click", () => openNewDocument("daily_note"));
  on(els.globalNewIncidentBtn, "click", () => openNewDocument("incident"));
  on(els.globalNewKeyworkBtn, "click", () => openNewDocument("keywork"));
  on(els.globalNewPlanBtn, "click", () => openNewDocument("plan"));
  on(els.globalNewRiskBtn, "click", () => openNewDocument("risk"));

  on(els.newPlanBtn, "click", () => openNewDocument("plan"));
  on(els.newRiskBtn, "click", () => openNewDocument("risk"));
  on(els.newDailyNoteBtn, "click", () => openNewDocument("daily_note"));
  on(els.refreshDailyNotesBtn, "click", () => state.selectedYoungPerson && loadDailyNotes(state.selectedYoungPerson.id));
  on(els.newIncidentBtn, "click", () => openNewDocument("incident"));
  on(els.newHealthRecordBtn, "click", () => openNewDocument("health"));
  on(els.newEducationRecordBtn, "click", () => openNewDocument("education"));
  on(els.newFamilyRecordBtn, "click", () => openNewDocument("family"));
  on(els.newKeyworkBtn, "click", () => openNewDocument("keywork"));
  on(els.newHandoverBtn, "click", () => openNewDocument("handover"));
  on(els.newSupervisionBtn, "click", () => openNewDocument("supervision"));

  on(els.dailyNoteStatusFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteShiftFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteSearch, "input", renderDailyNotesListFromState);

  on(els.rebuildChronologyBtn, "click", rebuildChronology);
  on(els.generateMonthlyReviewBtn, "click", generateMonthlyReview);
  on(els.rebuildStandardsBtn, "click", rebuildStandardsLinks);
  on(els.complianceStatusFilter, "change", rerenderComplianceFromState);
  on(els.complianceCategoryFilter, "change", rerenderComplianceFromState);

  on(els.workspaceModalCloseBtn, "click", closeWorkspaceModal);
  on(els.workspaceModalSaveBtn, "click", handleWorkspaceSave);
  on(els.workspaceModalCompleteBtn, "click", handleWorkspaceComplete);

  on(els.closeDrawerBtn, "click", closeRecordDrawer);

  if (els.recordWorkspaceModal) {
    els.recordWorkspaceModal.addEventListener("click", (event) => {
      if (event.target === els.recordWorkspaceModal) closeWorkspaceModal();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.modal.open) closeWorkspaceModal();
      else closeRecordDrawer();
    }
  });
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

  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : null;
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

/* -------------------- Status -------------------- */

function showStatus(message, isError = false) {
  if (!els.statusBar) return;
  els.statusBar.textContent = message;
  els.statusBar.classList.remove("hidden", "error");
  if (isError) els.statusBar.classList.add("error");

  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => {
    els.statusBar.classList.add("hidden");
  }, 4000);
}

/* -------------------- People -------------------- */

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
        updateStickyYoungPersonBar();
      }
    }

    showStatus("Young people loaded.");
  } catch (error) {
    els.youngPeopleList.innerHTML = `
      <div class="empty-state">
        Could not load young people.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
    showStatus(`Could not load young people: ${error.message}`, true);
  }
}

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();
  state.filteredYoungPeople = state.youngPeople.filter((person) => {
    const haystack = `${person.first_name || ""} ${person.last_name || ""} ${person.preferred_name || ""}`.toLowerCase();
    return haystack.includes(term);
  });
  renderYoungPeopleList();
}

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
      const id = Number(card.dataset.id);
      const person = state.youngPeople.find((row) => Number(row.id) === id);
      if (person) await selectYoungPerson(person);
    });
  });
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
    compliance: null,
    chronology: [],
    monthlyReviews: []
  };

  closeWorkspaceModal();
  closeRecordDrawer();

  renderYoungPeopleList();
  updateSelectedPersonHeader();
  updateStickyYoungPersonBar();

  await loadActionBarData();
  await loadActiveTabData();
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

function updateStickyYoungPersonBar() {
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
    `${yp.placement_status || "Placement status not recorded"}${yp.legal_status ? ` • ${yp.legal_status}` : ""}`
  );
  setText(els.stickyDobChip, `DOB: ${yp.date_of_birth ? formatDate(yp.date_of_birth) : "—"}`);
  setText(els.stickyPlacementChip, `Placement: ${yp.placement_status || "—"}`);
  setText(els.stickySocialWorkerChip, `SW: ${yp.social_worker_name || yp.social_worker || "—"}`);
  setText(els.stickyEducationChip, `Education: ${yp.school_name || educationProfile?.school_name || yp.education_status || "—"}`);
  setText(els.stickyRiskLevel, `Risk: ${yp.summary_risk_level || "—"}`);
  setText(els.stickyPlanReview, `Plan review: ${activePlan?.review_date ? formatDate(activePlan.review_date) : "—"}`);
  setText(els.stickyTodayInfo, `Today I need to know: ${alerts[0]?.title || alerts[0]?.description || "No live alert"}`);
}

/* -------------------- Tabs -------------------- */

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
  compliance: loadCompliance,
  handover: loadHandovers,
  supervision: loadSupervision
};

function setActiveTab(tabName) {
  state.activeTab = tabName;

  $$(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  $$(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  closeRecordDrawer();
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

async function loadActionBarData() {
  if (!state.selectedYoungPerson) return;
  const id = state.selectedYoungPerson.id;

  try {
    const [profile, plans, risk, incidents, compliance, dailyNotes, education] = await Promise.all([
      fetchFromCandidates(endpoints.profile(id)).catch(() => null),
      fetchFromCandidates(endpoints.plans(id)).catch(() => []),
      fetchFromCandidates(endpoints.risk(id)).catch(() => []),
      fetchFromCandidates(endpoints.incidents(id)).catch(() => []),
      fetchFromCandidates(endpoints.compliance(id)).catch(() => null),
      fetchFromCandidates(endpoints.daily_notes(id)).catch(() => []),
      fetchFromCandidates(endpoints.education(id)).catch(() => null)
    ]);

    state.latest.profile = profile;
    state.latest.plans = normaliseArrayResponse(plans);
    state.latest.risk = normaliseArrayResponse(risk);
    state.latest.incidents = normaliseArrayResponse(incidents);
    state.latest.compliance = compliance;
    state.latest.dailyNotes = normaliseArrayResponse(dailyNotes);
    state.latest.education = education;

    updateStickyYoungPersonBar();
  } catch (error) {
    console.error("Action bar load failed:", error);
  }
}

async function loadActiveTabData() {
  if (!state.selectedYoungPerson) return;
  const loader = tabLoaders[state.activeTab];
  if (!loader) return;

  try {
    await loader(state.selectedYoungPerson.id);
  } catch (error) {
    console.error(error);
    showStatus(error.message, true);
  }
}

/* -------------------- Overview -------------------- */

async function loadOverview(id) {
  renderLoading(els.overviewContent, "Loading overview...");
  renderLoading(els.overviewRecentActivityContent, "Loading activity...");
  renderLoading(els.overviewActionsContent, "Loading actions...");
  renderLoading(els.overviewAlertsContent, "Loading alerts...");

  const data = await fetchFromCandidates(endpoints.overview(id));
  state.latest.overview = data;

  const activePlans = state.latest.plans.filter((row) => String(row.status || "").toLowerCase() === "active");
  const activeRisks = state.latest.risk.filter((row) => String(row.status || "").toLowerCase() === "active");
  const alerts = Array.isArray(state.latest.profile?.alerts) ? state.latest.profile.alerts : [];
  const complianceItems = Array.isArray(state.latest.compliance?.compliance_items) ? state.latest.compliance.compliance_items : [];
  const dueItems = complianceItems.filter((item) => item.compliance_status !== "ok");

  els.overviewContent.innerHTML = `
    ${renderTiles([
      ["Placement Status", data?.placement_status],
      ["Risk Level", data?.summary_risk_level],
      ["Legal Status", data?.legal_status],
      ["School", data?.school_name],
      ["GP", data?.gp_name],
      ["What Matters", data?.what_matters_to_me]
    ])}
    ${renderSimpleListSection("Current picture", [
      data?.placement_status && `Current placement status: ${data.placement_status}`,
      data?.summary_risk_level && `Current recorded risk level: ${data.summary_risk_level}`,
      activePlans.length ? `${activePlans.length} active support plan${activePlans.length === 1 ? "" : "s"}` : "No active support plans shown",
      activeRisks.length ? `${activeRisks.length} active risk assessment${activeRisks.length === 1 ? "" : "s"}` : "No active risks shown"
    ])}
  `;

  els.overviewRecentActivityContent.innerHTML = `
    ${renderCompactRecordCards("Recent daily notes", state.latest.dailyNotes.slice(0, 5), "daily_note")}
    ${renderCompactRecordCards("Recent incidents", state.latest.incidents.slice(0, 5), "incident")}
  `;

  els.overviewActionsContent.innerHTML = `
    ${renderTiles([
      ["Overdue", dueItems.filter((item) => item.compliance_status === "overdue").length],
      ["Due Soon", dueItems.filter((item) => item.compliance_status === "due_soon").length],
      ["Active Plans", activePlans.length],
      ["Active Risks", activeRisks.length]
    ])}
    ${renderArraySection("Due actions", dueItems.slice(0, 8), ["compliance_status", "title", "due_date", "compliance_type"])}
  `;

  els.overviewAlertsContent.innerHTML = `
    ${renderArraySection("Alerts", alerts, ["alert_type", "title", "description", "severity", "review_date"])}
  `;
}

/* -------------------- Tabs content -------------------- */

async function loadProfile(id) {
  renderLoading(els.profileContent, "Loading profile...");
  const data = await fetchFromCandidates(endpoints.profile(id));
  state.latest.profile = data;
  updateStickyYoungPersonBar();

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
      "signs_of_distress",
      "what_helps",
      "what_to_avoid",
      "routines_and_predictability",
      "visual_support_needs"
    ]),
    renderArraySection("Identity Profile", data?.identity_profile || [], [
      "religion_or_faith",
      "cultural_identity",
      "first_language",
      "dietary_needs",
      "interests",
      "strengths_summary",
      "what_matters_to_me",
      "important_dates"
    ]),
    renderArraySection("Alerts", data?.alerts || [], [
      "alert_type",
      "title",
      "description",
      "severity",
      "is_active",
      "review_date"
    ])
  ].join("");
}

async function loadPlans(id) {
  renderLoading(els.plansContent, "Loading plans...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.plans(id)));
  state.latest.plans = rows;
  updateStickyYoungPersonBar();

  els.plansContent.innerHTML = renderDocumentCards(rows, "plan", {
    title: (row) => row.title || row.plan_type || "Plan",
    subtitle: (row) => `${stringifyValue(row.plan_type)} • ${row.review_date ? formatDate(row.review_date) : "No review date"}`,
    summary: (row) => row.presenting_need || row.summary || "No summary"
  });
}

async function loadRisk(id) {
  renderLoading(els.riskContent, "Loading risk...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.risk(id)));
  state.latest.risk = rows;
  updateStickyYoungPersonBar();

  els.riskContent.innerHTML = renderDocumentCards(rows, "risk", {
    title: (row) => row.title || row.category || "Risk assessment",
    subtitle: (row) => `${stringifyValue(row.severity)} • ${row.review_date ? formatDate(row.review_date) : "No review date"}`,
    summary: (row) => row.concern_summary || row.category || "No summary"
  });
}

async function loadDailyNotes(id) {
  renderLoading(els.dailyNotesContent, "Loading daily notes...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.daily_notes(id)));
  state.latest.dailyNotes = rows;
  renderDailyNotesListFromState();
}

function renderDailyNotesListFromState() {
  if (!els.dailyNotesContent) return;

  const statusFilter = els.dailyNoteStatusFilter?.value || "all";
  const shiftFilter = els.dailyNoteShiftFilter?.value || "all";
  const term = (els.dailyNoteSearch?.value || "").trim().toLowerCase();

  let rows = [...state.latest.dailyNotes];

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
        getDailyNoteField(row, ["what_happened", "presentation"]),
        getDailyNoteField(row, ["what_happened", "main_events"]),
        getDailyNoteField(row, ["what_happened", "positives"]),
        getDailyNoteField(row, ["young_person_voice", "voice"])
      ].join(" ").toLowerCase();
      return text.includes(term);
    });
  }

  els.dailyNotesContent.innerHTML = renderDocumentCards(rows, "daily_note", {
    title: (row) => `${formatDate(row.note_date)} • ${stringifyValue(row.shift_type)}`,
    subtitle: (row) => `${stringifyValue(row.workflow_status)} • ${row.author_name || "Unknown author"}`,
    summary: (row) =>
      getDailyNoteField(row, ["what_happened", "main_events"]) ||
      getDailyNoteField(row, ["what_happened", "presentation"]) ||
      "No summary"
  });
}

async function loadIncidents(id) {
  renderLoading(els.incidentsContent, "Loading incidents...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.incidents(id)));
  state.latest.incidents = rows;

  els.incidentsContent.innerHTML = renderDocumentCards(rows, "incident", {
    title: (row) => row.incident_type || "Incident",
    subtitle: (row) => `${row.incident_datetime ? formatDateTime(row.incident_datetime) : "No date"} • ${stringifyValue(row.severity)}`,
    summary: (row) => row.description || "No description"
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
    subtitle: (row) =>
      `${row.event_datetime ? formatDateTime(row.event_datetime) : row.scheduled_time ? formatDateTime(row.scheduled_time) : "No date"}`,
    summary: (row) => row.summary || row.outcome || row.status || "No summary"
  });
}

async function loadEducation(id) {
  renderLoading(els.educationContent, "Loading education...");
  const data = await fetchFromCandidates(endpoints.education(id));
  state.latest.education = data;
  updateStickyYoungPersonBar();

  els.educationContent.innerHTML = renderDocumentCards(data?.education_records || [], "education", {
    title: (row) => row.provision_name || "Education record",
    subtitle: (row) => `${row.record_date ? formatDate(row.record_date) : "No date"} • ${stringifyValue(row.attendance_status)}`,
    summary: (row) => row.behaviour_summary || row.learning_engagement || row.achievement_note || "No summary"
  });
}

async function loadFamily(id) {
  renderLoading(els.familyContent, "Loading family...");
  const data = await fetchFromCandidates(endpoints.family(id));
  state.latest.family = data;

  els.familyContent.innerHTML = renderDocumentCards(data?.family_contact_records || [], "family", {
    title: (row) => row.contact_person || "Family contact record",
    subtitle: (row) => `${row.contact_datetime ? formatDateTime(row.contact_datetime) : "No date"} • ${stringifyValue(row.contact_type)}`,
    summary: (row) => row.child_voice || row.concerns || row.post_contact_presentation || "No summary"
  });
}

async function loadKeywork(id) {
  renderLoading(els.keyworkList, "Loading key work...");
  const rows = normaliseArrayResponse(await fetchJson(`/young-people/${id}/keywork`));
  els.keyworkList.innerHTML = renderDocumentCards(rows, "keywork", {
    title: (row) => row.topic || "Key work session",
    subtitle: (row) => `${row.session_date ? formatDate(row.session_date) : "No date"} • ${row.worker_first_name || "Unknown worker"}`,
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

  bindDrawerRecordButtons();
}

async function loadMonthlyReviews(id) {
  renderLoading(els.monthlyReviewsList, "Loading monthly reviews...");
  const rows = await fetchJson(endpoints.monthlyReviews(id));
  state.latest.monthlyReviews = rows || [];

  if (!rows?.length) {
    els.monthlyReviewsList.innerHTML = `<div class="empty-state">No monthly reviews yet.</div>`;
    if (els.monthlyReviewDetail) {
      els.monthlyReviewDetail.innerHTML = `<div class="empty-state">Select a review to view details.</div>`;
    }
    return;
  }

  els.monthlyReviewsList.innerHTML = renderDocumentCards(rows, "monthly_review", {
    title: (row) => row.review_title || "Monthly review",
    subtitle: (row) => `${row.review_month ? formatDate(row.review_month) : "No month"} • ${stringifyValue(row.status)}`,
    summary: (row) => row.summary_of_month || row.progress_summary || "Open to view detail"
  });

  bindDocumentCards();
}

async function loadStandards(id) {
  renderLoading(els.standardsSummary, "Loading standards...");
  renderLoading(els.standardsEvidenceList, "Loading evidence...");

  const [summary, evidence] = await Promise.all([
    fetchFromCandidates([`/young-people/${id}/standards`]),
    fetchFromCandidates([`/young-people/${id}/standards/evidence`])
  ]);

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

async function loadHandovers() {
  els.handoverListContent.innerHTML = renderPlaceholderCards(
    "Handovers",
    "This should list handover records and open each one in the full-page modal."
  );
}

async function loadSupervision() {
  els.supervisionListContent.innerHTML = renderPlaceholderCards(
    "Supervision",
    "This should list supervision records and open each one in the full-page modal."
  );
}

/* -------------------- Standards / compliance rendering -------------------- */

function renderStandardsSummary(rows) {
  if (!rows?.length) {
    els.standardsSummary.innerHTML = `<div class="empty-state">No standards data found.</div>`;
    return;
  }

  els.standardsSummary.innerHTML = `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Standard</th>
            <th>Title</th>
            <th>Evidence Count</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            let cls = "status-green";
            if (Number(row.linked_record_count) < 3) cls = "status-amber";
            if (Number(row.linked_record_count) === 0) cls = "status-red";

            return `
              <tr>
                <td><strong>${escapeHtml(row.code)}</strong></td>
                <td>${escapeHtml(row.short_label)}</td>
                <td><span class="status-pill ${cls}">${escapeHtml(String(row.linked_record_count))}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStandardsEvidence(rows) {
  if (!rows?.length) {
    els.standardsEvidenceList.innerHTML = `<div class="empty-state">No evidence linked yet.</div>`;
    return;
  }

  els.standardsEvidenceList.innerHTML = `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Standard</th>
            <th>Source</th>
            <th>Source ID</th>
            <th>Evidence Strength</th>
            <th>Rationale</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.standard_code)}</td>
              <td>${escapeHtml(row.source_table)}</td>
              <td>${escapeHtml(String(row.source_id))}</td>
              <td>${escapeHtml(stringifyValue(row.evidence_strength))}</td>
              <td>${escapeHtml(stringifyValue(row.rationale))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
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
  const alerts = Array.isArray(data.active_alerts) ? data.active_alerts : [];

  if (statusFilter !== "all") {
    items = items.filter((item) => item.compliance_status === statusFilter);
  }

  if (categoryFilter !== "all") {
    items = items.filter((item) => item.compliance_type === categoryFilter);
  }

  const grouped = groupBy(items, "compliance_type");

  els.complianceContent.innerHTML = `
    ${renderComplianceSummaryStrip(items, alerts)}
    ${Object.keys(grouped).length
      ? Object.entries(grouped).map(([groupName, rows]) => renderComplianceGroup(groupName, rows)).join("")
      : `<div class="empty-state">No compliance items match the selected filters.</div>`
    }
    ${renderArraySection("Active Alerts", alerts, ["alert_type", "title", "description", "severity", "review_date"])}
  `;

  bindDrawerRecordButtons();
}

function renderComplianceSummaryStrip(items, alerts) {
  return renderTiles([
    ["Overdue", items.filter((item) => item.compliance_status === "overdue").length],
    ["Due Soon", items.filter((item) => item.compliance_status === "due_soon").length],
    ["Current", items.filter((item) => item.compliance_status === "ok").length],
    ["Active Alerts", alerts.length]
  ]);
}

function renderComplianceGroup(groupName, rows) {
  const columns = ["compliance_status", "title", "due_date", "status", "approval_status", "created_at"];

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(formatComplianceGroupTitle(groupName))}</h3>
      <div class="section-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map((col) => `<th>${escapeHtml(formatLabel(col))}</th>`).join("")}
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${columns.map((col) => `<td>${renderTableCell(col, row[col])}</td>`).join("")}
                <td><button class="text-link-btn js-open-drawer-record" data-record='${escapeHtml(JSON.stringify(row))}'>View</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* -------------------- Actions -------------------- */

async function rebuildChronology() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    await fetchJson(`/young-people/${state.selectedYoungPerson.id}/chronology/rebuild`, {
      method: "POST"
    });
    showStatus("Chronology rebuilt successfully.");
    await loadChronology(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(`Could not rebuild chronology: ${error.message}`, true);
  }
}

async function rebuildStandardsLinks() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    await fetchJson(`/young-people/${state.selectedYoungPerson.id}/standards/rebuild`, {
      method: "POST"
    });
    showStatus("Standards links rebuilt successfully.");
    await loadStandards(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(`Could not rebuild standards links: ${error.message}`, true);
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
      `/monthly-reviews/young-person/${state.selectedYoungPerson.id}/generate?review_month=${reviewMonth}`,
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
      title: "AI OFSTED Inspection Report",
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

/* -------------------- Full-page modal workflow -------------------- */

function openNewDocument(type) {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  const titleMap = {
    daily_note: "New Daily Note",
    incident: "New Incident",
    keywork: "New Key Work Session",
    plan: "New Support Plan",
    risk: "New Risk Assessment",
    health: "New Health Record",
    education: "New Education Record",
    family: "New Family Record",
    handover: "New Handover",
    supervision: "New Supervision"
  };

  openWorkspaceModal({
    type,
    mode: "create",
    title: titleMap[type] || "New Document",
    meta: getFullName(state.selectedYoungPerson),
    record: null
  });
}

function openWorkspaceModal({ type, mode = "view", title, meta, record }) {
  state.modal.open = true;
  state.modal.type = type;
  state.modal.mode = mode;
  state.modal.record = record;

  if (!els.recordWorkspaceModal) return;

  els.recordWorkspaceModal.classList.remove("hidden");
  els.recordWorkspaceModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setText(els.workspaceModalTitle, title || formatLabel(type));
  setText(els.workspaceModalMeta, meta || getFullName(state.selectedYoungPerson || { id: "—" }));

  els.workspaceModalContent.innerHTML = renderWorkspaceMain(type, mode, record);
  els.workspaceModalContext.innerHTML = renderWorkspaceContext(type, record);
  els.workspaceModalVersions.innerHTML = renderWorkspaceVersions(type, record);
  els.workspaceModalAiPanel.innerHTML = renderWorkspaceAiPanel(type, record);

  setText(els.workspaceModalSaveBtn, mode === "create" ? "Create Draft" : "Save");
  setText(els.workspaceModalCompleteBtn, mode === "create" ? "Create & Complete" : "Complete");
}

function closeWorkspaceModal() {
  state.modal.open = false;
  state.modal.type = null;
  state.modal.mode = "view";
  state.modal.record = null;

  if (!els.recordWorkspaceModal) return;
  els.recordWorkspaceModal.classList.add("hidden");
  els.recordWorkspaceModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function handleWorkspaceSave() {
  const type = state.modal.type;
  if (!type) return;

  showStatus(`${formatLabel(type)} save wiring comes next.`);
}

function handleWorkspaceComplete() {
  const type = state.modal.type;
  if (!type) return;

  showStatus(`${formatLabel(type)} complete wiring comes next.`);
}

function renderWorkspaceMain(type, mode, record) {
  if (type === "ofsted_ai_report") {
    return renderDrawerValue(record);
  }

  if (mode === "create") {
    return renderDocumentTemplate(type);
  }

  return renderDocumentRecord(type, record);
}

function renderDocumentTemplate(type) {
  const templates = {
    daily_note: `
      <section class="section-group">
        <h3 class="group-title">Basic Context</h3>
        <div class="info-card-list">
          <div class="info-card-item">Date, shift, staff on shift, location and tags should go here.</div>
          <div class="info-card-item">This will become the full editable daily note form in the modal.</div>
        </div>
      </section>
      <section class="section-group">
        <h3 class="group-title">What Happened Today?</h3>
        <div class="info-card-list">
          <div class="info-card-item">Presentation, events, positives, worries, family, health and education updates.</div>
        </div>
      </section>
      <section class="section-group">
        <h3 class="group-title">PACE Reflection</h3>
        <div class="info-card-list">
          <div class="info-card-item">Playfulness, Acceptance, Curiosity and Empathy sections belong here.</div>
        </div>
      </section>
    `,
    plan: `
      <section class="section-group">
        <h3 class="group-title">Support Plan</h3>
        <div class="info-card-list">
          <div class="info-card-item">Title, presenting need, summary, child voice and proactive strategies belong here.</div>
        </div>
      </section>
    `,
    risk: `
      <section class="section-group">
        <h3 class="group-title">Risk Assessment</h3>
        <div class="info-card-list">
          <div class="info-card-item">Category, concern summary, triggers, early warning signs and de-escalation guidance belong here.</div>
        </div>
      </section>
    `,
    incident: `
      <section class="section-group">
        <h3 class="group-title">Incident Record</h3>
        <div class="info-card-list">
          <div class="info-card-item">Incident overview, what happened before, what happened during, staff response and learning should be captured here.</div>
        </div>
      </section>
    `,
    keywork: `
      <section class="section-group">
        <h3 class="group-title">Key Work Session</h3>
        <div class="info-card-list">
          <div class="info-card-item">Topic, purpose, summary, child voice, reflection and actions agreed should go here.</div>
        </div>
      </section>
    `,
    health: `
      <section class="section-group">
        <h3 class="group-title">Health Record</h3>
        <div class="info-card-list">
          <div class="info-card-item">Health event details, treatment, professional advice and follow-up should go here.</div>
        </div>
      </section>
    `,
    education: `
      <section class="section-group">
        <h3 class="group-title">Education Record</h3>
        <div class="info-card-list">
          <div class="info-card-item">Attendance, participation, barriers, school contact and next steps should go here.</div>
        </div>
      </section>
    `,
    family: `
      <section class="section-group">
        <h3 class="group-title">Family Record</h3>
        <div class="info-card-list">
          <div class="info-card-item">Contact details, pre and post presentation, child voice and follow-up should go here.</div>
        </div>
      </section>
    `,
    handover: `
      <section class="section-group">
        <h3 class="group-title">Handover</h3>
        <div class="info-card-list">
          <div class="info-card-item">Shift summary, priorities, medication issues, due tasks and escalation points should go here.</div>
        </div>
      </section>
    `,
    supervision: `
      <section class="section-group">
        <h3 class="group-title">Supervision</h3>
        <div class="info-card-list">
          <div class="info-card-item">Reflection, practice review, wellbeing, safeguarding discussion and actions agreed should go here.</div>
        </div>
      </section>
    `
  };

  return templates[type] || `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(formatLabel(type))}</h3>
      <div class="info-card-list">
        <div class="info-card-item">This new document workspace is ready for the full form.</div>
      </div>
    </section>
  `;
}

function renderDocumentRecord(type, record) {
  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(formatLabel(type))}</h3>
      ${renderDrawerValue(record)}
    </section>
  `;
}

function renderWorkspaceContext(type, record) {
  const blocks = [];

  if (state.selectedYoungPerson) {
    blocks.push(`Young person: ${getFullName(state.selectedYoungPerson)}`);
    blocks.push(`Placement: ${stringifyValue(state.selectedYoungPerson.placement_status)}`);
    blocks.push(`Risk level: ${stringifyValue(state.selectedYoungPerson.summary_risk_level)}`);
  }

  if (record?.review_date) blocks.push(`Review date: ${formatDate(record.review_date)}`);
  if (record?.status) blocks.push(`Status: ${record.status}`);
  if (record?.severity) blocks.push(`Severity: ${record.severity}`);
  if (record?.workflow_status) blocks.push(`Workflow: ${record.workflow_status}`);
  if (record?.session_date) blocks.push(`Session date: ${formatDate(record.session_date)}`);
  if (record?.note_date) blocks.push(`Note date: ${formatDate(record.note_date)}`);

  return blocks.length
    ? `<div class="info-card-list">${blocks.map((text) => `<div class="info-card-item">${escapeHtml(text)}</div>`).join("")}</div>`
    : `<div class="empty-state">No extra context available.</div>`;
}

function renderWorkspaceVersions(type, record) {
  if (type === "daily_note" && record?.version_number) {
    return `
      <div class="info-card-list">
        <div class="info-card-item">Current version: ${escapeHtml(String(record.version_number))}</div>
      </div>
    `;
  }

  return `
    <div class="info-card-list">
      <div class="info-card-item">Version history should appear here.</div>
      <div class="info-card-item">Use this panel for amendments, manager review trail and audit history.</div>
    </div>
  `;
}

function renderWorkspaceAiPanel(type, record) {
  const map = {
    daily_note: [
      "Rewrite in more therapeutic language",
      "Extract child voice",
      "Suggest standards links"
    ],
    plan: [
      "Suggest clearer support strategies",
      "Summarise child voice",
      "Suggest linked standards"
    ],
    risk: [
      "Summarise concern in plain language",
      "Suggest relational de-escalation wording",
      "Highlight review focus"
    ],
    incident: [
      "Summarise incident clearly",
      "Identify learning points",
      "Suggest follow-up"
    ],
    keywork: [
      "Summarise session",
      "Extract actions agreed",
      "Highlight themes"
    ],
    ofsted_ai_report: [
      "Summarise strengths",
      "Highlight concerns",
      "Prepare export version"
    ]
  };

  const items = map[type] || ["AI support options will appear here."];

  return `<div class="info-card-list">${items.map((item) => `<div class="info-card-item">${escapeHtml(item)}</div>`).join("")}</div>`;
}

/* -------------------- Monthly review detail -------------------- */

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

/* -------------------- Record cards -------------------- */

function renderDocumentCards(rows, type, config) {
  if (!rows?.length) {
    return `<div class="empty-state">No records found.</div>`;
  }

  const html = `
    <div class="daily-note-list">
      ${rows.map((row) => `
        <button
          class="record-card js-open-document"
          type="button"
          data-doc-type="${escapeHtml(type)}"
          data-record='${escapeHtml(JSON.stringify(row))}'
        >
          <div class="record-card-top">
            <h4>${escapeHtml(config.title(row))}</h4>
            <div>${renderCardPill(type, row)}</div>
          </div>

          <div class="record-card-meta">
            <span>${escapeHtml(config.subtitle(row))}</span>
          </div>

          <div class="record-card-section">
            <strong>Summary</strong>
            <p>${escapeHtml(trimForTable(config.summary(row), "summary"))}</p>
          </div>
        </button>
      `).join("")}
    </div>
  `;

  queueMicrotask(bindDocumentCards);
  return html;
}

function renderCompactRecordCards(title, rows, type) {
  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      ${renderDocumentCards(rows, type, {
        title: (row) =>
          type === "daily_note"
            ? `${formatDate(row.note_date)} • ${stringifyValue(row.shift_type)}`
            : row.incident_type || "Incident",
        subtitle: (row) =>
          type === "daily_note"
            ? stringifyValue(row.workflow_status)
            : `${row.incident_datetime ? formatDateTime(row.incident_datetime) : "No date"} • ${stringifyValue(row.severity)}`,
        summary: (row) =>
          type === "daily_note"
            ? getDailyNoteField(row, ["what_happened", "main_events"]) ||
              getDailyNoteField(row, ["what_happened", "presentation"]) ||
              "No summary"
            : row.description || "No summary"
      })}
    </section>
  `;
}

function bindDocumentCards() {
  $$(".js-open-document").forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.docType;
      const record = parseRecordDataset(btn.dataset.record);

      if (type === "monthly_review") {
        if (record?.id) openMonthlyReviewDetail(record.id);
        return;
      }

      openWorkspaceModal({
        type,
        mode: "edit",
        title: modalTitleForType(type, "edit"),
        meta: getFullName(state.selectedYoungPerson),
        record
      });
    };
  });
}

function modalTitleForType(type, mode) {
  const create = {
    daily_note: "New Daily Note",
    incident: "New Incident",
    keywork: "New Key Work Session",
    plan: "New Support Plan",
    risk: "New Risk Assessment",
    health: "New Health Record",
    education: "New Education Record",
    family: "New Family Record",
    handover: "New Handover",
    supervision: "New Supervision"
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
    handover: "Handover",
    supervision: "Supervision"
  };

  return mode === "create" ? create[type] || "New Document" : edit[type] || "Document";
}

function renderCardPill(type, row) {
  if (type === "risk") return renderSeverityPill(row.severity);
  if (type === "incident") return renderSeverityPill(row.severity);
  if (type === "daily_note") return renderWorkflowPill(row.workflow_status);
  if (type === "plan") return renderStatusPill(row.status);
  if (type === "monthly_review") return renderStatusPill(row.status);
  return renderStatusPill(row.status || row.workflow_status || "open");
}

/* -------------------- Drawer fallback -------------------- */

function bindDrawerRecordButtons() {
  $$(".js-open-drawer-record").forEach((btn) => {
    btn.onclick = () => {
      const record = parseRecordDataset(btn.dataset.record);
      if (record) openRecordDrawer("Record Detail", record);
    };
  });
}

function openRecordDrawer(title, record) {
  if (!els.recordDetailDrawer || !els.recordDetailContent) return;
  els.recordDetailDrawer.classList.remove("hidden");
  els.recordDetailContent.innerHTML = `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      ${renderDrawerValue(record)}
    </section>
  `;
}

function closeRecordDrawer() {
  if (!els.recordDetailDrawer || !els.recordDetailContent) return;
  els.recordDetailDrawer.classList.add("hidden");
  els.recordDetailContent.innerHTML = "";
}

function renderDrawerValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) return `<div class="empty-state">No data found.</div>`;
    return value.map((item, index) => `
      <section class="section-group">
        <h3 class="group-title">Item ${index + 1}</h3>
        ${renderDrawerValue(item)}
      </section>
    `).join("");
  }

  if (value && typeof value === "object") {
    return `
      <div class="section-table-wrap">
        <table class="data-table key-value">
          <tbody>
            ${Object.entries(value).map(([key, itemValue]) => `
              <tr>
                <th>${escapeHtml(formatLabel(key))}</th>
                <td>${renderDrawerCellValue(itemValue)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  return `<div class="empty-state">${escapeHtml(stringifyValue(value))}</div>`;
}

function renderDrawerCellValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return `
      <div class="info-card-list">
        ${value.map((item, index) => `
          <div class="info-card-item">
            <strong>Item ${index + 1}</strong>
            ${typeof item === "object" ? renderDrawerValue(item) : escapeHtml(stringifyValue(item))}
          </div>
        `).join("")}
      </div>
    `;
  }

  if (value && typeof value === "object") {
    return renderDrawerValue(value);
  }

  return escapeHtml(stringifyValue(value));
}

/* -------------------- Shared render helpers -------------------- */

function renderLoading(el, text) {
  if (el) el.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function renderTiles(entries) {
  const items = entries.filter(([, value]) => hasValue(value));
  if (!items.length) return `<div class="empty-state">No summary available.</div>`;

  return `
    <div class="overview-grid">
      ${items.map(([title, value]) => `
        <div class="overview-tile">
          <h4>${escapeHtml(title)}</h4>
          <p>${escapeHtml(trimForTable(stringifyValue(value), title.toLowerCase()))}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSimpleListSection(title, items) {
  const rows = items.filter(Boolean);

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      ${rows.length
        ? `<div class="info-card-list">${rows.map((item) => `<div class="info-card-item">${escapeHtml(item)}</div>`).join("")}</div>`
        : `<div class="empty-state">No data found.</div>`
      }
    </section>
  `;
}

function renderObjectSection(title, record, keys) {
  if (!record || typeof record !== "object" || !Object.keys(record).length) {
    return `
      <section class="section-group">
        <h3 class="group-title">${escapeHtml(title)}</h3>
        <div class="empty-state">No data found.</div>
      </section>
    `;
  }

  const pickedKeys = (keys || Object.keys(record)).filter((key) => key in record && hasValue(record[key]));

  if (!pickedKeys.length) {
    return `
      <section class="section-group">
        <h3 class="group-title">${escapeHtml(title)}</h3>
        <div class="empty-state">No data found.</div>
      </section>
    `;
  }

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      <div class="section-table-wrap">
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
    </section>
  `;
}

function renderArraySection(title, rows, preferredColumns) {
  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      ${renderTableSection(title, normaliseArrayResponse(rows), preferredColumns, true)}
    </section>
  `;
}

function renderTableSection(_title, rows, preferredColumns = null, addViewButton = false) {
  if (!rows?.length) return `<div class="empty-state">No records found.</div>`;

  const columns = preferredColumns?.length
    ? preferredColumns.filter((col) => rows.some((row) => col in row))
    : Object.keys(rows[0]).slice(0, 8);

  return `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            ${columns.map((col) => `<th>${escapeHtml(formatLabel(col))}</th>`).join("")}
            ${addViewButton ? `<th>Open</th>` : ""}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((col) => `<td>${renderTableCell(col, row[col])}</td>`).join("")}
              ${addViewButton ? `
                <td class="table-actions">
                  <button class="text-link-btn js-open-drawer-record" data-record='${escapeHtml(JSON.stringify(row))}'>View</button>
                </td>
              ` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTableCell(key, value) {
  if (key === "compliance_status") return renderStatusPill(value);
  if (key === "severity") return renderSeverityPill(value);
  if (key === "workflow_status") return renderWorkflowPill(value);
  if (key === "status" && typeof value === "string") return renderStatusPill(value);
  return escapeHtml(trimForTable(formatFieldValue(key, value), key));
}

function renderStatusPill(value) {
  return `<span class="status-pill ${statusColour(value)}">${escapeHtml(stringifyValue(value))}</span>`;
}

function renderSeverityPill(value) {
  const lower = String(value || "").toLowerCase();
  const cls =
    lower === "high" ? "status-red" :
    lower === "medium" ? "status-amber" :
    lower === "low" ? "status-green" :
    "status-grey";
  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

function renderWorkflowPill(value) {
  const lower = String(value || "").toLowerCase();
  const cls =
    lower === "reviewed" || lower === "approved" ? "status-green" :
    lower === "submitted" || lower === "completed" || lower === "amended" ? "status-blue" :
    lower === "returned" ? "status-red" :
    "status-grey";
  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

function renderPlaceholderCards(title, text) {
  return `
    <div class="info-card-list">
      <div class="info-card-item"><strong>${escapeHtml(title)}</strong></div>
      <div class="info-card-item">${escapeHtml(text)}</div>
    </div>
  `;
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

function parseRecordDataset(value) {
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

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const groupKey = row[key] || "other";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(row);
    return acc;
  }, {});
}

function formatComplianceGroupTitle(value) {
  return {
    support_plan_review: "Support Plan Reviews",
    risk_review: "Risk Reviews",
    keywork_follow_up: "Key Work Follow-up",
    health_follow_up: "Health Follow-up",
    family_follow_up: "Family Follow-up",
    daily_note_follow_up: "Daily Note Follow-up"
  }[value] || formatLabel(value);
}

function getFullName(person) {
  const preferred = person.preferred_name ? ` (${person.preferred_name})` : "";
  const name = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  return name ? `${name}${preferred}` : `Young Person #${person.id}`;
}

function getInitials(person) {
  const parts = [person?.first_name, person?.last_name].filter(Boolean);
  return parts.length ? parts.map((part) => String(part).charAt(0).toUpperCase()).slice(0, 2).join("") : "YP";
}

function setText(el, value) {
  if (el) el.textContent = String(value);
}

function formatLabel(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function trimForTable(value, key) {
  const max = ["summary", "description", "presenting_need", "concern_summary", "positives", "actions_required"].includes(key)
    ? 100
    : 56;

  return String(value).length > max ? `${String(value).slice(0, max)}...` : String(value);
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
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function statusColour(value) {
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
