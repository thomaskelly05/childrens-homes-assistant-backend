const state = {
  youngPeople: [],
  selected: null,
  activeTab: "overview",
  latest: {
    overview: null,
    profile: null,
    plans: [],
    risk: [],
    daily: [],
    incidents: [],
    health: null,
    education: null,
    family: null,
    keywork: [],
    handover: [],
    reports: [],
    statutory: [],
    chronology: [],
    monthly: [],
    compliance: null
  },
  doc: {
    type: null,
    id: null,
    saveFn: null,
    dirty: false,
    timer: null
  }
};

const ep = {
  youngPeople: ["/young-people", "/young-people/list"],
  overview: id => [`/young-people/${id}`],
  profile: id => [`/young-people/${id}/profile`],
  profileCoreUpdate: id => `/young-people/${id}/profile/core`,
  profileCommUpdate: id => `/young-people/${id}/profile/communication`,
  profileIdentityUpdate: id => `/young-people/${id}/profile/identity`,
  photo: id => `/young-people/${id}/photo`,

  plans: id => [`/young-people/${id}/plans`],
  planById: id => `/young-people/plans/${id}`,
  planCreate: "/young-people/plans",
  planUpdate: id => `/young-people/plans/${id}`,
  planSubmit: id => `/young-people/plans/${id}/submit`,
  planApprove: id => `/young-people/plans/${id}/approve`,
  planReturn: id => `/young-people/plans/${id}/return`,

  risk: id => [`/young-people/${id}/risk`],
  riskById: id => `/young-people/risk/${id}`,
  riskCreate: "/young-people/risk",
  riskUpdate: id => `/young-people/risk/${id}`,
  riskSubmit: id => `/young-people/risk/${id}/submit`,
  riskApprove: id => `/young-people/risk/${id}/approve`,
  riskReturn: id => `/young-people/risk/${id}/return`,

  daily: id => [`/young-people/${id}/daily-notes`],
  dailyById: id => `/young-people/daily-notes/${id}`,
  dailyCreate: "/young-people/daily-notes",
  dailyUpdate: id => `/young-people/daily-notes/${id}`,
  dailySubmit: id => `/young-people/daily-notes/${id}/submit`,
  dailyApprove: id => `/young-people/daily-notes/${id}/approve`,
  dailyReturn: id => `/young-people/daily-notes/${id}/return`,

  incidents: id => [`/young-people/${id}/incidents`],
  incidentById: id => `/young-people/incidents/${id}`,
  incidentCreate: "/young-people/incidents",
  incidentUpdate: id => `/young-people/incidents/${id}`,
  incidentSubmit: id => `/young-people/incidents/${id}/submit`,
  incidentApprove: id => `/young-people/incidents/${id}/approve`,
  incidentReturn: id => `/young-people/incidents/${id}/return`,

  health: id => [`/young-people/${id}/health`],
  healthProfileUpdate: id => `/young-people/${id}/health/profile`,

  education: id => [`/young-people/${id}/education`],
  educationProfileUpdate: id => `/young-people/${id}/education/profile`,

  family: id => [`/young-people/${id}/family`],
  familyContactCreate: id => `/young-people/${id}/family/contacts`,
  familyContactUpdate: id => `/young-people/family/contacts/${id}`,

  keywork: id => `/young-people/${id}/keywork`,
  keyworkById: id => `/young-people/keywork/${id}`,
  keyworkCreate: "/young-people/keywork",
  keyworkUpdate: id => `/young-people/keywork/${id}`,
  keyworkSubmit: id => `/young-people/keywork/${id}/submit`,
  keyworkApprove: id => `/young-people/keywork/${id}/approve`,
  keyworkReturn: id => `/young-people/keywork/${id}/return`,

  handover: id => `/young-people/${id}/handover`,
  handoverGenerate: id => `/young-people/${id}/handover/generate`,

  reports: id => `/young-people/${id}/reports`,
  reportLinks: id => `/reports/${id}/links`,

  statutory: id => `/young-people/${id}/statutory-documents`,
  statutoryById: id => `/young-people/statutory-documents/${id}`,
  statutoryCreate: id => `/young-people/${id}/statutory-documents`,
  statutoryUpload: id => `/young-people/${id}/statutory-documents/upload`,
  statutoryUpdate: id => `/young-people/statutory-documents/${id}`,
  statutoryDownload: id => `/young-people/statutory-documents/${id}/download`,

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
  ofsted: (id, m = "") => m ? `/ofsted-ai/young-person/${id}/report?review_month=${encodeURIComponent(m)}` : `/ofsted-ai/young-person/${id}/report`,

  exportPrint: (type, id) => `/exports/${type}/${id}/print`,
  exportPdf: (type, id) => `/exports/${type}/${id}/pdf`,
  exportWord: (type, id) => `/exports/${type}/${id}/docx`
};

const $ = id => document.getElementById(id);
const $$ = s => [...document.querySelectorAll(s)];
const arr = d => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.rows) ? d.rows : Array.isArray(d?.data) ? d.data : [];
const esc = s => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const clean = v => (typeof v === "string" ? v.trim() : v) || null;
const n = v => { const x = Number(String(v ?? "").trim()); return Number.isNaN(x) ? null : x; };
const has = v => v !== null && v !== undefined && v !== "";
const fDate = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB"); };
const fDateTime = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`; };
const dateInput = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10); };
const dtInput = x => { const d = new Date(x); return !x || Number.isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

function tone(v){
  v = String(v || "").toLowerCase();
  if (["approved","active","reviewed","current","ok"].includes(v)) return "green";
  if (["submitted","generated","completed"].includes(v)) return "blue";
  if (["due_soon","pending","draft","medium"].includes(v)) return "amber";
  if (["returned","overdue","high","expired","archived"].includes(v)) return "red";
  return "grey";
}
function pill(v){ return `<span class="pill ${tone(v)}">${esc(v || "—")}</span>`; }

function msg(text, bad = false){
  const el = $("statusBar");
  el.classList.remove("hidden");
  el.innerHTML = `<span class="pill ${bad ? "red" : "green"}">${esc(text)}</span>`;
  clearTimeout(msg._t);
  msg._t = setTimeout(() => el.classList.add("hidden"), 3500);
}

async function j(url, options = {}){
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok){
    let m = `Request failed (${res.status})`;
    try {
      const d = await res.json();
      if (d?.detail) m = d.detail;
    } catch {}
    throw new Error(m);
  }
  return (res.headers.get("content-type") || "").includes("application/json") ? res.json() : null;
}

async function jc(urls){
  let lastErr = null;
  for (const u of urls){
    try { return await j(u); }
    catch (e){ lastErr = e; }
  }
  throw lastErr || new Error("No endpoint returned data");
}

function fullName(p){
  const pref = p.preferred_name ? ` (${p.preferred_name})` : "";
  return `${p.first_name || ""} ${p.last_name || ""}`.trim() + pref || `Young Person #${p.id}`;
}

function setPhoto(src, fallback = "YP"){
  const img = $("youngPersonPhotoPreview");
  const fb = $("youngPersonPhotoFallback");
  if (src){
    img.src = src;
    img.hidden = false;
    fb.hidden = true;
  } else {
    img.hidden = true;
    fb.hidden = false;
    fb.textContent = fallback;
  }
}

function setTab(tab){
  state.activeTab = tab;
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".panel").forEach(p => p.classList.toggle("active", p.id === `tab-${tab}`));
  closeMobileSheet();
  loadTab();
}

function openDocumentMode(){
  $("browseMode").classList.add("hidden");
  $("documentMode").classList.remove("hidden");
}

function closeDocumentMode(){
  $("documentMode").classList.add("hidden");
  $("browseMode").classList.remove("hidden");
  stopAutosave();
  state.doc = { type: null, id: null, saveFn: null, dirty: false, timer: null };
}

