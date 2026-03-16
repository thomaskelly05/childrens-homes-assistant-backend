const state = {
  youngPeople: [],
  filteredYoungPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview",
  sectionTabs: { plans: "records", risk: "records", daily_notes: "records", incidents: "records", keywork: "records" },
  latest: {
    overview: null, profile: null, plans: [], plansArchive: [],
    risk: [], riskArchive: [], dailyNotes: [], dailyNotesArchive: [],
    incidents: [], incidentsArchive: [], keywork: [], keyworkArchive: [],
    health: null, education: null, family: null, chronology: [],
    monthlyReviews: [], compliance: null
  }
};

const ep = {
  youngPeople: ["/young-people", "/young-people/list"],
  overview: id => [`/young-people/${id}`],
  profile: id => [`/young-people/${id}/profile`],

  plans: id => [`/young-people/${id}/plans`],
  plansArchive: id => [`/young-people/${id}/plans/archive`],
  planById: id => `/young-people/plans/${id}`,
  planCreate: "/young-people/plans",
  planUpdate: id => `/young-people/plans/${id}`,

  risk: id => [`/young-people/${id}/risk`],
  riskArchive: id => [`/young-people/${id}/risk/archive`],
  riskById: id => `/young-people/risk/${id}`,
  riskCreate: "/young-people/risk",
  riskUpdate: id => `/young-people/risk/${id}`,

  daily: id => [`/young-people/${id}/daily-notes`],
  dailyArchive: id => [`/young-people/${id}/daily-notes/archive`],
  dailyById: id => `/young-people/daily-notes/${id}`,
  dailyCreate: "/young-people/daily-notes",
  dailyUpdate: id => `/young-people/daily-notes/${id}`,

  incidents: id => [`/young-people/${id}/incidents`],
  incidentsArchive: id => [`/young-people/${id}/incidents/archive`],
  incidentById: id => `/young-people/incidents/${id}`,
  incidentCreate: "/young-people/incidents",
  incidentUpdate: id => `/young-people/incidents/${id}`,

  keywork: id => `/young-people/${id}/keywork`,
  keyworkArchive: id => `/young-people/${id}/keywork/archive`,
  keyworkById: id => `/young-people/keywork/${id}`,
  keyworkCreate: "/young-people/keywork",
  keyworkUpdate: id => `/young-people/keywork/${id}`,

  health: id => [`/young-people/${id}/health`],
  education: id => [`/young-people/${id}/education`],
  family: id => [`/young-people/${id}/family`],
  chronology: id => `/young-people/${id}/chronology`,
  chronologyRebuild: id => `/young-people/${id}/chronology/rebuild`,
  monthly: id => `/monthly-reviews/young-person/${id}`,
  monthlyDetail: id => `/monthly-reviews/${id}`,
  monthlyGenerate: (id, m) => `/monthly-reviews/young-person/${id}/generate?review_month=${m}`,
  standards: id => [`/young-people/${id}/standards`],
  evidence: id => [`/young-people/${id}/standards/evidence`],
  standardsRebuild: id => `/young-people/${id}/standards/rebuild`,
  compliance: id => [`/young-people/${id}/compliance`],
  pack: "/inspection-pack",
  ofsted: (id, m = "") => m ? `/ofsted-ai/young-person/${id}/report?review_month=${encodeURIComponent(m)}` : `/ofsted-ai/young-person/${id}/report`
};

const $ = id => document.getElementById(id);
const $$ = s => [...document.querySelectorAll(s)];
const v = (el, val) => { if (el) el.value = val ?? ""; };
const t = (el, val) => { if (el) el.textContent = String(val ?? ""); };
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const clean = x => (typeof x === "string" ? x.trim() : x) || null;
const nint = x => { const n = Number(String(x || "").trim()); return Number.isNaN(n) ? null : n || null; };
const arr = d => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.rows) ? d.rows : Array.isArray(d?.data) ? d.data : [];
const esc = s => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const fmtLabel = s => String(s).replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const has = x => x !== null && x !== undefined && x !== "";
const sVal = x => !has(x) ? "—" : typeof x === "boolean" ? (x ? "Yes" : "No") : typeof x === "object" ? JSON.stringify(x) : String(x);
const trim = (s, n = 180) => { s = String(s ?? ""); return s.length > n ? `${s.slice(0, n)}...` : s; };
const dtOnly = ["date_of_birth","session_date","note_date","record_date","admission_date","discharge_date","review_date","review_month","start_date","next_session_date","effective_from","effective_to","next_action_date","due_date"];
const dateKeys = [...dtOnly, "created_at","updated_at","event_datetime","incident_datetime","contact_datetime","scheduled_time","administered_time","approved_at","returned_at","submitted_at","generated_at"];
const fDate = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? sVal(x) : d.toLocaleDateString("en-GB"); };
const fDateTime = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? sVal(x) : `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`; };
const dInput = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10); };
const dtInput = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const fVal = (k, v) => !has(v) ? "—" : dateKeys.includes(k) ? (dtOnly.includes(k) ? fDate(v) : fDateTime(v)) : sVal(v);
const sCls = v => {
  v = String(v || "").toLowerCase();
  if (["overdue","high","returned"].includes(v)) return "status-red";
  if (["due_soon","medium","pending"].includes(v)) return "status-amber";
  if (["ok","active","approved","reviewed","open","complete"].includes(v)) return "status-green";
  if (["submitted","completed","amended","info"].includes(v)) return "status-blue";
  return "status-grey";
};
const pill = v => `<span class="status-pill ${sCls(v)}">${esc(sVal(v))}</span>`;

