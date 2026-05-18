const state = { referrals: [], selectedReferral: null };

const CAPABILITY_OPTIONS = [
  ["accepts_autism", "Autism"], ["accepts_learning_disability", "Learning disability"],
  ["accepts_global_developmental_delay", "Global developmental delay"], ["accepts_trauma_history", "Trauma history"],
  ["accepts_cse_risk", "CSE risk"], ["accepts_knife_risk", "Knife/weapons risk"],
  ["accepts_fire_setting", "Fire setting"], ["accepts_self_harm", "Self-harm"],
  ["accepts_suicidal_ideation", "Suicidal ideation"], ["accepts_physical_aggression", "Physical aggression"],
  ["accepts_sexualised_behaviour", "Sexualised behaviour"], ["accepts_missing_from_care", "Missing from care"],
  ["accepts_substance_misuse", "Substance misuse"], ["accepts_criminal_exploitation", "Criminal exploitation"],
  ["accepts_gang_affiliation", "Gang affiliation"], ["accepts_high_supervision", "High supervision"],
  ["accepts_deprivation_of_liberty", "DOLs / deprivation of liberty"], ["emergency_bed_available", "Emergency bed available"]
];

const $ = (id) => document.getElementById(id);
const els = {
  referralList: $("referralList"), refreshBtn: $("refreshBtn"), newReferralBtn: $("newReferralBtn"),
  newReferralPanel: $("newReferralPanel"), reviewPanel: $("reviewPanel"), referralForm: $("referralForm"),
  capabilityForm: $("capabilityForm"), capabilityChecks: $("capabilityChecks"), documentForm: $("documentForm"),
  fileUploadForm: $("fileUploadForm"), referralFile: $("referralFile"), riskFlags: $("riskFlags"),
  scoreAllBtn: $("scoreAllBtn"), scoreOneBtn: $("scoreOneBtn"), scoreHomeId: $("scoreHomeId"),
  matchingResults: $("matchingResults"), convertHomeId: $("convertHomeId"), convertBtn: $("convertBtn"),
  conversionResult: $("conversionResult"), decisionReason: $("decisionReason"), decisionHomeId: $("decisionHomeId"),
  acceptInPrincipleBtn: $("acceptInPrincipleBtn"), requestMoreInfoBtn: $("requestMoreInfoBtn"), declineReferralBtn: $("declineReferralBtn"),
  decisionResult: $("decisionResult"), toast: $("toast")
};