function startAutosave(fn){
  stopAutosave();
  state.doc.timer = setInterval(async () => {
    if (!state.doc.dirty || !state.doc.saveFn) return;
    try {
      $("docAutosaveState").textContent = "Autosaving…";
      $("docAutosaveState").className = "pill amber";
      await fn(true);
      state.doc.dirty = false;
      $("docAutosaveState").textContent = `Saved ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`;
      $("docAutosaveState").className = "pill green";
    } catch {
      $("docAutosaveState").textContent = "Autosave failed";
      $("docAutosaveState").className = "pill red";
    }
  }, 30000);
}

function stopAutosave(){
  if (state.doc.timer) clearInterval(state.doc.timer);
  state.doc.timer = null;
}

function markDirty(){
  state.doc.dirty = true;
  $("docAutosaveState").textContent = "Unsaved changes";
  $("docAutosaveState").className = "pill amber";
}

function setDocHeader({type, title, meta, workflow, exportType, exportId}){
  state.doc.type = exportType || type;
  state.doc.id = exportId;
  $("docEyebrow").textContent = type;
  $("docTitle").textContent = title;
  $("docMeta").textContent = meta || "";
  $("docWorkflowState").textContent = workflow || "Open";
  $("docWorkflowState").className = `pill ${tone(workflow)}`;
}

function setDocActions({show = true, saveFn = null, submitFn = null, approveFn = null, returnFn = null} = {}){
  $("docActions").classList.toggle("hidden", !show);
  state.doc.saveFn = saveFn || null;
  $("docSaveBtn").onclick = async () => saveFn && saveFn(false);
  $("docSubmitBtn").onclick = async () => submitFn && submitFn();
  $("docApproveBtn").onclick = async () => approveFn && approveFn();
  $("docReturnBtn").onclick = async () => returnFn && returnFn();

  $("docPrintBtn").onclick = () => {
    if (!state.doc.type || !state.doc.id) return;
    window.open(ep.exportPrint(state.doc.type, state.doc.id), "_blank");
  };
  $("docPdfBtn").onclick = () => {
    if (!state.doc.type || !state.doc.id) return;
    window.open(ep.exportPdf(state.doc.type, state.doc.id), "_blank");
  };
  $("docWordBtn").onclick = () => {
    if (!state.doc.type || !state.doc.id) return;
    window.open(ep.exportWord(state.doc.type, state.doc.id), "_blank");
  };
}

function field(label, id, value = "", type = "text"){
  if (type === "textarea"){
    return `
      <div class="field">
        <label class="field-label" for="${id}">${label}</label>
        <textarea id="${id}" class="textarea">${esc(value || "")}</textarea>
      </div>
    `;
  }
  return `
    <div class="field">
      <label class="field-label" for="${id}">${label}</label>
      <input id="${id}" class="input" type="${type}" value="${esc(value || "")}" />
    </div>
  `;
}

function recordCard({type, id, title, meta, summary, badges = ""}){
  return `
    <button class="card card-btn open-record" type="button" data-type="${type}" data-id="${id}">
      <div class="card-head">
        <div>
          <div class="card-title">${esc(title)}</div>
          <div class="card-meta">${meta}</div>
        </div>
        <div class="row">${badges}</div>
      </div>
      <div class="card-summary">${esc(summary || "")}</div>
    </button>
  `;
}

function bindOpenCards(){
  $$(".open-record").forEach(btn => {
    btn.onclick = () => openRecord(btn.dataset.type, Number(btn.dataset.id));
  });
}

function renderYoungPersonSelect(){
  const select = $("youngPersonSelect");
  select.innerHTML = state.youngPeople.map(p => `
    <option value="${p.id}" ${Number(state.selected?.id) === Number(p.id) ? "selected" : ""}>
      ${esc(fullName(p))}
    </option>
  `).join("");
}

function renderHeader(){
  const p = state.selected;
  if (!p) return;
  $("selectedYoungPersonName").textContent = fullName(p);
  $("selectedYoungPersonMeta").textContent = [
    p.placement_status ? `Placement: ${p.placement_status}` : null,
    p.date_of_birth ? `DOB: ${fDate(p.date_of_birth)}` : null,
    p.summary_risk_level ? `Risk: ${p.summary_risk_level}` : null
  ].filter(Boolean).join(" • ");
  setPhoto(p.photo_url, `${(p.first_name || "Y")[0]}${(p.last_name || "P")[0]}`);
}

function renderQuickSummary(){
  $("summaryRisk").textContent = state.latest.overview?.summary_risk_level || "—";
  $("summaryHelps").textContent = state.latest.overview?.what_matters_to_me || state.latest.profile?.identity_profile?.[0]?.what_matters_to_me || "—";
  const dueCount = arr(state.latest.compliance?.compliance_items).filter(x => ["overdue","due_soon"].includes(x.compliance_status)).length;
  $("summaryDue").textContent = dueCount ? `${dueCount} item${dueCount === 1 ? "" : "s"}` : "Nothing due";
  $("summaryHandover").textContent = state.latest.handover?.[0]?.title || "None yet";
}

function openMobileSheet(){ $("mobileSheet").classList.remove("hidden"); }
function closeMobileSheet(){ $("mobileSheet").classList.add("hidden"); }

function renderMobileTabs(){
  $("mobileTabs").innerHTML = $$(".tab").map(btn => `
    <button class="mobile-tab" type="button" data-tab="${btn.dataset.tab}">${btn.textContent}</button>
  `).join("");
  $$("#mobileTabs .mobile-tab").forEach(btn => on(btn, "click", () => setTab(btn.dataset.tab)));
}

async function loadYoungPeople(){
  try {
    const rows = arr(await jc(ep.youngPeople));
    state.youngPeople = rows;
    if (!rows.length){
      $("youngPersonSelect").innerHTML = `<option>No young people found</option>`;
      return;
    }
    if (!state.selected) state.selected = rows[0];
    else state.selected = rows.find(x => Number(x.id) === Number(state.selected.id)) || rows[0];
    renderYoungPersonSelect();
    renderHeader();
    await preloadSelected();
    await loadTab();
  } catch (e){
    msg(e.message, true);
  }
}

async function preloadSelected(){
  if (!state.selected) return;
  const id = state.selected.id;
  try {
    state.latest.overview = await jc(ep.overview(id)).catch(() => null);
    state.latest.profile = await jc(ep.profile(id)).catch(() => null);
    state.latest.compliance = await jc(ep.compliance(id)).catch(() => ({ compliance_items: [] }));
    state.latest.handover = await j(ep.handover(id)).then(arr).catch(() => []);
    renderQuickSummary();
  } catch {}
}

async function loadTab(){
  if (!state.selected) return;
  const id = state.selected.id;
  const map = {
    overview: () => loadOverview(id),
    profile: () => loadProfile(id),
    plans: () => loadPlans(id),
    risk: () => loadRisk(id),
    daily_notes: () => loadDaily(id),
    incidents: () => loadIncidents(id),
    health: () => loadHealth(id),
    education: () => loadEducation(id),
    family: () => loadFamily(id),
    keywork: () => loadKeywork(id),
    handover: () => loadHandover(id),
    reports: () => loadReports(id),
    statutory: () => loadStatutory(id),
    chronology: () => loadChronology(id),
    monthly_reviews: () => loadMonthly(id),
    standards: () => loadStandards(id),
    compliance: () => loadCompliance(id)
  };
  try {
    await map[state.activeTab]?.();
  } catch (e){
    msg(e.message, true);
  }
}

async function loadOverview(id){
  const d = await jc(ep.overview(id));
  state.latest.overview = d;
  $("overviewContent").innerHTML = `
    <div class="grid two">
      <div class="card"><div class="card-title">Current context</div><div class="card-summary">
        Placement: ${esc(d.placement_status || "—")}<br>
        Risk level: ${esc(d.summary_risk_level || "—")}<br>
        Legal status: ${esc(d.legal_status || "—")}<br>
        School: ${esc(d.school_name || "—")}
      </div></div>
      <div class="card"><div class="card-title">What matters</div><div class="card-summary">
        ${esc(d.what_matters_to_me || d.strengths_summary || "No summary yet.")}
      </div></div>
    </div>
  `;
  renderQuickSummary();
}