const els = {
  youngPeopleList: $("youngPeopleList"), youngPersonSearch: $("youngPersonSearch"), refreshYoungPeopleBtn: $("refreshYoungPeopleBtn"),
  selectedYoungPersonName: $("selectedYoungPersonName"), selectedYoungPersonMeta: $("selectedYoungPersonMeta"), statusBar: $("statusBar"),
  reloadCurrentBtn: $("reloadCurrentBtn"), inspectionPackBtn: $("inspectionPackBtn"), headerOfstedAiBtn: $("headerOfstedAiBtn"), monthlyOfstedAiBtn: $("monthlyOfstedAiBtn"),
  overviewContent: $("overviewContent"), profileContent: $("profileContent"),
  plansContent: $("plansContent"), plansArchiveContent: $("plansArchiveContent"),
  riskContent: $("riskContent"), riskArchiveContent: $("riskArchiveContent"),
  dailyNotesContent: $("dailyNotesContent"), dailyNotesArchiveContent: $("dailyNotesArchiveContent"),
  incidentsContent: $("incidentsContent"), incidentsArchiveContent: $("incidentsArchiveContent"),
  keyworkContent: $("keyworkContent"), keyworkArchiveContent: $("keyworkArchiveContent"),
  healthContent: $("healthContent"), educationContent: $("educationContent"), familyContent: $("familyContent"),
  chronologyContent: $("chronologyContent"), monthlyReviewsList: $("monthlyReviewsList"), monthlyReviewDetail: $("monthlyReviewDetail"),
  standardsSummary: $("standardsSummary"), standardsEvidenceList: $("standardsEvidenceList"), complianceContent: $("complianceContent"),
  refreshDailyNotesBtn: $("refreshDailyNotesBtn"), dailyNoteStatusFilter: $("dailyNoteStatusFilter"), dailyNoteShiftFilter: $("dailyNoteShiftFilter"), dailyNoteSearch: $("dailyNoteSearch"),
  rebuildChronologyBtn: $("rebuildChronologyBtn"), monthlyReviewMonth: $("monthlyReviewMonth"), generateMonthlyReviewBtn: $("generateMonthlyReviewBtn"),
  rebuildStandardsBtn: $("rebuildStandardsBtn"), complianceStatusFilter: $("complianceStatusFilter"), complianceCategoryFilter: $("complianceCategoryFilter"),
  plansOpenCreateBtn: $("plansOpenCreateBtn"), riskOpenCreateBtn: $("riskOpenCreateBtn"), dailyNotesOpenCreateBtn: $("dailyNotesOpenCreateBtn"), incidentsOpenCreateBtn: $("incidentsOpenCreateBtn"), keyworkOpenCreateBtn: $("keyworkOpenCreateBtn"),

  planForm: $("planForm"), planId: $("planId"), planType: $("planType"), planTitle: $("planTitle"), planPresentingNeed: $("planPresentingNeed"),
  planSummary: $("planSummary"), planChildVoice: $("planChildVoice"), planProactiveStrategies: $("planProactiveStrategies"),
  planPaceGuidance: $("planPaceGuidance"), planTriggers: $("planTriggers"), planProtectiveFactors: $("planProtectiveFactors"),
  planStartDate: $("planStartDate"), planReviewDate: $("planReviewDate"), planStatus: $("planStatus"), planOwnerId: $("planOwnerId"),
  planApprovalStatus: $("planApprovalStatus"), planCreatedBy: $("planCreatedBy"), clearPlanFormBtn: $("clearPlanFormBtn"),

  riskForm: $("riskForm"), riskId: $("riskId"), riskCategory: $("riskCategory"), riskTitle: $("riskTitle"), riskConcernSummary: $("riskConcernSummary"),
  riskKnownTriggers: $("riskKnownTriggers"), riskEarlyWarningSigns: $("riskEarlyWarningSigns"), riskContextualFactors: $("riskContextualFactors"),
  riskCurrentControls: $("riskCurrentControls"), riskDeescalationStrategies: $("riskDeescalationStrategies"), riskResponseActions: $("riskResponseActions"),
  riskChildViews: $("riskChildViews"), riskSeverity: $("riskSeverity"), riskLikelihood: $("riskLikelihood"), riskReviewDate: $("riskReviewDate"),
  riskStatus: $("riskStatus"), riskOwnerId: $("riskOwnerId"), riskApprovalStatus: $("riskApprovalStatus"), riskCreatedBy: $("riskCreatedBy"), clearRiskFormBtn: $("clearRiskFormBtn"),

  dailyNoteForm: $("dailyNoteForm"), dailyNoteId: $("dailyNoteId"), dailyNoteDate: $("dailyNoteDate"), dailyNoteShiftType: $("dailyNoteShiftType"),
  dailyNoteWorkflowStatus: $("dailyNoteWorkflowStatus"), dailyNoteMood: $("dailyNoteMood"), dailyNoteActivities: $("dailyNoteActivities"),
  dailyNoteEducationUpdate: $("dailyNoteEducationUpdate"), dailyNoteHealthUpdate: $("dailyNoteHealthUpdate"), dailyNoteFamilyUpdate: $("dailyNoteFamilyUpdate"),
  dailyNoteBehaviourUpdate: $("dailyNoteBehaviourUpdate"), dailyNoteYoungPersonVoice: $("dailyNoteYoungPersonVoice"), dailyNotePositives: $("dailyNotePositives"),
  dailyNoteActionsRequired: $("dailyNoteActionsRequired"), clearDailyNoteFormBtn: $("clearDailyNoteFormBtn"),

  incidentForm: $("incidentForm"), incidentId: $("incidentId"), incidentDatetime: $("incidentDatetime"), incidentType: $("incidentType"),
  incidentSeverity: $("incidentSeverity"), incidentLocation: $("incidentLocation"), incidentDescription: $("incidentDescription"),
  incidentResponse: $("incidentResponse"), incidentFollowUp: $("incidentFollowUp"), incidentManagerReviewStatus: $("incidentManagerReviewStatus"), clearIncidentFormBtn: $("clearIncidentFormBtn"),

  keyworkForm: $("keyworkForm"), keyworkId: $("keyworkId"), keyworkSessionDate: $("keyworkSessionDate"), keyworkWorkerId: $("keyworkWorkerId"),
  keyworkTopic: $("keyworkTopic"), keyworkPurpose: $("keyworkPurpose"), keyworkSummary: $("keyworkSummary"), keyworkChildVoice: $("keyworkChildVoice"),
  keyworkReflectiveAnalysis: $("keyworkReflectiveAnalysis"), keyworkActionsAgreed: $("keyworkActionsAgreed"), keyworkNextSessionDate: $("keyworkNextSessionDate"), clearKeyworkFormBtn: $("clearKeyworkFormBtn")
};

