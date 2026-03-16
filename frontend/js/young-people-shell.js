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
    incidents: [],
    compliance: null,
    dailyNotes: [],
    health: null,
    education: null,
    family: null
  },

  keyworkSessions: [],
  activeKeyworkSessionId: null,

  dailyNote: {
    activeId: null,
    activeRecord: null,
    versions: [],
    isDirty: false,
    autosaveTimer: null,
    languageHints: []
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

  dailyNoteSingle: (ypId, id) => `/young-people/${ypId}/daily-notes/${id}`,
  dailyNoteCreate: (ypId) => `/young-people/${ypId}/daily-notes`,
  dailyNoteUpdate: (ypId, id) => `/young-people/${ypId}/daily-notes/${id}`,
  dailyNoteReview: (ypId, id) => `/young-people/${ypId}/daily-notes/${id}/review`,
  dailyNoteVersions: (ypId, id) => `/young-people/${ypId}/daily-notes/${id}/versions`,
  dailyNoteLanguageCheck: "/young-people/daily-notes/therapeutic-language-check",

  keyworkList: (id) => `/young-people/${id}/keywork`,
  keyworkById: (id) => `/young-people/keywork/${id}`,
  keyworkCreate: "/young-people/keywork",
  keyworkUpdate: (id) => `/young-people/keywork/${id}`,

  chronologyList: (id) => `/young-people/${id}/chronology`,
  chronologyRebuild: (id) => `/young-people/${id}/chronology/rebuild`,

  standardsSummary: (id) => [`/young-people/${id}/standards`],
  standardsEvidence: (id) => [`/young-people/${id}/standards/evidence`],
  standardsRebuild: (id) => `/young-people/${id}/standards/rebuild`,

  monthlyReviewsList: (id) => `/monthly-reviews/young-person/${id}`,
  monthlyReviewDetail: (id) => `/monthly-reviews/${id}`,
  monthlyReviewGenerate: (id, month) =>
    `/monthly-reviews/young-person/${id}/generate?review_month=${month}`,

  inspectionPackCreate: "/inspection-pack",
  ofstedAiReport: (id, reviewMonth = "") =>
    reviewMonth
      ? `/ofsted-ai/young-person/${id}/report?review_month=${encodeURIComponent(reviewMonth)}`
      : `/ofsted-ai/young-person/${id}/report`
};

const $ = (id) => document.getElementById(id);

const els = {
  youngPeopleList: $("youngPeopleList"),
  youngPersonSearch: $("youngPersonSearch"),
  refreshYoungPeopleBtn: $("refreshYoungPeopleBtn"),
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

  quickAddDailyNoteBtn: $("quickAddDailyNoteBtn"),
  quickAddIncidentBtn: $("quickAddIncidentBtn"),
  quickAddKeyworkBtn: $("quickAddKeyworkBtn"),

  actionOverdueCount: $("actionOverdueCount"),
  actionDueSoonCount: $("actionDueSoonCount"),
  actionAlertsCount: $("actionAlertsCount"),
  actionPlansCount: $("actionPlansCount"),
  actionRiskCount: $("actionRiskCount"),
  actionIncidentsCount: $("actionIncidentsCount"),

  overviewContent: $("overviewContent"),
  overviewActionsContent: $("overviewActionsContent"),
  overviewRecentActivityContent: $("overviewRecentActivityContent"),
  overviewVoiceContent: $("overviewVoiceContent"),
  overviewAlertsContent: $("overviewAlertsContent"),
  overviewReadinessContent: $("overviewReadinessContent"),

  profileContent: $("profileContent"),
  plansContent: $("plansContent"),
  riskContent: $("riskContent"),
  dailyNotesContent: $("dailyNotesContent"),
  incidentsContent: $("incidentsContent"),
  healthContent: $("healthContent"),
  educationContent: $("educationContent"),
  familyContent: $("familyContent"),
  chronologyContent: $("chronologyContent"),
  complianceContent: $("complianceContent"),

  standardsSummary: $("standardsSummary"),
  standardsEvidenceList: $("standardsEvidenceList"),
  rebuildStandardsBtn: $("rebuildStandardsBtn"),

  complianceStatusFilter: $("complianceStatusFilter"),
  complianceCategoryFilter: $("complianceCategoryFilter"),

  monthlyReviewsList: $("monthlyReviewsList"),
  monthlyReviewDetail: $("monthlyReviewDetail"),
  generateMonthlyReviewBtn: $("generateMonthlyReviewBtn"),
  monthlyReviewMonth: $("monthlyReviewMonth"),

  keyworkList: $("keyworkList"),
  keyworkForm: $("keyworkForm"),
  keyworkFormTitle: $("keyworkFormTitle"),
  keyworkSessionId: $("keyworkSessionId"),
  sessionDate: $("sessionDate"),
  workerId: $("workerId"),
  topic: $("topic"),
  purpose: $("purpose"),
  summary: $("summary"),
  childVoice: $("childVoice"),
  reflectiveAnalysis: $("reflectiveAnalysis"),
  actionsAgreed: $("actionsAgreed"),
  nextSessionDate: $("nextSessionDate"),
  newKeyworkBtn: $("newKeyworkBtn"),
  clearKeyworkFormBtn: $("clearKeyworkFormBtn"),
  rebuildChronologyBtn: $("rebuildChronologyBtn"),

  recordDetailDrawer: $("recordDetailDrawer"),
  recordDetailContent: $("recordDetailContent"),
  closeDrawerBtn: $("closeDrawerBtn"),

  dailyNoteStatusFilter: $("dailyNoteStatusFilter"),
  dailyNoteShiftFilter: $("dailyNoteShiftFilter"),
  dailyNoteSearch: $("dailyNoteSearch"),
  newDailyNoteBtn: $("newDailyNoteBtn"),
  refreshDailyNotesBtn: $("refreshDailyNotesBtn"),

  dailyNoteForm: $("dailyNoteForm"),
  dailyNoteFormTitle: $("dailyNoteFormTitle"),
  dailyNoteId: $("dailyNoteId"),
  dailyNoteVersionNumber: $("dailyNoteVersionNumber"),
  dailyNoteCurrentStatus: $("dailyNoteCurrentStatus"),
  dailyNoteSaveIndicator: $("dailyNoteSaveIndicator"),
  dailyNoteWorkflowIndicator: $("dailyNoteWorkflowIndicator"),

  dailyNoteDate: $("dailyNoteDate"),
  dailyNoteShiftType: $("dailyNoteShiftType"),
  dailyNoteCustomShift: $("dailyNoteCustomShift"),
  dailyNoteStaffOnShift: $("dailyNoteStaffOnShift"),
  dailyNoteLocation: $("dailyNoteLocation"),
  dailyNoteTags: $("dailyNoteTags"),
  dailyNoteSignificantEvent: $("dailyNoteSignificantEvent"),
  dailyNoteManagerReviewRequired: $("dailyNoteManagerReviewRequired"),

  dailyNotePresentation: $("dailyNotePresentation"),
  dailyNoteMainEvents: $("dailyNoteMainEvents"),
  dailyNoteRoutineEngagement: $("dailyNoteRoutineEngagement"),
  dailyNoteEducationUpdate: $("dailyNoteEducationUpdate"),
  dailyNoteHealthUpdate: $("dailyNoteHealthUpdate"),
  dailyNoteFamilyUpdate: $("dailyNoteFamilyUpdate"),
  dailyNoteWorries: $("dailyNoteWorries"),
  dailyNotePositives: $("dailyNotePositives"),

  dailyNotePacePlayfulnessStatus: $("dailyNotePacePlayfulnessStatus"),
  dailyNotePacePlayfulness: $("dailyNotePacePlayfulness"),
  dailyNotePaceAcceptanceStatus: $("dailyNotePaceAcceptanceStatus"),
  dailyNotePaceAcceptance: $("dailyNotePaceAcceptance"),
  dailyNotePaceCuriosityTags: $("dailyNotePaceCuriosityTags"),
  dailyNotePaceCuriosity: $("dailyNotePaceCuriosity"),
  dailyNotePaceEmpathyTags: $("dailyNotePaceEmpathyTags"),
  dailyNotePaceEmpathy: $("dailyNotePaceEmpathy"),

  dailyNoteYoungPersonVoice: $("dailyNoteYoungPersonVoice"),
  dailyNoteCommunicationStyle: $("dailyNoteCommunicationStyle"),

  dailyNoteStaffResponse: $("dailyNoteStaffResponse"),
  dailyNoteWhatHelped: $("dailyNoteWhatHelped"),
  dailyNoteWhatDidNotHelp: $("dailyNoteWhatDidNotHelp"),
  dailyNoteImpact: $("dailyNoteImpact"),

  dailyNoteActionsRequired: $("dailyNoteActionsRequired"),
  dailyNoteDiscussInHandover: $("dailyNoteDiscussInHandover"),
  dailyNoteUpdateRiskAssessment: $("dailyNoteUpdateRiskAssessment"),
  dailyNoteLinkMonthlyReview: $("dailyNoteLinkMonthlyReview"),

  dailyNoteLinkedStandards: $("dailyNoteLinkedStandards"),
  dailyNoteLinkedRisks: $("dailyNoteLinkedRisks"),
  dailyNoteLinkedPlans: $("dailyNoteLinkedPlans"),
  dailyNoteEvidenceImpactStatement: $("dailyNoteEvidenceImpactStatement"),

  dailyNoteChangeReason: $("dailyNoteChangeReason"),
  dailyNoteManagerReviewComment: $("dailyNoteManagerReviewComment"),

  saveDailyNoteDraftBtn: $("saveDailyNoteDraftBtn"),
  completeDailyNoteBtn: $("completeDailyNoteBtn"),
  reviewDailyNoteBtn: $("reviewDailyNoteBtn"),
  clearDailyNoteFormBtn: $("clearDailyNoteFormBtn"),

  dailyNoteSidebarTodayInfo: $("dailyNoteSidebarTodayInfo"),
  dailyNoteSidebarRisks: $("dailyNoteSidebarRisks"),
  dailyNoteSidebarActions: $("dailyNoteSidebarActions"),
  therapeuticLanguageHints: $("therapeuticLanguageHints"),
  dailyNoteVersionHistory: $("dailyNoteVersionHistory")
};