async function loadProfile(id){
  const d = await jc(ep.profile(id));
  state.latest.profile = d;
  const yp = d.young_person || state.selected;
  $("profileContent").innerHTML = `
    <div class="card">
      <div class="card-title">${esc(fullName(yp))}</div>
      <div class="card-summary">
        Preferred name: ${esc(yp.preferred_name || "—")}<br>
        Gender: ${esc(yp.gender || "—")}<br>
        Ethnicity: ${esc(yp.ethnicity || "—")}<br>
        Placement: ${esc(yp.placement_status || "—")}<br>
        Communication: ${esc(d.communication_profile?.[0]?.communication_style || "—")}<br>
        Strengths: ${esc(d.identity_profile?.[0]?.strengths_summary || "—")}
      </div>
    </div>
  `;
}

async function loadPlans(id){
  const rows = arr(await jc(ep.plans(id)).catch(() => []));
  state.latest.plans = rows;
  $("plansContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"plan",
    id:r.id,
    title:r.title || r.plan_type || "Plan",
    meta:`${esc(r.plan_type || "")} • ${fDate(r.review_date)}`,
    summary:r.presenting_need || r.summary || "No summary",
    badges:`${pill(r.status)}${pill(r.workflow_status)}`
  })).join("") : `<div class="empty">No plans found.</div>`;
  bindOpenCards();
}

async function loadRisk(id){
  const rows = arr(await jc(ep.risk(id)).catch(() => []));
  state.latest.risk = rows;
  $("riskContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"risk",
    id:r.id,
    title:r.title || r.category || "Risk assessment",
    meta:`${esc(r.category || "")} • ${fDate(r.review_date)}`,
    summary:r.concern_summary || "No summary",
    badges:`${pill(r.severity)}${pill(r.workflow_status)}`
  })).join("") : `<div class="empty">No risk records found.</div>`;
  bindOpenCards();
}

async function loadDaily(id){
  const rows = arr(await jc(ep.daily(id)).catch(() => []));
  state.latest.daily = rows;
  $("dailyNotesContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"daily_note",
    id:r.id,
    title:`${fDate(r.note_date)} • ${r.shift_type || ""}`,
    meta:esc(r.workflow_status || "draft"),
    summary:r.activities || r.presentation || r.young_person_voice || "No summary",
    badges:`${pill(r.workflow_status)}`
  })).join("") : `<div class="empty">No daily notes found.</div>`;
  bindOpenCards();
}

async function loadIncidents(id){
  const rows = arr(await jc(ep.incidents(id)).catch(() => []));
  state.latest.incidents = rows;
  $("incidentsContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"incident",
    id:r.id,
    title:r.incident_type || "Incident",
    meta:`${fDateTime(r.incident_datetime)} • ${esc(r.location || "")}`,
    summary:r.description || "No summary",
    badges:`${pill(r.severity)}${pill(r.workflow_status)}`
  })).join("") : `<div class="empty">No incidents found.</div>`;
  bindOpenCards();
}

async function loadHealth(id){
  const d = await jc(ep.health(id)).catch(() => ({health_profile:[], health_records:[], medication_records:[]}));
  state.latest.health = d;
  $("healthContent").innerHTML = `
    <div class="card">
      <div class="card-title">Health profile</div>
      <div class="card-summary">
        GP: ${esc(d.health_profile?.[0]?.gp_name || "—")}<br>
        Allergies: ${esc(d.health_profile?.[0]?.allergies || "—")}<br>
        Diagnoses: ${esc(d.health_profile?.[0]?.diagnoses || "—")}
      </div>
    </div>
  `;
}

async function loadEducation(id){
  const d = await jc(ep.education(id)).catch(() => ({education_profile:[], education_records:[]}));
  state.latest.education = d;
  $("educationContent").innerHTML = `
    <div class="card">
      <div class="card-title">Education profile</div>
      <div class="card-summary">
        School: ${esc(d.education_profile?.[0]?.school_name || "—")}<br>
        Year group: ${esc(d.education_profile?.[0]?.year_group || "—")}<br>
        Status: ${esc(d.education_profile?.[0]?.education_status || "—")}
      </div>
    </div>
  `;
}

async function loadFamily(id){
  const d = await jc(ep.family(id)).catch(() => ({contacts:[], family_contact_records:[]}));
  state.latest.family = d;
  $("familyContent").innerHTML = d.contacts?.length ? d.contacts.map(c => recordCard({
    type:"family_contact",
    id:c.id,
    title:c.full_name || "Contact",
    meta:`${esc(c.relationship_to_child || "")} • ${c.is_approved_contact ? "Approved" : "Not marked approved"}`,
    summary:c.contact_notes || c.phone_number || c.email || "No notes"
  })).join("") : `<div class="empty">No family contacts found.</div>`;
  bindOpenCards();
}

async function loadKeywork(id){
  const rows = arr(await j(ep.keywork(id)).catch(() => []));
  state.latest.keywork = rows;
  $("keyworkContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"keywork",
    id:r.id,
    title:r.topic || "Key work session",
    meta:`${fDate(r.session_date)} • ${esc(r.worker_first_name || "")}`,
    summary:r.summary || r.purpose || "No summary",
    badges:`${pill(r.status)}${pill(r.workflow_status)}`
  })).join("") : `<div class="empty">No key work records found.</div>`;
  bindOpenCards();
}

async function loadHandover(id){
  const rows = arr(await j(ep.handover(id)).catch(() => []));
  state.latest.handover = rows;
  $("handoverContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"handover",
    id:r.id,
    title:r.title || "Shift Handover",
    meta:`${fDate(r.handover_date)} • ${esc(r.shift_type || "")}`,
    summary:r.summary_text || "No summary",
    badges:`${pill(r.status)}`
  })).join("") : `<div class="empty">No handover summaries yet.</div>`;
  renderQuickSummary();
  bindOpenCards();
}

async function loadReports(id){
  const rows = arr(await j(ep.reports(id)).catch(() => []));
  state.latest.reports = rows;
  $("reportsContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"report",
    id:r.id,
    title:r.title || "AI Report",
    meta:`${esc(r.report_type || "")} • ${fDate(r.review_month)}`,
    summary:r.report_text || "No report text",
    badges:`${pill(r.status)}`
  })).join("") : `<div class="empty">No reports found.</div>`;
  bindOpenCards();
}

async function loadStatutory(id){
  const rows = arr(await j(ep.statutory(id)).catch(() => []));
  state.latest.statutory = rows;
  $("statutoryContent").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"statutory_document",
    id:r.id,
    title:r.title || r.document_type || "Statutory document",
    meta:`${esc(r.document_type || "")} • Review ${fDate(r.review_date)} • Expiry ${fDate(r.expiry_date)}`,
    summary:r.description || r.file_name || "No summary",
    badges:`${pill(r.status)}`
  })).join("") : `<div class="empty">No statutory documents uploaded yet.</div>`;
  bindOpenCards();
}

async function loadChronology(id){
  const rows = arr(await j(ep.chronology(id)).catch(() => []));
  state.latest.chronology = rows;
  $("chronologyContent").innerHTML = rows.length ? rows.map(r => `
    <div class="card">
      <div class="card-title">${esc(r.title || "Event")}</div>
      <div class="card-meta">${esc(r.category || "")} • ${fDateTime(r.event_datetime)}</div>
      <div class="card-summary">${esc(r.summary || "")}</div>
    </div>
  `).join("") : `<div class="empty">No chronology found.</div>`;
}