document.addEventListener("DOMContentLoaded", () => {
  const d = new Date();
  if (els.monthlyReviewMonth) els.monthlyReviewMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  $$(".tab-btn").forEach(b => on(b, "click", () => setTab(b.dataset.tab)));
  $$(".section-tab-btn").forEach(b => on(b, "click", () => setSectionTab(b.dataset.section, b.dataset.sectionTab)));

  on(els.youngPersonSearch, "input", searchPeople);
  on(els.refreshYoungPeopleBtn, "click", loadYoungPeople);
  on(els.reloadCurrentBtn, "click", reloadCurrent);
  on(els.inspectionPackBtn, "click", createPack);
  on(els.headerOfstedAiBtn, "click", () => loadOfsted());
  on(els.monthlyOfstedAiBtn, "click", () => loadOfsted(monthParam()));

  on(els.refreshDailyNotesBtn, "click", () => state.selectedYoungPerson && loadDaily(state.selectedYoungPerson.id));
  on(els.dailyNoteStatusFilter, "change", renderDailyLists);
  on(els.dailyNoteShiftFilter, "change", renderDailyLists);
  on(els.dailyNoteSearch, "input", renderDailyLists);

  on(els.rebuildChronologyBtn, "click", rebuildChronology);
  on(els.generateMonthlyReviewBtn, "click", generateMonthly);
  on(els.rebuildStandardsBtn, "click", rebuildStandards);
  on(els.complianceStatusFilter, "change", renderCompliance);
  on(els.complianceCategoryFilter, "change", renderCompliance);

  on(els.plansOpenCreateBtn, "click", () => (resetPlan(), setSectionTab("plans","form")));
  on(els.riskOpenCreateBtn, "click", () => (resetRisk(), setSectionTab("risk","form")));
  on(els.dailyNotesOpenCreateBtn, "click", () => (resetDaily(), setSectionTab("daily_notes","form")));
  on(els.incidentsOpenCreateBtn, "click", () => (resetIncident(), setSectionTab("incidents","form")));
  on(els.keyworkOpenCreateBtn, "click", () => (resetKeywork(), setSectionTab("keywork","form")));

  on(els.clearPlanFormBtn, "click", resetPlan);
  on(els.clearRiskFormBtn, "click", resetRisk);
  on(els.clearDailyNoteFormBtn, "click", resetDaily);
  on(els.clearIncidentFormBtn, "click", resetIncident);
  on(els.clearKeyworkFormBtn, "click", resetKeywork);

  on(els.planForm, "submit", savePlan);
  on(els.riskForm, "submit", saveRisk);
  on(els.dailyNoteForm, "submit", saveDaily);
  on(els.incidentForm, "submit", saveIncident);
  on(els.keyworkForm, "submit", saveKeywork);

  loadYoungPeople();
});

function monthParam() { return els.monthlyReviewMonth?.value ? `${els.monthlyReviewMonth.value}-01` : ""; }
function msg(text, err = false) {
  if (!els.statusBar) return;
  t(els.statusBar, text);
  els.statusBar.classList.remove("hidden", "error");
  if (err) els.statusBar.classList.add("error");
  clearTimeout(msg._t);
  msg._t = setTimeout(() => els.statusBar.classList.add("hidden"), 4000);
}
async function j(url, options = {}) {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, credentials: "include", ...options });
  if (!r.ok) {
    let m = `Request failed (${r.status})`;
    try { const d = await r.json(); if (d?.detail) m = d.detail; } catch {}
    throw new Error(m);
  }
  return (r.headers.get("content-type") || "").includes("application/json") ? r.json() : null;
}
async function jc(urls) {
  let e = null;
  for (const u of urls) try { return await j(u); } catch (x) { e = x; }
  throw e || new Error("No endpoint returned data");
}

function setTab(tab) {
  state.activeTab = tab;
  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".tab-panel").forEach(p => p.classList.toggle("active", p.id === `tab-${tab}`));
  loadTab();
}
function setSectionTab(section, tab) {
  state.sectionTabs[section] = tab;
  $$(`.section-tab-btn[data-section="${section}"]`).forEach(b => b.classList.toggle("active", b.dataset.sectionTab === tab));
  $$(`#tab-${section} .section-subpanel`).forEach(p => p.classList.toggle("active", p.id === `${section}-subpanel-${tab}`));
}
function searchPeople(e) {
  const q = e.target.value.trim().toLowerCase();
  state.filteredYoungPeople = state.youngPeople.filter(p => `${p.first_name||""} ${p.last_name||""} ${p.preferred_name||""}`.toLowerCase().includes(q));
  renderPeople();
}
function fullName(p) {
  const pref = p.preferred_name ? ` (${p.preferred_name})` : "";
  const n = `${p.first_name || ""} ${p.last_name || ""}`.trim();
  return n ? `${n}${pref}` : `Young Person #${p.id}`;
}
function renderPeople() {
  els.youngPeopleList.innerHTML = !state.filteredYoungPeople.length
    ? `<div class="empty-state">No young people found.</div>`
    : state.filteredYoungPeople.map(p => `
      <div class="young-person-card ${Number(state.selectedYoungPerson?.id) === Number(p.id) ? "active" : ""}" data-id="${p.id}">
        <h4>${esc(fullName(p))}</h4>
        <p>${esc(p.placement_status ? `Status: ${p.placement_status}` : `ID: ${p.id}`)}</p>
      </div>`).join("");
  $$(".young-person-card").forEach(c => on(c, "click", async () => {
    const p = state.youngPeople.find(x => Number(x.id) === Number(c.dataset.id));
    if (p) await selectPerson(p);
  }));
}
async function loadYoungPeople() {
  try {
    msg("Loading young people...");
    const rows = arr(await jc(ep.youngPeople));
    state.youngPeople = rows;
    state.filteredYoungPeople = [...rows];
    renderPeople();
    if (!state.selectedYoungPerson && rows.length) await selectPerson(rows[0]);
    else if (state.selectedYoungPerson) {
      const p = rows.find(x => Number(x.id) === Number(state.selectedYoungPerson.id));
      if (p) { state.selectedYoungPerson = p; renderPeople(); renderHeader(); }
    }
    msg("Young people loaded.");
  } catch (e) {
    els.youngPeopleList.innerHTML = `<div class="empty-state">Could not load young people.<br><small>${esc(e.message)}</small></div>`;
    msg(`Could not load young people: ${e.message}`, true);
  }
}
async function selectPerson(p) {
  state.selectedYoungPerson = p;
  Object.assign(state.latest, {
    overview: null, profile: null, plans: [], plansArchive: [], risk: [], riskArchive: [],
    dailyNotes: [], dailyNotesArchive: [], incidents: [], incidentsArchive: [], keywork: [], keyworkArchive: [],
    health: null, education: null, family: null, chronology: [], monthlyReviews: [], compliance: null
  });
  resetAll();
  renderPeople();
  renderHeader();
  await preload();
  await loadTab();
}
function renderHeader() {
  const p = state.selectedYoungPerson;
  if (!p) return t(els.selectedYoungPersonName, "Select a young person"), t(els.selectedYoungPersonMeta, "No record loaded");
  const bits = [`ID: ${p.id}`];
  if (p.date_of_birth) bits.push(`DOB: ${fDate(p.date_of_birth)}`);
  if (p.placement_status) bits.push(`Status: ${p.placement_status}`);
  if (p.summary_risk_level) bits.push(`Risk: ${p.summary_risk_level}`);
  t(els.selectedYoungPersonName, fullName(p));
  t(els.selectedYoungPersonMeta, bits.join(" | "));
}
async function preload() {
  if (!state.selectedYoungPerson) return;
  const id = state.selectedYoungPerson.id;
  try {
    const [profile, plans, risk, daily, incidents] = await Promise.all([
      jc(ep.profile(id)).catch(() => null),
      jc(ep.plans(id)).then(arr).catch(() => []),
      jc(ep.risk(id)).then(arr).catch(() => []),
      jc(ep.daily(id)).then(arr).catch(() => []),
      jc(ep.incidents(id)).then(arr).catch(() => [])
    ]);
    state.latest.profile = profile;
    state.latest.plans = plans;
    state.latest.risk = risk;
    state.latest.dailyNotes = daily;
    state.latest.incidents = incidents;
  } catch {}
}
async function reloadCurrent() {
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  await preload();
  await loadTab();
}
async function loadTab() {
  if (!state.selectedYoungPerson) return;
  const id = state.selectedYoungPerson.id;
  const m = {
    overview: () => loadOverview(id),
    profile: () => loadProfile(id),
    plans: () => loadPlans(id),
    risk: () => loadRisk(id),
    daily_notes: () => loadDaily(id),
    incidents: () => loadIncidents(id),
    keywork: () => loadKeywork(id),
    health: () => loadHealth(id),
    education: () => loadEducation(id),
    family: () => loadFamily(id),
    chronology: () => loadChronology(id),
    monthly_reviews: () => loadMonthly(id),
    standards: () => loadStandards(id),
    compliance: () => loadCompliance(id)
  }[state.activeTab];
  if (m) try { await m(); } catch (e) { msg(e.message, true); }
}

