const state = {
  youngPeople: [],
  filteredYoungPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview",

  keyworkSessions: [],
  activeKeyworkSessionId: null,

  latestProfileData: null,
  latestPlansData: [],
  latestRiskData: [],
  latestIncidentsData: [],
  latestComplianceData: null,
  latestDailyNotesData: [],
  latestOverviewData: null,

  activeDailyNoteId: null,
  activeDailyNoteRecord: null,
  activeDailyNoteVersions: [],
  dailyNoteAutosaveTimer: null,
  dailyNoteIsDirty: false,
  dailyNoteLastSavedAt: null,
  dailyNoteLanguageHints: [],
  jumpComplianceFilter: "all"
};

const endpoints = {
  youngPeopleList: [
    "/young-people",
    "/young-people/list"
  ],
  overview: (id) => [
    `/young-people/${id}`
  ],
  profile: (id) => [
    `/young-people/${id}/profile`
  ],
  plans: (id) => [
    `/young-people/${id}/plans`
  ],
  risk: (id) => [
    `/young-people/${id}/risk`
  ],
  daily_notes: (id) => [
    `/young-people/${id}/daily-notes`
  ],
  daily_note_single: (youngPersonId, noteId) =>
    `/young-people/${youngPersonId}/daily-notes/${noteId}`,
  daily_note_versions: (youngPersonId, noteId) =>
    `/young-people/${youngPersonId}/daily-notes/${noteId}/versions`,
  daily_note_create: (youngPersonId) =>
    `/young-people/${youngPersonId}/daily-notes`,
  daily_note_update: (youngPersonId, noteId) =>
    `/young-people/${youngPersonId}/daily-notes/${noteId}`,
  daily_note_review: (youngPersonId, noteId) =>
    `/young-people/${youngPersonId}/daily-notes/${noteId}/review`,
  daily_note_therapeutic_language_check:
    "/young-people/daily-notes/therapeutic-language-check",

  incidents: (id) => [
    `/young-people/${id}/incidents`
  ],
  health: (id) => [
    `/young-people/${id}/health`
  ],
  education: (id) => [
    `/young-people/${id}/education`
  ],
  family: (id) => [
    `/young-people/${id}/family`
  ],
  compliance: (id) => [
    `/young-people/${id}/compliance`
  ],
  keyworkList: (id) => `/young-people/${id}/keywork`,
  keyworkById: (id) => `/young-people/keywork/${id}`,
  keyworkCreate: "/young-people/keywork",
  keyworkUpdate: (id) => `/young-people/keywork/${id}`,
  chronologyList: (id) => `/young-people/${id}/chronology`,
  chronologyRebuild: (id) => `/young-people/${id}/chronology/rebuild`,
  standardsSummary: (id) => [
    `/young-people/${id}/standards`
  ],
  standardsEvidence: (id) => [
    `/young-people/${id}/standards/evidence`
  ],
  standardsRebuild: (id) => `/young-people/${id}/standards/rebuild`,
  monthlyReviewsList: (id) => `/monthly-reviews/young-person/${id}`,
  monthlyReviewDetail: (id) => `/monthly-reviews/${id}`,
  monthlyReviewGenerate: (id, month) =>
    `/monthly-reviews/young-person/${id}/generate?review_month=${month}`,
  inspectionPackCreate: "/inspection-pack",
  inspectionPackData: (id) => `/inspection-pack/young-person/${id}`,
  ofstedAiReport: (id, reviewMonth = "") =>
    reviewMonth
      ? `/ofsted-ai/young-person/${id}/report?review_month=${encodeURIComponent(reviewMonth)}`
      : `/ofsted-ai/young-person/${id}/report`
};

const els = {
  youngPeopleList: document.getElementById("youngPeopleList"),
  youngPersonSearch: document.getElementById("youngPersonSearch"),
  refreshYoungPeopleBtn: document.getElementById("refreshYoungPeopleBtn"),
  reloadCurrentBtn: document.getElementById("reloadCurrentBtn"),
  inspectionPackBtn: document.getElementById("inspectionPackBtn"),
  headerOfstedAiBtn: document.getElementById("headerOfstedAiBtn"),
  monthlyOfstedAiBtn: document.getElementById("monthlyOfstedAiBtn"),

  selectedYoungPersonName: document.getElementById("selectedYoungPersonName"),
  selectedYoungPersonMeta: document.getElementById("selectedYoungPersonMeta"),

  stickyYoungPersonBar: document.getElementById("stickyYoungPersonBar"),
  stickyPersonAvatar: document.getElementById("stickyPersonAvatar"),
  stickyYoungPersonName: document.getElementById("stickyYoungPersonName"),
  stickyYoungPersonSummary: document.getElementById("stickyYoungPersonSummary"),
  stickyDobChip: document.getElementById("stickyDobChip"),
  stickyPlacementChip: document.getElementById("stickyPlacementChip"),
  stickySocialWorkerChip: document.getElementById("stickySocialWorkerChip"),
  stickyEducationChip: document.getElementById("stickyEducationChip"),
  stickyRiskLevel: document.getElementById("stickyRiskLevel"),
  stickyPlanReview: document.getElementById("stickyPlanReview"),
  stickyTodayInfo: document.getElementById("stickyTodayInfo"),
  quickAddDailyNoteBtn: document.getElementById("quickAddDailyNoteBtn"),
  quickAddIncidentBtn: document.getElementById("quickAddIncidentBtn"),
  quickAddKeyworkBtn: document.getElementById("quickAddKeyworkBtn"),

  statusBar: document.getElementById("statusBar"),

  actionOverdueCount: document.getElementById("actionOverdueCount"),
  actionDueSoonCount: document.getElementById("actionDueSoonCount"),
  actionAlertsCount: document.getElementById("actionAlertsCount"),
  actionPlansCount: document.getElementById("actionPlansCount"),
  actionRiskCount: document.getElementById("actionRiskCount"),
  actionIncidentsCount: document.getElementById("actionIncidentsCount"),

  overviewContent: document.getElementById("overviewContent"),
  overviewActionsContent: document.getElementById("overviewActionsContent"),
  profileContent: document.getElementById("profileContent"),
  plansContent: document.getElementById("plansContent"),
  riskContent: document.getElementById("riskContent"),
  dailyNotesContent: document.getElementById("dailyNotesContent"),
  incidentsContent: document.getElementById("incidentsContent"),
  healthContent: document.getElementById("healthContent"),
  educationContent: document.getElementById("educationContent"),
  familyContent: document.getElementById("familyContent"),
  chronologyContent: document.getElementById("chronologyContent"),
  complianceContent: document.getElementById("complianceContent"),

  standardsSummary: document.getElementById("standardsSummary"),
  standardsEvidenceList: document.getElementById("standardsEvidenceList"),
  rebuildStandardsBtn: document.getElementById("rebuildStandardsBtn"),

  complianceStatusFilter: document.getElementById("complianceStatusFilter"),
  complianceCategoryFilter: document.getElementById("complianceCategoryFilter"),

  monthlyReviewsList: document.getElementById("monthlyReviewsList"),
  monthlyReviewDetail: document.getElementById("monthlyReviewDetail"),
  generateMonthlyReviewBtn: document.getElementById("generateMonthlyReviewBtn"),
  monthlyReviewMonth: document.getElementById("monthlyReviewMonth"),

  keyworkList: document.getElementById("keyworkList"),
  keyworkForm: document.getElementById("keyworkForm"),
  keyworkFormTitle: document.getElementById("keyworkFormTitle"),
  keyworkSessionId: document.getElementById("keyworkSessionId"),
  sessionDate: document.getElementById("sessionDate"),
  workerId: document.getElementById("workerId"),
  topic: document.getElementById("topic"),
  purpose: document.getElementById("purpose"),
  summary: document.getElementById("summary"),
  childVoice: document.getElementById("childVoice"),
  reflectiveAnalysis: document.getElementById("reflectiveAnalysis"),
  actionsAgreed: document.getElementById("actionsAgreed"),
  nextSessionDate: document.getElementById("nextSessionDate"),
  newKeyworkBtn: document.getElementById("newKeyworkBtn"),
  clearKeyworkFormBtn: document.getElementById("clearKeyworkFormBtn"),
  rebuildChronologyBtn: document.getElementById("rebuildChronologyBtn"),

  recordDetailDrawer: document.getElementById("recordDetailDrawer"),
  recordDetailContent: document.getElementById("recordDetailContent"),
  closeDrawerBtn: document.getElementById("closeDrawerBtn"),

  dailyNoteStatusFilter: document.getElementById("dailyNoteStatusFilter"),
  dailyNoteShiftFilter: document.getElementById("dailyNoteShiftFilter"),
  dailyNoteSearch: document.getElementById("dailyNoteSearch"),
  newDailyNoteBtn: document.getElementById("newDailyNoteBtn"),
  refreshDailyNotesBtn: document.getElementById("refreshDailyNotesBtn"),

  dailyNoteForm: document.getElementById("dailyNoteForm"),
  dailyNoteFormTitle: document.getElementById("dailyNoteFormTitle"),
  dailyNoteId: document.getElementById("dailyNoteId"),
  dailyNoteVersionNumber: document.getElementById("dailyNoteVersionNumber"),
  dailyNoteCurrentStatus: document.getElementById("dailyNoteCurrentStatus"),
  dailyNoteSaveIndicator: document.getElementById("dailyNoteSaveIndicator"),
  dailyNoteWorkflowIndicator: document.getElementById("dailyNoteWorkflowIndicator"),

  dailyNoteDate: document.getElementById("dailyNoteDate"),
  dailyNoteShiftType: document.getElementById("dailyNoteShiftType"),
  dailyNoteCustomShift: document.getElementById("dailyNoteCustomShift"),
  dailyNoteStaffOnShift: document.getElementById("dailyNoteStaffOnShift"),
  dailyNoteLocation: document.getElementById("dailyNoteLocation"),
  dailyNoteTags: document.getElementById("dailyNoteTags"),
  dailyNoteSignificantEvent: document.getElementById("dailyNoteSignificantEvent"),
  dailyNoteManagerReviewRequired: document.getElementById("dailyNoteManagerReviewRequired"),

  dailyNotePresentation: document.getElementById("dailyNotePresentation"),
  dailyNoteMainEvents: document.getElementById("dailyNoteMainEvents"),
  dailyNoteRoutineEngagement: document.getElementById("dailyNoteRoutineEngagement"),
  dailyNoteEducationUpdate: document.getElementById("dailyNoteEducationUpdate"),
  dailyNoteHealthUpdate: document.getElementById("dailyNoteHealthUpdate"),
  dailyNoteFamilyUpdate: document.getElementById("dailyNoteFamilyUpdate"),
  dailyNoteWorries: document.getElementById("dailyNoteWorries"),
  dailyNotePositives: document.getElementById("dailyNotePositives"),

  dailyNotePacePlayfulnessStatus: document.getElementById("dailyNotePacePlayfulnessStatus"),
  dailyNotePacePlayfulness: document.getElementById("dailyNotePacePlayfulness"),
  dailyNotePaceAcceptanceStatus: document.getElementById("dailyNotePaceAcceptanceStatus"),
  dailyNotePaceAcceptance: document.getElementById("dailyNotePaceAcceptance"),
  dailyNotePaceCuriosityTags: document.getElementById("dailyNotePaceCuriosityTags"),
  dailyNotePaceCuriosity: document.getElementById("dailyNotePaceCuriosity"),
  dailyNotePaceEmpathyTags: document.getElementById("dailyNotePaceEmpathyTags"),
  dailyNotePaceEmpathy: document.getElementById("dailyNotePaceEmpathy"),

  dailyNoteYoungPersonVoice: document.getElementById("dailyNoteYoungPersonVoice"),
  dailyNoteCommunicationStyle: document.getElementById("dailyNoteCommunicationStyle"),

  dailyNoteStaffResponse: document.getElementById("dailyNoteStaffResponse"),
  dailyNoteWhatHelped: document.getElementById("dailyNoteWhatHelped"),
  dailyNoteWhatDidNotHelp: document.getElementById("dailyNoteWhatDidNotHelp"),
  dailyNoteImpact: document.getElementById("dailyNoteImpact"),

  dailyNoteActionsRequired: document.getElementById("dailyNoteActionsRequired"),
  dailyNoteDiscussInHandover: document.getElementById("dailyNoteDiscussInHandover"),
  dailyNoteUpdateRiskAssessment: document.getElementById("dailyNoteUpdateRiskAssessment"),
  dailyNoteLinkMonthlyReview: document.getElementById("dailyNoteLinkMonthlyReview"),

  dailyNoteLinkedStandards: document.getElementById("dailyNoteLinkedStandards"),
  dailyNoteLinkedRisks: document.getElementById("dailyNoteLinkedRisks"),
  dailyNoteLinkedPlans: document.getElementById("dailyNoteLinkedPlans"),
  dailyNoteEvidenceImpactStatement: document.getElementById("dailyNoteEvidenceImpactStatement"),

  dailyNoteChangeReason: document.getElementById("dailyNoteChangeReason"),
  dailyNoteManagerReviewComment: document.getElementById("dailyNoteManagerReviewComment"),

  saveDailyNoteDraftBtn: document.getElementById("saveDailyNoteDraftBtn"),
  completeDailyNoteBtn: document.getElementById("completeDailyNoteBtn"),
  reviewDailyNoteBtn: document.getElementById("reviewDailyNoteBtn"),
  clearDailyNoteFormBtn: document.getElementById("clearDailyNoteFormBtn"),

  dailyNoteSidebarTodayInfo: document.getElementById("dailyNoteSidebarTodayInfo"),
  dailyNoteSidebarRisks: document.getElementById("dailyNoteSidebarRisks"),
  dailyNoteSidebarActions: document.getElementById("dailyNoteSidebarActions"),
  therapeuticLanguageHints: document.getElementById("therapeuticLanguageHints"),
  dailyNoteVersionHistory: document.getElementById("dailyNoteVersionHistory")
};