async function loadMonthly(id){
  const rows = arr(await j(ep.monthly(id)).catch(() => []));
  state.latest.monthly = rows;
  $("monthlyReviewsList").innerHTML = rows.length ? rows.map(r => recordCard({
    type:"monthly_review",
    id:r.id,
    title:r.review_title || "Monthly review",
    meta:`${fDate(r.review_month)} • ${esc(r.status || "")}`,
    summary:r.summary_of_month || r.progress_summary || "Open to view",
    badges:`${pill(r.status)}`
  })).join("") : `<div class="empty">No monthly reviews found.</div>`;
  $("monthlyReviewDetail").innerHTML = `<div class="empty">Select a review to view details.</div>`;
  bindOpenCards();
}

async function loadStandards(id){
  const [summary, evidence] = await Promise.all([
    jc(ep.standards(id)).catch(() => []),
    jc(ep.evidence(id)).catch(() => [])
  ]);
  $("standardsSummary").innerHTML = arr(summary).length ? arr(summary).map(r => `
    <div class="card">
      <div class="card-title">${esc(r.code || r.standard_code || "Standard")}</div>
      <div class="card-summary">${esc(r.short_label || "")} • ${esc(r.linked_record_count || r.evidence_count || 0)} linked</div>
    </div>
  `).join("") : `<div class="empty">No standards data found.</div>`;

  $("standardsEvidenceList").innerHTML = arr(evidence).length ? arr(evidence).map(r => `
    <div class="card">
      <div class="card-title">${esc(r.standard_code || "Standard")}</div>
      <div class="card-summary">${esc(r.rationale || "")}<br><span class="card-meta">${esc(r.source_table || "")} #${esc(r.source_id || "")}</span></div>
    </div>
  `).join("") : `<div class="empty">No evidence linked yet.</div>`;
}

async function loadCompliance(id){
  const d = await jc(ep.compliance(id)).catch(() => ({ compliance_items: [] }));
  state.latest.compliance = d;
  const rows = arr(d.compliance_items);
  $("complianceContent").innerHTML = rows.length ? rows.map(r => `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">${esc(r.title || "Item")}</div>
          <div class="card-meta">${esc(r.compliance_type || "")} • Due ${fDate(r.due_date)}</div>
        </div>
        <div>${pill(r.compliance_status)}</div>
      </div>
    </div>
  `).join("") : `<div class="empty">No compliance items found.</div>`;
  renderQuickSummary();
}

async function openRecord(type, id){
  if (type === "plan") return openPlan(id);
  if (type === "risk") return openRisk(id);
  if (type === "daily_note") return openDaily(id);
  if (type === "incident") return openIncident(id);
  if (type === "keywork") return openKeywork(id);
  if (type === "handover") return openHandover(id);
  if (type === "report") return openReport(id);
  if (type === "monthly_review") return openMonthly(id);
  if (type === "statutory_document") return openStatutory(id);
  if (type === "family_contact") return openFamilyContact(id);
}

function bindDocumentInputs(){
  $("#docBody input, #docBody textarea, #docBody select");
  $$("#docBody input, #docBody textarea, #docBody select").forEach(el => on(el, "input", markDirty));
}

async function workflowAction(url, label, refreshFn){
  await j(url, { method: "PUT" });
  msg(label);
  if (refreshFn) await refreshFn();
}