const empty = txt => `<div class="empty-state">${esc(txt)}</div>`;
const cards = (rows, type, cfg) => !rows?.length ? empty("No records found.") : `<div class="record-list">${
  rows.map(r => `<button class="record-card js-open-record" type="button" data-type="${type}" data-record='${esc(JSON.stringify(r))}'>
    <h4>${esc(cfg.title(r))}</h4><div class="record-meta">${esc(cfg.meta(r))}</div><div class="record-summary">${esc(trim(cfg.summary(r)))}</div>
  </button>`).join("")
}</div>`;
const kvCards = rows => !rows.length ? empty("No information.") : `<div class="record-list">${
  rows.map(([k,v]) => `<div class="record-card"><h4>${esc(k)}</h4><div class="record-summary">${esc(sVal(v))}</div></div>`).join("")
}</div>`;
const table = (rows, cols) => !rows?.length ? empty("No records found.") : `<table class="data-table"><thead><tr>${
  cols.filter(c => rows.some(r => c in r)).map(c => `<th>${esc(fmtLabel(c))}</th>`).join("")
}</tr></thead><tbody>${
  rows.map(r => `<tr>${cols.filter(c => rows.some(x => c in x)).map(c => `<td>${
    ["status","workflow_status","compliance_status"].includes(c) ? pill(r[c]) : c === "severity" ? pill(r[c]) : esc(fVal(c, r[c]))
  }</td>`).join("")}</tr>`).join("")
}</tbody></table>`;
const objSec = (title, row, cols) => {
  const keys = (cols || Object.keys(row || {})).filter(k => row && has(row[k]));
  return `<div class="panel"><div class="panel-header"><h3>${esc(title)}</h3></div>${
    !keys.length ? empty("No data found.") : `<table class="data-table key-value"><tbody>${keys.map(k => `<tr><th>${esc(fmtLabel(k))}</th><td>${esc(fVal(k, row[k]))}</td></tr>`).join("")}</tbody></table>`
  }</div>`;
};
const arrSec = (title, rows, cols) => `<div class="panel"><div class="panel-header"><h3>${esc(title)}</h3></div>${table(arr(rows), cols)}</div>`;

function bindRecordButtons() {
  $$(".js-open-record").forEach(b => b.onclick = async () => {
    let r; try { r = JSON.parse(b.dataset.record); } catch { return; }
    const map = {
      plan: editPlan,
      risk: editRisk,
      daily_note: editDaily,
      incident: editIncident,
      keywork: editKeywork,
      monthly_review: x => x.id && openMonthlyDetail(x.id)
    };
    if (map[b.dataset.type]) await map[b.dataset.type](r);
  });
}