document.addEventListener("DOMContentLoaded", () => {
  setDefaultMonthlyReviewMonth();
  bindEvents();
  loadYoungPeople();
});

function bindEvents() {
  qsa(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab))
  );

  qsa(".action-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (chip.dataset.jumpTab === "compliance") {
        state.jumpComplianceFilter = chip.dataset.filter || "all";
      }
      setActiveTab(chip.dataset.jumpTab);
    });
  });

  qsa(".help-toggle").forEach((btn) => {
    btn.addEventListener("click", () => toggleHelp(btn.dataset.helpTarget, btn));
  });

  on(els.youngPersonSearch, "input", handleSearch);
  on(els.refreshYoungPeopleBtn, "click", loadYoungPeople);
  on(els.reloadCurrentBtn, "click", reloadCurrentRecord);
  on(els.inspectionPackBtn, "click", createInspectionPackJob);

  on(els.headerOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));
  on(els.monthlyOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));
  on(els.rebuildStandardsBtn, "click", rebuildStandardsLinks);
  on(els.generateMonthlyReviewBtn, "click", generateMonthlyReview);

  on(els.complianceStatusFilter, "change", rerenderComplianceFromState);
  on(els.complianceCategoryFilter, "change", rerenderComplianceFromState);

  on(els.keyworkForm, "submit", saveKeyworkSession);
  on(els.newKeyworkBtn, "click", resetKeyworkForm);
  on(els.clearKeyworkFormBtn, "click", resetKeyworkForm);
  on(els.rebuildChronologyBtn, "click", rebuildChronology);
  on(els.closeDrawerBtn, "click", closeRecordDrawer);

  on(els.quickAddDailyNoteBtn, "click", () => {
    setActiveTab("daily_notes");
    createNewDailyNote();
  });
  on(els.quickAddIncidentBtn, "click", () => setActiveTab("incidents"));
  on(els.quickAddKeyworkBtn, "click", () => {
    setActiveTab("keywork");
    resetKeyworkForm();
  });

  on(els.newDailyNoteBtn, "click", createNewDailyNote);
  on(els.refreshDailyNotesBtn, "click", () => {
    if (state.selectedYoungPerson) loadDailyNotes(state.selectedYoungPerson.id);
  });
  on(els.dailyNoteStatusFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteShiftFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteSearch, "input", renderDailyNotesListFromState);

  on(els.dailyNoteForm, "submit", (e) => {
    e.preventDefault();
    saveDailyNote("draft");
  });
  on(els.completeDailyNoteBtn, "click", () => saveDailyNote("completed"));
  on(els.reviewDailyNoteBtn, "click", markDailyNoteReviewed);
  on(els.clearDailyNoteFormBtn, "click", clearDailyNoteFormWithPrompt);

  bindDailyNoteDirtyTracking();

  window.addEventListener("beforeunload", (event) => {
    if (!state.dailyNote.isDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function on(el, event, handler) {
  if (el) el.addEventListener(event, handler);
}

function qsa(selector) {
  return [...document.querySelectorAll(selector)];
}

function toggleHelp(id, btn) {
  const target = $(id);
  if (!target) return;
  target.classList.toggle("hidden");
  if (btn) btn.textContent = target.classList.contains("hidden") ? "Why this matters" : "Hide help";
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
    } catch {}
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
    } catch (err) {
      lastError = err;
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
  showStatus.timer = setTimeout(() => els.statusBar.classList.add("hidden"), 4000);
}

/* -------------------- Young people -------------------- */

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
      const refreshed = rows.find((p) => Number(p.id) === Number(state.selectedYoungPerson.id));
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
        <br /><small>${escapeHtml(error.message)}</small>
      </div>
    `;
    showStatus(`Could not load young people: ${error.message}`, true);
  }
}

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();
  state.filteredYoungPeople = state.youngPeople.filter((person) =>
    `${person.first_name || ""} ${person.last_name || ""} ${person.preferred_name || ""}`.toLowerCase().includes(term)
  );
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

  qsa(".young-person-card").forEach((card) => {
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
    incidents: [],
    compliance: null,
    dailyNotes: [],
    health: null,
    education: null,
    family: null
  };
  state.keyworkSessions = [];
  state.activeKeyworkSessionId = null;
  resetDailyNoteForm();
  resetKeyworkForm();
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

  const p = state.selectedYoungPerson;
  const bits = [`ID: ${p.id}`];
  if (p.date_of_birth) bits.push(`DOB: ${formatDate(p.date_of_birth)}`);
  if (p.placement_status) bits.push(`Status: ${p.placement_status}`);
  if (p.summary_risk_level) bits.push(`Risk: ${p.summary_risk_level}`);

  setText(els.selectedYoungPersonName, getFullName(p));
  setText(els.selectedYoungPersonMeta, bits.join(" | "));
}

function updateStickyYoungPersonBar() {
  const p = state.selectedYoungPerson;
  if (!p) {
    setText(els.stickyPersonAvatar, "YP");
    setText(els.stickyYoungPersonName, "No young person selected");
    setText(els.stickyYoungPersonSummary, "Select a record to view the full shell");
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
  const yp = profile.young_person || p;
  const alerts = profile.alerts || [];
  const activePlan = (state.latest.plans || []).find((x) => String(x.status || "").toLowerCase() === "active");
  const firstEducation = Array.isArray(state.latest.education?.education_profile)
    ? state.latest.education.education_profile[0]
    : null;

  setText(els.stickyPersonAvatar, getInitials(p));
  setText(els.stickyYoungPersonName, getFullName(p));
  setText(
    els.stickyYoungPersonSummary,
    `${yp.placement_status || "Placement status not recorded"}${yp.legal_status ? ` • ${yp.legal_status}` : ""}`
  );
  setText(els.stickyDobChip, `DOB: ${yp.date_of_birth ? formatDate(yp.date_of_birth) : "—"}`);
  setText(els.stickyPlacementChip, `Placement: ${yp.placement_status || "—"}`);
  setText(els.stickySocialWorkerChip, `SW: ${yp.social_worker_name || yp.social_worker || "—"}`);
  setText(els.stickyEducationChip, `Education: ${yp.school_name || firstEducation?.school_name || yp.education_status || "—"}`);
  setText(els.stickyRiskLevel, `Risk: ${yp.summary_risk_level || "—"}`);
  setText(els.stickyPlanReview, `Plan review: ${activePlan?.review_date ? formatDate(activePlan.review_date) : "—"}`);
  setText(els.stickyTodayInfo, `Today I need to know: ${alerts[0]?.title || alerts[0]?.description || "No live alert"}`);
}

/* -------------------- Tab loading -------------------- */

function setActiveTab(tabName) {
  state.activeTab = tabName;
  qsa(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  qsa(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
  closeRecordDrawer();
  loadActiveTabData();
}

async function reloadCurrentRecord() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
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

    const items = compliance?.compliance_items || [];
    setText(els.actionOverdueCount, items.filter((x) => x.compliance_status === "overdue").length);
    setText(els.actionDueSoonCount, items.filter((x) => x.compliance_status === "due_soon").length);
    setText(els.actionAlertsCount, (profile?.alerts || []).length);
    setText(els.actionPlansCount, state.latest.plans.length);
    setText(els.actionRiskCount, state.latest.risk.length);
    setText(els.actionIncidentsCount, state.latest.incidents.length);

    updateStickyYoungPersonBar();
  } catch (error) {
    console.error("Action bar load failed:", error);
  }
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
  chronology: loadChronology,
  monthly_reviews: loadMonthlyReviews,
  standards: loadStandards,
  compliance: loadCompliance,
  keywork: loadKeyworkSessions
};

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
  renderLoading(els.overviewActionsContent, "Loading actions...");
  renderLoading(els.overviewRecentActivityContent, "Loading activity...");
  renderLoading(els.overviewVoiceContent, "Loading voice...");
  renderLoading(els.overviewAlertsContent, "Loading alerts...");
  renderLoading(els.overviewReadinessContent, "Loading readiness...");

  const data = await fetchFromCandidates(endpoints.overview(id));
  state.latest.overview = data;

  const activePlans = state.latest.plans.filter((x) => String(x.status || "").toLowerCase() === "active");
  const activeRisks = state.latest.risk.filter((x) => String(x.status || "").toLowerCase() === "active");
  const complianceItems = state.latest.compliance?.compliance_items || [];
  const alerts = state.latest.profile?.alerts || [];
  const recentNotes = state.latest.dailyNotes.slice(0, 5);
  const recentIncidents = state.latest.incidents.slice(0, 5);

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
    ${renderArraySection("Current plans", activePlans, ["status", "plan_type", "title", "review_date"])}
    ${renderArraySection("Live risks", activeRisks, ["severity", "category", "title", "review_date"])}
  `;

  els.overviewRecentActivityContent.innerHTML = `
    ${renderArraySection("Recent daily notes", recentNotes, ["note_date", "shift_type", "workflow_status"])}
    ${renderArraySection("Recent incidents", recentIncidents, ["incident_datetime", "incident_type", "severity"])}
  `;

  els.overviewVoiceContent.innerHTML = `
    ${renderSimpleListSection("What matters and voice", [
      data?.what_matters_to_me && `What matters: ${data.what_matters_to_me}`,
      data?.strengths_summary && `Strengths: ${data.strengths_summary}`,
      data?.interests && `Interests: ${data.interests}`
    ])}
    ${renderRecentVoiceQuotes(recentNotes)}
  `;

  els.overviewActionsContent.innerHTML = renderComplianceSummaryStrip(complianceItems, alerts);

  els.overviewAlertsContent.innerHTML = `
    ${renderArraySection("Alerts", alerts, ["alert_type", "title", "description", "severity", "review_date"])}
  `;

  els.overviewReadinessContent.innerHTML = `
    ${renderTiles([
      ["Active alerts", alerts.length],
      ["Active plans", activePlans.length],
      ["Active risks", activeRisks.length],
      ["Daily notes", state.latest.dailyNotes.length]
    ])}
  `;
}

function renderTiles(entries) {
  const items = entries.filter(([, value]) => hasValue(value));
  if (!items.length) return `<div class="empty-state">No overview summary available.</div>`;
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
        ? `<div class="info-card-list">${rows.map((x) => `<div class="info-card-item">${escapeHtml(x)}</div>`).join("")}</div>`
        : `<div class="empty-state">No data found.</div>`}
    </section>
  `;
}

function renderRecentVoiceQuotes(notes) {
  const quotes = notes
    .map((n) => getDailyNoteField(n, ["young_person_voice", "voice"]))
    .filter(Boolean)
    .slice(0, 5);

  return `
    <section class="section-group">
      <h3 class="group-title">Recent child voice</h3>
      ${quotes.length
        ? `<div class="info-card-list">${quotes.map((q) => `<div class="info-card-item">${escapeHtml(trimForTable(q, "young_person_voice"))}</div>`).join("")}</div>`
        : `<div class="empty-state">No recent voice entries found.</div>`}
    </section>
  `;
}

/* -------------------- Generic module loaders -------------------- */

async function loadProfile(id) {
  renderLoading(els.profileContent, "Loading profile...");
  const data = await fetchFromCandidates(endpoints.profile(id));
  state.latest.profile = data;
  updateStickyYoungPersonBar();

  els.profileContent.innerHTML = [
    renderObjectSection("Young Person", data?.young_person || {}, [
      "id", "first_name", "last_name", "preferred_name", "date_of_birth", "gender",
      "ethnicity", "local_id_number", "placement_status", "summary_risk_level"
    ]),
    renderArraySection("Legal Status", data?.legal_status || [], [
      "legal_status", "order_type", "order_details", "effective_from", "effective_to", "is_current"
    ]),
    renderArraySection("Communication Profile", data?.communication_profile || [], [
      "neurodiversity_summary", "communication_style", "sensory_profile", "processing_needs",
      "signs_of_distress", "what_helps", "what_to_avoid", "routines_and_predictability", "visual_support_needs"
    ]),
    renderArraySection("Identity Profile", data?.identity_profile || [], [
      "religion_or_faith", "cultural_identity", "first_language", "dietary_needs",
      "interests", "strengths_summary", "what_matters_to_me", "important_dates"
    ]),
    renderArraySection("Alerts", data?.alerts || [], [
      "alert_type", "title", "description", "severity", "is_active", "review_date"
    ])
  ].join("");
}

async function loadPlans(id) {
  renderLoading(els.plansContent, "Loading plans...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.plans(id)));
  state.latest.plans = rows;
  updateStickyYoungPersonBar();

  els.plansContent.innerHTML = renderArraySection("Support Plans", rows, [
    "status", "plan_type", "title", "presenting_need", "review_date", "approval_status", "owner_first_name", "created_at"
  ]);
}

async function loadRisk(id) {
  renderLoading(els.riskContent, "Loading risk...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.risk(id)));
  state.latest.risk = rows;
  updateStickyYoungPersonBar();

  els.riskContent.innerHTML = renderArraySection("Risk Assessments", rows, [
    "severity", "category", "title", "concern_summary", "review_date", "status", "approval_status", "owner_first_name"
  ]);
}

async function loadIncidents(id) {
  renderLoading(els.incidentsContent, "Loading incidents...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.incidents(id)));
  state.latest.incidents = rows;

  els.incidentsContent.innerHTML = renderArraySection("Incidents", rows, [
    "incident_datetime", "incident_type", "severity", "location", "description",
    "manager_review_status", "follow_up_required", "staff_first_name"
  ]);
}

async function loadHealth(id) {
  renderLoading(els.healthContent, "Loading health...");
  const data = await fetchFromCandidates(endpoints.health(id));
  state.latest.health = data;

  els.healthContent.innerHTML = [
    renderArraySection("Health Profile", data?.health_profile || [], [
      "gp_name", "gp_contact", "dentist_name", "dentist_contact", "optician_name", "optician_contact",
      "allergies", "diagnoses", "mental_health_summary", "medication_summary", "consent_notes"
    ]),
    renderArraySection("Health Records", data?.health_records || [], [
      "event_datetime", "record_type", "title", "summary", "professional_name", "outcome",
      "follow_up_required", "next_action_date"
    ]),
    renderArraySection("Medication Profiles", data?.medication_profiles || [], [
      "medication_name", "dosage", "route", "frequency", "prescribed_by", "start_date",
      "end_date", "is_active", "notes"
    ]),
    renderArraySection("Medication Records", data?.medication_records || [], [
      "scheduled_time", "administered_time", "medication_name", "dose", "route", "status",
      "error_flag", "administered_by_first_name"
    ])
  ].join("");
}

async function loadEducation(id) {
  renderLoading(els.educationContent, "Loading education...");
  const data = await fetchFromCandidates(endpoints.education(id));
  state.latest.education = data;
  updateStickyYoungPersonBar();

  els.educationContent.innerHTML = [
    renderArraySection("Education Profile", data?.education_profile || [], [
      "school_name", "year_group", "education_status", "sen_status", "ehcp_details",
      "designated_teacher", "attendance_baseline", "pep_status", "support_summary"
    ]),
    renderArraySection("Education Records", data?.education_records || [], [
      "record_date", "attendance_status", "provision_name", "behaviour_summary",
      "learning_engagement", "issue_raised", "action_taken", "professional_involved", "achievement_note"
    ])
  ].join("");
}

async function loadFamily(id) {
  renderLoading(els.familyContent, "Loading family...");
  const data = await fetchFromCandidates(endpoints.family(id));
  state.latest.family = data;

  els.familyContent.innerHTML = [
    renderArraySection("Contacts", data?.contacts || [], [
      "contact_type", "full_name", "relationship_to_young_person", "phone", "email",
      "is_parental_responsibility_holder", "is_approved_contact", "is_restricted_contact", "supervision_level"
    ]),
    renderArraySection("Family Contact Records", data?.family_contact_records || [], [
      "contact_datetime", "contact_type", "contact_person", "supervision_level", "location",
      "pre_contact_presentation", "post_contact_presentation", "child_voice", "concerns", "follow_up_required"
    ])
  ].join("");
}

async function loadChronology(id) {
  renderLoading(els.chronologyContent, "Loading chronology...");
  const rows = normaliseArrayResponse(await fetchJson(endpoints.chronologyList(id)));

  els.chronologyContent.innerHTML = renderTableSection("Chronology", rows, [
    "event_datetime", "category", "subcategory", "title", "summary", "significance", "source_table"
  ], true);

  bindOpenRecordButtons();
}

async function loadStandards(id) {
  renderLoading(els.standardsSummary, "Loading standards...");
  renderLoading(els.standardsEvidenceList, "Loading evidence...");

  const [summary, evidence] = await Promise.all([
    fetchFromCandidates(endpoints.standardsSummary(id)),
    fetchFromCandidates(endpoints.standardsEvidence(id))
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

async function loadMonthlyReviews(id) {
  renderLoading(els.monthlyReviewsList, "Loading monthly reviews...");
  const rows = await fetchJson(endpoints.monthlyReviewsList(id));

  if (!rows?.length) {
    els.monthlyReviewsList.innerHTML = `<div class="empty-state">No monthly reviews yet.</div>`;
    els.monthlyReviewDetail.innerHTML = `<div class="empty-state">Select a review to view details.</div>`;
    return;
  }

  els.monthlyReviewsList.innerHTML = `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Status</th>
            <th>Title</th>
            <th>Open</th>
            <th>AI Report</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td>${escapeHtml(formatDate(r.review_month))}</td>
              <td>${renderStatusPill(r.status)}</td>
              <td>${escapeHtml(r.review_title || "")}</td>
              <td><button class="text-link-btn js-open-monthly-review" data-review-id="${r.id}">Open</button></td>
              <td><button class="text-link-btn js-open-ofsted-ai-report" data-review-month="${escapeHtml(formatMonthApiValue(r.review_month))}">View AI Report</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  qsa(".js-open-monthly-review").forEach((btn) =>
    btn.addEventListener("click", () => loadMonthlyReviewDetail(Number(btn.dataset.reviewId)))
  );
  qsa(".js-open-ofsted-ai-report").forEach((btn) =>
    btn.addEventListener("click", () => loadOfstedAiReport(btn.dataset.reviewMonth || ""))
  );
}

