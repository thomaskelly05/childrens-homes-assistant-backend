const state = {
  youngPeople: [],
  filteredYoungPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview",
  activeSectionTabs: {
    plans: "records",
    risk: "records",
    daily_notes: "records",
    incidents: "records",
    keywork: "records"
  },
  latest: {
    overview: null, profile: null, plans: [], risk: [], dailyNotes: [], incidents: [],
    health: null, education: null, family: null, chronology: [], monthlyReviews: [],
    standardsSummary: [], standardsEvidence: [], compliance: null, keywork: []
  }
};

const endpoints = {
  youngPeopleList: ["/young-people", "/young-people/list"],
  overview: (id) => [`/young-people/${id}`],
  profile: (id) => [`/young-people/${id}/profile`],
  plans: (id) => [`/young-people/${id}/plans`],
  risk: (id) => [`/young-people/${id}/risk`],
  dailyNotes: (id) => [`/young-people/${id}/daily-notes`],
  incidents: (id) => [`/young-people/${id}/incidents`],
  health: (id) => [`/young-people/${id}/health`],
  education: (id) => [`/young-people/${id}/education`],
  family: (id) => [`/young-people/${id}/family`],
  compliance: (id) => [`/young-people/${id}/compliance`],
  chronology: (id) => `/young-people/${id}/chronology`,
  chronologyRebuild: (id) => `/young-people/${id}/chronology/rebuild`,
  keywork: (id) => `/young-people/${id}/keywork`,
  keyworkById: (id) => `/young-people/keywork/${id}`,
  keyworkCreate: "/young-people/keywork",
  keyworkUpdate: (id) => `/young-people/keywork/${id}`,
  monthlyReviews: (id) => `/monthly-reviews/young-person/${id}`,
  monthlyReviewDetail: (id) => `/monthly-reviews/${id}`,
  monthlyReviewGenerate: (id, month) => `/monthly-reviews/young-person/${id}/generate?review_month=${month}`,
  standardsSummary: (id) => [`/young-people/${id}/standards`],
  standardsEvidence: (id) => [`/young-people/${id}/standards/evidence`],
  standardsRebuild: (id) => `/young-people/${id}/standards/rebuild`,
  inspectionPackCreate: "/inspection-pack",
  ofstedAiReport: (id, m = "") => m ? `/ofsted-ai/young-person/${id}/report?review_month=${encodeURIComponent(m)}` : `/ofsted-ai/young-person/${id}/report`
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
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
  monthlyOfstedAiBtn: $("monthlyOfstedAiBtn"),
  overviewContent: $("overviewContent"),
  profileContent: $("profileContent"),
  plansContent: $("plansContent"),
  plansArchiveContent: $("plansArchiveContent"),
  riskContent: $("riskContent"),
  riskArchiveContent: $("riskArchiveContent"),
  dailyNotesContent: $("dailyNotesContent"),
  dailyNotesArchiveContent: $("dailyNotesArchiveContent"),
  incidentsContent: $("incidentsContent"),
  incidentsArchiveContent: $("incidentsArchiveContent"),
  healthContent: $("healthContent"),
  educationContent: $("educationContent"),
  familyContent: $("familyContent"),
  keyworkContent: $("keyworkContent"),
  keyworkArchiveContent: $("keyworkArchiveContent"),
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
  rebuildStandardsBtn: $("rebuildStandardsBtn"),
  complianceStatusFilter: $("complianceStatusFilter"),
  complianceCategoryFilter: $("complianceCategoryFilter"),
  plansOpenCreateBtn: $("plansOpenCreateBtn"),
  riskOpenCreateBtn: $("riskOpenCreateBtn"),
  dailyNotesOpenCreateBtn: $("dailyNotesOpenCreateBtn"),
  incidentsOpenCreateBtn: $("incidentsOpenCreateBtn"),
  keyworkOpenCreateBtn: $("keyworkOpenCreateBtn"),
  planForm: $("planForm"), planId: $("planId"), planType: $("planType"), planTitle: $("planTitle"),
  planPresentingNeed: $("planPresentingNeed"), planSummary: $("planSummary"), planChildVoice: $("planChildVoice"),
  planProactiveStrategies: $("planProactiveStrategies"), planPaceGuidance: $("planPaceGuidance"),
  planTriggers: $("planTriggers"), planProtectiveFactors: $("planProtectiveFactors"), planStartDate: $("planStartDate"),
  planReviewDate: $("planReviewDate"), planStatus: $("planStatus"), planOwnerId: $("planOwnerId"),
  planApprovalStatus: $("planApprovalStatus"), planCreatedBy: $("planCreatedBy"), clearPlanFormBtn: $("clearPlanFormBtn"),
  riskForm: $("riskForm"), riskId: $("riskId"), riskCategory: $("riskCategory"), riskTitle: $("riskTitle"),
  riskConcernSummary: $("riskConcernSummary"), riskKnownTriggers: $("riskKnownTriggers"),
  riskEarlyWarningSigns: $("riskEarlyWarningSigns"), riskContextualFactors: $("riskContextualFactors"),
  riskCurrentControls: $("riskCurrentControls"), riskDeescalationStrategies: $("riskDeescalationStrategies"),
  riskResponseActions: $("riskResponseActions"), riskChildViews: $("riskChildViews"), riskSeverity: $("riskSeverity"),
  riskLikelihood: $("riskLikelihood"), riskReviewDate: $("riskReviewDate"), riskStatus: $("riskStatus"),
  riskOwnerId: $("riskOwnerId"), riskApprovalStatus: $("riskApprovalStatus"), riskCreatedBy: $("riskCreatedBy"),
  clearRiskFormBtn: $("clearRiskFormBtn"),
  dailyNoteForm: $("dailyNoteForm"), dailyNoteId: $("dailyNoteId"), dailyNoteDate: $("dailyNoteDate"),
  dailyNoteShiftType: $("dailyNoteShiftType"), dailyNoteWorkflowStatus: $("dailyNoteWorkflowStatus"),
  dailyNoteMood: $("dailyNoteMood"), dailyNoteActivities: $("dailyNoteActivities"),
  dailyNoteEducationUpdate: $("dailyNoteEducationUpdate"), dailyNoteHealthUpdate: $("dailyNoteHealthUpdate"),
  dailyNoteFamilyUpdate: $("dailyNoteFamilyUpdate"), dailyNoteBehaviourUpdate: $("dailyNoteBehaviourUpdate"),
  dailyNoteYoungPersonVoice: $("dailyNoteYoungPersonVoice"), dailyNotePositives: $("dailyNotePositives"),
  dailyNoteActionsRequired: $("dailyNoteActionsRequired"), clearDailyNoteFormBtn: $("clearDailyNoteFormBtn"),
  incidentForm: $("incidentForm"), incidentId: $("incidentId"), incidentDatetime: $("incidentDatetime"),
  incidentType: $("incidentType"), incidentSeverity: $("incidentSeverity"), incidentLocation: $("incidentLocation"),
  incidentDescription: $("incidentDescription"), incidentResponse: $("incidentResponse"),
  incidentFollowUp: $("incidentFollowUp"), incidentManagerReviewStatus: $("incidentManagerReviewStatus"),
  clearIncidentFormBtn: $("clearIncidentFormBtn"),
  keyworkForm: $("keyworkForm"), keyworkId: $("keyworkId"), keyworkSessionDate: $("keyworkSessionDate"),
  keyworkWorkerId: $("keyworkWorkerId"), keyworkTopic: $("keyworkTopic"), keyworkPurpose: $("keyworkPurpose"),
  keyworkSummary: $("keyworkSummary"), keyworkChildVoice: $("keyworkChildVoice"),
  keyworkReflectiveAnalysis: $("keyworkReflectiveAnalysis"), keyworkActionsAgreed: $("keyworkActionsAgreed"),
  keyworkNextSessionDate: $("keyworkNextSessionDate"), clearKeyworkFormBtn: $("clearKeyworkFormBtn")
};