document.addEventListener("DOMContentLoaded", () => {
  setDefaultMonthlyReviewMonth();
  bindEvents();
  loadYoungPeople();
});

function setDefaultMonthlyReviewMonth() {
  if (!els.monthlyReviewMonth) return;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  els.monthlyReviewMonth.value = month;
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  document.querySelectorAll(".action-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const jumpTab = chip.dataset.jumpTab;
      const filter = chip.dataset.filter || "all";

      if (jumpTab === "compliance") {
        state.jumpComplianceFilter = filter;
      }

      setActiveTab(jumpTab);
    });
  });

  document.querySelectorAll(".help-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.helpTarget);
      if (!target) return;
      target.classList.toggle("hidden");
      btn.textContent = target.classList.contains("hidden") ? "Why this matters" : "Hide help";
    });
  });

  if (els.youngPersonSearch) {
    els.youngPersonSearch.addEventListener("input", handleSearch);
  }

  if (els.refreshYoungPeopleBtn) {
    els.refreshYoungPeopleBtn.addEventListener("click", loadYoungPeople);
  }

  if (els.reloadCurrentBtn) {
    els.reloadCurrentBtn.addEventListener("click", reloadCurrentRecord);
  }

  if (els.inspectionPackBtn) {
    els.inspectionPackBtn.addEventListener("click", createInspectionPackJob);
  }

  if (els.headerOfstedAiBtn) {
    els.headerOfstedAiBtn.addEventListener("click", async () => {
      await loadOfstedAiReport(getSelectedReviewMonthParam());
    });
  }

  if (els.monthlyOfstedAiBtn) {
    els.monthlyOfstedAiBtn.addEventListener("click", async () => {
      await loadOfstedAiReport(getSelectedReviewMonthParam());
    });
  }

  if (els.rebuildStandardsBtn) {
    els.rebuildStandardsBtn.addEventListener("click", rebuildStandardsLinks);
  }

  if (els.generateMonthlyReviewBtn) {
    els.generateMonthlyReviewBtn.addEventListener("click", generateMonthlyReview);
  }

  if (els.complianceStatusFilter) {
    els.complianceStatusFilter.addEventListener("change", rerenderComplianceFromState);
  }

  if (els.complianceCategoryFilter) {
    els.complianceCategoryFilter.addEventListener("change", rerenderComplianceFromState);
  }

  if (els.keyworkForm) {
    els.keyworkForm.addEventListener("submit", saveKeyworkSession);
  }

  if (els.newKeyworkBtn) {
    els.newKeyworkBtn.addEventListener("click", resetKeyworkForm);
  }

  if (els.clearKeyworkFormBtn) {
    els.clearKeyworkFormBtn.addEventListener("click", resetKeyworkForm);
  }

  if (els.rebuildChronologyBtn) {
    els.rebuildChronologyBtn.addEventListener("click", rebuildChronology);
  }

  if (els.closeDrawerBtn) {
    els.closeDrawerBtn.addEventListener("click", closeRecordDrawer);
  }

  if (els.quickAddDailyNoteBtn) {
    els.quickAddDailyNoteBtn.addEventListener("click", () => {
      setActiveTab("daily_notes");
      createNewDailyNote();
    });
  }

  if (els.quickAddKeyworkBtn) {
    els.quickAddKeyworkBtn.addEventListener("click", () => {
      setActiveTab("keywork");
      resetKeyworkForm();
    });
  }

  if (els.quickAddIncidentBtn) {
    els.quickAddIncidentBtn.addEventListener("click", () => {
      setActiveTab("incidents");
      showStatus("Incident quick-add can be wired next.", false);
    });
  }

  if (els.newDailyNoteBtn) {
    els.newDailyNoteBtn.addEventListener("click", createNewDailyNote);
  }

  if (els.refreshDailyNotesBtn) {
    els.refreshDailyNotesBtn.addEventListener("click", async () => {
      if (!state.selectedYoungPerson) return;
      await loadDailyNotes(state.selectedYoungPerson.id);
    });
  }

  if (els.dailyNoteStatusFilter) {
    els.dailyNoteStatusFilter.addEventListener("change", renderDailyNotesListFromState);
  }

  if (els.dailyNoteShiftFilter) {
    els.dailyNoteShiftFilter.addEventListener("change", renderDailyNotesListFromState);
  }

  if (els.dailyNoteSearch) {
    els.dailyNoteSearch.addEventListener("input", renderDailyNotesListFromState);
  }

  if (els.dailyNoteForm) {
    els.dailyNoteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveDailyNote("draft");
    });
  }

  if (els.completeDailyNoteBtn) {
    els.completeDailyNoteBtn.addEventListener("click", async () => {
      await saveDailyNote("completed");
    });
  }

  if (els.reviewDailyNoteBtn) {
    els.reviewDailyNoteBtn.addEventListener("click", async () => {
      await markDailyNoteReviewed();
    });
  }

  if (els.clearDailyNoteFormBtn) {
    els.clearDailyNoteFormBtn.addEventListener("click", clearDailyNoteFormWithPrompt);
  }

  bindDailyNoteDirtyTracking();

  window.addEventListener("beforeunload", (event) => {
    if (!state.dailyNoteIsDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function bindDailyNoteDirtyTracking() {
  const dailyNoteInputs = [
    els.dailyNoteDate,
    els.dailyNoteShiftType,
    els.dailyNoteCustomShift,
    els.dailyNoteStaffOnShift,
    els.dailyNoteLocation,
    els.dailyNoteTags,
    els.dailyNoteSignificantEvent,
    els.dailyNoteManagerReviewRequired,
    els.dailyNotePresentation,
    els.dailyNoteMainEvents,
    els.dailyNoteRoutineEngagement,
    els.dailyNoteEducationUpdate,
    els.dailyNoteHealthUpdate,
    els.dailyNoteFamilyUpdate,
    els.dailyNoteWorries,
    els.dailyNotePositives,
    els.dailyNotePacePlayfulnessStatus,
    els.dailyNotePacePlayfulness,
    els.dailyNotePaceAcceptanceStatus,
    els.dailyNotePaceAcceptance,
    els.dailyNotePaceCuriosityTags,
    els.dailyNotePaceCuriosity,
    els.dailyNotePaceEmpathyTags,
    els.dailyNotePaceEmpathy,
    els.dailyNoteYoungPersonVoice,
    els.dailyNoteCommunicationStyle,
    els.dailyNoteStaffResponse,
    els.dailyNoteWhatHelped,
    els.dailyNoteWhatDidNotHelp,
    els.dailyNoteImpact,
    els.dailyNoteActionsRequired,
    els.dailyNoteDiscussInHandover,
    els.dailyNoteUpdateRiskAssessment,
    els.dailyNoteLinkMonthlyReview,
    els.dailyNoteLinkedStandards,
    els.dailyNoteLinkedRisks,
    els.dailyNoteLinkedPlans,
    els.dailyNoteEvidenceImpactStatement,
    els.dailyNoteChangeReason,
    els.dailyNoteManagerReviewComment
  ].filter(Boolean);

  dailyNoteInputs.forEach((field) => {
    const eventName = field.type === "checkbox" ? "change" : "input";
    field.addEventListener(eventName, () => {
      state.dailyNoteIsDirty = true;
      setDailyNoteSaveIndicator("Unsaved changes");
      scheduleDailyNoteAutosave();
      maybeRunTherapeuticLanguageCheck();
    });
  });
}

function scheduleDailyNoteAutosave() {
  clearTimeout(state.dailyNoteAutosaveTimer);

  if (!state.selectedYoungPerson) return;
  if (state.activeTab !== "daily_notes") return;
  if (!state.dailyNoteIsDirty) return;

  state.dailyNoteAutosaveTimer = setTimeout(async () => {
    try {
      await saveDailyNote("draft", { silent: true, autosave: true });
    } catch (_err) {
      // handled in saveDailyNote
    }
  }, 2500);
}

function getSelectedReviewMonthParam() {
  if (!els.monthlyReviewMonth || !els.monthlyReviewMonth.value) return "";
  return `${els.monthlyReviewMonth.value}-01`;
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

function setDailyNoteSaveIndicator(text) {
  if (!els.dailyNoteSaveIndicator) return;
  els.dailyNoteSaveIndicator.textContent = text;
}

function setDailyNoteWorkflowIndicator(text) {
  if (!els.dailyNoteWorkflowIndicator) return;
  els.dailyNoteWorkflowIndicator.textContent = text || "Draft";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    ...options
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      if (data && data.detail) {
        message = data.detail;
      }
    } catch (_err) {}

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function fetchFromCandidates(candidateUrls) {
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      return await fetchJson(url);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No endpoint returned data");
}

async function loadYoungPeople() {
  try {
    showStatus("Loading young people...");
    const data = await fetchFromCandidates(endpoints.youngPeopleList);

    const rows = normaliseArrayResponse(data);
    state.youngPeople = rows;
    state.filteredYoungPeople = [...rows];

    renderYoungPeopleList();

    if (!state.selectedYoungPerson && rows.length > 0) {
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
    console.error(error);

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

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();

  state.filteredYoungPeople = state.youngPeople.filter((person) => {
    const name = `${person.first_name || ""} ${person.last_name || ""} ${person.preferred_name || ""}`.toLowerCase();
    return name.includes(term);
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
    const name = getFullName(person);
    const active = Number(state.selectedYoungPerson?.id) === Number(person.id) ? "active" : "";
    const subtitle = person.placement_status
      ? `Status: ${escapeHtml(person.placement_status)}`
      : `ID: ${person.id}`;

    return `
      <div class="young-person-card ${active}" data-id="${person.id}">
        <h4>${escapeHtml(name)}</h4>
        <p>${subtitle}</p>
      </div>
    `;
  }).join("");

  els.youngPeopleList.querySelectorAll(".young-person-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const personId = Number(card.dataset.id);
      const person = state.youngPeople.find((row) => Number(row.id) === personId);
      if (person) {
        await selectYoungPerson(person);
      }
    });
  });
}

async function selectYoungPerson(person) {
  state.selectedYoungPerson = person;
  state.activeKeyworkSessionId = null;
  state.keyworkSessions = [];
  state.latestProfileData = null;
  state.latestPlansData = [];
  state.latestRiskData = [];
  state.latestIncidentsData = [];
  state.latestComplianceData = null;
  state.latestDailyNotesData = [];
  state.latestOverviewData = null;

  state.activeDailyNoteId = null;
  state.activeDailyNoteRecord = null;
  state.activeDailyNoteVersions = [];
  state.dailyNoteIsDirty = false;
  clearTimeout(state.dailyNoteAutosaveTimer);

  renderYoungPeopleList();
  updateSelectedPersonHeader();
  updateStickyYoungPersonBar();
  resetKeyworkForm();
  resetDailyNoteForm();
  closeRecordDrawer();

  await loadActionBarData();
  await loadActiveTabData();
}

function updateSelectedPersonHeader() {
  if (!els.selectedYoungPersonName || !els.selectedYoungPersonMeta) return;

  if (!state.selectedYoungPerson) {
    els.selectedYoungPersonName.textContent = "Select a young person";
    els.selectedYoungPersonMeta.textContent = "No record loaded";
    return;
  }

  const person = state.selectedYoungPerson;
  const bits = [`ID: ${person.id}`];

  if (person.date_of_birth) bits.push(`DOB: ${formatDate(person.date_of_birth)}`);
  if (person.placement_status) bits.push(`Status: ${person.placement_status}`);
  if (person.summary_risk_level) bits.push(`Risk: ${person.summary_risk_level}`);

  els.selectedYoungPersonName.textContent = getFullName(person);
  els.selectedYoungPersonMeta.textContent = bits.join(" | ");
}

function updateStickyYoungPersonBar() {
  if (!state.selectedYoungPerson) {
    setText(els.stickyYoungPersonName, "No young person selected");
    setText(els.stickyYoungPersonSummary, "Select a record to view the full shell");
    setText(els.stickyDobChip, "DOB: —");
    setText(els.stickyPlacementChip, "Placement: —");
    setText(els.stickySocialWorkerChip, "SW: —");
    setText(els.stickyEducationChip, "Education: —");
    setText(els.stickyRiskLevel, "Risk: —");
    setText(els.stickyPlanReview, "Plan review: —");
    setText(els.stickyTodayInfo, "Today I need to know: —");
    setText(els.stickyPersonAvatar, "YP");
    return;
  }

  const person = state.selectedYoungPerson;
  const profileData = state.latestProfileData || {};
  const youngPerson = profileData?.young_person || person;
  const legalStatus = Array.isArray(profileData?.legal_status) ? profileData.legal_status[0] : null;
  const educationProfile = Array.isArray(profileData?.education_profile) ? profileData.education_profile[0] : null;
  const alerts = Array.isArray(profileData?.alerts) ? profileData.alerts : [];
  const plans = state.latestPlansData || [];
  const risks = state.latestRiskData || [];

  const initials = getInitials(person);
  const activePlan = plans.find((plan) => String(plan.status || "").toLowerCase() === "active");
  const nextPlanReview = activePlan?.review_date ? formatDate(activePlan.review_date) : "—";
  const topAlert = alerts[0]?.title || alerts[0]?.description || "No live alert";
  const schoolName =
    youngPerson.school_name ||
    educationProfile?.school_name ||
    youngPerson.education_status ||
    "—";
  const swName =
    youngPerson.social_worker_name ||
    youngPerson.social_worker ||
    "—";
  const riskLevel =
    youngPerson.summary_risk_level ||
    risks[0]?.severity ||
    "—";

  setText(els.stickyPersonAvatar, initials);
  setText(els.stickyYoungPersonName, getFullName(person));
  setText(
    els.stickyYoungPersonSummary,
    `${youngPerson.placement_status || "Placement status not recorded"}${legalStatus?.legal_status ? ` • ${legalStatus.legal_status}` : ""}`
  );
  setText(els.stickyDobChip, `DOB: ${youngPerson.date_of_birth ? formatDate(youngPerson.date_of_birth) : "—"}`);
  setText(els.stickyPlacementChip, `Placement: ${youngPerson.placement_status || "—"}`);
  setText(els.stickySocialWorkerChip, `SW: ${swName}`);
  setText(els.stickyEducationChip, `Education: ${schoolName}`);
  setText(els.stickyRiskLevel, `Risk: ${stringifyValue(riskLevel)}`);
  setText(els.stickyPlanReview, `Plan review: ${nextPlanReview}`);
  setText(els.stickyTodayInfo, `Today I need to know: ${topAlert}`);
}

function setActiveTab(tabName) {
  state.activeTab = tabName;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
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
    const [
      profileData,
      plansData,
      riskData,
      incidentsData,
      complianceData,
      dailyNotesData
    ] = await Promise.all([
      fetchFromCandidates(endpoints.profile(id)).catch(() => null),
      fetchFromCandidates(endpoints.plans(id)).catch(() => []),
      fetchFromCandidates(endpoints.risk(id)).catch(() => []),
      fetchFromCandidates(endpoints.incidents(id)).catch(() => []),
      fetchFromCandidates(endpoints.compliance(id)).catch(() => null),
      fetchFromCandidates(endpoints.daily_notes(id)).catch(() => [])
    ]);

    state.latestProfileData = profileData;
    state.latestPlansData = normaliseArrayResponse(plansData);
    state.latestRiskData = normaliseArrayResponse(riskData);
    state.latestIncidentsData = normaliseArrayResponse(incidentsData);
    state.latestComplianceData = complianceData;
    state.latestDailyNotesData = normaliseArrayResponse(dailyNotesData);

    const alertsCount = Array.isArray(profileData?.alerts) ? profileData.alerts.length : 0;
    const complianceItems = Array.isArray(complianceData?.compliance_items) ? complianceData.compliance_items : [];
    const overdueCount = complianceItems.filter((item) => item.compliance_status === "overdue").length;
    const dueSoonCount = complianceItems.filter((item) => item.compliance_status === "due_soon").length;

    setText(els.actionOverdueCount, overdueCount);
    setText(els.actionDueSoonCount, dueSoonCount);
    setText(els.actionAlertsCount, alertsCount);
    setText(els.actionPlansCount, state.latestPlansData.length);
    setText(els.actionRiskCount, state.latestRiskData.length);
    setText(els.actionIncidentsCount, state.latestIncidentsData.length);

    updateStickyYoungPersonBar();
  } catch (error) {
    console.error("Action bar load failed:", error);
  }
}

async function loadActiveTabData() {
  if (!state.selectedYoungPerson) return;

  const id = state.selectedYoungPerson.id;

  try {
    switch (state.activeTab) {
      case "overview":
        await loadOverview(id);
        break;
      case "profile":
        await loadProfile(id);
        break;
      case "plans":
        await loadPlans(id);
        break;
      case "risk":
        await loadRisk(id);
        break;
      case "daily_notes":
        await loadDailyNotes(id);
        break;
      case "incidents":
        await loadIncidents(id);
        break;
      case "health":
        await loadHealth(id);
        break;
      case "education":
        await loadEducation(id);
        break;
      case "family":
        await loadFamily(id);
        break;
      case "chronology":
        await loadChronology(id);
        break;
      case "monthly_reviews":
        await loadMonthlyReviews(id);
        break;
      case "standards":
        await loadStandards(id);
        break;
      case "compliance":
        await loadCompliance(id);
        break;
      case "keywork":
        await loadKeyworkSessions(id);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(error);
    showStatus(error.message, true);
  }
}

async function loadOverview(youngPersonId) {
  if (!els.overviewContent) return;

  els.overviewContent.innerHTML = `<div class="empty-state">Loading overview...</div>`;
  if (els.overviewActionsContent) {
    els.overviewActionsContent.innerHTML = `<div class="empty-state">Loading actions...</div>`;
  }

  try {
    const data = await fetchFromCandidates(endpoints.overview(youngPersonId));
    state.latestOverviewData = data;

    const activePlans = state.latestPlansData.filter((row) => String(row.status || "").toLowerCase() === "active");
    const activeRisks = state.latestRiskData.filter((row) => String(row.status || "").toLowerCase() === "active");
    const recentNotes = state.latestDailyNotesData.slice(0, 5);
    const complianceItems = Array.isArray(state.latestComplianceData?.compliance_items)
      ? state.latestComplianceData.compliance_items
      : [];
    const liveActions = complianceItems.filter((item) => item.compliance_status !== "ok").slice(0, 8);

    const topTiles = [
      {
        title: "Placement Status",
        value: data?.placement_status
      },
      {
        title: "Risk Level",
        value: data?.summary_risk_level
      },
      {
        title: "Legal Status",
        value: data?.legal_status
      },
      {
        title: "School",
        value: data?.school_name
      },
      {
        title: "GP",
        value: data?.gp_name
      },
      {
        title: "What Matters",
        value: data?.what_matters_to_me
      }
    ].filter((tile) => hasValue(tile.value));

    els.overviewContent.innerHTML = `
      ${topTiles.length ? `
        <div class="overview-grid">
          ${topTiles.map((tile) => `
            <div class="overview-tile">
              <h4>${escapeHtml(tile.title)}</h4>
              <p>${escapeHtml(trimForTable(stringifyValue(tile.value), "what_matters_to_me"))}</p>
            </div>
          `).join("")}
        </div>
      ` : ""}

      ${renderOverviewNarrativeSummary(data, activePlans, activeRisks)}
      ${renderOverviewRecentNotes(recentNotes)}
      ${renderOverviewRisks(activeRisks)}
      ${renderOverviewPlans(activePlans)}
    `;

    if (els.overviewActionsContent) {
      els.overviewActionsContent.innerHTML = `
        ${renderOverviewActions(liveActions)}
        ${renderOverviewInspectionReadiness(state.latestProfileData, state.latestPlansData, state.latestRiskData)}
      `;
    }
  } catch (error) {
    els.overviewContent.innerHTML = `
      <div class="empty-state">
        Could not load overview.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
    if (els.overviewActionsContent) {
      els.overviewActionsContent.innerHTML = `<div class="empty-state">Could not load actions.</div>`;
    }
  }
}

function renderOverviewNarrativeSummary(data, activePlans, activeRisks) {
  const summaryPoints = [
    data?.placement_status ? `Current placement status: ${data.placement_status}` : null,
    data?.summary_risk_level ? `Current recorded risk level: ${data.summary_risk_level}` : null,
    activePlans.length ? `${activePlans.length} active support plan${activePlans.length === 1 ? "" : "s"}` : "No active support plans shown",
    activeRisks.length ? `${activeRisks.length} active risk assessment${activeRisks.length === 1 ? "" : "s"}` : "No active risks shown",
    data?.what_matters_to_me ? `What matters to the young person: ${data.what_matters_to_me}` : null
  ].filter(Boolean);

  return `
    <section class="section-group">
      <h3 class="group-title">Current picture</h3>
      <div class="info-card-list">
        ${summaryPoints.map((point) => `<div class="info-card-item">${escapeHtml(point)}</div>`).join("")}
      </div>
    </section>
  `;
}

function renderOverviewRecentNotes(rows) {
  return `
    <section class="section-group">
      <h3 class="group-title">Recent daily notes</h3>
      ${rows.length ? `
        <div class="section-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Status</th>
                <th>Presentation</th>
                <th>Positives</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  <td>${escapeHtml(formatDate(row.note_date))}</td>
                  <td>${escapeHtml(stringifyValue(row.shift_type))}</td>
                  <td>${renderWorkflowPill(row.workflow_status)}</td>
                  <td>${escapeHtml(trimForTable(
                    getDailyNoteField(row, ["what_happened", "presentation"]) || "—",
                    "presentation"
                  ))}</td>
                  <td>${escapeHtml(trimForTable(
                    getDailyNoteField(row, ["what_happened", "positives"]) || "—",
                    "positives"
                  ))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No daily notes found.</div>`}
    </section>
  `;
}

function renderOverviewRisks(rows) {
  return `
    <section class="section-group">
      <h3 class="group-title">Live risks</h3>
      ${rows.length ? renderTableSection("Live Risks", rows, [
        "severity",
        "category",
        "title",
        "concern_summary",
        "review_date",
        "status"
      ], true) : `<div class="empty-state">No active risks found.</div>`}
    </section>
  `;
}

function renderOverviewPlans(rows) {
  return `
    <section class="section-group">
      <h3 class="group-title">Current plans</h3>
      ${rows.length ? renderTableSection("Current Plans", rows, [
        "status",
        "plan_type",
        "title",
        "presenting_need",
        "review_date"
      ], true) : `<div class="empty-state">No active plans found.</div>`}
    </section>
  `;
}

function renderOverviewActions(rows) {
  return `
    <section class="section-group">
      <h3 class="group-title">Live actions and due items</h3>
      ${rows.length ? `
        <div class="section-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Title</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  <td>${renderStatusPill(row.compliance_status)}</td>
                  <td>${escapeHtml(formatComplianceGroupTitle(row.compliance_type))}</td>
                  <td>${escapeHtml(stringifyValue(row.title))}</td>
                  <td>${escapeHtml(formatDate(row.due_date))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No overdue or due soon items.</div>`}
    </section>
  `;
}

function renderOverviewInspectionReadiness(profileData, plansData, riskData) {
  const alertsCount = Array.isArray(profileData?.alerts) ? profileData.alerts.length : 0;
  const activePlanCount = (plansData || []).filter((row) => String(row.status || "").toLowerCase() === "active").length;
  const activeRiskCount = (riskData || []).filter((row) => String(row.status || "").toLowerCase() === "active").length;

  return `
    <section class="section-group">
      <h3 class="group-title">Inspection readiness snapshot</h3>
      <div class="overview-grid">
        <div class="overview-tile">
          <h4>Active alerts</h4>
          <p>${alertsCount}</p>
        </div>
        <div class="overview-tile">
          <h4>Active plans</h4>
          <p>${activePlanCount}</p>
        </div>
        <div class="overview-tile">
          <h4>Active risks</h4>
          <p>${activeRiskCount}</p>
        </div>
        <div class="overview-tile">
          <h4>Daily notes</h4>
          <p>${state.latestDailyNotesData.length}</p>
        </div>
      </div>
    </section>
  `;
}

async function loadProfile(youngPersonId) {
  if (!els.profileContent) return;

  els.profileContent.innerHTML = `<div class="empty-state">Loading profile...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.profile(youngPersonId));
    state.latestProfileData = data;
    updateStickyYoungPersonBar();

    els.profileContent.innerHTML = `
      ${renderObjectSection("Young Person", data?.young_person || {}, ["id", "first_name", "last_name", "preferred_name", "date_of_birth", "gender", "ethnicity", "local_id_number", "placement_status", "summary_risk_level"])}
      ${renderArraySection("Legal Status", data?.legal_status || [], ["legal_status", "order_type", "order_details", "effective_from", "effective_to", "is_current"])}
      ${renderArraySection("Communication Profile", data?.communication_profile || [], ["neurodiversity_summary", "communication_style", "sensory_profile", "processing_needs", "signs_of_distress", "what_helps", "what_to_avoid", "routines_and_predictability", "visual_support_needs"])}
      ${renderArraySection("Identity Profile", data?.identity_profile || [], ["religion_or_faith", "cultural_identity", "first_language", "dietary_needs", "interests", "strengths_summary", "what_matters_to_me", "important_dates"])}
      ${renderArraySection("Alerts", data?.alerts || [], ["alert_type", "title", "description", "severity", "is_active", "review_date"])}
    `;
  } catch (error) {
    els.profileContent.innerHTML = `
      <div class="empty-state">
        Could not load profile.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadPlans(youngPersonId) {
  if (!els.plansContent) return;

  els.plansContent.innerHTML = `<div class="empty-state">Loading plans...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.plans(youngPersonId));
    const rows = normaliseArrayResponse(data);
    state.latestPlansData = rows;
    updateStickyYoungPersonBar();

    els.plansContent.innerHTML = renderArraySection("Support Plans", rows, [
      "status",
      "plan_type",
      "title",
      "presenting_need",
      "review_date",
      "approval_status",
      "owner_first_name",
      "created_at"
    ]);
  } catch (error) {
    els.plansContent.innerHTML = `
      <div class="empty-state">
        Could not load plans.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadRisk(youngPersonId) {
  if (!els.riskContent) return;

  els.riskContent.innerHTML = `<div class="empty-state">Loading risk...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.risk(youngPersonId));
    const rows = normaliseArrayResponse(data);
    state.latestRiskData = rows;
    updateStickyYoungPersonBar();

    els.riskContent.innerHTML = renderArraySection("Risk Assessments", rows, [
      "severity",
      "category",
      "title",
      "concern_summary",
      "review_date",
      "status",
      "approval_status",
      "owner_first_name"
    ]);
  } catch (error) {
    els.riskContent.innerHTML = `
      <div class="empty-state">
        Could not load risk.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadDailyNotes(youngPersonId) {
  if (!els.dailyNotesContent) return;

  els.dailyNotesContent.innerHTML = `<div class="empty-state">Loading daily notes...</div>`;
  renderDailyNoteSidebarContext();

  try {
    const data = await fetchFromCandidates(endpoints.daily_notes(youngPersonId));
    state.latestDailyNotesData = normaliseArrayResponse(data);

    renderDailyNotesListFromState();
    renderDailyNoteSidebarContext();

    if (!state.activeDailyNoteId) {
      createNewDailyNote({ quiet: true });
    }
  } catch (error) {
    els.dailyNotesContent.innerHTML = `
      <div class="empty-state">
        Could not load daily notes.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

function renderDailyNotesListFromState() {
  if (!els.dailyNotesContent) return;

  const statusFilter = els.dailyNoteStatusFilter ? els.dailyNoteStatusFilter.value : "all";
  const shiftFilter = els.dailyNoteShiftFilter ? els.dailyNoteShiftFilter.value : "all";
  const searchTerm = (els.dailyNoteSearch?.value || "").trim().toLowerCase();

  let rows = [...state.latestDailyNotesData];

  if (statusFilter !== "all") {
    rows = rows.filter((row) => String(row.workflow_status || "").toLowerCase() === statusFilter);
  }

  if (shiftFilter !== "all") {
    rows = rows.filter((row) => String(row.shift_type || "").toLowerCase() === shiftFilter);
  }

  if (searchTerm) {
    rows = rows.filter((row) => {
      const haystack = [
        row.note_date,
        row.shift_type,
        row.workflow_status,
        getDailyNoteField(row, ["what_happened", "presentation"]),
        getDailyNoteField(row, ["what_happened", "main_events"]),
        getDailyNoteField(row, ["what_happened", "positives"]),
        getDailyNoteField(row, ["young_person_voice", "voice"]),
        getDailyNoteField(row, ["follow_up", "actions_required"])
      ].join(" ").toLowerCase();

      return haystack.includes(searchTerm);
    });
  }

  if (!rows.length) {
    els.dailyNotesContent.innerHTML = `<div class="empty-state">No daily notes match the selected filters.</div>`;
    return;
  }

  els.dailyNotesContent.innerHTML = `
    <div class="daily-note-list">
      ${rows.map((row) => {
        const isActive = Number(state.activeDailyNoteId) === Number(row.id);
        const presentation = getDailyNoteField(row, ["what_happened", "presentation"]) || row.summary?.presentation || "—";
        const positives = getDailyNoteField(row, ["what_happened", "positives"]) || row.summary?.positives || "—";
        const voice = getDailyNoteField(row, ["young_person_voice", "voice"]) || row.summary?.young_person_voice || "—";

        return `
          <button
            class="record-card daily-note-card ${isActive ? "active" : ""}"
            type="button"
            data-note-id="${row.id}"
          >
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
              <p>${escapeHtml(trimForTable(stringifyValue(presentation), "presentation"))}</p>
            </div>

            <div class="record-card-section">
              <strong>Positive moments</strong>
              <p>${escapeHtml(trimForTable(stringifyValue(positives), "positives"))}</p>
            </div>

            <div class="record-card-section">
              <strong>Young person’s voice</strong>
              <p>${escapeHtml(trimForTable(stringifyValue(voice), "young_person_voice"))}</p>
            </div>
          </button>
        `;
      }).join("")}
    </div>
  `;

  els.dailyNotesContent.querySelectorAll("[data-note-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const noteId = Number(btn.dataset.noteId);
      await loadSingleDailyNote(noteId);
    });
  });
}