/* -------------------- Monthly reviews / AI -------------------- */

async function loadMonthlyReviewDetail(reviewId) {
  renderLoading(els.monthlyReviewDetail, "Loading review...");
  const data = await fetchJson(endpoints.monthlyReviewDetail(reviewId));

  els.monthlyReviewDetail.innerHTML = [
    renderObjectSection("Review Summary", data?.review || {}, [
      "review_title", "review_month", "status", "summary_of_month", "progress_summary", "child_voice_summary",
      "concerns_and_risks", "education_summary", "health_summary", "family_summary", "keywork_summary",
      "behaviour_summary", "achievements_summary", "actions_for_next_month", "manager_analysis"
    ]),
    renderArraySection("Linked Evidence", data?.record_links || [], [
      "source_table", "source_id", "link_reason", "created_at"
    ]),
    renderArraySection("Standards Summary", data?.standards || [], [
      "standard_code", "standard_short_label", "evidence_count", "narrative_summary"
    ]),
    renderArraySection("Actions", data?.actions || [], [
      "action_text", "action_owner_id", "due_date", "status"
    ])
  ].join("");
}

async function generateMonthlyReview() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  if (!els.monthlyReviewMonth?.value) return showStatus("Please choose a month first.", true);

  const reviewMonth = `${els.monthlyReviewMonth.value}-01`;
  try {
    const result = await fetchJson(
      endpoints.monthlyReviewGenerate(state.selectedYoungPerson.id, reviewMonth),
      { method: "POST" }
    );

    showStatus("Monthly review generated successfully.");
    await loadMonthlyReviews(state.selectedYoungPerson.id);

    if (result?.monthly_review_id) {
      await loadMonthlyReviewDetail(result.monthly_review_id);
      await loadOfstedAiReport(reviewMonth);
    }
  } catch (error) {
    showStatus(`Could not generate monthly review: ${error.message}`, true);
  }
}