document.addEventListener("DOMContentLoaded", () => {
  setDefaultMonthlyReviewMonth();
  bindEvents();
  loadYoungPeople();
});

function bindEvents() {
  $$(".tab-btn").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
  $$(".section-tab-btn").forEach(btn => btn.addEventListener("click", () => setSectionTab(btn.dataset.section, btn.dataset.sectionTab)));

  on(els.youngPersonSearch, "input", handleSearch);
  on(els.refreshYoungPeopleBtn, "click", loadYoungPeople);
  on(els.reloadCurrentBtn, "click", reloadCurrentRecord);
  on(els.inspectionPackBtn, "click", createInspectionPackJob);
  on(els.headerOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));
  on(els.monthlyOfstedAiBtn, "click", () => loadOfstedAiReport(getSelectedReviewMonthParam()));
  on(els.refreshDailyNotesBtn, "click", () => state.selectedYoungPerson && loadDailyNotes(state.selectedYoungPerson.id));
  on(els.dailyNoteStatusFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteShiftFilter, "change", renderDailyNotesListFromState);
  on(els.dailyNoteSearch, "input", renderDailyNotesListFromState);
  on(els.rebuildChronologyBtn, "click", rebuildChronology);
  on(els.generateMonthlyReviewBtn, "click", generateMonthlyReview);
  on(els.rebuildStandardsBtn, "click", rebuildStandardsLinks);
  on(els.complianceStatusFilter, "change", rerenderComplianceFromState);
  on(els.complianceCategoryFilter, "change", rerenderComplianceFromState);

  on(els.plansOpenCreateBtn, "click", () => { resetPlanForm(); setSectionTab("plans", "form"); });
  on(els.riskOpenCreateBtn, "click", () => { resetRiskForm(); setSectionTab("risk", "form"); });
  on(els.dailyNotesOpenCreateBtn, "click", () => { resetDailyNoteForm(); setSectionTab("daily_notes", "form"); });
  on(els.incidentsOpenCreateBtn, "click", () => { resetIncidentForm(); setSectionTab("incidents", "form"); });
  on(els.keyworkOpenCreateBtn, "click", () => { resetKeyworkForm(); setSectionTab("keywork", "form"); });

  on(els.clearPlanFormBtn, "click", resetPlanForm);
  on(els.clearRiskFormBtn, "click", resetRiskForm);
  on(els.clearDailyNoteFormBtn, "click", resetDailyNoteForm);
  on(els.clearIncidentFormBtn, "click", resetIncidentForm);
  on(els.clearKeyworkFormBtn, "click", resetKeyworkForm);

  on(els.planForm, "submit", (e) => { e.preventDefault(); showStatus("Plan save wiring needs matching create/update route."); });
  on(els.riskForm, "submit", (e) => { e.preventDefault(); showStatus("Risk save wiring needs matching create/update route."); });
  on(els.dailyNoteForm, "submit", (e) => { e.preventDefault(); showStatus("Daily note save wiring needs matching create/update route."); });
  on(els.incidentForm, "submit", (e) => { e.preventDefault(); showStatus("Incident save wiring needs matching create/update route."); });
  on(els.keyworkForm, "submit", saveKeyworkSession);
}

function on(el, event, handler) { if (el) el.addEventListener(event, handler); }
function setDefaultMonthlyReviewMonth() {
  if (!els.monthlyReviewMonth) return;
  const now = new Date();
  els.monthlyReviewMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function getSelectedReviewMonthParam() { return els.monthlyReviewMonth?.value ? `${els.monthlyReviewMonth.value}-01` : ""; }

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, credentials: "include", ...options });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const data = await response.json(); if (data?.detail) message = data.detail; } catch {}
    throw new Error(message);
  }
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : null;
}
async function fetchFromCandidates(urls) {
  let lastError = null;
  for (const url of urls) { try { return await fetchJson(url); } catch (e) { lastError = e; } }
  throw lastError || new Error("No endpoint returned data");
}