function createNewDailyNote(options = {}) {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  if (state.dailyNoteIsDirty && !options.quiet) {
    const proceed = window.confirm("You have unsaved changes. Start a new daily note anyway?");
    if (!proceed) return;
  }

  resetDailyNoteForm();
  prefillNewDailyNoteDefaults();
  renderDailyNoteSidebarContext();
  showStatus(options.quiet ? "Ready." : "New daily note ready.");
}

function prefillNewDailyNoteDefaults() {
  if (els.dailyNoteDate) {
    els.dailyNoteDate.value = toDateInputValue(new Date());
  }
  if (els.dailyNoteShiftType && !els.dailyNoteShiftType.value) {
    els.dailyNoteShiftType.value = "day";
  }
  setDailyNoteSaveIndicator("Not saved yet");
  setDailyNoteWorkflowIndicator("Draft");
}

function resetDailyNoteForm() {
  state.activeDailyNoteId = null;
  state.activeDailyNoteRecord = null;
  state.activeDailyNoteVersions = [];
  state.dailyNoteIsDirty = false;
  state.dailyNoteLanguageHints = [];
  clearTimeout(state.dailyNoteAutosaveTimer);

  if (els.dailyNoteForm) {
    els.dailyNoteForm.reset();
  }

  if (els.dailyNoteId) els.dailyNoteId.value = "";
  if (els.dailyNoteVersionNumber) els.dailyNoteVersionNumber.value = "";
  if (els.dailyNoteCurrentStatus) els.dailyNoteCurrentStatus.value = "draft";

  if (els.dailyNoteFormTitle) {
    els.dailyNoteFormTitle.textContent = "Create / Edit Daily Note";
  }

  setDailyNoteSaveIndicator("Not saved yet");
  setDailyNoteWorkflowIndicator("Draft");

  if (els.dailyNoteVersionHistory) {
    els.dailyNoteVersionHistory.innerHTML = `<div class="empty-state">Version history will appear here.</div>`;
  }

  renderTherapeuticLanguageHints([]);
}