async function loadOfstedAiReport(reviewMonth = "") {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);

  try {
    showStatus("Generating AI OFSTED report...");
    const report = await fetchJson(endpoints.ofstedAiReport(state.selectedYoungPerson.id, reviewMonth));
    openRecordDrawer("AI OFSTED Inspection Report", report);
    showStatus("AI OFSTED report loaded.");
  } catch (error) {
    showStatus(`Could not load AI OFSTED report: ${error.message}`, true);
  }
}

/* -------------------- Standards / compliance -------------------- */

function renderStandardsSummary(rows) {
  if (!rows?.length) {
    els.standardsSummary.innerHTML = `<div class="empty-state">No standards data found.</div>`;
    return;
  }

  els.standardsSummary.innerHTML = `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Standard</th><th>Title</th><th>Evidence Count</th></tr>
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
            <th>Standard</th><th>Source</th><th>Source ID</th><th>Evidence Strength</th><th>Rationale</th><th>Created</th>
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

  let items = data.compliance_items || [];
  const alerts = data.active_alerts || [];

  if (statusFilter !== "all") items = items.filter((x) => x.compliance_status === statusFilter);
  if (categoryFilter !== "all") items = items.filter((x) => x.compliance_type === categoryFilter);

  const grouped = groupBy(items, "compliance_type");

  els.complianceContent.innerHTML = `
    ${renderComplianceSummaryStrip(items, alerts)}
    ${Object.keys(grouped).length
      ? Object.entries(grouped).map(([name, rows]) => renderComplianceGroup(name, rows)).join("")
      : `<div class="empty-state">No compliance items match the selected filters.</div>`}
    ${renderArraySection("Active Alerts", alerts, ["alert_type", "title", "description", "severity", "review_date"])}
  `;

  bindOpenRecordButtons();
}

function renderComplianceSummaryStrip(items, alerts) {
  return renderTiles([
    ["Overdue", items.filter((x) => x.compliance_status === "overdue").length],
    ["Due Soon", items.filter((x) => x.compliance_status === "due_soon").length],
    ["Current", items.filter((x) => x.compliance_status === "ok").length],
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
            <tr>${columns.map((c) => `<th>${escapeHtml(formatLabel(c))}</th>`).join("")}<th>Open</th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${columns.map((c) => `<td>${renderTableCell(c, row[c])}</td>`).join("")}
                <td><button class="text-link-btn js-open-record" data-record='${escapeHtml(JSON.stringify(row))}'>View</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* -------------------- Daily notes -------------------- */

const dailyNoteFields = [
  "dailyNoteDate", "dailyNoteShiftType", "dailyNoteCustomShift", "dailyNoteStaffOnShift", "dailyNoteLocation",
  "dailyNoteTags", "dailyNoteSignificantEvent", "dailyNoteManagerReviewRequired", "dailyNotePresentation",
  "dailyNoteMainEvents", "dailyNoteRoutineEngagement", "dailyNoteEducationUpdate", "dailyNoteHealthUpdate",
  "dailyNoteFamilyUpdate", "dailyNoteWorries", "dailyNotePositives", "dailyNotePacePlayfulnessStatus",
  "dailyNotePacePlayfulness", "dailyNotePaceAcceptanceStatus", "dailyNotePaceAcceptance",
  "dailyNotePaceCuriosityTags", "dailyNotePaceCuriosity", "dailyNotePaceEmpathyTags", "dailyNotePaceEmpathy",
  "dailyNoteYoungPersonVoice", "dailyNoteCommunicationStyle", "dailyNoteStaffResponse", "dailyNoteWhatHelped",
  "dailyNoteWhatDidNotHelp", "dailyNoteImpact", "dailyNoteActionsRequired", "dailyNoteDiscussInHandover",
  "dailyNoteUpdateRiskAssessment", "dailyNoteLinkMonthlyReview", "dailyNoteLinkedStandards", "dailyNoteLinkedRisks",
  "dailyNoteLinkedPlans", "dailyNoteEvidenceImpactStatement", "dailyNoteChangeReason", "dailyNoteManagerReviewComment"
];

function bindDailyNoteDirtyTracking() {
  dailyNoteFields.map((id) => els[id]).filter(Boolean).forEach((field) => {
    const eventName = field.type === "checkbox" ? "change" : "input";
    field.addEventListener(eventName, () => {
      state.dailyNote.isDirty = true;
      setDailyNoteSaveIndicator("Unsaved changes");
      scheduleDailyNoteAutosave();
      maybeRunTherapeuticLanguageCheck();
    });
  });
}

async function loadDailyNotes(id) {
  renderLoading(els.dailyNotesContent, "Loading daily notes...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.daily_notes(id)));
  state.latest.dailyNotes = rows;
  renderDailyNotesListFromState();
  renderDailyNoteSidebarContext();
  if (!state.dailyNote.activeId) createNewDailyNote({ quiet: true });
}

function renderDailyNotesListFromState() {
  if (!els.dailyNotesContent) return;

  const statusFilter = els.dailyNoteStatusFilter?.value || "all";
  const shiftFilter = els.dailyNoteShiftFilter?.value || "all";
  const term = (els.dailyNoteSearch?.value || "").trim().toLowerCase();

  let rows = [...state.latest.dailyNotes];
  if (statusFilter !== "all") rows = rows.filter((x) => String(x.workflow_status || "").toLowerCase() === statusFilter);
  if (shiftFilter !== "all") rows = rows.filter((x) => String(x.shift_type || "").toLowerCase() === shiftFilter);
  if (term) {
    rows = rows.filter((row) => [
      row.note_date,
      row.shift_type,
      row.workflow_status,
      getDailyNoteField(row, ["what_happened", "presentation"]),
      getDailyNoteField(row, ["what_happened", "main_events"]),
      getDailyNoteField(row, ["what_happened", "positives"]),
      getDailyNoteField(row, ["young_person_voice", "voice"]),
      getDailyNoteField(row, ["follow_up", "actions_required"])
    ].join(" ").toLowerCase().includes(term));
  }

  if (!rows.length) {
    els.dailyNotesContent.innerHTML = `<div class="empty-state">No daily notes match the selected filters.</div>`;
    return;
  }

  els.dailyNotesContent.innerHTML = `
    <div class="daily-note-list">
      ${rows.map((row) => `
        <button class="record-card ${Number(state.dailyNote.activeId) === Number(row.id) ? "active" : ""}" type="button" data-note-id="${row.id}">
          <div class="record-card-top">
            <h4>${escapeHtml(formatDate(row.note_date))} • ${escapeHtml(stringifyValue(row.shift_type))}</h4>
            <div>${renderWorkflowPill(row.workflow_status)}</div>
          </div>
          <div class="record-card-meta">
            <span>Version ${escapeHtml(String(row.version_number || 1))}</span>
            <span>${escapeHtml(row.author_name || "Unknown author")}</span>
          </div>
          <div class="record-card-section">
            <strong>Presentation</strong>
            <p>${escapeHtml(trimForTable(getDailyNoteField(row, ["what_happened", "presentation"]) || "—", "presentation"))}</p>
          </div>
          <div class="record-card-section">
            <strong>Positive moments</strong>
            <p>${escapeHtml(trimForTable(getDailyNoteField(row, ["what_happened", "positives"]) || "—", "positives"))}</p>
          </div>
        </button>
      `).join("")}
    </div>
  `;

  qsa("[data-note-id]").forEach((btn) =>
    btn.addEventListener("click", () => loadSingleDailyNote(Number(btn.dataset.noteId)))
  );
}

function createNewDailyNote(options = {}) {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  if (state.dailyNote.isDirty && !options.quiet && !window.confirm("You have unsaved changes. Start a new daily note anyway?")) return;

  resetDailyNoteForm();
  if (els.dailyNoteDate) els.dailyNoteDate.value = toDateInputValue(new Date());
  if (els.dailyNoteShiftType) els.dailyNoteShiftType.value = "day";
  renderDailyNoteSidebarContext();
  if (!options.quiet) showStatus("New daily note ready.");
}

function resetDailyNoteForm() {
  state.dailyNote = {
    activeId: null,
    activeRecord: null,
    versions: [],
    isDirty: false,
    autosaveTimer: null,
    languageHints: []
  };

  els.dailyNoteForm?.reset();
  setValue(els.dailyNoteId, "");
  setValue(els.dailyNoteVersionNumber, "");
  setValue(els.dailyNoteCurrentStatus, "draft");
  setText(els.dailyNoteFormTitle, "Create / Edit Daily Note");
  setDailyNoteSaveIndicator("Not saved yet");
  setDailyNoteWorkflowIndicator("Draft");
  if (els.dailyNoteVersionHistory) els.dailyNoteVersionHistory.innerHTML = `<div class="empty-state">Version history will appear here.</div>`;
  renderTherapeuticLanguageHints([]);
}

async function clearDailyNoteFormWithPrompt() {
  if (state.dailyNote.isDirty && !window.confirm("You have unsaved changes. Clear this form?")) return;
  createNewDailyNote();
}

async function loadSingleDailyNote(noteId) {
  if (!state.selectedYoungPerson) return;
  if (state.dailyNote.isDirty && Number(state.dailyNote.activeId) !== Number(noteId)) {
    if (!window.confirm("You have unsaved changes. Open another daily note anyway?")) return;
  }

  setDailyNoteSaveIndicator("Loading...");
  const record = await fetchJson(endpoints.dailyNoteSingle(state.selectedYoungPerson.id, noteId));
  state.dailyNote.activeId = noteId;
  state.dailyNote.activeRecord = record;
  fillDailyNoteForm(record);
  await loadDailyNoteVersions(noteId);
  renderDailyNotesListFromState();
  renderDailyNoteSidebarContext();
  setDailyNoteSaveIndicator("Loaded");
}

function fillDailyNoteForm(record) {
  const c = record?.content_json || {};
  const basic = c.basic_context || {};
  const what = c.what_happened || {};
  const pace = c.pace || {};
  const voice = c.young_person_voice || {};
  const response = c.staff_response || {};
  const follow = c.follow_up || {};
  const evidence = c.evidence || {};
  const review = c.review_meta || {};

  state.dailyNote.isDirty = false;

  setText(els.dailyNoteFormTitle, `Edit Daily Note #${record.id}`);
  setValue(els.dailyNoteId, record.id);
  setValue(els.dailyNoteVersionNumber, record.version_number || "");
  setValue(els.dailyNoteCurrentStatus, record.workflow_status || "draft");

  setValue(els.dailyNoteDate, toDateInputValue(basic.note_date || record.note_date));
  setValue(els.dailyNoteShiftType, basic.shift_type || record.shift_type || "day");
  setValue(els.dailyNoteCustomShift, basic.custom_shift_label || "");
  setValue(els.dailyNoteStaffOnShift, basic.staff_on_shift || "");
  setValue(els.dailyNoteLocation, basic.location || "");
  setValue(els.dailyNoteTags, basic.tags || "");
  setChecked(els.dailyNoteSignificantEvent, Boolean(basic.significant_event || record.significant_event));
  setChecked(els.dailyNoteManagerReviewRequired, Boolean(basic.manager_review_required || record.manager_review_required));

  setValue(els.dailyNotePresentation, what.presentation || "");
  setValue(els.dailyNoteMainEvents, what.main_events || "");
  setValue(els.dailyNoteRoutineEngagement, what.routine_engagement || "");
  setValue(els.dailyNoteEducationUpdate, what.education_update || "");
  setValue(els.dailyNoteHealthUpdate, what.health_update || "");
  setValue(els.dailyNoteFamilyUpdate, what.family_update || "");
  setValue(els.dailyNoteWorries, what.worries || "");
  setValue(els.dailyNotePositives, what.positives || "");

  setValue(els.dailyNotePacePlayfulnessStatus, pace?.playfulness?.status || "not_used");
  setValue(els.dailyNotePacePlayfulness, pace?.playfulness?.reflection || "");
  setValue(els.dailyNotePaceAcceptanceStatus, pace?.acceptance?.status || "not_evident");
  setValue(els.dailyNotePaceAcceptance, pace?.acceptance?.reflection || "");
  setValue(els.dailyNotePaceCuriosityTags, Array.isArray(pace?.curiosity?.tags) ? pace.curiosity.tags.join(", ") : "");
  setValue(els.dailyNotePaceCuriosity, pace?.curiosity?.reflection || "");
  setValue(els.dailyNotePaceEmpathyTags, Array.isArray(pace?.empathy?.tags) ? pace.empathy.tags.join(", ") : "");
  setValue(els.dailyNotePaceEmpathy, pace?.empathy?.reflection || "");

  setValue(els.dailyNoteYoungPersonVoice, voice.voice || "");
  setValue(els.dailyNoteCommunicationStyle, voice.communication_style || "");

  setValue(els.dailyNoteStaffResponse, response.staff_response || "");
  setValue(els.dailyNoteWhatHelped, response.what_helped || "");
  setValue(els.dailyNoteWhatDidNotHelp, response.what_did_not_help || "");
  setValue(els.dailyNoteImpact, response.impact || "");

  setValue(els.dailyNoteActionsRequired, follow.actions_required || "");
  setChecked(els.dailyNoteDiscussInHandover, Boolean(follow.discuss_in_handover));
  setChecked(els.dailyNoteUpdateRiskAssessment, Boolean(follow.update_risk_assessment));
  setChecked(els.dailyNoteLinkMonthlyReview, Boolean(follow.link_monthly_review));

  setValue(els.dailyNoteLinkedStandards, Array.isArray(evidence.linked_standards) ? evidence.linked_standards.join(", ") : "");
  setValue(els.dailyNoteLinkedRisks, Array.isArray(evidence.linked_risks) ? evidence.linked_risks.join(", ") : "");
  setValue(els.dailyNoteLinkedPlans, Array.isArray(evidence.linked_plans) ? evidence.linked_plans.join(", ") : "");
  setValue(els.dailyNoteEvidenceImpactStatement, evidence.impact_statement || "");

  setValue(els.dailyNoteChangeReason, review.change_reason || record.change_reason || "");
  setValue(els.dailyNoteManagerReviewComment, review.manager_review_comment || record.manager_review_comment || "");

  setDailyNoteWorkflowIndicator(record.workflow_status || "draft");
  maybeRunTherapeuticLanguageCheck();
}