async function loadYoungPeople() {
  try {
    showStatus("Loading young people...");
    const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.youngPeopleList));
    state.youngPeople = rows;
    state.filteredYoungPeople = [...rows];
    renderYoungPeopleList();
    if (!state.selectedYoungPerson && rows.length) await selectYoungPerson(rows[0]);
    else if (state.selectedYoungPerson) {
      const refreshed = rows.find(r => Number(r.id) === Number(state.selectedYoungPerson.id));
      if (refreshed) { state.selectedYoungPerson = refreshed; renderYoungPeopleList(); updateSelectedPersonHeader(); updateStickyHeader(); }
    }
    showStatus("Young people loaded.");
  } catch (error) {
    els.youngPeopleList.innerHTML = `<div class="empty-state">Could not load young people.<br /><small>${escapeHtml(error.message)}</small></div>`;
    showStatus(`Could not load young people: ${error.message}`, true);
  }
}

function renderYoungPeopleList() {
  if (!els.youngPeopleList) return;
  if (!state.filteredYoungPeople.length) return els.youngPeopleList.innerHTML = `<div class="empty-state">No young people found.</div>`;
  els.youngPeopleList.innerHTML = state.filteredYoungPeople.map(person => {
    const active = Number(state.selectedYoungPerson?.id) === Number(person.id) ? "active" : "";
    return `<div class="young-person-card ${active}" data-id="${person.id}"><h4>${escapeHtml(getFullName(person))}</h4><p>${escapeHtml(person.placement_status ? `Status: ${person.placement_status}` : `ID: ${person.id}`)}</p></div>`;
  }).join("");
  $$(".young-person-card").forEach(card => card.addEventListener("click", async () => {
    const person = state.youngPeople.find(r => Number(r.id) === Number(card.dataset.id));
    if (person) await selectYoungPerson(person);
  }));
}

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();
  state.filteredYoungPeople = state.youngPeople.filter(person => `${person.first_name || ""} ${person.last_name || ""} ${person.preferred_name || ""}`.toLowerCase().includes(term));
  renderYoungPeopleList();
}

async function selectYoungPerson(person) {
  state.selectedYoungPerson = person;
  state.latest = { overview: null, profile: null, plans: [], risk: [], dailyNotes: [], incidents: [], health: null, education: null, family: null, chronology: [], monthlyReviews: [], standardsSummary: [], standardsEvidence: [], compliance: null, keywork: [] };
  renderYoungPeopleList();
  updateSelectedPersonHeader();
  updateStickyHeader();
  resetAllForms();
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
      fetchFromCandidates(endpoints.dailyNotes(id)).catch(() => []),
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
  } catch {}
}

function updateSelectedPersonHeader() {
  if (!state.selectedYoungPerson) {
    setText(els.selectedYoungPersonName, "Select a young person");
    setText(els.selectedYoungPersonMeta, "No record loaded");
    return;
  }
  const p = state.selectedYoungPerson, bits = [`ID: ${p.id}`];
  if (p.date_of_birth) bits.push(`DOB: ${formatDate(p.date_of_birth)}`);
  if (p.placement_status) bits.push(`Status: ${p.placement_status}`);
  if (p.summary_risk_level) bits.push(`Risk: ${p.summary_risk_level}`);
  setText(els.selectedYoungPersonName, getFullName(p));
  setText(els.selectedYoungPersonMeta, bits.join(" | "));
}

function updateStickyHeader() {
  const p = state.selectedYoungPerson;
  if (!p) {
    setText(els.stickyPersonAvatar, "YP"); setText(els.stickyYoungPersonName, "No young person selected");
    setText(els.stickyYoungPersonSummary, "Select a young person to load the workspace");
    setText(els.stickyDobChip, "DOB: —"); setText(els.stickyPlacementChip, "Placement: —");
    setText(els.stickySocialWorkerChip, "SW: —"); setText(els.stickyEducationChip, "Education: —");
    setText(els.stickyRiskLevel, "Risk: —"); setText(els.stickyPlanReview, "Plan review: —"); setText(els.stickyTodayInfo, "Today I need to know: —");
    return;
  }
  const profile = state.latest.profile || {}, yp = profile.young_person || p, alerts = Array.isArray(profile.alerts) ? profile.alerts : [];
  const activePlan = state.latest.plans.find(r => String(r.status || "").toLowerCase() === "active");
  const ed = Array.isArray(state.latest.education?.education_profile) ? state.latest.education.education_profile[0] : null;
  setText(els.stickyPersonAvatar, getInitials(p));
  setText(els.stickyYoungPersonName, getFullName(p));
  setText(els.stickyYoungPersonSummary, `${yp.placement_status || "Placement not recorded"}${yp.legal_status ? ` • ${yp.legal_status}` : ""}`);
  setText(els.stickyDobChip, `DOB: ${yp.date_of_birth ? formatDate(yp.date_of_birth) : "—"}`);
  setText(els.stickyPlacementChip, `Placement: ${yp.placement_status || "—"}`);
  setText(els.stickySocialWorkerChip, `SW: ${yp.social_worker_name || yp.social_worker || "—"}`);
  setText(els.stickyEducationChip, `Education: ${yp.school_name || ed?.school_name || yp.education_status || "—"}`);
  setText(els.stickyRiskLevel, `Risk: ${yp.summary_risk_level || "—"}`);
  setText(els.stickyPlanReview, `Plan review: ${activePlan?.review_date ? formatDate(activePlan.review_date) : "—"}`);
  setText(els.stickyTodayInfo, `Today I need to know: ${alerts[0]?.title || alerts[0]?.description || "No live alert"}`);
}

const tabLoaders = { overview: loadOverview, profile: loadProfile, plans: loadPlans, risk: loadRisk, daily_notes: loadDailyNotes, incidents: loadIncidents, health: loadHealth, education: loadEducation, family: loadFamily, keywork: loadKeywork, chronology: loadChronology, monthly_reviews: loadMonthlyReviews, standards: loadStandards, compliance: loadCompliance };

function setActiveTab(tabName) {
  state.activeTab = tabName;
  $$(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabName));
  $$(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
  loadActiveTabData();
}
async function reloadCurrentRecord() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  await loadActionBarData();
  await loadActiveTabData();
}
async function loadActiveTabData() {
  if (!state.selectedYoungPerson) return;
  const loader = tabLoaders[state.activeTab];
  if (loader) try { await loader(state.selectedYoungPerson.id); } catch (e) { showStatus(e.message, true); }
}