async function loadOverview(id) {
  els.overviewContent.innerHTML = empty("Loading overview...");
  const d = await jc(ep.overview(id));
  state.latest.overview = d;
  els.overviewContent.innerHTML = kvCards([
    ["Placement Status", d?.placement_status], ["Risk Level", d?.summary_risk_level], ["Legal Status", d?.legal_status],
    ["School", d?.school_name], ["GP", d?.gp_name], ["What Matters", d?.what_matters_to_me]
  ].filter(([,x]) => has(x)));
}
async function loadProfile(id) {
  els.profileContent.innerHTML = empty("Loading profile...");
  const d = await jc(ep.profile(id));
  state.latest.profile = d;
  els.profileContent.innerHTML = [
    objSec("Young Person", d?.young_person || {}, ["id","first_name","last_name","preferred_name","date_of_birth","gender","ethnicity","local_id_number","placement_status","summary_risk_level"]),
    arrSec("Legal Status", d?.legal_status || [], ["legal_status","order_type","order_details","effective_from","effective_to","is_current"]),
    arrSec("Communication Profile", d?.communication_profile || [], ["neurodiversity_summary","communication_style","sensory_profile","processing_needs","what_helps"]),
    arrSec("Identity Profile", d?.identity_profile || [], ["interests","strengths_summary","what_matters_to_me"]),
    arrSec("Alerts", d?.alerts || [], ["alert_type","title","description","severity","review_date"])
  ].join("");
}
async function loadPlans(id) {
  els.plansContent.innerHTML = empty("Loading plans...");
  els.plansArchiveContent.innerHTML = empty("Loading archived plans...");
  const [cur, arc] = await Promise.all([jc(ep.plans(id)).then(arr), jc(ep.plansArchive(id)).then(arr).catch(() => [])]);
  state.latest.plans = cur; state.latest.plansArchive = arc;
  const cfg = { title:r=>r.title||r.plan_type||"Plan", meta:r=>`${sVal(r.status)} • ${r.review_date?fDate(r.review_date):"No review date"}`, summary:r=>r.presenting_need||r.summary||"No summary" };
  els.plansContent.innerHTML = cards(cur, "plan", cfg);
  els.plansArchiveContent.innerHTML = cards(arc, "plan", cfg);
  bindRecordButtons();
}
async function loadRisk(id) {
  els.riskContent.innerHTML = empty("Loading risk...");
  els.riskArchiveContent.innerHTML = empty("Loading archived risk...");
  const [cur, arc] = await Promise.all([jc(ep.risk(id)).then(arr), jc(ep.riskArchive(id)).then(arr).catch(() => [])]);
  state.latest.risk = cur; state.latest.riskArchive = arc;
  const cfg = { title:r=>r.title||r.category||"Risk assessment", meta:r=>`${sVal(r.severity)} • ${r.review_date?fDate(r.review_date):"No review date"}`, summary:r=>r.concern_summary||"No summary" };
  els.riskContent.innerHTML = cards(cur, "risk", cfg);
  els.riskArchiveContent.innerHTML = cards(arc, "risk", cfg);
  bindRecordButtons();
}
async function loadDaily(id) {
  els.dailyNotesContent.innerHTML = empty("Loading daily notes...");
  els.dailyNotesArchiveContent.innerHTML = empty("Loading archived daily notes...");
  const [cur, arc] = await Promise.all([jc(ep.daily(id)).then(arr), jc(ep.dailyArchive(id)).then(arr).catch(() => [])]);
  state.latest.dailyNotes = cur; state.latest.dailyNotesArchive = arc;
  renderDailyLists();
}
function renderDailyLists() {
  const cfg = { title:r=>`${fDate(r.note_date)} • ${sVal(r.shift_type)}`, meta:r=>`${sVal(r.workflow_status)} • ${r.author_first_name||""}`.trim(), summary:r=>r.activities||r.presentation||r.young_person_voice||"No summary" };
  let cur = [...state.latest.dailyNotes], arc = [...state.latest.dailyNotesArchive];
  const status = els.dailyNoteStatusFilter?.value || "all";
  const shift = els.dailyNoteShiftFilter?.value || "all";
  const q = (els.dailyNoteSearch?.value || "").trim().toLowerCase();
  const filt = rows => rows.filter(r =>
    (status === "all" || String(r.workflow_status || "").toLowerCase() === status) &&
    (shift === "all" || String(r.shift_type || "").toLowerCase() === shift) &&
    (!q || [r.note_date,r.shift_type,r.workflow_status,r.activities,r.presentation,r.young_person_voice].join(" ").toLowerCase().includes(q))
  );
  cur = filt(cur); arc = filt(arc);
  els.dailyNotesContent.innerHTML = cards(cur, "daily_note", cfg);
  els.dailyNotesArchiveContent.innerHTML = cards(arc, "daily_note", cfg);
  bindRecordButtons();
}
async function loadIncidents(id) {
  els.incidentsContent.innerHTML = empty("Loading incidents...");
  els.incidentsArchiveContent.innerHTML = empty("Loading archived incidents...");
  const [cur, arc] = await Promise.all([jc(ep.incidents(id)).then(arr), jc(ep.incidentsArchive(id)).then(arr).catch(() => [])]);
  state.latest.incidents = cur; state.latest.incidentsArchive = arc;
  const cfg = { title:r=>r.incident_type||"Incident", meta:r=>`${r.incident_datetime?fDateTime(r.incident_datetime):"No date"} • ${sVal(r.severity)}`, summary:r=>r.description||"No summary" };
  els.incidentsContent.innerHTML = cards(cur, "incident", cfg);
  els.incidentsArchiveContent.innerHTML = cards(arc, "incident", cfg);
  bindRecordButtons();
}
async function loadKeywork(id) {
  els.keyworkContent.innerHTML = empty("Loading keywork...");
  els.keyworkArchiveContent.innerHTML = empty("Loading archived keywork...");
  const [cur, arc] = await Promise.all([j(ep.keywork(id)).then(arr), j(ep.keyworkArchive(id)).then(arr).catch(() => [])]);
  state.latest.keywork = cur; state.latest.keyworkArchive = arc;
  const cfg = { title:r=>r.topic||"Keywork session", meta:r=>`${r.session_date?fDate(r.session_date):"No date"} • ${r.worker_first_name||""}`.trim(), summary:r=>r.summary||r.purpose||"No summary" };
  els.keyworkContent.innerHTML = cards(cur, "keywork", cfg);
  els.keyworkArchiveContent.innerHTML = cards(arc, "keywork", cfg);
  bindRecordButtons();
}
async function loadHealth(id) {
  els.healthContent.innerHTML = empty("Loading health...");
  const d = await jc(ep.health(id));
  state.latest.health = d;
  const rows = [...(d?.health_records || []), ...(d?.medication_records || [])];
  els.healthContent.innerHTML = cards(rows, "health", { title:r=>r.title||r.record_type||r.medication_name||"Health record", meta:r=>r.event_datetime?fDateTime(r.event_datetime):r.scheduled_time?fDateTime(r.scheduled_time):"No date", summary:r=>r.summary||r.outcome||r.status||"No summary" });
}
async function loadEducation(id) {
  els.educationContent.innerHTML = empty("Loading education...");
  const d = await jc(ep.education(id));
  state.latest.education = d;
  els.educationContent.innerHTML = cards(d?.education_records || [], "education", { title:r=>r.provision_name||"Education record", meta:r=>`${r.record_date?fDate(r.record_date):"No date"} • ${sVal(r.attendance_status)}`, summary:r=>r.behaviour_summary||r.learning_engagement||r.achievement_note||"No summary" });
}
async function loadFamily(id) {
  els.familyContent.innerHTML = empty("Loading family...");
  const d = await jc(ep.family(id));
  state.latest.family = d;
  els.familyContent.innerHTML = cards(d?.family_contact_records || [], "family", { title:r=>r.contact_person||"Family record", meta:r=>`${r.contact_datetime?fDateTime(r.contact_datetime):"No date"} • ${sVal(r.contact_type)}`, summary:r=>r.child_voice||r.concerns||r.post_contact_presentation||"No summary" });
}
async function loadChronology(id) {
  els.chronologyContent.innerHTML = empty("Loading chronology...");
  const rows = arr(await j(ep.chronology(id)));
  state.latest.chronology = rows;
  els.chronologyContent.innerHTML = table(rows, ["event_datetime","category","subcategory","title","summary","significance","source_table"]);
}
async function loadMonthly(id) {
  els.monthlyReviewsList.innerHTML = empty("Loading monthly reviews...");
  const rows = await j(ep.monthly(id));
  state.latest.monthlyReviews = rows || [];
  if (!rows?.length) {
    els.monthlyReviewsList.innerHTML = empty("No monthly reviews yet.");
    els.monthlyReviewDetail.innerHTML = empty("Select a review to view details.");
    return;
  }
  els.monthlyReviewsList.innerHTML = cards(rows, "monthly_review", { title:r=>r.review_title||"Monthly review", meta:r=>`${r.review_month?fDate(r.review_month):"No month"} • ${sVal(r.status)}`, summary:r=>r.summary_of_month||r.progress_summary||"Open to view detail" });
  bindRecordButtons();
}
async function openMonthlyDetail(id) {
  els.monthlyReviewDetail.innerHTML = empty("Loading review...");
  const d = await j(ep.monthlyDetail(id));
  els.monthlyReviewDetail.innerHTML = [
    objSec("Review Summary", d?.review || {}, ["review_title","review_month","status","summary_of_month","progress_summary","child_voice_summary","concerns_and_risks","education_summary","health_summary","family_summary","keywork_summary","behaviour_summary","achievements_summary","actions_for_next_month","manager_analysis"]),
    arrSec("Linked Evidence", d?.record_links || [], ["source_table","source_id","link_reason","created_at"]),
    arrSec("Standards Summary", d?.standards || [], ["standard_code","standard_short_label","evidence_count","narrative_summary"]),
    arrSec("Actions", d?.actions || [], ["action_text","action_owner_id","due_date","status"])
  ].join("");
}
async function loadStandards(id) {
  els.standardsSummary.innerHTML = empty("Loading standards...");
  els.standardsEvidenceList.innerHTML = empty("Loading evidence...");
  const [s, e] = await Promise.all([jc(ep.standards(id)), jc(ep.evidence(id))]);
  els.standardsSummary.innerHTML = !s?.length ? empty("No standards data found.") : table(s, ["code","short_label","linked_record_count"]);
  els.standardsEvidenceList.innerHTML = !e?.length ? empty("No evidence linked yet.") : table(e, ["standard_code","source_table","source_id","evidence_strength","rationale","created_at"]);
}
async function loadCompliance(id) {
  els.complianceContent.innerHTML = empty("Loading compliance...");
  state.latest.compliance = await jc(ep.compliance(id));
  renderCompliance();
}
function renderCompliance() {
  const d = state.latest.compliance;
  if (!d) return els.complianceContent.innerHTML = empty("No compliance data found.");
  let rows = Array.isArray(d.compliance_items) ? d.compliance_items : [];
  const s = els.complianceStatusFilter?.value || "all";
  const c = els.complianceCategoryFilter?.value || "all";
  if (s !== "all") rows = rows.filter(r => r.compliance_status === s);
  if (c !== "all") rows = rows.filter(r => r.compliance_type === c);
  els.complianceContent.innerHTML = table(rows, ["compliance_status","title","due_date","status","approval_status","created_at"]);
}