function collectDailyNotePayload() {
  return {
    home_id: state.selectedYoungPerson?.home_id || null,
    note_date: cleanValue(els.dailyNoteDate?.value),
    shift_type: cleanValue(els.dailyNoteShiftType?.value) || "day",
    custom_shift_label: cleanValue(els.dailyNoteCustomShift?.value),
    staff_on_shift: cleanValue(els.dailyNoteStaffOnShift?.value),
    location: cleanValue(els.dailyNoteLocation?.value),
    tags: cleanValue(els.dailyNoteTags?.value),
    significant_event: Boolean(els.dailyNoteSignificantEvent?.checked),
    manager_review_required: Boolean(els.dailyNoteManagerReviewRequired?.checked),

    presentation: cleanValue(els.dailyNotePresentation?.value),
    main_events: cleanValue(els.dailyNoteMainEvents?.value),
    routine_engagement: cleanValue(els.dailyNoteRoutineEngagement?.value),
    education_update: cleanValue(els.dailyNoteEducationUpdate?.value),
    health_update: cleanValue(els.dailyNoteHealthUpdate?.value),
    family_update: cleanValue(els.dailyNoteFamilyUpdate?.value),
    worries: cleanValue(els.dailyNoteWorries?.value),
    positives: cleanValue(els.dailyNotePositives?.value),

    pace_playfulness_status: cleanValue(els.dailyNotePacePlayfulnessStatus?.value) || "not_used",
    pace_playfulness: cleanValue(els.dailyNotePacePlayfulness?.value),
    pace_acceptance_status: cleanValue(els.dailyNotePaceAcceptanceStatus?.value) || "not_evident",
    pace_acceptance: cleanValue(els.dailyNotePaceAcceptance?.value),
    pace_curiosity_tags: cleanValue(els.dailyNotePaceCuriosityTags?.value),
    pace_curiosity: cleanValue(els.dailyNotePaceCuriosity?.value),
    pace_empathy_tags: cleanValue(els.dailyNotePaceEmpathyTags?.value),
    pace_empathy: cleanValue(els.dailyNotePaceEmpathy?.value),

    young_person_voice: cleanValue(els.dailyNoteYoungPersonVoice?.value),
    communication_style: cleanValue(els.dailyNoteCommunicationStyle?.value),

    staff_response: cleanValue(els.dailyNoteStaffResponse?.value),
    what_helped: cleanValue(els.dailyNoteWhatHelped?.value),
    what_did_not_help: cleanValue(els.dailyNoteWhatDidNotHelp?.value),
    impact: cleanValue(els.dailyNoteImpact?.value),

    actions_required: cleanValue(els.dailyNoteActionsRequired?.value),
    discuss_in_handover: Boolean(els.dailyNoteDiscussInHandover?.checked),
    update_risk_assessment: Boolean(els.dailyNoteUpdateRiskAssessment?.checked),
    link_monthly_review: Boolean(els.dailyNoteLinkMonthlyReview?.checked),

    linked_standards: cleanValue(els.dailyNoteLinkedStandards?.value),
    linked_risks: cleanValue(els.dailyNoteLinkedRisks?.value),
    linked_plans: cleanValue(els.dailyNoteLinkedPlans?.value),
    evidence_impact_statement: cleanValue(els.dailyNoteEvidenceImpactStatement?.value),

    change_reason: cleanValue(els.dailyNoteChangeReason?.value),
    manager_review_comment: cleanValue(els.dailyNoteManagerReviewComment?.value),
    author_id: 1
  };
}