async function clearDailyNoteFormWithPrompt() {
  if (state.dailyNoteIsDirty) {
    const proceed = window.confirm("You have unsaved changes. Clear this form?");
    if (!proceed) return;
  }
  createNewDailyNote();
}

async function loadSingleDailyNote(noteId) {
  if (!state.selectedYoungPerson) return;

  if (state.dailyNoteIsDirty && Number(state.activeDailyNoteId) !== Number(noteId)) {
    const proceed = window.confirm("You have unsaved changes. Open another daily note anyway?");
    if (!proceed) return;
  }

  try {
    setDailyNoteSaveIndicator("Loading...");
    const record = await fetchJson(
      endpoints.daily_note_single(state.selectedYoungPerson.id, noteId)
    );
    state.activeDailyNoteId = noteId;
    state.activeDailyNoteRecord = record;
    fillDailyNoteForm(record);
    await loadDailyNoteVersions(noteId);
    renderDailyNotesListFromState();
    renderDailyNoteSidebarContext();
    setDailyNoteSaveIndicator("Loaded");
    showStatus("Daily note loaded.");
  } catch (error) {
    console.error(error);
    showStatus(`Could not load daily note: ${error.message}`, true);
    setDailyNoteSaveIndicator("Load failed");
  }
}

function fillDailyNoteForm(record) {
  const content = record?.content_json || {};
  const basicContext = content.basic_context || {};
  const whatHappened = content.what_happened || {};
  const pace = content.pace || {};
  const voice = content.young_person_voice || {};
  const staffResponse = content.staff_response || {};
  const followUp = content.follow_up || {};
  const evidence = content.evidence || {};
  const reviewMeta = content.review_meta || {};

  state.dailyNoteIsDirty = false;

  if (els.dailyNoteFormTitle) {
    els.dailyNoteFormTitle.textContent = `Edit Daily Note #${record.id}`;
  }

  if (els.dailyNoteId) els.dailyNoteId.value = record.id || "";
  if (els.dailyNoteVersionNumber) els.dailyNoteVersionNumber.value = record.version_number || "";
  if (els.dailyNoteCurrentStatus) els.dailyNoteCurrentStatus.value = record.workflow_status || "draft";

  if (els.dailyNoteDate) els.dailyNoteDate.value = toDateInputValue(basicContext.note_date || record.note_date);
  if (els.dailyNoteShiftType) els.dailyNoteShiftType.value = basicContext.shift_type || record.shift_type || "day";
  if (els.dailyNoteCustomShift) els.dailyNoteCustomShift.value = basicContext.custom_shift_label || "";
  if (els.dailyNoteStaffOnShift) els.dailyNoteStaffOnShift.value = basicContext.staff_on_shift || "";
  if (els.dailyNoteLocation) els.dailyNoteLocation.value = basicContext.location || "";
  if (els.dailyNoteTags) els.dailyNoteTags.value = basicContext.tags || "";
  if (els.dailyNoteSignificantEvent) els.dailyNoteSignificantEvent.checked = Boolean(basicContext.significant_event || record.significant_event);
  if (els.dailyNoteManagerReviewRequired) els.dailyNoteManagerReviewRequired.checked = Boolean(basicContext.manager_review_required || record.manager_review_required);

  if (els.dailyNotePresentation) els.dailyNotePresentation.value = whatHappened.presentation || "";
  if (els.dailyNoteMainEvents) els.dailyNoteMainEvents.value = whatHappened.main_events || "";
  if (els.dailyNoteRoutineEngagement) els.dailyNoteRoutineEngagement.value = whatHappened.routine_engagement || "";
  if (els.dailyNoteEducationUpdate) els.dailyNoteEducationUpdate.value = whatHappened.education_update || "";
  if (els.dailyNoteHealthUpdate) els.dailyNoteHealthUpdate.value = whatHappened.health_update || "";
  if (els.dailyNoteFamilyUpdate) els.dailyNoteFamilyUpdate.value = whatHappened.family_update || "";
  if (els.dailyNoteWorries) els.dailyNoteWorries.value = whatHappened.worries || "";
  if (els.dailyNotePositives) els.dailyNotePositives.value = whatHappened.positives || "";

  if (els.dailyNotePacePlayfulnessStatus) els.dailyNotePacePlayfulnessStatus.value = pace?.playfulness?.status || "not_used";
  if (els.dailyNotePacePlayfulness) els.dailyNotePacePlayfulness.value = pace?.playfulness?.reflection || "";
  if (els.dailyNotePaceAcceptanceStatus) els.dailyNotePaceAcceptanceStatus.value = pace?.acceptance?.status || "not_evident";
  if (els.dailyNotePaceAcceptance) els.dailyNotePaceAcceptance.value = pace?.acceptance?.reflection || "";
  if (els.dailyNotePaceCuriosityTags) els.dailyNotePaceCuriosityTags.value = Array.isArray(pace?.curiosity?.tags) ? pace.curiosity.tags.join(", ") : "";
  if (els.dailyNotePaceCuriosity) els.dailyNotePaceCuriosity.value = pace?.curiosity?.reflection || "";
  if (els.dailyNotePaceEmpathyTags) els.dailyNotePaceEmpathyTags.value = Array.isArray(pace?.empathy?.tags) ? pace.empathy.tags.join(", ") : "";
  if (els.dailyNotePaceEmpathy) els.dailyNotePaceEmpathy.value = pace?.empathy?.reflection || "";

  if (els.dailyNoteYoungPersonVoice) els.dailyNoteYoungPersonVoice.value = voice.voice || "";
  if (els.dailyNoteCommunicationStyle) els.dailyNoteCommunicationStyle.value = voice.communication_style || "";

  if (els.dailyNoteStaffResponse) els.dailyNoteStaffResponse.value = staffResponse.staff_response || "";
  if (els.dailyNoteWhatHelped) els.dailyNoteWhatHelped.value = staffResponse.what_helped || "";
  if (els.dailyNoteWhatDidNotHelp) els.dailyNoteWhatDidNotHelp.value = staffResponse.what_did_not_help || "";
  if (els.dailyNoteImpact) els.dailyNoteImpact.value = staffResponse.impact || "";

  if (els.dailyNoteActionsRequired) els.dailyNoteActionsRequired.value = followUp.actions_required || "";
  if (els.dailyNoteDiscussInHandover) els.dailyNoteDiscussInHandover.checked = Boolean(followUp.discuss_in_handover);
  if (els.dailyNoteUpdateRiskAssessment) els.dailyNoteUpdateRiskAssessment.checked = Boolean(followUp.update_risk_assessment);
  if (els.dailyNoteLinkMonthlyReview) els.dailyNoteLinkMonthlyReview.checked = Boolean(followUp.link_monthly_review);

  if (els.dailyNoteLinkedStandards) els.dailyNoteLinkedStandards.value = Array.isArray(evidence.linked_standards) ? evidence.linked_standards.join(", ") : "";
  if (els.dailyNoteLinkedRisks) els.dailyNoteLinkedRisks.value = Array.isArray(evidence.linked_risks) ? evidence.linked_risks.join(", ") : "";
  if (els.dailyNoteLinkedPlans) els.dailyNoteLinkedPlans.value = Array.isArray(evidence.linked_plans) ? evidence.linked_plans.join(", ") : "";
  if (els.dailyNoteEvidenceImpactStatement) els.dailyNoteEvidenceImpactStatement.value = evidence.impact_statement || "";

  if (els.dailyNoteChangeReason) els.dailyNoteChangeReason.value = reviewMeta.change_reason || record.change_reason || "";
  if (els.dailyNoteManagerReviewComment) els.dailyNoteManagerReviewComment.value = reviewMeta.manager_review_comment || record.manager_review_comment || "";

  setDailyNoteWorkflowIndicator(record.workflow_status || "draft");
  setDailyNoteSaveIndicator("Loaded");
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
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  const payload = collectDailyNotePayload();

  if (!payload.note_date) {
    showStatus("Daily note date is required.", true);
    return;
  }

  if (!payload.shift_type) {
    showStatus("Shift type is required.", true);
    return;
  }

  setDailyNoteSaveIndicator(options.autosave ? "Autosaving..." : "Saving...");

  try {
    let result = null;
    const noteId = cleanValue(els.dailyNoteId?.value);

    if (noteId) {
      result = await fetchJson(
        endpoints.daily_note_update(state.selectedYoungPerson.id, noteId),
        {
          method: "PUT",
          body: JSON.stringify({
            ...payload,
            edited_by: 1,
            save_as: saveAs === "completed" ? "completed" : "draft"
          })
        }
      );
    } else {
      result = await fetchJson(
        endpoints.daily_note_create(state.selectedYoungPerson.id),
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            save_as: saveAs === "completed" ? "completed" : "draft"
          })
        }
      );
    }

    state.dailyNoteIsDirty = false;
    state.dailyNoteLastSavedAt = new Date();

    if (result?.therapeutic_language_suggestions) {
      renderTherapeuticLanguageHints(result.therapeutic_language_suggestions);
    }

    setDailyNoteSaveIndicator(
      options.autosave
        ? `Autosaved ${formatTimeOnly(state.dailyNoteLastSavedAt)}`
        : `Saved ${formatTimeOnly(state.dailyNoteLastSavedAt)}`
    );

    if (!options.silent) {
      showStatus(saveAs === "completed" ? "Daily note completed." : "Daily note saved.");
    }

    await loadDailyNotes(state.selectedYoungPerson.id);

    if (result?.daily_note_id) {
      await loadSingleDailyNote(result.daily_note_id);
    }

    await loadActionBarData();
  } catch (error) {
    console.error(error);
    setDailyNoteSaveIndicator("Save failed");
    if (!options.silent) {
      showStatus(`Could not save daily note: ${error.message}`, true);
    }
    throw error;
  }
}