async function editPlan(r) {
  r = r?.id ? await j(ep.planById(r.id)) : r;
  v(els.planId, r.id); v(els.planType, r.plan_type); v(els.planTitle, r.title); v(els.planPresentingNeed, r.presenting_need);
  v(els.planSummary, r.summary); v(els.planChildVoice, r.child_voice); v(els.planProactiveStrategies, r.proactive_strategies);
  v(els.planPaceGuidance, r.pace_guidance); v(els.planTriggers, r.triggers); v(els.planProtectiveFactors, r.protective_factors);
  v(els.planStartDate, dInput(r.start_date)); v(els.planReviewDate, dInput(r.review_date)); v(els.planStatus, r.status || "active");
  v(els.planOwnerId, r.owner_id); v(els.planApprovalStatus, r.approval_status || "not_required"); v(els.planCreatedBy, r.created_by);
  setSectionTab("plans", "form");
}
async function editRisk(r) {
  r = r?.id ? await j(ep.riskById(r.id)) : r;
  v(els.riskId, r.id); v(els.riskCategory, r.category); v(els.riskTitle, r.title); v(els.riskConcernSummary, r.concern_summary);
  v(els.riskKnownTriggers, r.known_triggers); v(els.riskEarlyWarningSigns, r.early_warning_signs); v(els.riskContextualFactors, r.contextual_factors);
  v(els.riskCurrentControls, r.current_controls); v(els.riskDeescalationStrategies, r.deescalation_strategies); v(els.riskResponseActions, r.response_actions);
  v(els.riskChildViews, r.child_views); v(els.riskSeverity, r.severity || "medium"); v(els.riskLikelihood, r.likelihood || "medium");
  v(els.riskReviewDate, dInput(r.review_date)); v(els.riskStatus, r.status || "active"); v(els.riskOwnerId, r.owner_id);
  v(els.riskApprovalStatus, r.approval_status || "not_required"); v(els.riskCreatedBy, r.created_by);
  setSectionTab("risk", "form");
}
async function editDaily(r) {
  r = r?.id ? await j(ep.dailyById(r.id)) : r;
  v(els.dailyNoteId, r.id); v(els.dailyNoteDate, dInput(r.note_date)); v(els.dailyNoteShiftType, r.shift_type || "day");
  v(els.dailyNoteWorkflowStatus, r.workflow_status || "draft"); v(els.dailyNoteMood, r.mood || r.presentation); v(els.dailyNoteActivities, r.activities);
  v(els.dailyNoteEducationUpdate, r.education_update); v(els.dailyNoteHealthUpdate, r.health_update); v(els.dailyNoteFamilyUpdate, r.family_update);
  v(els.dailyNoteBehaviourUpdate, r.behaviour_update); v(els.dailyNoteYoungPersonVoice, r.young_person_voice); v(els.dailyNotePositives, r.positives);
  v(els.dailyNoteActionsRequired, r.actions_required);
  setSectionTab("daily_notes", "form");
}
async function editIncident(r) {
  r = r?.id ? await j(ep.incidentById(r.id)) : r;
  v(els.incidentId, r.id); v(els.incidentDatetime, dtInput(r.incident_datetime)); v(els.incidentType, r.incident_type); v(els.incidentSeverity, r.severity || "medium");
  v(els.incidentLocation, r.location); v(els.incidentDescription, r.description); v(els.incidentResponse, r.staff_response || r.response);
  v(els.incidentFollowUp, r.follow_up_required); v(els.incidentManagerReviewStatus, r.manager_review_status || "pending");
  setSectionTab("incidents", "form");
}
async function editKeywork(r) {
  r = r?.id ? await j(ep.keyworkById(r.id)) : r;
  v(els.keyworkId, r.id); v(els.keyworkSessionDate, dInput(r.session_date)); v(els.keyworkWorkerId, r.worker_id); v(els.keyworkTopic, r.topic);
  v(els.keyworkPurpose, r.purpose); v(els.keyworkSummary, r.summary); v(els.keyworkChildVoice, r.child_voice);
  v(els.keyworkReflectiveAnalysis, r.reflective_analysis); v(els.keyworkActionsAgreed, r.actions_agreed); v(els.keyworkNextSessionDate, dInput(r.next_session_date));
  setSectionTab("keywork", "form");
}