async function saveDailyNote(saveAs = "draft", options = {}) {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);

  const payload = collectDailyNotePayload();
  if (!payload.note_date) return showStatus("Daily note date is required.", true);
  if (!payload.shift_type) return showStatus("Shift type is required.", true);

  setDailyNoteSaveIndicator(options.autosave ? "Autosaving..." : "Saving...");

  try {
    const noteId = cleanValue(els.dailyNoteId?.value);
    const url = noteId
      ? endpoints.dailyNoteUpdate(state.selectedYoungPerson.id, noteId)
      : endpoints.dailyNoteCreate(state.selectedYoungPerson.id);

    const method = noteId ? "PUT" : "POST";

    const result = await fetchJson(url, {
      method,
      body: JSON.stringify({
        ...payload,
        edited_by: 1,
        save_as: saveAs === "completed" ? "completed" : "draft"
      })
    });

    state.dailyNote.isDirty = false;
    setDailyNoteSaveIndicator(`${options.autosave ? "Autosaved" : "Saved"} ${formatTimeOnly(new Date())}`);

    if (result?.therapeutic_language_suggestions) {
      renderTherapeuticLanguageHints(result.therapeutic_language_suggestions);
    }

    if (!options.silent) showStatus(saveAs === "completed" ? "Daily note completed." : "Daily note saved.");

    await loadDailyNotes(state.selectedYoungPerson.id);
    if (result?.daily_note_id) await loadSingleDailyNote(result.daily_note_id);
    await loadActionBarData();
  } catch (error) {
    setDailyNoteSaveIndicator("Save failed");
    if (!options.silent) showStatus(`Could not save daily note: ${error.message}`, true);
    throw error;
  }
}