async function markDailyNoteReviewed() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  const noteId = cleanValue(els.dailyNoteId?.value);
  if (!noteId) {
    showStatus("Please open or save a daily note before marking it reviewed.", true);
    return;
  }

  try {
    await fetchJson(
      endpoints.daily_note_review(state.selectedYoungPerson.id, noteId),
      {
        method: "POST",
        body: JSON.stringify({
          reviewed_by: 1,
          manager_review_comment: cleanValue(els.dailyNoteManagerReviewComment?.value),
          mark_as: "reviewed"
        })
      }
    );

    showStatus("Daily note marked as reviewed.");
    await loadDailyNotes(state.selectedYoungPerson.id);
    await loadSingleDailyNote(Number(noteId));
    await loadActionBarData();
  } catch (error) {
    console.error(error);
    showStatus(`Could not mark daily note reviewed: ${error.message}`, true);
  }
}

async function loadDailyNoteVersions(noteId) {
  if (!state.selectedYoungPerson || !noteId) return;

  try {
    const versions = await fetchJson(
      endpoints.daily_note_versions(state.selectedYoungPerson.id, noteId)
    );
    state.activeDailyNoteVersions = normaliseArrayResponse(versions);
    renderDailyNoteVersionHistory();
  } catch (error) {
    console.error(error);
    if (els.dailyNoteVersionHistory) {
      els.dailyNoteVersionHistory.innerHTML = `
        <div class="empty-state">
          Could not load version history.
          <br />
          <small>${escapeHtml(error.message)}</small>
        </div>
      `;
    }
  }
}