async function openPlan(id){
  openDocumentMode();
  const r = await j(ep.planById(id));
  const saveFn = async (auto = false) => {
    const payload = {
      plan_type: clean($("f_plan_type").value),
      title: clean($("f_title").value),
      presenting_need: clean($("f_presenting_need").value),
      summary: clean($("f_summary").value),
      child_voice: clean($("f_child_voice").value),
      proactive_strategies: clean($("f_proactive_strategies").value),
      pace_guidance: clean($("f_pace_guidance").value),
      triggers: clean($("f_triggers").value),
      protective_factors: clean($("f_protective_factors").value),
      start_date: clean($("f_start_date").value),
      review_date: clean($("f_review_date").value),
      status: clean($("f_status").value),
      review_comment: clean($("f_review_comment").value),
      workflow_status: clean($("docWorkflowState").textContent).toLowerCase()
    };
    await j(ep.planUpdate(id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Plan saved.");
    await loadPlans(state.selected.id);
  };

  setDocHeader({
    type: "Plan",
    title: r.title || r.plan_type || "Plan",
    meta: `${r.plan_type || ""} • Review ${fDate(r.review_date)}`,
    workflow: r.workflow_status || "draft",
    exportType: "plan",
    exportId: id
  });

  setDocActions({
    show: true,
    saveFn,
    submitFn: async () => workflowAction(ep.planSubmit(id), "Plan sent for review.", () => openPlan(id)),
    approveFn: async () => workflowAction(ep.planApprove(id), "Plan approved.", () => openPlan(id)),
    returnFn: async () => workflowAction(ep.planReturn(id), "Plan returned for changes.", () => openPlan(id))
  });

  $("docBody").innerHTML = `
    <form class="document-form">
      <div class="grid two">
        ${field("Plan Type","f_plan_type",r.plan_type)}
        ${field("Title","f_title",r.title)}
      </div>
      ${field("Presenting Need","f_presenting_need",r.presenting_need,"textarea")}
      ${field("Summary","f_summary",r.summary,"textarea")}
      ${field("Young Person's Voice","f_child_voice",r.child_voice,"textarea")}
      ${field("Proactive Strategies","f_proactive_strategies",r.proactive_strategies,"textarea")}
      ${field("PACE / Relational Guidance","f_pace_guidance",r.pace_guidance,"textarea")}
      ${field("Triggers / Stressors","f_triggers",r.triggers,"textarea")}
      ${field("Protective Factors / Strengths","f_protective_factors",r.protective_factors,"textarea")}
      <div class="grid three">
        ${field("Start Date","f_start_date",dateInput(r.start_date),"date")}
        ${field("Review Date","f_review_date",dateInput(r.review_date),"date")}
        ${field("Status","f_status",r.status)}
      </div>
      ${field("Review Comment","f_review_comment",r.review_comment || "")}
    </form>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openRisk(id){
  openDocumentMode();
  const r = await j(ep.riskById(id));
  const saveFn = async (auto = false) => {
    const payload = {
      category: clean($("f_category").value),
      title: clean($("f_title").value),
      concern_summary: clean($("f_concern_summary").value),
      known_triggers: clean($("f_known_triggers").value),
      early_warning_signs: clean($("f_early_warning_signs").value),
      contextual_factors: clean($("f_contextual_factors").value),
      current_controls: clean($("f_current_controls").value),
      deescalation_strategies: clean($("f_deescalation_strategies").value),
      response_actions: clean($("f_response_actions").value),
      child_views: clean($("f_child_views").value),
      severity: clean($("f_severity").value),
      likelihood: clean($("f_likelihood").value),
      review_date: clean($("f_review_date").value),
      review_comment: clean($("f_review_comment").value),
      workflow_status: clean($("docWorkflowState").textContent).toLowerCase()
    };
    await j(ep.riskUpdate(id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Risk saved.");
    await loadRisk(state.selected.id);
  };

  setDocHeader({
    type: "Risk",
    title: r.title || r.category || "Risk assessment",
    meta: `${r.category || ""} • Review ${fDate(r.review_date)}`,
    workflow: r.workflow_status || "draft",
    exportType: "risk",
    exportId: id
  });

  setDocActions({
    show: true,
    saveFn,
    submitFn: async () => workflowAction(ep.riskSubmit(id), "Risk sent for review.", () => openRisk(id)),
    approveFn: async () => workflowAction(ep.riskApprove(id), "Risk approved.", () => openRisk(id)),
    returnFn: async () => workflowAction(ep.riskReturn(id), "Risk returned for changes.", () => openRisk(id))
  });

  $("docBody").innerHTML = `
    <form class="document-form">
      <div class="grid two">
        ${field("Category","f_category",r.category)}
        ${field("Title","f_title",r.title)}
      </div>
      ${field("Concern Summary","f_concern_summary",r.concern_summary,"textarea")}
      ${field("Known Triggers","f_known_triggers",r.known_triggers,"textarea")}
      ${field("Early Warning Signs","f_early_warning_signs",r.early_warning_signs,"textarea")}
      ${field("Contextual Factors","f_contextual_factors",r.contextual_factors,"textarea")}
      ${field("Current Controls","f_current_controls",r.current_controls,"textarea")}
      ${field("De-escalation Strategies","f_deescalation_strategies",r.deescalation_strategies,"textarea")}
      ${field("Response Actions","f_response_actions",r.response_actions,"textarea")}
      ${field("Young Person's Views","f_child_views",r.child_views,"textarea")}
      <div class="grid three">
        ${field("Severity","f_severity",r.severity)}
        ${field("Likelihood","f_likelihood",r.likelihood)}
        ${field("Review Date","f_review_date",dateInput(r.review_date),"date")}
      </div>
      ${field("Review Comment","f_review_comment",r.review_comment || "")}
    </form>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openDaily(id){
  openDocumentMode();
  const r = await j(ep.dailyById(id));
  const saveFn = async (auto = false) => {
    const payload = {
      note_date: clean($("f_note_date").value),
      shift_type: clean($("f_shift_type").value),
      mood: clean($("f_mood").value),
      presentation: clean($("f_mood").value),
      activities: clean($("f_activities").value),
      education_update: clean($("f_education_update").value),
      health_update: clean($("f_health_update").value),
      family_update: clean($("f_family_update").value),
      behaviour_update: clean($("f_behaviour_update").value),
      young_person_voice: clean($("f_child_voice").value),
      positives: clean($("f_positives").value),
      actions_required: clean($("f_actions_required").value),
      manager_review_comment: clean($("f_review_comment").value),
      workflow_status: clean($("docWorkflowState").textContent).toLowerCase()
    };
    await j(ep.dailyUpdate(id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Daily note saved.");
    await loadDaily(state.selected.id);
  };

  setDocHeader({
    type: "Daily Note",
    title: `${fDate(r.note_date)} • ${r.shift_type || ""}`,
    meta: r.workflow_status || "draft",
    workflow: r.workflow_status || "draft",
    exportType: "daily_note",
    exportId: id
  });

  setDocActions({
    show: true,
    saveFn,
    submitFn: async () => workflowAction(ep.dailySubmit(id), "Daily note sent for review.", () => openDaily(id)),
    approveFn: async () => workflowAction(ep.dailyApprove(id), "Daily note approved.", () => openDaily(id)),
    returnFn: async () => workflowAction(ep.dailyReturn(id), "Daily note returned for changes.", () => openDaily(id))
  });

  $("docBody").innerHTML = `
    <form class="document-form">
      <div class="grid two">
        ${field("Date","f_note_date",dateInput(r.note_date),"date")}
        ${field("Shift Type","f_shift_type",r.shift_type)}
      </div>
      ${field("Mood / Presentation","f_mood",r.mood || r.presentation,"textarea")}
      ${field("Activities / Daily Life","f_activities",r.activities,"textarea")}
      ${field("Education Update","f_education_update",r.education_update,"textarea")}
      ${field("Health Update","f_health_update",r.health_update,"textarea")}
      ${field("Family Update","f_family_update",r.family_update,"textarea")}
      ${field("Behaviour / Regulation","f_behaviour_update",r.behaviour_update,"textarea")}
      ${field("Young Person's Voice","f_child_voice",r.young_person_voice,"textarea")}
      ${field("Positives","f_positives",r.positives,"textarea")}
      ${field("Actions Required","f_actions_required",r.actions_required,"textarea")}
      ${field("Manager Review Comment","f_review_comment",r.manager_review_comment || "")}
    </form>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openIncident(id){
  openDocumentMode();
  const r = await j(ep.incidentById(id));
  const saveFn = async (auto = false) => {
    const payload = {
      incident_datetime: clean($("f_incident_datetime").value),
      incident_type: clean($("f_incident_type").value),
      severity: clean($("f_severity").value),
      location: clean($("f_location").value),
      description: clean($("f_description").value),
      antecedent: clean($("f_antecedent").value),
      staff_response: clean($("f_staff_response").value),
      child_response: clean($("f_child_response").value),
      outcome: clean($("f_outcome").value),
      review_comment: clean($("f_review_comment").value),
      workflow_status: clean($("docWorkflowState").textContent).toLowerCase()
    };
    await j(ep.incidentUpdate(id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Incident saved.");
    await loadIncidents(state.selected.id);
  };

  setDocHeader({
    type: "Incident",
    title: r.incident_type || "Incident",
    meta: `${fDateTime(r.incident_datetime)} • ${r.location || ""}`,
    workflow: r.workflow_status || "draft",
    exportType: "incident",
    exportId: id
  });

  setDocActions({
    show: true,
    saveFn,
    submitFn: async () => workflowAction(ep.incidentSubmit(id), "Incident sent for review.", () => openIncident(id)),
    approveFn: async () => workflowAction(ep.incidentApprove(id), "Incident approved.", () => openIncident(id)),
    returnFn: async () => workflowAction(ep.incidentReturn(id), "Incident returned for changes.", () => openIncident(id))
  });

  $("docBody").innerHTML = `
    <form class="document-form">
      <div class="grid three">
        ${field("Incident Date / Time","f_incident_datetime",dtInput(r.incident_datetime),"datetime-local")}
        ${field("Incident Type","f_incident_type",r.incident_type)}
        ${field("Severity","f_severity",r.severity)}
      </div>
      ${field("Location","f_location",r.location)}
      ${field("Description","f_description",r.description,"textarea")}
      ${field("Antecedent","f_antecedent",r.antecedent,"textarea")}
      ${field("Staff Response","f_staff_response",r.staff_response,"textarea")}
      ${field("Child Response","f_child_response",r.child_response,"textarea")}
      ${field("Outcome","f_outcome",r.outcome,"textarea")}
      ${field("Review Comment","f_review_comment",r.review_comment || "")}
    </form>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openKeywork(id){
  openDocumentMode();
  const r = await j(ep.keyworkById(id));
  const saveFn = async (auto = false) => {
    const payload = {
      session_date: clean($("f_session_date").value),
      worker_id: n($("f_worker_id").value),
      topic: clean($("f_topic").value),
      purpose: clean($("f_purpose").value),
      summary: clean($("f_summary").value),
      child_voice: clean($("f_child_voice").value),
      reflective_analysis: clean($("f_reflective_analysis").value),
      actions_agreed: clean($("f_actions_agreed").value),
      next_session_date: clean($("f_next_session_date").value),
      review_comment: clean($("f_review_comment").value),
      workflow_status: clean($("docWorkflowState").textContent).toLowerCase()
    };
    await j(ep.keyworkUpdate(id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Key work saved.");
    await loadKeywork(state.selected.id);
  };

  setDocHeader({
    type: "Key Work",
    title: r.topic || "Key Work Session",
    meta: `${fDate(r.session_date)} • ${r.worker_id || ""}`,
    workflow: r.workflow_status || "draft",
    exportType: "keywork",
    exportId: id
  });

  setDocActions({
    show: true,
    saveFn,
    submitFn: async () => workflowAction(ep.keyworkSubmit(id), "Key work sent for review.", () => openKeywork(id)),
    approveFn: async () => workflowAction(ep.keyworkApprove(id), "Key work approved.", () => openKeywork(id)),
    returnFn: async () => workflowAction(ep.keyworkReturn(id), "Key work returned for changes.", () => openKeywork(id))
  });

  $("docBody").innerHTML = `
    <form class="document-form">
      <div class="grid three">
        ${field("Session Date","f_session_date",dateInput(r.session_date),"date")}
        ${field("Worker ID","f_worker_id",r.worker_id || "","number")}
        ${field("Topic","f_topic",r.topic)}
      </div>
      ${field("Purpose","f_purpose",r.purpose,"textarea")}
      ${field("Summary","f_summary",r.summary,"textarea")}
      ${field("Young Person's Voice","f_child_voice",r.child_voice,"textarea")}
      ${field("Reflective Analysis","f_reflective_analysis",r.reflective_analysis,"textarea")}
      ${field("Actions Agreed","f_actions_agreed",r.actions_agreed,"textarea")}
      ${field("Next Session Date","f_next_session_date",dateInput(r.next_session_date),"date")}
      ${field("Review Comment","f_review_comment",r.review_comment || "")}
    </form>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openProfileDocument(){
  openDocumentMode();
  const d = state.latest.profile || await jc(ep.profile(state.selected.id));
  const yp = d.young_person || state.selected;

  const saveFn = async (auto = false) => {
    const corePayload = {
      first_name: clean($("f_first_name").value),
      last_name: clean($("f_last_name").value),
      preferred_name: clean($("f_preferred_name").value),
      date_of_birth: clean($("f_date_of_birth").value),
      gender: clean($("f_gender").value),
      ethnicity: clean($("f_ethnicity").value),
      nhs_number: clean($("f_nhs_number").value),
      local_id_number: clean($("f_local_id_number").value),
      admission_date: clean($("f_admission_date").value),
      discharge_date: clean($("f_discharge_date").value),
      placement_status: clean($("f_placement_status").value),
      primary_keyworker_id: n($("f_primary_keyworker_id").value),
      summary_risk_level: clean($("f_summary_risk_level").value)
    };
    const commPayload = {
      communication_style: clean($("f_communication_style").value),
      sensory_profile: clean($("f_sensory_profile").value)
    };
    const identityPayload = {
      interests: clean($("f_interests").value),
      strengths_summary: clean($("f_strengths_summary").value),
      what_matters_to_me: clean($("f_what_matters_to_me").value)
    };
    await Promise.all([
      j(ep.profileCoreUpdate(state.selected.id), { method:"PUT", body: JSON.stringify(corePayload) }),
      j(ep.profileCommUpdate(state.selected.id), { method:"PUT", body: JSON.stringify(commPayload) }),
      j(ep.profileIdentityUpdate(state.selected.id), { method:"PUT", body: JSON.stringify(identityPayload) })
    ]);
    state.doc.dirty = false;
    if (!auto) msg("Profile saved.");
    await preloadSelected();
    await loadProfile(state.selected.id);
    renderHeader();
  };

  setDocHeader({
    type: "Profile",
    title: fullName(yp),
    meta: `${yp.placement_status || "—"} • ${yp.gender || "—"} • ${yp.ethnicity || "—"}`,
    workflow: "editable",
    exportType: "profile",
    exportId: state.selected.id
  });

  setDocActions({
    show: true,
    saveFn,
    submitFn: null,
    approveFn: null,
    returnFn: null
  });

  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";

  $("docBody").innerHTML = `
    <form class="document-form">
      <div class="grid three">
        ${field("First Name","f_first_name",yp.first_name)}
        ${field("Last Name","f_last_name",yp.last_name)}
        ${field("Preferred Name","f_preferred_name",yp.preferred_name)}
      </div>
      <div class="grid three">
        ${field("Date of Birth","f_date_of_birth",dateInput(yp.date_of_birth),"date")}
        ${field("Gender","f_gender",yp.gender)}
        ${field("Ethnicity","f_ethnicity",yp.ethnicity)}
      </div>
      <div class="grid three">
        ${field("NHS Number","f_nhs_number",yp.nhs_number)}
        ${field("Local ID","f_local_id_number",yp.local_id_number)}
        ${field("Placement Status","f_placement_status",yp.placement_status)}
      </div>
      <div class="grid three">
        ${field("Admission Date","f_admission_date",dateInput(yp.admission_date),"date")}
        ${field("Discharge Date","f_discharge_date",dateInput(yp.discharge_date),"date")}
        ${field("Risk Level","f_summary_risk_level",yp.summary_risk_level)}
      </div>
      ${field("Primary Keyworker ID","f_primary_keyworker_id",yp.primary_keyworker_id || "","number")}
      ${field("Communication Style","f_communication_style",d.communication_profile?.[0]?.communication_style,"textarea")}
      ${field("Sensory Profile","f_sensory_profile",d.communication_profile?.[0]?.sensory_profile,"textarea")}
      ${field("Interests","f_interests",d.identity_profile?.[0]?.interests,"textarea")}
      ${field("Strengths Summary","f_strengths_summary",d.identity_profile?.[0]?.strengths_summary,"textarea")}
      ${field("What Matters To Me","f_what_matters_to_me",d.identity_profile?.[0]?.what_matters_to_me,"textarea")}
    </form>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openHealthDocument(){
  openDocumentMode();
  const d = state.latest.health || await jc(ep.health(state.selected.id));
  const hp = d.health_profile?.[0] || {};

  const saveFn = async (auto = false) => {
    const payload = {
      gp_name: clean($("f_gp_name").value),
      allergies: clean($("f_allergies").value),
      diagnoses: clean($("f_diagnoses").value)
    };
    await j(ep.healthProfileUpdate(state.selected.id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Health profile saved.");
    await loadHealth(state.selected.id);
  };

  setDocHeader({
    type: "Health",
    title: "Health Profile",
    meta: `GP ${hp.gp_name || "—"}`,
    workflow: "editable",
    exportType: "profile",
    exportId: state.selected.id
  });

  setDocActions({ show:true, saveFn });
  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";

  $("docBody").innerHTML = `
    <form class="document-form">
      ${field("GP Name","f_gp_name",hp.gp_name)}
      ${field("Allergies","f_allergies",hp.allergies,"textarea")}
      ${field("Diagnoses","f_diagnoses",hp.diagnoses,"textarea")}
    </form>

    <div class="stack-gap">
      <div class="card">
        <div class="card-title">Recent health records</div>
        <div class="card-summary">${(d.health_records || []).slice(0,5).map(x => `${x.title || x.record_type || "Record"} • ${fDateTime(x.event_datetime)}`).join("<br>") || "No health records"}</div>
      </div>
    </div>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openEducationDocument(){
  openDocumentMode();
  const d = state.latest.education || await jc(ep.education(state.selected.id));
  const epf = d.education_profile?.[0] || {};

  const saveFn = async (auto = false) => {
    const payload = {
      school_name: clean($("f_school_name").value),
      year_group: clean($("f_year_group").value),
      education_status: clean($("f_education_status").value)
    };
    await j(ep.educationProfileUpdate(state.selected.id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Education profile saved.");
    await loadEducation(state.selected.id);
  };

  setDocHeader({
    type: "Education",
    title: "Education Profile",
    meta: epf.school_name || "No school set",
    workflow: "editable",
    exportType: "profile",
    exportId: state.selected.id
  });

  setDocActions({ show:true, saveFn });
  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";

  $("docBody").innerHTML = `
    <form class="document-form">
      ${field("School Name","f_school_name",epf.school_name)}
      ${field("Year Group","f_year_group",epf.year_group)}
      ${field("Education Status","f_education_status",epf.education_status)}
    </form>

    <div class="stack-gap">
      <div class="card">
        <div class="card-title">Recent education records</div>
        <div class="card-summary">${(d.education_records || []).slice(0,5).map(x => `${fDate(x.record_date)} • ${x.provision_name || "Education record"} • ${x.attendance_status || ""}`).join("<br>") || "No education records"}</div>
      </div>
    </div>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openFamilyDocument(){
  openDocumentMode();
  const d = state.latest.family || await jc(ep.family(state.selected.id));

  setDocHeader({
    type: "Family",
    title: "Contacts and Family Records",
    meta: `${(d.contacts || []).length} contact(s)`,
    workflow: "editable",
    exportType: "profile",
    exportId: state.selected.id
  });

  setDocActions({ show:false });

  $("docBody").innerHTML = `
    <div class="grid">
      <div class="card">
        <div class="card-title">Contacts</div>
        <div class="card-summary">
          ${(d.contacts || []).length ? d.contacts.map(c => `
            <button class="card card-btn open-record" type="button" data-type="family_contact" data-id="${c.id}">
              <div class="card-title">${esc(c.full_name || "Contact")}</div>
              <div class="card-meta">${esc(c.relationship_to_child || "")}</div>
              <div class="card-summary">${esc(c.contact_notes || c.phone_number || c.email || "No notes")}</div>
            </button>
          `).join("") : "No contacts"}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Recent family contact records</div>
        <div class="card-summary">
          ${(d.family_contact_records || []).slice(0,6).map(r => `${fDateTime(r.contact_datetime)} • ${r.contact_person || "Contact"} • ${r.contact_type || ""}`).join("<br>") || "No family contact records"}
        </div>
      </div>
    </div>
  `;
  bindOpenCards();
}

async function openFamilyContact(id){
  openDocumentMode();
  const d = state.latest.family || await jc(ep.family(state.selected.id));
  const c = (d.contacts || []).find(x => Number(x.id) === Number(id));
  if (!c) return msg("Contact not found.", true);

  const saveFn = async (auto = false) => {
    const payload = {
      full_name: clean($("f_full_name").value),
      relationship_to_child: clean($("f_relationship").value),
      phone_number: clean($("f_phone").value),
      email: clean($("f_email").value),
      address: clean($("f_address").value),
      is_parental_responsibility_holder: $("f_pr").checked,
      is_approved_contact: $("f_approved").checked,
      contact_notes: clean($("f_notes").value)
    };
    await j(ep.familyContactUpdate(id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Contact saved.");
    await loadFamily(state.selected.id);
  };

  setDocHeader({
    type: "Family Contact",
    title: c.full_name || "Contact",
    meta: c.relationship_to_child || "",
    workflow: "editable",
    exportType: "profile",
    exportId: state.selected.id
  });

  setDocActions({ show:true, saveFn });
  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";

  $("docBody").innerHTML = `
    <form class="document-form">
      ${field("Full Name","f_full_name",c.full_name)}
      ${field("Relationship to Child","f_relationship",c.relationship_to_child)}
      <div class="grid two">
        ${field("Phone Number","f_phone",c.phone_number)}
        ${field("Email","f_email",c.email)}
      </div>
      ${field("Address","f_address",c.address,"textarea")}
      ${field("Notes","f_notes",c.contact_notes,"textarea")}
      <div class="row">
        <label><input id="f_pr" type="checkbox" ${c.is_parental_responsibility_holder ? "checked" : ""}> Parental responsibility holder</label>
        <label><input id="f_approved" type="checkbox" ${c.is_approved_contact ? "checked" : ""}> Approved contact</label>
      </div>
    </form>
  `;
  bindDocumentInputs();
  startAutosave(saveFn);
}

async function openHandover(id){
  openDocumentMode();
  const r = state.latest.handover.find(x => Number(x.id) === Number(id));
  setDocHeader({
    type: "Handover",
    title: r?.title || "Shift Handover",
    meta: `${fDate(r?.handover_date)} • ${r?.shift_type || ""}`,
    workflow: r?.status || "draft",
    exportType: "handover",
    exportId: id
  });
  setDocActions({ show:true, saveFn:null, submitFn:null, approveFn:null, returnFn:null });
  $("docSaveBtn").style.display = "none";
  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";
  $("docBody").innerHTML = `<div class="card"><div class="card-summary">${esc(r?.summary_text || "No summary available.")}</div></div>`;
}

async function openReport(id){
  openDocumentMode();
  const r = state.latest.reports.find(x => Number(x.id) === Number(id));
  const links = arr(await j(ep.reportLinks(id)).catch(() => []));
  setDocHeader({
    type: "AI Report",
    title: r?.title || "Report",
    meta: `${r?.report_type || ""} • ${fDate(r?.review_month)}`,
    workflow: r?.status || "generated",
    exportType: "report",
    exportId: id
  });
  setDocActions({ show:true });
  $("docSaveBtn").style.display = "none";
  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";

  $("docBody").innerHTML = `
    <div class="card"><div class="card-summary">${esc(r?.report_text || "No report text available.")}</div></div>
    <div class="stack-gap">
      ${links.length ? links.map(l => `
        <div class="card">
          <div class="card-title">${esc(l.source_table || "Source")}</div>
          <div class="card-summary">${esc(l.link_reason || "Evidence link")} • #${esc(l.source_id || "")}</div>
        </div>
      `).join("") : `<div class="empty">No linked evidence found.</div>`}
    </div>
  `;
}

async function openMonthly(id){
  openDocumentMode();
  const d = await j(ep.monthlyDetail(id));
  setDocHeader({
    type: "Monthly Review",
    title: d?.review?.review_title || "Monthly Review",
    meta: fDate(d?.review?.review_month),
    workflow: d?.review?.status || "draft",
    exportType: "report",
    exportId: id
  });
  setDocActions({ show:true });
  $("docSaveBtn").style.display = "none";
  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";
  $("docBody").innerHTML = `<div class="card"><div class="card-summary">${esc(d?.review?.summary_of_month || d?.review?.progress_summary || "No summary available.")}</div></div>`;
}

async function openStatutory(id){
  openDocumentMode();
  const r = await j(ep.statutoryById(id));
  const saveFn = async (auto = false) => {
    const payload = {
      document_type: clean($("f_document_type").value),
      title: clean($("f_title").value),
      description: clean($("f_description").value),
      issue_date: clean($("f_issue_date").value),
      review_date: clean($("f_review_date").value),
      expiry_date: clean($("f_expiry_date").value),
      status: clean($("f_status").value),
      compliance_category: clean($("f_compliance_category").value),
      linked_standard_code: clean($("f_linked_standard_code").value)
    };
    await j(ep.statutoryUpdate(id), { method:"PUT", body: JSON.stringify(payload) });
    state.doc.dirty = false;
    if (!auto) msg("Statutory document updated.");
    await loadStatutory(state.selected.id);
  };

  setDocHeader({
    type: "Statutory Document",
    title: r.title || r.document_type || "Statutory document",
    meta: `${r.document_type || ""} • Review ${fDate(r.review_date)}`,
    workflow: r.status || "current",
    exportType: "statutory_document",
    exportId: id
  });

  setDocActions({ show:true, saveFn });
  $("docSubmitBtn").style.display = "none";
  $("docApproveBtn").style.display = "none";
  $("docReturnBtn").style.display = "none";

  $("docBody").innerHTML = `
    <form class="document-form">
      ${field("Document Type","f_document_type",r.document_type)}
      ${field("Title","f_title",r.title)}
      ${field("Description","f_description",r.description,"textarea")}
      <div class="grid three">
        ${field("Issue Date","f_issue_date",dateInput(r.issue_date),"date")}
        ${field("Review Date","f_review_date",dateInput(r.review_date),"date")}
        ${field("Expiry Date","f_expiry_date",dateInput(r.expiry_date),"date")}
      </div>
      <div class="grid three">
        ${field("Status","f_status",r.status)}
        ${field("Compliance Category","f_compliance_category",r.compliance_category)}
        ${field("Linked Standard","f_linked_standard_code",r.linked_standard_code)}
      </div>
    </form>

    <div class="stack-gap row">
      ${r.file_url ? `<button id="openStatFileBtn" class="btn secondary" type="button">Open uploaded file</button>` : ""}
      ${r.file_url ? `<button id="downloadStatFileBtn" class="btn primary" type="button">Download file</button>` : ""}
    </div>
  `;
  if (r.file_url){
    $("openStatFileBtn").onclick = () => window.open(r.file_url, "_blank");
    $("downloadStatFileBtn").onclick = () => window.open(ep.statutoryDownload(id), "_blank");
  }
  bindDocumentInputs();
  startAutosave(saveFn);
}

function bindPrimaryDocButtons(){
  on($("openProfileBtn"), "click", openProfileDocument);
  on($("openProfileDocBtn"), "click", openProfileDocument);
  on($("mobileOpenProfileBtn"), "click", openProfileDocument);
  on($("openHealthDocBtn"), "click", openHealthDocument);
  on($("openEducationDocBtn"), "click", openEducationDocument);
  on($("openFamilyDocBtn"), "click", openFamilyDocument);
}

function bindCreateButtons(){
  on($("plansOpenCreateBtn"), "click", () => msg("New document flows can be added next.", true));
  on($("riskOpenCreateBtn"), "click", () => msg("New document flows can be added next.", true));
  on($("dailyNotesOpenCreateBtn"), "click", () => msg("New document flows can be added next.", true));
  on($("incidentsOpenCreateBtn"), "click", () => msg("New document flows can be added next.", true));
  on($("keyworkOpenCreateBtn"), "click", () => msg("New document flows can be added next.", true));
}

async function generateHandover(){
  if (!state.selected) return msg("Select a young person first.", true);
  try {
    await j(ep.handoverGenerate(state.selected.id), { method:"POST" });
    msg("Handover generated.");
    await loadHandover(state.selected.id);
    setTab("handover");
  } catch (e){
    msg(e.message, true);
  }
}

async function uploadPhoto(file){
  if (!state.selected || !file) return;
  const fd = new FormData();
  fd.append("photo", file);
  const res = await fetch(ep.photo(state.selected.id), { method:"POST", credentials:"include", body:fd });
  if (!res.ok) throw new Error("Photo upload failed");
  const d = await res.json();
  state.selected.photo_url = d.photo_url;
  renderHeader();
  msg("Photo uploaded.");
}

async function uploadStatutoryDocument(){
  if (!state.selected) return msg("Select a young person first.", true);

  openDocumentMode();
  setDocHeader({
    type: "Statutory Document",
    title: "Upload Statutory Document",
    meta: "Upload file and set compliance dates",
    workflow: "new"
  });
  setDocActions({ show:false });

  $("docBody").innerHTML = `
    <form id="statUploadForm" class="document-form">
      ${field("Document Type","u_document_type")}
      ${field("Title","u_title")}
      ${field("Description","u_description","","textarea")}
      <div class="grid three">
        ${field("Issue Date","u_issue_date","","date")}
        ${field("Review Date","u_review_date","","date")}
        ${field("Expiry Date","u_expiry_date","","date")}
      </div>
      <div class="grid three">
        ${field("Status","u_status","current")}
        ${field("Compliance Category","u_compliance_category")}
        ${field("Linked Standard","u_linked_standard_code")}
      </div>
      <div class="field">
        <label class="field-label" for="u_file">File</label>
        <input id="u_file" class="input" type="file" />
      </div>
      <div class="row">
        <button id="u_submit" class="btn primary" type="button">Upload Document</button>
      </div>
    </form>
  `;

  $("u_submit").onclick = async () => {
    const file = $("u_file").files?.[0];
    if (!file) return msg("Choose a file first.", true);

    const fd = new FormData();
    fd.append("document_type", clean($("u_document_type").value) || "");
    fd.append("title", clean($("u_title").value) || "");
    fd.append("description", clean($("u_description").value) || "");
    fd.append("issue_date", clean($("u_issue_date").value) || "");
    fd.append("review_date", clean($("u_review_date").value) || "");
    fd.append("expiry_date", clean($("u_expiry_date").value) || "");
    fd.append("status", clean($("u_status").value) || "current");
    fd.append("compliance_category", clean($("u_compliance_category").value) || "");
    fd.append("linked_standard_code", clean($("u_linked_standard_code").value) || "");
    fd.append("uploaded_by", "1");
    fd.append("home_id", String(state.selected.home_id || 1));
    fd.append("file", file);

    const res = await fetch(ep.statutoryUpload(state.selected.id), {
      method: "POST",
      credentials: "include",
      body: fd
    });

    if (!res.ok){
      let m = "Upload failed";
      try {
        const d = await res.json();
        if (d?.detail) m = d.detail;
      } catch {}
      return msg(m, true);
    }

    msg("Statutory document uploaded.");
    await loadStatutory(state.selected.id);
    setTab("statutory");
    closeDocumentMode();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const d = new Date();
  $("monthlyReviewMonth").value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  $$(".tab").forEach(btn => on(btn, "click", () => setTab(btn.dataset.tab)));
  renderMobileTabs();

  on($("mobileMenuBtn"), "click", openMobileSheet);
  on($("mobileSheetCloseBtn"), "click", closeMobileSheet);

  on($("youngPersonSelect"), "change", async e => {
    const p = state.youngPeople.find(x => Number(x.id) === Number(e.target.value));
    if (!p) return;
    state.selected = p;
    renderHeader();
    await preloadSelected();
    await loadTab();
  });

  on($("reloadCurrentBtn"), "click", async () => {
    await preloadSelected();
    await loadTab();
    msg("Record refreshed.");
  });

  on($("inspectionPackBtn"), "click", async () => {
    if (!state.selected) return msg("Select a young person first.", true);
    try {
      await j(ep.pack, {
        method:"POST",
        body: JSON.stringify({
          scope_type: "young_person",
          scope_id: state.selected.id,
          pack_type: "ofsted",
          requested_by: 1
        })
      });
      msg("Inspection pack created.");
    } catch (e){
      msg(e.message, true);
    }
  });

  on($("headerOfstedAiBtn"), "click", async () => {
    if (!state.selected) return msg("Select a young person first.", true);
    try {
      await j(ep.ofsted(state.selected.id));
      msg("AI OFSTED report generated.");
      setTab("reports");
      await loadReports(state.selected.id);
    } catch (e){
      msg(e.message, true);
    }
  });

  on($("generateHandoverBtn"), "click", generateHandover);
  on($("generateHandoverBtn2"), "click", generateHandover);
  on($("mobileGenerateHandoverBtn"), "click", generateHandover);
  on($("refreshHandoverBtn"), "click", () => state.selected && loadHandover(state.selected.id));

  on($("rebuildChronologyBtn"), "click", async () => {
    if (!state.selected) return;
    try {
      await j(ep.chronologyRebuild(state.selected.id), { method:"POST" });
      msg("Chronology rebuilt.");
      await loadChronology(state.selected.id);
    } catch (e){
      msg(e.message, true);
    }
  });

  on($("generateMonthlyReviewBtn"), "click", async () => {
    if (!state.selected) return msg("Select a young person first.", true);
    const month = $("monthlyReviewMonth").value ? `${$("monthlyReviewMonth").value}-01` : "";
    if (!month) return msg("Choose a month first.", true);
    try {
      await j(ep.monthlyGenerate(state.selected.id, month), { method:"POST" });
      msg("Monthly review generated.");
      await loadMonthly(state.selected.id);
    } catch (e){
      msg(e.message, true);
    }
  });

  on($("monthlyOfstedAiBtn"), "click", async () => {
    if (!state.selected) return msg("Select a young person first.", true);
    const month = $("monthlyReviewMonth").value ? `${$("monthlyReviewMonth").value}-01` : "";
    try {
      await j(ep.ofsted(state.selected.id, month));
      msg("AI OFSTED report generated.");
      setTab("reports");
      await loadReports(state.selected.id);
    } catch (e){
      msg(e.message, true);
    }
  });

  on($("rebuildStandardsBtn"), "click", async () => {
    if (!state.selected) return;
    try {
      await j(ep.standardsRebuild(state.selected.id), { method:"POST" });
      msg("Standards rebuilt.");
      await loadStandards(state.selected.id);
    } catch (e){
      msg(e.message, true);
    }
  });

  on($("docBackBtn"), "click", closeDocumentMode);

  on($("youngPersonPhotoUpload"), "change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await uploadPhoto(file); }
    catch (err){ msg(err.message, true); }
  });

  on($("statDocUploadBtn"), "click", uploadStatutoryDocument);
  on($("mobileUploadStatBtn"), "click", uploadStatutoryDocument);

  bindPrimaryDocButtons();
  bindCreateButtons();
  loadYoungPeople();
});