async function markDailyNoteReviewed() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  const noteId = cleanValue(els.dailyNoteId?.value);
  if (!noteId) return showStatus("Please open or save a daily note before marking it reviewed.", true);

  try {
    await fetchJson(endpoints.dailyNoteReview(state.selectedYoungPerson.id, noteId), {
      method: "POST",
      body: JSON.stringify({
        reviewed_by: 1,
        manager_review_comment: cleanValue(els.dailyNoteManagerReviewComment?.value),
        mark_as: "reviewed"
      })
    });

    showStatus("Daily note marked as reviewed.");
    await loadDailyNotes(state.selectedYoungPerson.id);
    await loadSingleDailyNote(Number(noteId));
    await loadActionBarData();
  } catch (error) {
    showStatus(`Could not mark daily note reviewed: ${error.message}`, true);
  }
}

async function loadDailyNoteVersions(noteId) {
  const versions = normaliseArrayResponse(await fetchJson(endpoints.dailyNoteVersions(state.selectedYoungPerson.id, noteId)));
  state.dailyNote.versions = versions;
  renderDailyNoteVersionHistory();
}

function renderDailyNoteVersionHistory() {
  if (!els.dailyNoteVersionHistory) return;
  const rows = state.dailyNote.versions;
  if (!rows.length) {
    els.dailyNoteVersionHistory.innerHTML = `<div class="empty-state">Version history will appear here.</div>`;
    return;
  }

  els.dailyNoteVersionHistory.innerHTML = `
    <div class="version-history-list">
      ${rows.map((row) => `
        <button type="button" class="version-history-item" data-version-id="${row.id}">
          <div class="version-history-top">
            <strong>Version ${escapeHtml(String(row.version_number || 1))}</strong>
            <span>${renderWorkflowPill(row.workflow_status)}</span>
          </div>
          <div class="version-history-meta">
            <span>${escapeHtml(row.edited_by_name || "Unknown user")}</span>
            <span>${escapeHtml(formatDateTime(row.edited_at))}</span>
          </div>
          <div class="version-history-reason">${escapeHtml(row.change_reason || "No reason recorded")}</div>
        </button>
      `).join("")}
    </div>
  `;

  qsa("[data-version-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const version = rows.find((x) => Number(x.id) === Number(btn.dataset.versionId));
      if (version) openRecordDrawer("Daily Note Version", version);
    });
  });
}

function renderDailyNoteSidebarContext() {
  const profile = state.latest.profile || {};
  const alerts = profile.alerts || [];
  const plans = state.latest.plans.filter((x) => String(x.status || "").toLowerCase() === "active");
  const risks = state.latest.risk || [];
  const items = (state.latest.compliance?.compliance_items || []).filter((x) => x.compliance_status !== "ok");

  els.dailyNoteSidebarTodayInfo.innerHTML = `
    <div class="support-lines">
      <div><strong>Alerts:</strong> ${escapeHtml(alerts.length ? alerts.map((a) => a.title || a.description).slice(0, 3).join(" • ") : "None recorded")}</div>
      <div><strong>Active plans:</strong> ${plans.length}</div>
      <div><strong>Placement status:</strong> ${escapeHtml(stringifyValue(state.selectedYoungPerson?.placement_status))}</div>
      <div><strong>Risk level:</strong> ${escapeHtml(stringifyValue(state.selectedYoungPerson?.summary_risk_level))}</div>
    </div>
  `;

  els.dailyNoteSidebarRisks.innerHTML = risks.length
    ? `<ul class="support-list">${risks.slice(0, 6).map((risk) => `
        <li><strong>${escapeHtml(stringifyValue(risk.title || risk.category))}</strong><div>${escapeHtml(stringifyValue(risk.concern_summary || risk.category))}</div></li>
      `).join("")}</ul>`
    : `<div class="empty-state">No current risks loaded.</div>`;

  els.dailyNoteSidebarActions.innerHTML = items.length
    ? `<ul class="support-list">${items.slice(0, 6).map((item) => `
        <li><strong>${escapeHtml(stringifyValue(item.title))}</strong><div>${escapeHtml(formatComplianceGroupTitle(item.compliance_type))} • ${escapeHtml(formatDate(item.due_date))}</div></li>
      `).join("")}</ul>`
    : `<div class="empty-state">No active actions loaded.</div>`;
}

function scheduleDailyNoteAutosave() {
  clearTimeout(state.dailyNote.autosaveTimer);
  if (!state.selectedYoungPerson || state.activeTab !== "daily_notes" || !state.dailyNote.isDirty) return;

  state.dailyNote.autosaveTimer = setTimeout(() => {
    saveDailyNote("draft", { silent: true, autosave: true }).catch(() => {});
  }, 2500);
}

async function maybeRunTherapeuticLanguageCheck() {
  const textFields = [
    els.dailyNotePresentation?.value,
    els.dailyNoteMainEvents?.value,
    els.dailyNoteRoutineEngagement?.value,
    els.dailyNoteEducationUpdate?.value,
    els.dailyNoteHealthUpdate?.value,
    els.dailyNoteFamilyUpdate?.value,
    els.dailyNoteWorries?.value,
    els.dailyNotePositives?.value,
    els.dailyNotePacePlayfulness?.value,
    els.dailyNotePaceAcceptance?.value,
    els.dailyNotePaceCuriosity?.value,
    els.dailyNotePaceEmpathy?.value,
    els.dailyNoteYoungPersonVoice?.value,
    els.dailyNoteCommunicationStyle?.value,
    els.dailyNoteStaffResponse?.value,
    els.dailyNoteWhatHelped?.value,
    els.dailyNoteWhatDidNotHelp?.value,
    els.dailyNoteImpact?.value,
    els.dailyNoteActionsRequired?.value,
    els.dailyNoteEvidenceImpactStatement?.value
  ].filter(Boolean);

  clearTimeout(maybeRunTherapeuticLanguageCheck.timer);
  maybeRunTherapeuticLanguageCheck.timer = setTimeout(async () => {
    try {
      const result = await fetchJson(endpoints.dailyNoteLanguageCheck, {
        method: "POST",
        body: JSON.stringify({ text_fields: textFields })
      });
      renderTherapeuticLanguageHints(result?.suggestions || []);
    } catch {}
  }, 500);
}

function renderTherapeuticLanguageHints(suggestions = []) {
  state.dailyNote.languageHints = suggestions;

  els.therapeuticLanguageHints.innerHTML = suggestions.length
    ? `
      <p class="muted-copy">Suggested therapeutic wording:</p>
      <ul class="support-list">
        ${suggestions.map((item) => `
          <li><strong>Try:</strong> ${escapeHtml(item.suggestion)}<div>${escapeHtml(item.reason || "")}</div></li>
        `).join("")}
      </ul>
    `
    : `
      <p class="muted-copy">No wording prompts at the moment.</p>
      <ul class="support-list">
        <li><strong>Try:</strong> clear, kind, factual recording</li>
        <li><strong>Use:</strong> curiosity, empathy and child-centred language</li>
      </ul>
    `;
}

function getDailyNoteField(row, path) {
  let current = row?.content_json || row || {};
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = current[key];
  }
  return current ?? null;
}

function setDailyNoteSaveIndicator(text) {
  setText(els.dailyNoteSaveIndicator, text);
}

function setDailyNoteWorkflowIndicator(text) {
  setText(els.dailyNoteWorkflowIndicator, text || "Draft");
}

/* -------------------- Keywork -------------------- */

async function loadKeyworkSessions(id) {
  renderLoading(els.keyworkList, "Loading key work sessions...");
  const data = await fetchJson(endpoints.keyworkList(id));
  state.keyworkSessions = normaliseArrayResponse(data);
  renderKeyworkList();
}