function renderDailyNoteVersionHistory() {
  if (!els.dailyNoteVersionHistory) return;

  const rows = state.activeDailyNoteVersions || [];
  if (!rows.length) {
    els.dailyNoteVersionHistory.innerHTML = `<div class="empty-state">Version history will appear here.</div>`;
    return;
  }

  els.dailyNoteVersionHistory.innerHTML = `
    <div class="version-history-list">
      ${rows.map((row) => `
        <button
          type="button"
          class="version-history-item"
          data-version-id="${row.id}"
        >
          <div class="version-history-top">
            <strong>Version ${escapeHtml(String(row.version_number || 1))}</strong>
            <span>${renderWorkflowPill(row.workflow_status)}</span>
          </div>
          <div class="version-history-meta">
            <span>${escapeHtml(row.edited_by_name || "Unknown user")}</span>
            <span>${escapeHtml(formatDateTime(row.edited_at))}</span>
          </div>
          <div class="version-history-reason">
            ${escapeHtml(row.change_reason || "No reason recorded")}
          </div>
        </button>
      `).join("")}
    </div>
  `;

  els.dailyNoteVersionHistory.querySelectorAll("[data-version-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const versionId = Number(btn.dataset.versionId);
      const version = rows.find((row) => Number(row.id) === versionId);
      if (version) {
        openRecordDrawer("Daily Note Version", version);
      }
    });
  });
}

function renderDailyNoteSidebarContext() {
  renderDailyNoteSidebarTodayInfo();
  renderDailyNoteSidebarRisks();
  renderDailyNoteSidebarActions();
}

function renderDailyNoteSidebarTodayInfo() {
  if (!els.dailyNoteSidebarTodayInfo) return;

  const profile = state.latestProfileData || {};
  const alerts = Array.isArray(profile?.alerts) ? profile.alerts : [];
  const activePlans = state.latestPlansData.filter((row) => String(row.status || "").toLowerCase() === "active");

  els.dailyNoteSidebarTodayInfo.innerHTML = `
    <div class="support-lines">
      <div><strong>Alerts:</strong> ${alerts.length ? escapeHtml(alerts.map((a) => a.title || a.description).slice(0, 3).join(" • ")) : "None recorded"}</div>
      <div><strong>Active plans:</strong> ${activePlans.length}</div>
      <div><strong>Placement status:</strong> ${escapeHtml(stringifyValue(state.selectedYoungPerson?.placement_status))}</div>
      <div><strong>Risk level:</strong> ${escapeHtml(stringifyValue(state.selectedYoungPerson?.summary_risk_level))}</div>
    </div>
  `;
}