function escapeHtml(value = "") {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function showToast(message, kind = "info") {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.className = `toast ${kind}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 3200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.detail || data?.error || `Request failed: ${response.status}`);
  return data;
}

async function apiForm(path, formData) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    body: formData
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.detail || data?.error || `Upload failed: ${response.status}`);
  return data;
}

function formToObject(form) {
  const data = {};
  new FormData(form).forEach((value, key) => { if (value !== "") data[key] = value; });
  form.querySelectorAll("input[type='checkbox']").forEach((input) => { data[input.name] = input.checked; });
  form.querySelectorAll("input[type='number']").forEach((input) => { if (input.value !== "") data[input.name] = Number(input.value); });
  return data;
}

function statusClass(status = "") { return String(status || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_"); }
function referralName(referral = {}) { return [referral.preferred_name || referral.young_person_first_name, referral.young_person_last_name].filter(Boolean).join(" ") || `Referral #${referral.id}`; }

function renderCapabilityChecks() {
  if (!els.capabilityChecks) return;
  els.capabilityChecks.innerHTML = CAPABILITY_OPTIONS.map(([name, label]) => `<label class="check"><input type="checkbox" name="${escapeHtml(name)}" /><span>${escapeHtml(label)}</span></label>`).join("");
}

function renderReferralList() {
  if (!els.referralList) return;
  if (!state.referrals.length) { els.referralList.innerHTML = `<p class="muted">No referrals yet.</p>`; return; }
  els.referralList.innerHTML = state.referrals.map((referral) => `
    <article class="row ${state.selectedReferral?.id === referral.id ? "active" : ""}" data-referral-id="${escapeHtml(referral.id)}">
      <div class="row-title"><span>${escapeHtml(referralName(referral))}</span><span class="status ${escapeHtml(statusClass(referral.status))}">${escapeHtml(referral.status || "received")}</span></div>
      <div class="row-meta">${escapeHtml(referral.source_local_authority || "No LA recorded")} · ${escapeHtml(referral.urgency || "standard")}</div>
    </article>`).join("");
  els.referralList.querySelectorAll("[data-referral-id]").forEach((row) => row.addEventListener("click", () => selectReferral(Number(row.dataset.referralId))));
}

function renderOverview(referral = {}) {
  const panel = document.querySelector("[data-panel='overview']");
  if (!panel) return;
  panel.innerHTML = `
    <div><h2>${escapeHtml(referralName(referral))}</h2><p>${escapeHtml(referral.reason_for_referral || "No referral reason recorded yet.")}</p>
      <div class="pill-row"><span class="pill">${escapeHtml(referral.source_local_authority || "Local authority unknown")}</span><span class="pill">${escapeHtml(referral.urgency || "standard")}</span><span class="pill">${escapeHtml(referral.legal_status || "legal status not set")}</span><span class="pill">${escapeHtml(referral.ai_extraction_status || "pending extraction")}</span><span class="pill">Decision: ${escapeHtml(referral.manager_decision || "not recorded")}</span></div></div>
    <div class="grid"><div class="score-card"><strong>Presenting needs</strong><p>${escapeHtml(referral.presenting_needs || "Not yet populated.")}</p></div><div class="score-card"><strong>Risk summary</strong><p>${escapeHtml(referral.risk_summary || "Not yet populated.")}</p></div><div class="score-card"><strong>Education</strong><p>${escapeHtml(referral.education_summary || "Not yet populated.")}</p></div><div class="score-card"><strong>Health</strong><p>${escapeHtml(referral.health_summary || "Not yet populated.")}</p></div><div class="score-card"><strong>Family/contact</strong><p>${escapeHtml(referral.family_contact_summary || "Not yet populated.")}</p></div><div class="score-card"><strong>Child voice</strong><p>${escapeHtml(referral.child_voice || "Not yet populated.")}</p></div></div>`;
}

function renderRiskFlags(referral = {}) {
  if (!els.riskFlags) return;
  const flags = referral.risk_flags || [];
  if (!flags.length) { els.riskFlags.innerHTML = `<p class="muted">No extracted risk flags yet. Add or scan referral text.</p>`; return; }

  const pendingCount = flags.filter((flag) => (flag.manager_review_status || "pending") === "pending").length;
  els.riskFlags.innerHTML = `
    <article class="score-card">
      <h3>Manager risk review</h3>
      <p>${escapeHtml(pendingCount)} extracted flag(s) still need manager review before matching should be relied on.</p>
      <p class="muted">Confirm what is accurate, override wording/severity where the referral pack is unclear, dismiss false positives, or request more information.</p>
    </article>
    ${flags.map((flag) => {
      const reviewStatus = flag.manager_review_status || "pending";
      const label = flag.manager_override_label || flag.flag_label || flag.flag_key;
      const severity = flag.manager_override_severity || flag.severity || "medium";
      return `<article class="row" data-risk-flag-id="${escapeHtml(flag.id)}">
        <div class="row-title"><span>${escapeHtml(label)}</span><span class="status ${escapeHtml(statusClass(severity))}">${escapeHtml(severity)}</span></div>
        <div class="row-meta">Review: <strong>${escapeHtml(reviewStatus)}</strong> · ${escapeHtml(flag.evidence || "Evidence not recorded.")}</div>
        ${flag.manager_review_note ? `<p>${escapeHtml(flag.manager_review_note)}</p>` : ""}
        <div class="grid" style="margin-top:10px">
          <button class="success" type="button" data-risk-review="confirmed" data-risk-flag-id="${escapeHtml(flag.id)}">Confirm</button>
          <button class="secondary" type="button" data-risk-review="overridden" data-risk-flag-id="${escapeHtml(flag.id)}">Override</button>
          <button class="warning" type="button" data-risk-review="needs_more_information" data-risk-flag-id="${escapeHtml(flag.id)}">Need info</button>
          <button class="danger" type="button" data-risk-review="dismissed" data-risk-flag-id="${escapeHtml(flag.id)}">Dismiss</button>
        </div>
      </article>`;
    }).join("")}`;
}

function renderMatching(referral = {}) {
  if (!els.matchingResults) return;
  const rows = referral.matching_assessments || [];
  if (!rows.length) { els.matchingResults.innerHTML = `<p class="muted">No matching assessments yet. Score this referral against configured homes.</p>`; return; }
  els.matchingResults.innerHTML = rows.map((item) => {
    const unmet = Array.isArray(item.unmet_needs) ? item.unmet_needs : [];
    return `<article class="score-card"><div class="row-title"><span>Home ${escapeHtml(item.home_id)}</span><span class="status ${escapeHtml(statusClass(item.compatibility_status))}">${escapeHtml(item.compatibility_status)}</span></div><div class="score">${escapeHtml(Math.round(Number(item.fit_score || 0)))}%</div><div class="muted">Risk score: ${escapeHtml(item.risk_score || 0)}</div><p>${escapeHtml(item.peer_impact_summary || "Peer impact review required before final decision.")}</p>${unmet.length ? `<p><strong>Unmet needs:</strong> ${escapeHtml(unmet.map((u) => u.label || u.flag_key).join(", "))}</p>` : ""}</article>`;
  }).join("");
}

function renderDecision(result = null) {
  if (!els.decisionResult) return;
  const referral = result?.referral || result?.item || state.selectedReferral;
  if (!referral) { els.decisionResult.innerHTML = ""; return; }
  els.decisionResult.innerHTML = `<article class="score-card"><h3>Decision status</h3><p><strong>${escapeHtml(referral.status || "received")}</strong></p><p>${escapeHtml(referral.decision_reason || "No decision rationale recorded yet.")}</p></article>`;
}

function renderConversion(result = null) {
  if (!els.conversionResult) return;
  if (!result) { els.conversionResult.innerHTML = ""; return; }
  const item = result.referral_conversion || result.item || result;
  const youngPerson = item.young_person || {};
  const plan = item.initial_care_plan || {};
  const risk = item.matching_risk_assessment || {};
  const docs = item.copied_referral_documents || [];
  els.conversionResult.innerHTML = `<article class="score-card"><h3>Referral converted with evidence</h3><p>Young person ID: <strong>${escapeHtml(youngPerson.id || "created")}</strong></p><p>Initial care plan: <strong>${escapeHtml(plan.id || "created")}</strong></p><p>Matching risk assessment: <strong>${escapeHtml(risk.id || "created")}</strong></p><p>Copied referral evidence documents: <strong>${escapeHtml(docs.length)}</strong></p>${youngPerson.id ? `<a class="button primary" href="/young-people.html?id=${encodeURIComponent(youngPerson.id)}">Open child profile</a>` : ""}</article>`;
}

function renderSelectedReferral() {
  const referral = state.selectedReferral;
  if (!referral) { els.reviewPanel?.classList.add("hidden"); return; }
  els.reviewPanel?.classList.remove("hidden");
  renderOverview(referral); renderRiskFlags(referral); renderMatching(referral); renderDecision(); renderConversion(null); renderReferralList();
}

async function loadReferrals() {
  const data = await api("/referrals");
  state.referrals = data.items || data.referrals || [];
  renderReferralList();
  if (state.selectedReferral?.id && state.referrals.some((item) => item.id === state.selectedReferral.id)) await selectReferral(state.selectedReferral.id);
}

async function selectReferral(referralId) {
  const data = await api(`/referrals/${encodeURIComponent(referralId)}`);
  state.selectedReferral = data.referral || data.item || data;
  renderSelectedReferral();
}

async function saveCapability(event) {
  event.preventDefault();
  const data = formToObject(event.currentTarget);
  const homeId = data.home_id;
  if (!homeId) return showToast("Home ID is required", "error");
  delete data.home_id;
  await api(`/referrals/homes/${encodeURIComponent(homeId)}/capabilities`, { method: "PUT", body: JSON.stringify(data) });
  showToast("Home matching capability saved");
}

async function createReferral(event) {
  event.preventDefault();
  const result = await api("/referrals", { method: "POST", body: JSON.stringify(formToObject(event.currentTarget)) });
  showToast("Referral created");
  event.currentTarget.reset();
  await loadReferrals();
  const created = result.referral || result.item;
  if (created?.id) await selectReferral(created.id);
}

async function addDocument(event) {
  event.preventDefault();
  if (!state.selectedReferral?.id) return showToast("Select a referral first", "error");
  await api(`/referrals/${encodeURIComponent(state.selectedReferral.id)}/documents`, { method: "POST", body: JSON.stringify(formToObject(event.currentTarget)) });
  showToast("Document text added and scanned");
  event.currentTarget.reset();
  await selectReferral(state.selectedReferral.id);
}

async function uploadDocumentFile(event) {
  event.preventDefault();
  if (!state.selectedReferral?.id) return showToast("Select a referral first", "error");
  const formData = new FormData(event.currentTarget);
  const file = formData.get("file");
  if (!file || !file.name) return showToast("Choose a referral file first", "error");
  await apiForm(`/referrals/${encodeURIComponent(state.selectedReferral.id)}/documents/upload`, formData);
  showToast("Referral file uploaded and scanned");
  event.currentTarget.reset();
  await selectReferral(state.selectedReferral.id);
}

async function scoreAllHomes() {
  if (!state.selectedReferral?.id) return showToast("Select a referral first", "error");
  await api(`/referrals/${encodeURIComponent(state.selectedReferral.id)}/score`, { method: "POST", body: "{}" });
  showToast("Referral scored against all configured homes");
  await selectReferral(state.selectedReferral.id);
}

async function scoreOneHome() {
  if (!state.selectedReferral?.id) return showToast("Select a referral first", "error");
  const homeId = Number(els.scoreHomeId?.value || 0);
  if (!homeId) return showToast("Enter a home ID to score", "error");
  await api(`/referrals/${encodeURIComponent(state.selectedReferral.id)}/score/homes/${encodeURIComponent(homeId)}`, { method: "POST", body: "{}" });
  showToast("Referral scored against selected home");
  await selectReferral(state.selectedReferral.id);
}

async function reviewRiskFlag(flagId, status) {
  if (!state.selectedReferral?.id) return showToast("Select a referral first", "error");
  const note = window.prompt("Add manager review note / rationale", "") || "";
  const payload = { review_note: note };
  if (status === "overridden") {
    const severity = window.prompt("Override severity: low, medium or high", "medium") || "medium";
    const label = window.prompt("Override label", "") || "";
    payload.manager_override_severity = severity;
    if (label) payload.manager_override_label = label;
  }
  await api(`/referrals/${encodeURIComponent(state.selectedReferral.id)}/risk-flags/${encodeURIComponent(flagId)}/review/${encodeURIComponent(status)}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  showToast("Referral risk flag reviewed");
  await selectReferral(state.selectedReferral.id);
}

function decisionPayload() {
  return { decision_reason: els.decisionReason?.value || "", home_id: Number(els.decisionHomeId?.value || els.convertHomeId?.value || 0) || undefined };
}

async function recordDecision(action) {
  if (!state.selectedReferral?.id) return showToast("Select a referral first", "error");
  const result = await api(`/referrals/${encodeURIComponent(state.selectedReferral.id)}/decision/${action}`, { method: "POST", body: JSON.stringify(decisionPayload()) });
  showToast(result.message || "Referral decision recorded");
  renderDecision(result);
  await loadReferrals();
  await selectReferral(state.selectedReferral.id);
}

async function convertReferral() {
  if (!state.selectedReferral?.id) return showToast("Select a referral first", "error");
  const homeId = Number(els.convertHomeId?.value || els.decisionHomeId?.value || 0);
  if (!homeId) return showToast("Accepted home ID is required", "error");
  const result = await api(`/referrals/${encodeURIComponent(state.selectedReferral.id)}/convert-with-evidence`, { method: "POST", body: JSON.stringify({ home_id: homeId }) });
  showToast("Referral converted into child journey with evidence");
  renderConversion(result);
  await loadReferrals();
  await selectReferral(state.selectedReferral.id);
}

function bindTabs() {
  document.querySelectorAll(".tab[data-tab]").forEach((tab) => tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    document.querySelectorAll(".tab[data-tab]").forEach((item) => item.classList.toggle("active", item === tab));
    document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== target));
  }));
}

function bindEvents() {
  els.refreshBtn?.addEventListener("click", () => loadReferrals().catch((error) => showToast(error.message, "error")));
  els.newReferralBtn?.addEventListener("click", () => els.newReferralPanel?.scrollIntoView({ behavior: "smooth" }));
  els.capabilityForm?.addEventListener("submit", (event) => saveCapability(event).catch((error) => showToast(error.message, "error")));
  els.referralForm?.addEventListener("submit", (event) => createReferral(event).catch((error) => showToast(error.message, "error")));
  els.documentForm?.addEventListener("submit", (event) => addDocument(event).catch((error) => showToast(error.message, "error")));
  els.fileUploadForm?.addEventListener("submit", (event) => uploadDocumentFile(event).catch((error) => showToast(error.message, "error")));
  els.riskFlags?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-risk-review]");
    if (!button) return;
    reviewRiskFlag(button.dataset.riskFlagId, button.dataset.riskReview).catch((error) => showToast(error.message, "error"));
  });
  els.scoreAllBtn?.addEventListener("click", () => scoreAllHomes().catch((error) => showToast(error.message, "error")));
  els.scoreOneBtn?.addEventListener("click", () => scoreOneHome().catch((error) => showToast(error.message, "error")));
  els.acceptInPrincipleBtn?.addEventListener("click", () => recordDecision("accept-in-principle").catch((error) => showToast(error.message, "error")));
  els.requestMoreInfoBtn?.addEventListener("click", () => recordDecision("request-more-information").catch((error) => showToast(error.message, "error")));
  els.declineReferralBtn?.addEventListener("click", () => recordDecision("decline").catch((error) => showToast(error.message, "error")));
  els.convertBtn?.addEventListener("click", () => convertReferral().catch((error) => showToast(error.message, "error")));
}

function init() { renderCapabilityChecks(); bindTabs(); bindEvents(); loadReferrals().catch((error) => showToast(error.message, "error")); }
init();