function renderKeyworkList() {
  const rows = state.keyworkSessions;
  if (!rows.length) {
    els.keyworkList.innerHTML = `<div class="empty-state">No key work sessions found.</div>`;
    return;
  }

  els.keyworkList.innerHTML = renderTableSection("Key Work Sessions", rows, [
    "session_date", "topic", "worker_first_name", "summary", "next_session_date"
  ], true);

  bindOpenRecordButtons();
  qsa(".js-keywork-row").forEach((btn) =>
    btn.addEventListener("click", () => loadSingleKeyworkSession(Number(btn.dataset.sessionId)))
  );
}

async function loadSingleKeyworkSession(sessionId) {
  const session = await fetchJson(endpoints.keyworkById(sessionId));
  state.activeKeyworkSessionId = session.id;
  fillKeyworkForm(session);
  openRecordDrawer("Key Work Session", session);
  renderKeyworkList();
}

function fillKeyworkForm(session) {
  setText(els.keyworkFormTitle, `Edit Key Work Session #${session.id}`);
  setValue(els.keyworkSessionId, session.id || "");
  setValue(els.sessionDate, toDateInputValue(session.session_date));
  setValue(els.workerId, session.worker_id ?? "");
  setValue(els.topic, session.topic ?? "");
  setValue(els.purpose, session.purpose ?? "");
  setValue(els.summary, session.summary ?? "");
  setValue(els.childVoice, session.child_voice ?? "");
  setValue(els.reflectiveAnalysis, session.reflective_analysis ?? "");
  setValue(els.actionsAgreed, session.actions_agreed ?? "");
  setValue(els.nextSessionDate, toDateInputValue(session.next_session_date));
}

function resetKeyworkForm() {
  state.activeKeyworkSessionId = null;
  els.keyworkForm?.reset();
  setValue(els.keyworkSessionId, "");
  setText(els.keyworkFormTitle, "Create / Edit Key Work Session");
}

async function saveKeyworkSession(event) {
  event.preventDefault();
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);

  const sessionId = cleanValue(els.keyworkSessionId?.value);
  const payload = {
    young_person_id: Number(state.selectedYoungPerson.id),
    session_date: cleanValue(els.sessionDate?.value),
    worker_id: parseNullableInt(els.workerId?.value),
    topic: cleanValue(els.topic?.value),
    purpose: cleanValue(els.purpose?.value),
    summary: cleanValue(els.summary?.value),
    child_voice: cleanValue(els.childVoice?.value),
    reflective_analysis: cleanValue(els.reflectiveAnalysis?.value),
    actions_agreed: cleanValue(els.actionsAgreed?.value),
    next_session_date: cleanValue(els.nextSessionDate?.value)
  };

  if (!payload.session_date || !payload.topic) {
    return showStatus("Session date and topic are required.", true);
  }

  try {
    if (sessionId) {
      await fetchJson(endpoints.keyworkUpdate(sessionId), {
        method: "PUT",
        body: JSON.stringify({
          session_date: payload.session_date,
          worker_id: payload.worker_id,
          topic: payload.topic,
          purpose: payload.purpose,
          summary: payload.summary,
          child_voice: payload.child_voice,
          reflective_analysis: payload.reflective_analysis,
          actions_agreed: payload.actions_agreed,
          next_session_date: payload.next_session_date
        })
      });
      showStatus("Key work session updated successfully.");
    } else {
      await fetchJson(endpoints.keyworkCreate, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showStatus("Key work session created successfully.");
    }

    resetKeyworkForm();
    await loadKeyworkSessions(state.selectedYoungPerson.id);
    await loadActionBarData();
  } catch (error) {
    showStatus(`Could not save key work session: ${error.message}`, true);
  }
}

/* -------------------- Actions -------------------- */

async function rebuildChronology() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  try {
    await fetchJson(endpoints.chronologyRebuild(state.selectedYoungPerson.id), { method: "POST" });
    showStatus("Chronology rebuilt successfully.");
    await loadChronology(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(`Could not rebuild chronology: ${error.message}`, true);
  }
}

async function rebuildStandardsLinks() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  try {
    await fetchJson(endpoints.standardsRebuild(state.selectedYoungPerson.id), { method: "POST" });
    showStatus("Standards links rebuilt successfully.");
    await loadStandards(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(`Could not rebuild standards links: ${error.message}`, true);
  }
}

async function createInspectionPackJob() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);

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

/* -------------------- Render helpers -------------------- */

function renderLoading(el, text) {
  if (el) el.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function renderObjectSection(title, record, keys) {
  if (!record || typeof record !== "object" || !Object.keys(record).length) {
    return `<section class="section-group"><h3 class="group-title">${escapeHtml(title)}</h3><div class="empty-state">No data found.</div></section>`;
  }

  const picked = (keys || Object.keys(record)).filter((key) => key in record && hasValue(record[key]));
  if (!picked.length) {
    return `<section class="section-group"><h3 class="group-title">${escapeHtml(title)}</h3><div class="empty-state">No data found.</div></section>`;
  }

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      <div class="section-table-wrap">
        <table class="data-table key-value compact">
          <tbody>
            ${picked.map((key) => `
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
                  <button class="text-link-btn js-open-record" data-record='${escapeHtml(JSON.stringify(row))}'>View</button>
                  ${state.activeTab === "keywork" && row.id ? `<button class="text-link-btn js-keywork-row" data-session-id="${row.id}">Edit</button>` : ""}
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
  const cls = lower === "high" ? "status-red" : lower === "medium" ? "status-amber" : lower === "low" ? "status-green" : "status-grey";
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

/* -------------------- Drawer -------------------- */

function bindOpenRecordButtons() {
  qsa(".js-open-record").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        openRecordDrawer("Record Detail", JSON.parse(unescapeHtml(btn.dataset.record)));
      } catch {}
    });
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
        <table class="data-table key-value compact">
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
    return `<div class="drawer-nested-list">${value.map((item, i) => `
      <div class="drawer-nested-item"><strong>Item ${i + 1}</strong>${renderDrawerValue(item)}</div>
    `).join("")}</div>`;
  }
  if (value && typeof value === "object") return renderDrawerValue(value);
  return escapeHtml(stringifyValue(value));
}

function closeRecordDrawer() {
  els.recordDetailDrawer?.classList.add("hidden");
  if (els.recordDetailContent) els.recordDetailContent.innerHTML = "";
}

/* -------------------- Utilities -------------------- */

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
  return parts.length ? parts.map((x) => String(x).charAt(0).toUpperCase()).slice(0, 2).join("") : "YP";
}

function setText(el, value) {
  if (el) el.textContent = String(value);
}

function setValue(el, value) {
  if (el) el.value = value ?? "";
}

function setChecked(el, checked) {
  if (el) el.checked = Boolean(checked);
}

function cleanValue(value) {
  const cleaned = typeof value === "string" ? value.trim() : value;
  return cleaned === "" ? null : cleaned;
}

function parseNullableInt(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function trimForTable(value, key) {
  const max = ["summary", "description", "presenting_need", "concern_summary", "positives", "actions_required", "what_matters_to_me", "rationale", "presentation", "young_person_voice"].includes(key)
    ? 80
    : 48;
  return String(value).length > max ? `${String(value).slice(0, max)}...` : String(value);
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
    "date_of_birth", "created_at", "updated_at", "event_datetime", "session_date", "note_date", "record_date",
    "admission_date", "discharge_date", "review_date", "review_month", "start_date", "next_session_date",
    "contact_datetime", "effective_from", "effective_to", "scheduled_time", "administered_time", "approved_at",
    "returned_at", "submitted_at", "next_action_date", "due_date", "generated_at", "last_edited_at", "edited_at"
  ];

  if (dateKeys.includes(key)) {
    const plainDateKeys = [
      "date_of_birth", "session_date", "note_date", "record_date", "admission_date", "discharge_date",
      "review_date", "review_month", "start_date", "next_session_date", "effective_from",
      "effective_to", "next_action_date", "due_date"
    ];
    return plainDateKeys.includes(key) ? formatDate(value) : formatDateTime(value);
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
    : `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatTimeOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatMonthApiValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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