function resetPlan() { els.planForm?.reset(); v(els.planId, ""); }
function resetRisk() { els.riskForm?.reset(); v(els.riskId, ""); }
function resetDaily() { els.dailyNoteForm?.reset(); v(els.dailyNoteId, ""); }
function resetIncident() { els.incidentForm?.reset(); v(els.incidentId, ""); }
function resetKeywork() { els.keyworkForm?.reset(); v(els.keyworkId, ""); }
function resetAll() { resetPlan(); resetRisk(); resetDaily(); resetIncident(); resetKeywork(); }

async function savePlan(e) {
  e.preventDefault();
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  const id = clean(els.planId?.value);
  const p = {
    young_person_id: Number(state.selectedYoungPerson.id),
    plan_type: clean(els.planType?.value), title: clean(els.planTitle?.value),
    presenting_need: clean(els.planPresentingNeed?.value), summary: clean(els.planSummary?.value),
    child_voice: clean(els.planChildVoice?.value), proactive_strategies: clean(els.planProactiveStrategies?.value),
    pace_guidance: clean(els.planPaceGuidance?.value), triggers: clean(els.planTriggers?.value),
    protective_factors: clean(els.planProtectiveFactors?.value), start_date: clean(els.planStartDate?.value),
    review_date: clean(els.planReviewDate?.value), status: clean(els.planStatus?.value) || "active",
    owner_id: nint(els.planOwnerId?.value), approval_status: clean(els.planApprovalStatus?.value) || "not_required",
    created_by: nint(els.planCreatedBy?.value), archived: String(clean(els.planStatus?.value) || "").toLowerCase() === "archived"
  };
  if (!p.plan_type || !p.title) return msg("Plan type and title are required.", true);
  try {
    await j(id ? ep.planUpdate(id) : ep.planCreate, { method: id ? "PUT" : "POST", body: JSON.stringify(id ? { ...p, young_person_id: undefined } : p) });
    msg(`Plan ${id ? "updated" : "created"}.`);
    resetPlan(); setSectionTab("plans", "records"); await loadPlans(state.selectedYoungPerson.id); await preload();
  } catch (e2) { msg(`Could not save plan: ${e2.message}`, true); }
}
async function saveRisk(e) {
  e.preventDefault();
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  const id = clean(els.riskId?.value);
  const p = {
    young_person_id: Number(state.selectedYoungPerson.id),
    category: clean(els.riskCategory?.value), title: clean(els.riskTitle?.value), concern_summary: clean(els.riskConcernSummary?.value),
    known_triggers: clean(els.riskKnownTriggers?.value), early_warning_signs: clean(els.riskEarlyWarningSigns?.value),
    contextual_factors: clean(els.riskContextualFactors?.value), current_controls: clean(els.riskCurrentControls?.value),
    deescalation_strategies: clean(els.riskDeescalationStrategies?.value), response_actions: clean(els.riskResponseActions?.value),
    child_views: clean(els.riskChildViews?.value), severity: clean(els.riskSeverity?.value) || "medium", likelihood: clean(els.riskLikelihood?.value) || "medium",
    review_date: clean(els.riskReviewDate?.value), status: clean(els.riskStatus?.value) || "active", owner_id: nint(els.riskOwnerId?.value),
    approval_status: clean(els.riskApprovalStatus?.value) || "not_required", created_by: nint(els.riskCreatedBy?.value),
    archived: String(clean(els.riskStatus?.value) || "").toLowerCase() === "archived"
  };
  if (!p.category || !p.title) return msg("Category and title are required.", true);
  try {
    await j(id ? ep.riskUpdate(id) : ep.riskCreate, { method: id ? "PUT" : "POST", body: JSON.stringify(id ? { ...p, young_person_id: undefined } : p) });
    msg(`Risk ${id ? "updated" : "created"}.`);
    resetRisk(); setSectionTab("risk", "records"); await loadRisk(state.selectedYoungPerson.id); await preload();
  } catch (e2) { msg(`Could not save risk: ${e2.message}`, true); }
}
async function saveDaily(e) {
  e.preventDefault();
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  const id = clean(els.dailyNoteId?.value);
  const p = {
    young_person_id: Number(state.selectedYoungPerson.id),
    note_date: clean(els.dailyNoteDate?.value), shift_type: clean(els.dailyNoteShiftType?.value), workflow_status: clean(els.dailyNoteWorkflowStatus?.value) || "draft",
    mood: clean(els.dailyNoteMood?.value), presentation: clean(els.dailyNoteMood?.value), activities: clean(els.dailyNoteActivities?.value),
    education_update: clean(els.dailyNoteEducationUpdate?.value), health_update: clean(els.dailyNoteHealthUpdate?.value),
    family_update: clean(els.dailyNoteFamilyUpdate?.value), behaviour_update: clean(els.dailyNoteBehaviourUpdate?.value),
    young_person_voice: clean(els.dailyNoteYoungPersonVoice?.value), positives: clean(els.dailyNotePositives?.value), actions_required: clean(els.dailyNoteActionsRequired?.value)
  };
  if (!p.note_date || !p.shift_type) return msg("Date and shift type are required.", true);
  try {
    await j(id ? ep.dailyUpdate(id) : ep.dailyCreate, { method: id ? "PUT" : "POST", body: JSON.stringify(id ? { ...p, young_person_id: undefined } : p) });
    msg(`Daily note ${id ? "updated" : "created"}.`);
    resetDaily(); setSectionTab("daily_notes", "records"); await loadDaily(state.selectedYoungPerson.id); await preload();
  } catch (e2) { msg(`Could not save daily note: ${e2.message}`, true); }
}
async function saveIncident(e) {
  e.preventDefault();
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  const id = clean(els.incidentId?.value);
  const st = clean(els.incidentManagerReviewStatus?.value) || "pending";
  const p = {
    young_person_id: Number(state.selectedYoungPerson.id),
    incident_datetime: clean(els.incidentDatetime?.value), incident_type: clean(els.incidentType?.value), severity: clean(els.incidentSeverity?.value) || "medium",
    location: clean(els.incidentLocation?.value), description: clean(els.incidentDescription?.value),
    follow_up_required: clean(els.incidentFollowUp?.value), manager_review_status: st,
    archived: ["reviewed","closed","archived","completed"].includes(String(st).toLowerCase())
  };
  if (!p.incident_datetime || !p.incident_type) return msg("Incident date/time and type are required.", true);
  try {
    await j(id ? ep.incidentUpdate(id) : ep.incidentCreate, { method: id ? "PUT" : "POST", body: JSON.stringify(id ? { ...p, young_person_id: undefined } : p) });
    msg(`Incident ${id ? "updated" : "created"}.`);
    resetIncident(); setSectionTab("incidents", "records"); await loadIncidents(state.selectedYoungPerson.id); await preload();
  } catch (e2) { msg(`Could not save incident: ${e2.message}`, true); }
}
async function saveKeywork(e) {
  e.preventDefault();
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  const id = clean(els.keyworkId?.value);
  const p = {
    young_person_id: Number(state.selectedYoungPerson.id),
    session_date: clean(els.keyworkSessionDate?.value), worker_id: nint(els.keyworkWorkerId?.value), topic: clean(els.keyworkTopic?.value),
    purpose: clean(els.keyworkPurpose?.value), summary: clean(els.keyworkSummary?.value), child_voice: clean(els.keyworkChildVoice?.value),
    reflective_analysis: clean(els.keyworkReflectiveAnalysis?.value), actions_agreed: clean(els.keyworkActionsAgreed?.value),
    next_session_date: clean(els.keyworkNextSessionDate?.value), status: "active", archived: false
  };
  if (!p.session_date || !p.topic) return msg("Session date and topic are required.", true);
  try {
    await j(id ? ep.keyworkUpdate(id) : ep.keyworkCreate, { method: id ? "PUT" : "POST", body: JSON.stringify(id ? { ...p, young_person_id: undefined } : p) });
    msg(`Keywork ${id ? "updated" : "created"}.`);
    resetKeywork(); setSectionTab("keywork", "records"); await loadKeywork(state.selectedYoungPerson.id); await preload();
  } catch (e2) { msg(`Could not save keywork: ${e2.message}`, true); }
}