function setSectionTab(section, tab) {
  state.activeSectionTabs[section] = tab;
  $$(`.section-tab-btn[data-section="${section}"]`).forEach(btn => btn.classList.toggle("active", btn.dataset.sectionTab === tab));
  $$(`#tab-${section} .section-subpanel`).forEach(panel => panel.classList.toggle("active", panel.id === `${section}-subpanel-${tab}`));
}

async function loadOverview(id) {
  renderLoading(els.overviewContent, "Loading overview...");
  const data = await fetchFromCandidates(endpoints.overview(id));
  state.latest.overview = data;
  els.overviewContent.innerHTML = renderKeyValueCards([
    ["Placement Status", data?.placement_status], ["Risk Level", data?.summary_risk_level], ["Legal Status", data?.legal_status],
    ["School", data?.school_name], ["GP", data?.gp_name], ["What Matters", data?.what_matters_to_me]
  ]);
}

async function loadProfile(id) {
  renderLoading(els.profileContent, "Loading profile...");
  const data = await fetchFromCandidates(endpoints.profile(id));
  state.latest.profile = data; updateStickyHeader();
  els.profileContent.innerHTML = [
    renderObjectSection("Young Person", data?.young_person || {}, ["id","first_name","last_name","preferred_name","date_of_birth","gender","ethnicity","local_id_number","placement_status","summary_risk_level"]),
    renderArraySection("Legal Status", data?.legal_status || [], ["legal_status","order_type","order_details","effective_from","effective_to","is_current"]),
    renderArraySection("Communication Profile", data?.communication_profile || [], ["neurodiversity_summary","communication_style","sensory_profile","processing_needs","what_helps"]),
    renderArraySection("Identity Profile", data?.identity_profile || [], ["interests","strengths_summary","what_matters_to_me"]),
    renderArraySection("Alerts", data?.alerts || [], ["alert_type","title","description","severity","review_date"])
  ].join("");
}