function renderDailyNoteSidebarRisks() {
  if (!els.dailyNoteSidebarRisks) return;

  const risks = state.latestRiskData || [];

  if (!risks.length) {
    els.dailyNoteSidebarRisks.innerHTML = `<div class="empty-state">No current risks loaded.</div>`;
    return;
  }

  els.dailyNoteSidebarRisks.innerHTML = `
    <ul class="support-list">
      ${risks.slice(0, 6).map((risk) => `
        <li>
          <strong>${escapeHtml(stringifyValue(risk.title || risk.category))}</strong>
          <div>${escapeHtml(stringifyValue(risk.concern_summary || risk.category))}</div>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderDailyNoteSidebarActions() {
  if (!els.dailyNoteSidebarActions) return;

  const complianceItems = Array.isArray(state.latestComplianceData?.compliance_items)
    ? state.latestComplianceData.compliance_items
    : [];
  const liveItems = complianceItems.filter((item) => item.compliance_status !== "ok");

  if (!liveItems.length) {
    els.dailyNoteSidebarActions.innerHTML = `<div class="empty-state">No active actions loaded.</div>`;
    return;
  }

  els.dailyNoteSidebarActions.innerHTML = `
    <ul class="support-list">
      ${liveItems.slice(0, 6).map((item) => `
        <li>
          <strong>${escapeHtml(stringifyValue(item.title))}</strong>
          <div>${escapeHtml(formatComplianceGroupTitle(item.compliance_type))} • ${escapeHtml(formatDate(item.due_date))}</div>
        </li>
      `).join("")}
    </ul>
  `;
}

async function maybeRunTherapeuticLanguageCheck() {
  const fields = [
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

  if (!fields.length) {
    renderTherapeuticLanguageHints([]);
    return;
  }

  clearTimeout(maybeRunTherapeuticLanguageCheck.timer);
  maybeRunTherapeuticLanguageCheck.timer = setTimeout(async () => {
    try {
      const result = await fetchJson(endpoints.daily_note_therapeutic_language_check, {
        method: "POST",
        body: JSON.stringify({
          text_fields: fields
        })
      });
      renderTherapeuticLanguageHints(result?.suggestions || []);
    } catch (_error) {
      // soft feature - ignore quietly
    }
  }, 500);
}

function renderTherapeuticLanguageHints(suggestions) {
  state.dailyNoteLanguageHints = suggestions || [];

  if (!els.therapeuticLanguageHints) return;

  if (!state.dailyNoteLanguageHints.length) {
    els.therapeuticLanguageHints.innerHTML = `
      <p class="muted-copy">No wording prompts at the moment.</p>
      <ul class="support-list">
        <li><strong>Try:</strong> clear, kind, factual recording</li>
        <li><strong>Use:</strong> curiosity, empathy and child-centred language</li>
      </ul>
    `;
    return;
  }

  els.therapeuticLanguageHints.innerHTML = `
    <p class="muted-copy">Suggested therapeutic wording:</p>
    <ul class="support-list">
      ${state.dailyNoteLanguageHints.map((item) => `
        <li>
          <strong>Try:</strong> ${escapeHtml(item.suggestion)}
          <div>${escapeHtml(item.reason || "")}</div>
        </li>
      `).join("")}
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

async function loadIncidents(youngPersonId) {
  if (!els.incidentsContent) return;

  els.incidentsContent.innerHTML = `<div class="empty-state">Loading incidents...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.incidents(youngPersonId));
    const rows = normaliseArrayResponse(data);
    state.latestIncidentsData = rows;

    els.incidentsContent.innerHTML = renderArraySection("Incidents", rows, [
      "incident_datetime",
      "incident_type",
      "severity",
      "location",
      "description",
      "manager_review_status",
      "follow_up_required",
      "staff_first_name"
    ]);
  } catch (error) {
    els.incidentsContent.innerHTML = `
      <div class="empty-state">
        Could not load incidents.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadHealth(youngPersonId) {
  if (!els.healthContent) return;

  els.healthContent.innerHTML = `<div class="empty-state">Loading health...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.health(youngPersonId));

    els.healthContent.innerHTML = `
      ${renderArraySection("Health Profile", data?.health_profile || [], ["gp_name", "gp_contact", "dentist_name", "dentist_contact", "optician_name", "optician_contact", "allergies", "diagnoses", "mental_health_summary", "medication_summary", "consent_notes"])}
      ${renderArraySection("Health Records", data?.health_records || [], ["event_datetime", "record_type", "title", "summary", "professional_name", "outcome", "follow_up_required", "next_action_date"])}
      ${renderArraySection("Medication Profiles", data?.medication_profiles || [], ["medication_name", "dosage", "route", "frequency", "prescribed_by", "start_date", "end_date", "is_active", "notes"])}
      ${renderArraySection("Medication Records", data?.medication_records || [], ["scheduled_time", "administered_time", "medication_name", "dose", "route", "status", "error_flag", "administered_by_first_name"])}
    `;
  } catch (error) {
    els.healthContent.innerHTML = `
      <div class="empty-state">
        Could not load health.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadEducation(youngPersonId) {
  if (!els.educationContent) return;

  els.educationContent.innerHTML = `<div class="empty-state">Loading education...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.education(youngPersonId));

    els.educationContent.innerHTML = `
      ${renderArraySection("Education Profile", data?.education_profile || [], ["school_name", "year_group", "education_status", "sen_status", "ehcp_details", "designated_teacher", "attendance_baseline", "pep_status", "support_summary"])}
      ${renderArraySection("Education Records", data?.education_records || [], ["record_date", "attendance_status", "provision_name", "behaviour_summary", "learning_engagement", "issue_raised", "action_taken", "professional_involved", "achievement_note"])}
    `;
  } catch (error) {
    els.educationContent.innerHTML = `
      <div class="empty-state">
        Could not load education.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadFamily(youngPersonId) {
  if (!els.familyContent) return;

  els.familyContent.innerHTML = `<div class="empty-state">Loading family...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.family(youngPersonId));

    els.familyContent.innerHTML = `
      ${renderArraySection("Contacts", data?.contacts || [], ["contact_type", "full_name", "relationship_to_young_person", "phone", "email", "is_parental_responsibility_holder", "is_approved_contact", "is_restricted_contact", "supervision_level"])}
      ${renderArraySection("Family Contact Records", data?.family_contact_records || [], ["contact_datetime", "contact_type", "contact_person", "supervision_level", "location", "pre_contact_presentation", "post_contact_presentation", "child_voice", "concerns", "follow_up_required"])}
    `;
  } catch (error) {
    els.familyContent.innerHTML = `
      <div class="empty-state">
        Could not load family.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadChronology(youngPersonId) {
  if (!els.chronologyContent) return;

  els.chronologyContent.innerHTML = `<div class="empty-state">Loading chronology...</div>`;

  try {
    const data = await fetchJson(endpoints.chronologyList(youngPersonId));
    const rows = normaliseArrayResponse(data);

    els.chronologyContent.innerHTML = renderTableSection("Chronology", rows, [
      "event_datetime",
      "category",
      "subcategory",
      "title",
      "summary",
      "significance",
      "source_table"
    ], true);

    bindOpenRecordButtons();
  } catch (error) {
    console.error(error);
    els.chronologyContent.innerHTML = `
      <div class="empty-state">
        Could not load chronology.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadMonthlyReviews(youngPersonId) {
  if (!els.monthlyReviewsList) return;

  els.monthlyReviewsList.innerHTML = `<div class="empty-state">Loading monthly reviews...</div>`;

  try {
    const rows = await fetchJson(endpoints.monthlyReviewsList(youngPersonId));

    if (!rows || !rows.length) {
      els.monthlyReviewsList.innerHTML = `<div class="empty-state">No monthly reviews yet.</div>`;
      if (els.monthlyReviewDetail) {
        els.monthlyReviewDetail.innerHTML = `<div class="empty-state">Select a review to view details.</div>`;
      }
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
                <td>
                  <button class="text-link-btn js-open-monthly-review" data-review-id="${r.id}">Open</button>
                </td>
                <td>
                  <button
                    class="text-link-btn js-open-ofsted-ai-report"
                    data-review-month="${escapeHtml(formatMonthApiValue(r.review_month))}"
                  >
                    View AI Report
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    bindMonthlyReviewButtons();
  } catch (error) {
    console.error(error);
    els.monthlyReviewsList.innerHTML = `
      <div class="empty-state">
        Could not load monthly reviews.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

function bindMonthlyReviewButtons() {
  document.querySelectorAll(".js-open-monthly-review").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reviewId = Number(btn.dataset.reviewId);
      await loadMonthlyReviewDetail(reviewId);
    });
  });

  document.querySelectorAll(".js-open-ofsted-ai-report").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reviewMonth = btn.dataset.reviewMonth || "";
      await loadOfstedAiReport(reviewMonth);
    });
  });
}

async function loadMonthlyReviewDetail(reviewId) {
  if (!els.monthlyReviewDetail) return;

  els.monthlyReviewDetail.innerHTML = `<div class="empty-state">Loading review...</div>`;

  try {
    const data = await fetchJson(endpoints.monthlyReviewDetail(reviewId));
    const review = data?.review || {};
    const links = data?.record_links || [];
    const standards = data?.standards || [];
    const actions = data?.actions || [];

    els.monthlyReviewDetail.innerHTML = `
      ${renderObjectSection("Review Summary", review, [
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
      ])}

      ${renderArraySection("Linked Evidence", links, [
        "source_table",
        "source_id",
        "link_reason",
        "created_at"
      ])}

      ${renderArraySection("Standards Summary", standards, [
        "standard_code",
        "standard_short_label",
        "evidence_count",
        "narrative_summary"
      ])}

      ${renderArraySection("Actions", actions, [
        "action_text",
        "action_owner_id",
        "due_date",
        "status"
      ])}
    `;
  } catch (error) {
    console.error(error);
    els.monthlyReviewDetail.innerHTML = `
      <div class="empty-state">
        Could not load review.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function generateMonthlyReview() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  if (!els.monthlyReviewMonth || !els.monthlyReviewMonth.value) {
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
      await loadMonthlyReviewDetail(result.monthly_review_id);
      await loadOfstedAiReport(reviewMonth);
    }
  } catch (error) {
    console.error(error);
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
    const report = await fetchJson(
      endpoints.ofstedAiReport(state.selectedYoungPerson.id, reviewMonth)
    );

    openRecordDrawer("AI OFSTED Inspection Report", report);
    showStatus("AI OFSTED report loaded.");
  } catch (error) {
    console.error(error);
    showStatus(`Could not load AI OFSTED report: ${error.message}`, true);
  }
}

async function loadStandards(youngPersonId) {
  if (!els.standardsSummary || !els.standardsEvidenceList) return;

  els.standardsSummary.innerHTML = `<div class="empty-state">Loading standards...</div>`;
  els.standardsEvidenceList.innerHTML = `<div class="empty-state">Loading evidence...</div>`;

  try {
    const summary = await fetchFromCandidates(endpoints.standardsSummary(youngPersonId));
    const evidence = await fetchFromCandidates(endpoints.standardsEvidence(youngPersonId));

    renderStandardsSummary(summary);
    renderStandardsEvidence(evidence);
  } catch (error) {
    els.standardsSummary.innerHTML = `
      <div class="empty-state">
        Could not load standards evidence.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
    els.standardsEvidenceList.innerHTML = `<div class="empty-state">No evidence loaded.</div>`;
  }
}

function renderStandardsSummary(rows) {
  if (!rows || !rows.length) {
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
            let statusClass = "status-green";
            if (Number(row.linked_record_count) < 3) statusClass = "status-amber";
            if (Number(row.linked_record_count) === 0) statusClass = "status-red";

            return `
              <tr>
                <td><strong>${escapeHtml(row.code)}</strong></td>
                <td>${escapeHtml(row.short_label)}</td>
                <td><span class="status-pill ${statusClass}">${escapeHtml(String(row.linked_record_count))}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStandardsEvidence(rows) {
  if (!rows || !rows.length) {
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

async function loadCompliance(youngPersonId) {
  if (!els.complianceContent) return;

  els.complianceContent.innerHTML = `<div class="empty-state">Loading compliance...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.compliance(youngPersonId));
    state.latestComplianceData = data;

    if (state.jumpComplianceFilter !== "all" && els.complianceStatusFilter) {
      els.complianceStatusFilter.value = state.jumpComplianceFilter;
      state.jumpComplianceFilter = "all";
    }

    rerenderComplianceFromState();
  } catch (error) {
    els.complianceContent.innerHTML = `
      <div class="empty-state">
        Could not load compliance.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

function rerenderComplianceFromState() {
  if (!els.complianceContent) return;

  const data = state.latestComplianceData;
  if (!data) {
    els.complianceContent.innerHTML = `<div class="empty-state">No compliance data found.</div>`;
    return;
  }

  const statusFilter = els.complianceStatusFilter ? els.complianceStatusFilter.value : "all";
  const categoryFilter = els.complianceCategoryFilter ? els.complianceCategoryFilter.value : "all";

  let complianceItems = Array.isArray(data.compliance_items) ? data.compliance_items : [];
  const activeAlerts = Array.isArray(data.active_alerts) ? data.active_alerts : [];

  if (statusFilter !== "all") {
    complianceItems = complianceItems.filter((item) => item.compliance_status === statusFilter);
  }

  if (categoryFilter !== "all") {
    complianceItems = complianceItems.filter((item) => item.compliance_type === categoryFilter);
  }

  const grouped = groupBy(complianceItems, "compliance_type");

  els.complianceContent.innerHTML = `
    ${renderComplianceSummaryStrip(complianceItems, activeAlerts)}
    ${Object.keys(grouped).length
      ? Object.entries(grouped).map(([groupName, rows]) => renderComplianceGroup(groupName, rows)).join("")
      : `<div class="empty-state">No compliance items match the selected filters.</div>`
    }
    ${renderArraySection("Active Alerts", activeAlerts, ["alert_type", "title", "description", "severity", "review_date"])}
  `;

  bindOpenRecordButtons();
}

function renderComplianceSummaryStrip(items, alerts) {
  const overdue = items.filter((item) => item.compliance_status === "overdue").length;
  const dueSoon = items.filter((item) => item.compliance_status === "due_soon").length;
  const ok = items.filter((item) => item.compliance_status === "ok").length;

  return `
    <div class="overview-grid">
      <div class="overview-tile">
        <h4>Overdue</h4>
        <p>${overdue}</p>
      </div>
      <div class="overview-tile">
        <h4>Due Soon</h4>
        <p>${dueSoon}</p>
      </div>
      <div class="overview-tile">
        <h4>Current</h4>
        <p>${ok}</p>
      </div>
      <div class="overview-tile">
        <h4>Active Alerts</h4>
        <p>${alerts.length}</p>
      </div>
    </div>
  `;
}

function renderComplianceGroup(groupName, rows) {
  const columns = [
    { key: "compliance_status", label: "Status" },
    { key: "title", label: "Title" },
    { key: "due_date", label: "Due Date" },
    { key: "status", label: "Record Status" },
    { key: "approval_status", label: "Approval" },
    { key: "created_at", label: "Created" }
  ];

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(formatComplianceGroupTitle(groupName))}</h3>
      <div class="section-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${columns.map((col) => `
                  <td>${renderTableCell(col.key, row[col.key])}</td>
                `).join("")}
                <td>
                  <button class="text-link-btn js-open-record" data-record='${escapeHtml(JSON.stringify(row))}'>View</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function loadKeyworkSessions(youngPersonId) {
  if (!els.keyworkList) return;

  els.keyworkList.innerHTML = `<div class="empty-state">Loading key work sessions...</div>`;

  try {
    const data = await fetchJson(endpoints.keyworkList(youngPersonId));
    state.keyworkSessions = normaliseArrayResponse(data);
    renderKeyworkList();
  } catch (error) {
    console.error(error);
    els.keyworkList.innerHTML = `
      <div class="empty-state">
        Could not load key work sessions.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

function renderKeyworkList() {
  if (!els.keyworkList) return;

  const rows = state.keyworkSessions;

  if (!rows.length) {
    els.keyworkList.innerHTML = `<div class="empty-state">No key work sessions found.</div>`;
    return;
  }

  els.keyworkList.innerHTML = renderTableSection("Key Work Sessions", rows, [
    "session_date",
    "topic",
    "worker_first_name",
    "summary",
    "next_session_date"
  ], true);

  bindOpenRecordButtons();
  bindKeyworkRowSelection();
}

function bindKeyworkRowSelection() {
  if (!els.keyworkList) return;

  els.keyworkList.querySelectorAll(".js-keywork-row").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sessionId = Number(btn.dataset.sessionId);
      await loadSingleKeyworkSession(sessionId);
    });
  });
}

async function loadSingleKeyworkSession(sessionId) {
  try {
    const session = await fetchJson(endpoints.keyworkById(sessionId));
    state.activeKeyworkSessionId = session.id;
    fillKeyworkForm(session);
    openRecordDrawer("Key Work Session", session);
    renderKeyworkList();
  } catch (error) {
    console.error(error);
    showStatus(`Could not load key work session: ${error.message}`, true);
  }
}

function fillKeyworkForm(session) {
  if (els.keyworkFormTitle) els.keyworkFormTitle.textContent = `Edit Key Work Session #${session.id}`;
  if (els.keyworkSessionId) els.keyworkSessionId.value = session.id || "";
  if (els.sessionDate) els.sessionDate.value = toDateInputValue(session.session_date);
  if (els.workerId) els.workerId.value = session.worker_id ?? "";
  if (els.topic) els.topic.value = session.topic ?? "";
  if (els.purpose) els.purpose.value = session.purpose ?? "";
  if (els.summary) els.summary.value = session.summary ?? "";
  if (els.childVoice) els.childVoice.value = session.child_voice ?? "";
  if (els.reflectiveAnalysis) els.reflectiveAnalysis.value = session.reflective_analysis ?? "";
  if (els.actionsAgreed) els.actionsAgreed.value = session.actions_agreed ?? "";
  if (els.nextSessionDate) els.nextSessionDate.value = toDateInputValue(session.next_session_date);
}

function resetKeyworkForm() {
  state.activeKeyworkSessionId = null;
  if (els.keyworkForm) els.keyworkForm.reset();
  if (els.keyworkSessionId) els.keyworkSessionId.value = "";
  if (els.keyworkFormTitle) els.keyworkFormTitle.textContent = "Create / Edit Key Work Session";
}

async function saveKeyworkSession(event) {
  event.preventDefault();

  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  const sessionId = els.keyworkSessionId ? els.keyworkSessionId.value.trim() : "";

  const payload = {
    young_person_id: Number(state.selectedYoungPerson.id),
    session_date: els.sessionDate ? els.sessionDate.value || null : null,
    worker_id: parseNullableInt(els.workerId ? els.workerId.value : ""),
    topic: cleanValue(els.topic ? els.topic.value : ""),
    purpose: cleanValue(els.purpose ? els.purpose.value : ""),
    summary: cleanValue(els.summary ? els.summary.value : ""),
    child_voice: cleanValue(els.childVoice ? els.childVoice.value : ""),
    reflective_analysis: cleanValue(els.reflectiveAnalysis ? els.reflectiveAnalysis.value : ""),
    actions_agreed: cleanValue(els.actionsAgreed ? els.actionsAgreed.value : ""),
    next_session_date: cleanValue(els.nextSessionDate ? els.nextSessionDate.value : "")
  };

  if (!payload.session_date || !payload.topic) {
    showStatus("Session date and topic are required.", true);
    return;
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
    console.error(error);
    showStatus(`Could not save key work session: ${error.message}`, true);
  }
}

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
    console.error(error);
    showStatus(`Could not rebuild chronology: ${error.message}`, true);
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
    console.error(error);
    showStatus(`Could not rebuild standards links: ${error.message}`, true);
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
    console.error(error);
    showStatus(`Could not create inspection pack job: ${error.message}`, true);
  }
}

function renderGroupedKeyValueSection(title, source, keys) {
  const presentKeys = keys.filter((key) => hasValue(source[key]));

  if (!presentKeys.length) {
    return "";
  }

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      <div class="section-table-wrap">
        <table class="data-table key-value compact">
          <tbody>
            ${presentKeys.map((key) => `
              <tr>
                <th>${escapeHtml(formatLabel(key))}</th>
                <td>${escapeHtml(formatFieldValue(key, source[key]))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
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
        <table class="data-table key-value compact">
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
  if (!rows || !rows.length) {
    return `<div class="empty-state">No records found.</div>`;
  }

  const columns = (preferredColumns && preferredColumns.length)
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
  if (key === "compliance_status") {
    return renderStatusPill(value);
  }

  if (key === "severity") {
    return renderSeverityPill(value);
  }

  if (key === "workflow_status") {
    return renderWorkflowPill(value);
  }

  if (key === "status" && typeof value === "string") {
    return renderStatusPill(value);
  }

  return escapeHtml(trimForTable(formatFieldValue(key, value), key));
}

function renderStatusPill(value) {
  const label = stringifyValue(value);
  const cls = statusColour(value);
  return `<span class="status-pill ${cls}">${escapeHtml(label)}</span>`;
}

function renderSeverityPill(value) {
  const lower = String(value || "").toLowerCase();
  let cls = "status-grey";

  if (lower === "high") cls = "status-red";
  else if (lower === "medium") cls = "status-amber";
  else if (lower === "low") cls = "status-green";

  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

function renderWorkflowPill(value) {
  const lower = String(value || "").toLowerCase();
  let cls = "status-grey";

  if (lower === "reviewed" || lower === "approved") cls = "status-green";
  else if (lower === "submitted" || lower === "completed" || lower === "amended") cls = "status-blue";
  else if (lower === "returned") cls = "status-red";
  else if (lower === "draft") cls = "status-grey";

  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

function bindOpenRecordButtons() {
  document.querySelectorAll(".js-open-record").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        const record = JSON.parse(unescapeHtml(btn.dataset.record));
        openRecordDrawer("Record Detail", record);
      } catch (_err) {}
    });
  });
}

function openRecordDrawer(title, record) {
  if (!els.recordDetailDrawer || !els.recordDetailContent) return;

  els.recordDetailDrawer.classList.remove("hidden");
  els.recordDetailContent.innerHTML = renderDrawerContent(title, record);
}

function renderDrawerContent(title, record) {
  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      ${renderDrawerValue(record)}
    </section>
  `;
}

function renderDrawerValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) {
      return `<div class="empty-state">No data found.</div>`;
    }

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
    return `
      <div class="drawer-nested-list">
        ${value.map((item, index) => `
          <div class="drawer-nested-item">
            <strong>Item ${index + 1}</strong>
            ${renderDrawerValue(item)}
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

function closeRecordDrawer() {
  if (!els.recordDetailDrawer || !els.recordDetailContent) return;
  els.recordDetailDrawer.classList.add("hidden");
  els.recordDetailContent.innerHTML = "";
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
  const map = {
    support_plan_review: "Support Plan Reviews",
    risk_review: "Risk Reviews",
    keywork_follow_up: "Key Work Follow-up",
    health_follow_up: "Health Follow-up",
    family_follow_up: "Family Follow-up",
    daily_note_follow_up: "Daily Note Follow-up"
  };
  return map[value] || formatLabel(value);
}

function getFullName(person) {
  const preferred = person.preferred_name ? ` (${person.preferred_name})` : "";
  const name = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  return name ? `${name}${preferred}` : `Young Person #${person.id}`;
}

function getInitials(person) {
  const parts = [person?.first_name, person?.last_name].filter(Boolean);
  if (!parts.length) return "YP";
  return parts.map((part) => String(part).charAt(0).toUpperCase()).slice(0, 2).join("");
}

function setText(el, value) {
  if (el) el.textContent = String(value);
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
  const max = [
    "summary",
    "description",
    "presenting_need",
    "concern_summary",
    "positives",
    "actions_required",
    "what_matters_to_me",
    "rationale",
    "presentation",
    "young_person_voice"
  ].includes(key)
    ? 80
    : 48;

  return value.length > max ? `${value.slice(0, max)}...` : value;
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

function formatFieldValue(key, value) {
  if (!hasValue(value)) return "—";

  const dateKeys = [
    "date_of_birth",
    "created_at",
    "updated_at",
    "event_datetime",
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
    "generated_at",
    "last_edited_at",
    "edited_at"
  ];

  if (dateKeys.includes(key)) {
    if (
      key === "date_of_birth" ||
      key === "session_date" ||
      key === "note_date" ||
      key === "record_date" ||
      key === "admission_date" ||
      key === "discharge_date" ||
      key === "review_date" ||
      key === "review_month" ||
      key === "start_date" ||
      key === "next_session_date" ||
      key === "effective_from" ||
      key === "effective_to" ||
      key === "next_action_date" ||
      key === "due_date"
    ) {
      return formatDate(value);
    }

    return formatDateTime(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return stringifyValue(value);
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

function formatTimeOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMonthApiValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function statusColour(value) {
  const lower = String(value || "").toLowerCase();

  if (lower === "overdue" || lower === "high" || lower === "returned") return "status-red";
  if (lower === "due_soon" || lower === "medium" || lower === "pending") return "status-amber";
  if (lower === "ok" || lower === "active" || lower === "approved" || lower === "reviewed" || lower === "complete" || lower === "open") return "status-green";
  if (lower === "submitted" || lower === "completed" || lower === "amended" || lower === "info") return "status-blue";

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