async function rebuildChronology() {
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  try { await j(ep.chronologyRebuild(state.selectedYoungPerson.id), { method: "POST" }); msg("Chronology rebuilt successfully."); await loadChronology(state.selectedYoungPerson.id); }
  catch (e) { msg(`Could not rebuild chronology: ${e.message}`, true); }
}
async function generateMonthly() {
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  if (!monthParam()) return msg("Please choose a month first.", true);
  try {
    const r = await j(ep.monthlyGenerate(state.selectedYoungPerson.id, monthParam()), { method: "POST" });
    msg("Monthly review generated successfully.");
    await loadMonthly(state.selectedYoungPerson.id);
    if (r?.monthly_review_id) await openMonthlyDetail(r.monthly_review_id);
  } catch (e) { msg(`Could not generate monthly review: ${e.message}`, true); }
}
async function rebuildStandards() {
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  try { await j(ep.standardsRebuild(state.selectedYoungPerson.id), { method: "POST" }); msg("Standards links rebuilt successfully."); await loadStandards(state.selectedYoungPerson.id); }
  catch (e) { msg(`Could not rebuild standards links: ${e.message}`, true); }
}
async function createPack() {
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  try {
    const r = await j(ep.pack, { method: "POST", body: JSON.stringify({ scope_type: "young_person", scope_id: state.selectedYoungPerson.id, pack_type: "ofsted", requested_by: 1 }) });
    msg(`Inspection pack job created${r?.id ? ` (#${r.id})` : ""}.`);
  } catch (e) { msg(`Could not create inspection pack job: ${e.message}`, true); }
}
async function loadOfsted(reviewMonth = "") {
  if (!state.selectedYoungPerson) return msg("Please select a young person first.", true);
  try { msg("Generating AI OFSTED report..."); await j(ep.ofsted(state.selectedYoungPerson.id, reviewMonth)); msg("AI OFSTED report route loaded."); }
  catch (e) { msg(`Could not load AI OFSTED report: ${e.message}`, true); }
}