async function loadPlans(id) {
  renderLoading(els.plansContent, "Loading plans...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.plans(id)));
  state.latest.plans = rows; updateStickyHeader();
  const active = rows.filter(r => !["archived","completed"].includes(String(r.status || "").toLowerCase()));
  const archived = rows.filter(r => ["archived","completed"].includes(String(r.status || "").toLowerCase()));
  els.plansContent.innerHTML = renderDocumentCards(active, "plan", { title: r => r.title || r.plan_type || "Plan", meta: r => `${stringifyValue(r.status)} • ${r.review_date ? formatDate(r.review_date) : "No review date"}`, summary: r => r.presenting_need || r.summary || "No summary" });
  els.plansArchiveContent.innerHTML = renderDocumentCards(archived, "plan", { title: r => r.title || r.plan_type || "Plan", meta: r => `${stringifyValue(r.status)} • ${r.review_date ? formatDate(r.review_date) : "No review date"}`, summary: r => r.presenting_need || r.summary || "No summary" });
}

async function loadRisk(id) {
  renderLoading(els.riskContent, "Loading risk...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.risk(id)));
  state.latest.risk = rows; updateStickyHeader();
  const active = rows.filter(r => !["archived","completed"].includes(String(r.status || "").toLowerCase()));
  const archived = rows.filter(r => ["archived","completed"].includes(String(r.status || "").toLowerCase()));
  const cfg = { title: r => r.title || r.category || "Risk assessment", meta: r => `${stringifyValue(r.severity)} • ${r.review_date ? formatDate(r.review_date) : "No review date"}`, summary: r => r.concern_summary || "No summary" };
  els.riskContent.innerHTML = renderDocumentCards(active, "risk", cfg);
  els.riskArchiveContent.innerHTML = renderDocumentCards(archived, "risk", cfg);
}

async function loadDailyNotes(id) {
  renderLoading(els.dailyNotesContent, "Loading daily notes...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.dailyNotes(id)));
  state.latest.dailyNotes = rows;
  renderDailyNotesListFromState();
}
function renderDailyNotesListFromState() {
  let rows = [...state.latest.dailyNotes];
  const archivedStatuses = ["completed","reviewed"];
  const status = els.dailyNoteStatusFilter?.value || "all";
  const shift = els.dailyNoteShiftFilter?.value || "all";
  const term = (els.dailyNoteSearch?.value || "").trim().toLowerCase();
  if (status !== "all") rows = rows.filter(r => String(r.workflow_status || "").toLowerCase() === status);
  if (shift !== "all") rows = rows.filter(r => String(r.shift_type || "").toLowerCase() === shift);
  if (term) rows = rows.filter(r => [r.note_date,r.shift_type,r.workflow_status,r.presentation,r.activities,r.young_person_voice].join(" ").toLowerCase().includes(term));
  const active = rows.filter(r => !archivedStatuses.includes(String(r.workflow_status || "").toLowerCase()));
  const archived = rows.filter(r => archivedStatuses.includes(String(r.workflow_status || "").toLowerCase()));
  const cfg = { title: r => `${formatDate(r.note_date)} • ${stringifyValue(r.shift_type)}`, meta: r => `${stringifyValue(r.workflow_status)} • ${r.author_first_name || ""}`.trim(), summary: r => r.activities || r.presentation || r.young_person_voice || "No summary" };
  els.dailyNotesContent.innerHTML = renderDocumentCards(active, "daily_note", cfg);
  els.dailyNotesArchiveContent.innerHTML = renderDocumentCards(archived, "daily_note", cfg);
}

async function loadIncidents(id) {
  renderLoading(els.incidentsContent, "Loading incidents...");
  const rows = normaliseArrayResponse(await fetchFromCandidates(endpoints.incidents(id)));
  state.latest.incidents = rows;
  const archived = rows.filter(r => String(r.manager_review_status || "").toLowerCase() === "reviewed");
  const active = rows.filter(r => String(r.manager_review_status || "").toLowerCase() !== "reviewed");
  const cfg = { title: r => r.incident_type || "Incident", meta: r => `${r.incident_datetime ? formatDateTime(r.incident_datetime) : "No date"} • ${stringifyValue(r.severity)}`, summary: r => r.description || "No summary" };
  els.incidentsContent.innerHTML = renderDocumentCards(active, "incident", cfg);
  els.incidentsArchiveContent.innerHTML = renderDocumentCards(archived, "incident", cfg);
}

async function loadHealth(id) {
  renderLoading(els.healthContent, "Loading health...");
  const data = await fetchFromCandidates(endpoints.health(id));
  state.latest.health = data;
  const records = [...(data?.health_records || []), ...(data?.medication_records || [])];
  els.healthContent.innerHTML = renderDocumentCards(records, "health", { title: r => r.title || r.record_type || r.medication_name || "Health record", meta: r => r.event_datetime ? formatDateTime(r.event_datetime) : r.scheduled_time ? formatDateTime(r.scheduled_time) : "No date", summary: r => r.summary || r.outcome || r.status || "No summary" });
}

async function loadEducation(id) {
  renderLoading(els.educationContent, "Loading education...");
  const data = await fetchFromCandidates(endpoints.education(id));
  state.latest.education = data; updateStickyHeader();
  els.educationContent.innerHTML = renderDocumentCards(data?.education_records || [], "education", { title: r => r.provision_name || "Education record", meta: r => `${r.record_date ? formatDate(r.record_date) : "No date"} • ${stringifyValue(r.attendance_status)}`, summary: r => r.behaviour_summary || r.learning_engagement || r.achievement_note || "No summary" });
}

async function loadFamily(id) {
  renderLoading(els.familyContent, "Loading family...");
  const data = await fetchFromCandidates(endpoints.family(id));
  state.latest.family = data;
  els.familyContent.innerHTML = renderDocumentCards(data?.family_contact_records || [], "family", { title: r => r.contact_person || "Family record", meta: r => `${r.contact_datetime ? formatDateTime(r.contact_datetime) : "No date"} • ${stringifyValue(r.contact_type)}`, summary: r => r.child_voice || r.concerns || r.post_contact_presentation || "No summary" });
}

async function loadKeywork(id) {
  renderLoading(els.keyworkContent, "Loading key work...");
  const rows = normaliseArrayResponse(await fetchJson(endpoints.keywork(id)));
  state.latest.keywork = rows;
  const archived = rows.filter(r => String(r.status || "").toLowerCase() === "archived");
  const active = rows.filter(r => String(r.status || "").toLowerCase() !== "archived");
  const cfg = { title: r => r.topic || "Key work session", meta: r => `${r.session_date ? formatDate(r.session_date) : "No date"} • ${r.worker_first_name || ""}`.trim(), summary: r => r.summary || r.purpose || "No summary" };
  els.keyworkContent.innerHTML = renderDocumentCards(active, "keywork", cfg);
  els.keyworkArchiveContent.innerHTML = renderDocumentCards(archived, "keywork", cfg);
}

async function loadChronology(id) {
  renderLoading(els.chronologyContent, "Loading chronology...");
  const rows = normaliseArrayResponse(await fetchJson(endpoints.chronology(id)));
  state.latest.chronology = rows;
  els.chronologyContent.innerHTML = renderTableSection(rows, ["event_datetime","category","subcategory","title","summary","significance","source_table"]);
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
  els.monthlyReviewsList.innerHTML = renderDocumentCards(rows, "monthly_review", { title: r => r.review_title || "Monthly review", meta: r => `${r.review_month ? formatDate(r.review_month) : "No month"} • ${stringifyValue(r.status)}`, summary: r => r.summary_of_month || r.progress_summary || "Open to view detail" });
}

async function loadStandards(id) {
  renderLoading(els.standardsSummary, "Loading standards...");
  renderLoading(els.standardsEvidenceList, "Loading evidence...");
  const [summary, evidence] = await Promise.all([fetchFromCandidates(endpoints.standardsSummary(id)), fetchFromCandidates(endpoints.standardsEvidence(id))]);
  renderStandardsSummary(summary); renderStandardsEvidence(evidence);
}
function renderStandardsSummary(rows) {
  if (!rows?.length) return els.standardsSummary.innerHTML = `<div class="empty-state">No standards data found.</div>`;
  els.standardsSummary.innerHTML = renderTableSection(rows, ["code","short_label","linked_record_count"]);
}
function renderStandardsEvidence(rows) {
  if (!rows?.length) return els.standardsEvidenceList.innerHTML = `<div class="empty-state">No evidence linked yet.</div>`;
  els.standardsEvidenceList.innerHTML = renderTableSection(rows, ["standard_code","source_table","source_id","evidence_strength","rationale","created_at"]);
}

async function loadCompliance(id) {
  renderLoading(els.complianceContent, "Loading compliance...");
  const data = await fetchFromCandidates(endpoints.compliance(id));
  state.latest.compliance = data;
  rerenderComplianceFromState();
}
function rerenderComplianceFromState() {
  const data = state.latest.compliance;
  if (!data) return els.complianceContent.innerHTML = `<div class="empty-state">No compliance data found.</div>`;
  let items = Array.isArray(data.compliance_items) ? data.compliance_items : [];
  const status = els.complianceStatusFilter?.value || "all";
  const category = els.complianceCategoryFilter?.value || "all";
  if (status !== "all") items = items.filter(i => i.compliance_status === status);
  if (category !== "all") items = items.filter(i => i.compliance_type === category);
  els.complianceContent.innerHTML = renderTableSection(items, ["compliance_status","title","due_date","status","approval_status","created_at"]);
}

function renderDocumentCards(rows, type, cfg) {
  if (!rows?.length) return `<div class="empty-state">No records found.</div>`;
  const html = `<div class="record-list">${rows.map(row => `<button class="record-card js-open-record" type="button" data-type="${type}" data-record='${escapeHtml(JSON.stringify(row))}'><h4>${escapeHtml(cfg.title(row))}</h4><div class="record-meta">${escapeHtml(cfg.meta(row))}</div><div class="record-summary">${escapeHtml(trimText(cfg.summary(row), 180))}</div></button>`).join("")}</div>`;
  queueMicrotask(bindRecordButtons);
  return html;
}
function bindRecordButtons() {
  $$(".js-open-record").forEach(btn => btn.onclick = () => {
    const type = btn.dataset.type, record = parseRecord(btn.dataset.record);
    if (!record) return;
    if (type === "monthly_review") return record.id && openMonthlyReviewDetail(record.id);
    if (type === "plan") return editPlan(record);
    if (type === "risk") return editRisk(record);
    if (type === "daily_note") return editDailyNote(record);
    if (type === "incident") return editIncident(record);
    if (type === "keywork") return editKeywork(record);
  });
}

function editPlan(r) {
  setValue(els.planId, r.id); setValue(els.planType, r.plan_type); setValue(els.planTitle, r.title);
  setValue(els.planPresentingNeed, r.presenting_need); setValue(els.planSummary, r.summary);
  setValue(els.planChildVoice, r.child_voice); setValue(els.planProactiveStrategies, r.proactive_strategies);
  setValue(els.planPaceGuidance, r.pace_guidance); setValue(els.planTriggers, r.triggers);
  setValue(els.planProtectiveFactors, r.protective_factors); setValue(els.planStartDate, toDateInputValue(r.start_date));
  setValue(els.planReviewDate, toDateInputValue(r.review_date)); setValue(els.planStatus, r.status || "active");
  setValue(els.planOwnerId, r.owner_id); setValue(els.planApprovalStatus, r.approval_status || "not_required");
  setValue(els.planCreatedBy, r.created_by); setSectionTab("plans", "form");
}
function editRisk(r) {
  setValue(els.riskId, r.id); setValue(els.riskCategory, r.category); setValue(els.riskTitle, r.title);
  setValue(els.riskConcernSummary, r.concern_summary); setValue(els.riskKnownTriggers, r.known_triggers);
  setValue(els.riskEarlyWarningSigns, r.early_warning_signs); setValue(els.riskContextualFactors, r.contextual_factors);
  setValue(els.riskCurrentControls, r.current_controls); setValue(els.riskDeescalationStrategies, r.deescalation_strategies);
  setValue(els.riskResponseActions, r.response_actions); setValue(els.riskChildViews, r.child_views);
  setValue(els.riskSeverity, r.severity || "medium"); setValue(els.riskLikelihood, r.likelihood || "medium");
  setValue(els.riskReviewDate, toDateInputValue(r.review_date)); setValue(els.riskStatus, r.status || "active");
  setValue(els.riskOwnerId, r.owner_id); setValue(els.riskApprovalStatus, r.approval_status || "not_required");
  setValue(els.riskCreatedBy, r.created_by); setSectionTab("risk", "form");
}
function editDailyNote(r) {
  setValue(els.dailyNoteId, r.id); setValue(els.dailyNoteDate, toDateInputValue(r.note_date));
  setValue(els.dailyNoteShiftType, r.shift_type || "day"); setValue(els.dailyNoteWorkflowStatus, r.workflow_status || "draft");
  setValue(els.dailyNoteMood, r.mood || r.presentation); setValue(els.dailyNoteActivities, r.activities);
  setValue(els.dailyNoteEducationUpdate, r.education_update); setValue(els.dailyNoteHealthUpdate, r.health_update);
  setValue(els.dailyNoteFamilyUpdate, r.family_update); setValue(els.dailyNoteBehaviourUpdate, r.behaviour_update);
  setValue(els.dailyNoteYoungPersonVoice, r.young_person_voice); setValue(els.dailyNotePositives, r.positives);
  setValue(els.dailyNoteActionsRequired, r.actions_required); setSectionTab("daily_notes", "form");
}
function editIncident(r) {
  setValue(els.incidentId, r.id); setValue(els.incidentDatetime, toDateTimeLocalValue(r.incident_datetime));
  setValue(els.incidentType, r.incident_type); setValue(els.incidentSeverity, r.severity || "medium");
  setValue(els.incidentLocation, r.location); setValue(els.incidentDescription, r.description);
  setValue(els.incidentResponse, r.staff_response || r.response); setValue(els.incidentFollowUp, r.follow_up_required);
  setValue(els.incidentManagerReviewStatus, r.manager_review_status || "pending"); setSectionTab("incidents", "form");
}
function editKeywork(r) {
  setValue(els.keyworkId, r.id); setValue(els.keyworkSessionDate, toDateInputValue(r.session_date));
  setValue(els.keyworkWorkerId, r.worker_id); setValue(els.keyworkTopic, r.topic); setValue(els.keyworkPurpose, r.purpose);
  setValue(els.keyworkSummary, r.summary); setValue(els.keyworkChildVoice, r.child_voice);
  setValue(els.keyworkReflectiveAnalysis, r.reflective_analysis); setValue(els.keyworkActionsAgreed, r.actions_agreed);
  setValue(els.keyworkNextSessionDate, toDateInputValue(r.next_session_date)); setSectionTab("keywork", "form");
}

function resetAllForms() { resetPlanForm(); resetRiskForm(); resetDailyNoteForm(); resetIncidentForm(); resetKeyworkForm(); }
function resetPlanForm() { els.planForm?.reset(); setValue(els.planId, ""); }
function resetRiskForm() { els.riskForm?.reset(); setValue(els.riskId, ""); }
function resetDailyNoteForm() { els.dailyNoteForm?.reset(); setValue(els.dailyNoteId, ""); }
function resetIncidentForm() { els.incidentForm?.reset(); setValue(els.incidentId, ""); }
function resetKeyworkForm() { els.keyworkForm?.reset(); setValue(els.keyworkId, ""); }

async function saveKeyworkSession(e) {
  e.preventDefault();
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  const id = clean(els.keyworkId?.value);
  const payload = {
    young_person_id: Number(state.selectedYoungPerson.id),
    session_date: clean(els.keyworkSessionDate?.value),
    worker_id: parseNullableInt(els.keyworkWorkerId?.value),
    topic: clean(els.keyworkTopic?.value),
    purpose: clean(els.keyworkPurpose?.value),
    summary: clean(els.keyworkSummary?.value),
    child_voice: clean(els.keyworkChildVoice?.value),
    reflective_analysis: clean(els.keyworkReflectiveAnalysis?.value),
    actions_agreed: clean(els.keyworkActionsAgreed?.value),
    next_session_date: clean(els.keyworkNextSessionDate?.value)
  };
  if (!payload.session_date || !payload.topic) return showStatus("Session date and topic are required.", true);
  try {
    if (id) {
      await fetchJson(endpoints.keyworkUpdate(id), { method: "PUT", body: JSON.stringify({ session_date: payload.session_date, worker_id: payload.worker_id, topic: payload.topic, purpose: payload.purpose, summary: payload.summary, child_voice: payload.child_voice, reflective_analysis: payload.reflective_analysis, actions_agreed: payload.actions_agreed, next_session_date: payload.next_session_date }) });
      showStatus("Key work updated.");
    } else {
      await fetchJson(endpoints.keyworkCreate, { method: "POST", body: JSON.stringify(payload) });
      showStatus("Key work created.");
    }
    resetKeyworkForm();
    setSectionTab("keywork", "records");
    await loadKeywork(state.selectedYoungPerson.id);
  } catch (error) {
    showStatus(`Could not save key work: ${error.message}`, true);
  }
}

async function rebuildChronology() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  try {
    await fetchJson(endpoints.chronologyRebuild(state.selectedYoungPerson.id), { method: "POST" });
    showStatus("Chronology rebuilt successfully.");
    await loadChronology(state.selectedYoungPerson.id);
  } catch (e) { showStatus(`Could not rebuild chronology: ${e.message}`, true); }
}
async function generateMonthlyReview() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  if (!els.monthlyReviewMonth?.value) return showStatus("Please choose a month first.", true);
  const month = `${els.monthlyReviewMonth.value}-01`;
  try {
    const result = await fetchJson(endpoints.monthlyReviewGenerate(state.selectedYoungPerson.id, month), { method: "POST" });
    showStatus("Monthly review generated successfully.");
    await loadMonthlyReviews(state.selectedYoungPerson.id);
    if (result?.monthly_review_id) await openMonthlyReviewDetail(result.monthly_review_id);
  } catch (e) { showStatus(`Could not generate monthly review: ${e.message}`, true); }
}
async function rebuildStandardsLinks() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  try {
    await fetchJson(endpoints.standardsRebuild(state.selectedYoungPerson.id), { method: "POST" });
    showStatus("Standards links rebuilt successfully.");
    await loadStandards(state.selectedYoungPerson.id);
  } catch (e) { showStatus(`Could not rebuild standards links: ${e.message}`, true); }
}
async function openMonthlyReviewDetail(reviewId) {
  renderLoading(els.monthlyReviewDetail, "Loading review...");
  const data = await fetchJson(endpoints.monthlyReviewDetail(reviewId));
  els.monthlyReviewDetail.innerHTML = [
    renderObjectSection("Review Summary", data?.review || {}, ["review_title","review_month","status","summary_of_month","progress_summary","child_voice_summary","concerns_and_risks","education_summary","health_summary","family_summary","keywork_summary","behaviour_summary","achievements_summary","actions_for_next_month","manager_analysis"]),
    renderArraySection("Linked Evidence", data?.record_links || [], ["source_table","source_id","link_reason","created_at"]),
    renderArraySection("Standards Summary", data?.standards || [], ["standard_code","standard_short_label","evidence_count","narrative_summary"]),
    renderArraySection("Actions", data?.actions || [], ["action_text","action_owner_id","due_date","status"])
  ].join("");
}
async function loadOfstedAiReport(reviewMonth = "") {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  try { showStatus("Generating AI OFSTED report..."); await fetchJson(endpoints.ofstedAiReport(state.selectedYoungPerson.id, reviewMonth)); showStatus("AI OFSTED report route loaded."); }
  catch (e) { showStatus(`Could not load AI OFSTED report: ${e.message}`, true); }
}
async function createInspectionPackJob() {
  if (!state.selectedYoungPerson) return showStatus("Please select a young person first.", true);
  try {
    const result = await fetchJson(endpoints.inspectionPackCreate, { method: "POST", body: JSON.stringify({ scope_type: "young_person", scope_id: state.selectedYoungPerson.id, pack_type: "ofsted", requested_by: 1 }) });
    showStatus(`Inspection pack job created${result?.id ? ` (#${result.id})` : ""}.`);
  } catch (e) { showStatus(`Could not create inspection pack job: ${e.message}`, true); }
}

function renderLoading(el, text) { if (el) el.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`; }
function renderDocumentCards(rows, type, cfg) {
  if (!rows?.length) return `<div class="empty-state">No records found.</div>`;
  const html = `<div class="record-list">${rows.map(r => `<button class="record-card js-open-record" type="button" data-type="${type}" data-record='${escapeHtml(JSON.stringify(r))}'><h4>${escapeHtml(cfg.title(r))}</h4><div class="record-meta">${escapeHtml(cfg.meta(r))}</div><div class="record-summary">${escapeHtml(trimText(cfg.summary(r), 180))}</div></button>`).join("")}</div>`;
  queueMicrotask(bindRecordButtons); return html;
}
function renderKeyValueCards(entries) {
  const rows = entries.filter(([,v]) => hasValue(v));
  if (!rows.length) return `<div class="empty-state">No information.</div>`;
  return `<div class="record-list">${rows.map(([k,v]) => `<div class="record-card"><h4>${escapeHtml(k)}</h4><div class="record-summary">${escapeHtml(stringifyValue(v))}</div></div>`).join("")}</div>`;
}
function renderObjectSection(title, record, keys) {
  if (!record || typeof record !== "object" || !Object.keys(record).length) return `<div class="panel"><div class="panel-header"><h3>${escapeHtml(title)}</h3></div><div class="empty-state">No data found.</div></div>`;
  const picked = (keys || Object.keys(record)).filter(k => k in record && hasValue(record[k]));
  if (!picked.length) return `<div class="panel"><div class="panel-header"><h3>${escapeHtml(title)}</h3></div><div class="empty-state">No data found.</div></div>`;
  return `<div class="panel"><div class="panel-header"><h3>${escapeHtml(title)}</h3></div><table class="data-table key-value"><tbody>${picked.map(k => `<tr><th>${escapeHtml(formatLabel(k))}</th><td>${escapeHtml(formatFieldValue(k, record[k]))}</td></tr>`).join("")}</tbody></table></div>`;
}
function renderArraySection(title, rows, cols) { return `<div class="panel"><div class="panel-header"><h3>${escapeHtml(title)}</h3></div>${renderTableSection(normaliseArrayResponse(rows), cols)}</div>`; }
function renderTableSection(rows, cols) {
  if (!rows?.length) return `<div class="empty-state">No records found.</div>`;
  const columns = cols?.length ? cols.filter(c => rows.some(r => c in r)) : Object.keys(rows[0]).slice(0, 8);
  return `<table class="data-table"><thead><tr>${columns.map(c => `<th>${escapeHtml(formatLabel(c))}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${renderTableCell(c, r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function renderTableCell(key, value) {
  if (key === "compliance_status" || key === "workflow_status" || key === "status") return renderStatusPill(value);
  if (key === "severity") return renderSeverityPill(value);
  return escapeHtml(formatFieldValue(key, value));
}
function renderStatusPill(value) { return `<span class="status-pill ${statusClass(value)}">${escapeHtml(stringifyValue(value))}</span>`; }
function renderSeverityPill(value) {
  const lower = String(value || "").toLowerCase();
  let cls = "status-grey"; if (lower === "high") cls = "status-red"; else if (lower === "medium") cls = "status-amber"; else if (lower === "low") cls = "status-green";
  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

function bindRecordButtons() {
  $$(".js-open-record").forEach(btn => btn.onclick = () => {
    const type = btn.dataset.type, r = parseRecord(btn.dataset.record); if (!r) return;
    if (type === "monthly_review") return r.id && openMonthlyReviewDetail(r.id);
    if (type === "plan") return editPlan(r);
    if (type === "risk") return editRisk(r);
    if (type === "daily_note") return editDailyNote(r);
    if (type === "incident") return editIncident(r);
    if (type === "keywork") return editKeywork(r);
  });
}

function normaliseArrayResponse(data) { if (Array.isArray(data)) return data; if (Array.isArray(data?.items)) return data.items; if (Array.isArray(data?.rows)) return data.rows; if (Array.isArray(data?.data)) return data.data; return []; }
function getFullName(p) { const pref = p.preferred_name ? ` (${p.preferred_name})` : ""; const name = `${p.first_name || ""} ${p.last_name || ""}`.trim(); return name ? `${name}${pref}` : `Young Person #${p.id}`; }
function getInitials(p) { const parts = [p?.first_name, p?.last_name].filter(Boolean); return parts.length ? parts.map(x => x.charAt(0).toUpperCase()).slice(0,2).join("") : "YP"; }
function setText(el, value) { if (el) el.textContent = String(value); }
function setValue(el, value) { if (el) el.value = value ?? ""; }
function clean(v) { const x = typeof v === "string" ? v.trim() : v; return x === "" ? null : x; }
function parseNullableInt(v) { const x = String(v || "").trim(); if (!x) return null; const n = Number(x); return Number.isNaN(n) ? null : n; }
function parseRecord(v) { try { return JSON.parse(unescapeHtml(v)); } catch { return null; } }
function formatLabel(v) { return String(v).replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()); }
function stringifyValue(v) { if (v === null || v === undefined || v === "") return "—"; if (typeof v === "boolean") return v ? "Yes" : "No"; if (typeof v === "object") return JSON.stringify(v); return String(v); }
function formatFieldValue(key, value) {
  if (!hasValue(value)) return "—";
  const dateKeys = ["date_of_birth","created_at","updated_at","event_datetime","incident_datetime","session_date","note_date","record_date","admission_date","discharge_date","review_date","review_month","start_date","next_session_date","contact_datetime","effective_from","effective_to","scheduled_time","administered_time","approved_at","returned_at","submitted_at","next_action_date","due_date","generated_at"];
  if (dateKeys.includes(key)) {
    const dateOnly = ["date_of_birth","session_date","note_date","record_date","admission_date","discharge_date","review_date","review_month","start_date","next_session_date","effective_from","effective_to","next_action_date","due_date"];
    return dateOnly.includes(key) ? formatDate(value) : formatDateTime(value);
  }
  return typeof value === "boolean" ? (value ? "Yes" : "No") : stringifyValue(value);
}
function formatDate(v) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB"); }
function formatDateTime(v) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`; }
function toDateInputValue(v) { if (!v) return ""; const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10); }
function toDateTimeLocalValue(v) { if (!v) return ""; const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
function trimText(v, max=180) { const t = String(v || ""); return t.length > max ? `${t.slice(0,max)}...` : t; }
function hasValue(v) { return v !== null && v !== undefined && v !== ""; }
function statusClass(v) {
  const lower = String(v || "").toLowerCase();
  if (["overdue","high","returned"].includes(lower)) return "status-red";
  if (["due_soon","medium","pending"].includes(lower)) return "status-amber";
  if (["ok","active","approved","reviewed","complete","open"].includes(lower)) return "status-green";
  if (["submitted","completed","amended","info"].includes(lower)) return "status-blue";
  return "status-grey";
}
function unescapeHtml(v) { const t = document.createElement("textarea"); t.innerHTML = v; return t.value; }
function escapeHtml(v) { return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function showStatus(message, isError=false) {
  if (!els.statusBar) return;
  els.statusBar.textContent = message; els.statusBar.classList.remove("hidden","error");
  if (isError) els.statusBar.classList.add("error");
  clearTimeout(showStatus.timer); showStatus.timer = setTimeout(() => els.statusBar.classList.add("hidden"), 4000);
}
