const viewMain = document.getElementById("workspace-main");
const viewTitle = document.getElementById("view-title");
const viewSubtitle = document.getElementById("view-subtitle");
const nav = document.getElementById("workspace-nav");
const refreshButton = document.getElementById("refresh-workspace-button");
const createButton = document.getElementById("new-record-button");
const recordModal = document.getElementById("record-modal");
const closeModalButton = document.getElementById("close-modal");
const assistantOutput = document.getElementById("assistant-output");

const controlledViews = {
  intelligence: {
    title: "Home intelligence",
    subtitle: "Risk, evidence gaps, staff uncertainty and recommended actions.",
    render: renderManagerIntelligence,
  },
  provider: {
    title: "Provider dashboard",
    subtitle: "Compare risk, evidence gaps and review pressure across homes.",
    render: renderProviderDashboard,
  },
  "staff-profile": {
    title: "My staff profile",
    subtitle: "Your compliance, training, supervision and work-life record.",
    render: renderStaffProfile,
  },
  settings: {
    title: "Settings",
    subtitle: "Configure language, terminology, notifications and therapeutic defaults.",
    render: renderSettings,
  },
};

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    const view = button.dataset.view;
    if (!controlledViews[view]) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    setViewHeading(controlledViews[view].title, controlledViews[view].subtitle);
    controlledViews[view].render();
  }, true);
}

if (refreshButton) {
  refreshButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const active = document.querySelector(".nav-item.active")?.dataset.view || "home";
    if (controlledViews[active]) {
      controlledViews[active].render();
      toast("Workspace refreshed.");
    } else if (window.loadView) {
      window.loadView(active);
    } else {
      location.reload();
    }
  }, true);
}

if (createButton) {
  createButton.addEventListener("click", () => {
    if (recordModal) recordModal.classList.remove("hidden");
  });
}

if (closeModalButton) {
  closeModalButton.addEventListener("click", () => {
    if (recordModal) recordModal.classList.add("hidden");
  });
}

async function renderManagerIntelligence() {
  showLoading();
  const data = await getJson("/manager/intelligence/dashboard");
  if (!data?.ok) return showError(data?.detail || data?.error || "Could not load home intelligence.");
  const summary = data.summary || {};
  const risks = data.risks || {};
  viewMain.innerHTML = `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Manager intelligence</p>
        <h3>Home oversight dashboard</h3>
        <p>Live risk, evidence and staff uncertainty signals for the home.</p>
      </div>
      <span class="score-pill">${escapeHtml(summary.risk_status || risks.status || "review")}</span>
    </section>
    <section class="card-grid">
      ${metric("Risk status", summary.risk_status || risks.status || "review", "Current home risk band")}
      ${metric("Review queue", summary.review_queue || 0, "Items requiring manager review")}
      ${metric("Evidence gaps", summary.evidence_gaps || 0, "Ofsted evidence gaps")}
      ${metric("Open actions", summary.open_actions || 0, "Actions needing follow-up")}
    </section>
    <section class="two-column">
      ${panel("Risk signals", renderSignals(risks.signals || []))}
      ${panel("Recommended actions", listActions(data.recommended_actions || []))}
    </section>
    <section class="two-column">
      ${panel("Evidence gaps", listGaps(data.evidence_gaps || []))}
      ${panel("Document gaps", listGaps(data.document_gaps || []))}
    </section>
    <section class="panel">
      <h3>Staff uncertainty</h3>
      ${renderAssistantInsights(data.assistant_insights || [])}
    </section>
  `;
}

async function renderProviderDashboard() {
  showLoading();
  const data = await getJson("/provider/intelligence");
  if (!data?.ok) return showError(data?.detail || data?.error || "Could not load provider dashboard.");
  const summary = data.summary || {};
  const homes = data.homes || [];
  viewMain.innerHTML = `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Provider intelligence</p>
        <h3>Provider overview</h3>
        <p>Compare risk, safeguarding, evidence gaps and review pressure across homes.</p>
      </div>
      <span class="score-pill">${escapeHtml(summary.total_homes || 0)} home(s)</span>
    </section>
    <section class="card-grid">
      ${metric("High risk", summary.high_risk || 0, "Homes needing urgent attention")}
      ${metric("Medium risk", summary.medium_risk || 0, "Homes requiring review")}
      ${metric("Low risk", summary.low_risk || 0, "Homes currently stable")}
      ${metric("Review queue", summary.total_review_queue || 0, "Pending manager reviews")}
    </section>
    <section class="record-list">
      ${homes.length ? homes.map(renderHomeCard).join("") : empty("No homes available for this provider view.")}
    </section>
  `;
}

function renderStaffProfile() {
  viewMain.innerHTML = `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Staff work life</p>
        <h3>My staff profile</h3>
        <p>One place for compliance, learning, supervision, wellbeing and professional standards.</p>
      </div>
      <span class="score-pill">Profile</span>
    </section>
    <section class="card-grid">
      ${metric("DBS", "Check", "DBS/update service status")}
      ${metric("Training", "Review", "Mandatory learning completion")}
      ${metric("Supervision", "Due check", "Reflective support and accountability")}
      ${metric("Policies", "Acknowledge", "Conduct, safeguarding and confidentiality")}
    </section>
    <section class="two-column">
      ${panel("My compliance", listItems(["DBS status and annual update check", "Right to work", "Mandatory training", "Driving documents", "Policy acknowledgements"]))}
      ${panel("My work life", listItems(["Supervision and appraisal", "Sickness and annual leave", "Wellbeing notes", "Professional development", "Reflective practice journal"]))}
    </section>
    <section class="panel">
      <h3>Professional standards reminders</h3>
      ${listItems(["Maintain professional boundaries", "Do not use personal devices or social media contact with children", "Record safeguarding concerns immediately", "Protect confidentiality and only access records for legitimate work reasons"])}
    </section>
  `;
}

function renderSettings() {
  viewMain.innerHTML = `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Configuration</p>
        <h3>Workspace settings</h3>
        <p>Prepare IndiCare for different homes, providers, language choices and practice models.</p>
      </div>
      <span class="score-pill">Config driven</span>
    </section>
    <section class="two-column">
      <article class="panel settings-panel">
        <h3>Terminology</h3>
        <label>Preferred child wording<select><option>Child</option><option>Young person</option><option>Resident</option></select></label>
        <label>Key adult wording<select><option>Key worker</option><option>Link worker</option><option>Trusted adult</option></select></label>
        <label>Local authority wording<select><option>Placing authority</option><option>Local authority</option></select></label>
      </article>
      <article class="panel settings-panel">
        <h3>Practice model</h3>
        <label><input type="checkbox" checked /> Trauma-informed prompts</label>
        <label><input type="checkbox" checked /> PACE-informed language</label>
        <label><input type="checkbox" checked /> Autism-friendly communication prompts</label>
        <label><input type="checkbox" checked /> Restorative repair prompts</label>
      </article>
    </section>
    <section class="two-column">
      <article class="panel settings-panel">
        <h3>Notifications</h3>
        <label><input type="checkbox" checked /> Safeguarding alerts</label>
        <label><input type="checkbox" checked /> Missing-from-care alerts</label>
        <label><input type="checkbox" checked /> Manager review reminders</label>
        <label><input type="checkbox" checked /> Ofsted evidence gaps</label>
      </article>
      <article class="panel settings-panel">
        <h3>Data and governance</h3>
        <label><input type="checkbox" checked /> Require approved documents for cited answers</label>
        <label><input type="checkbox" checked /> Log assistant queries</label>
        <label><input type="checkbox" checked /> Show safeguarding warnings</label>
        <label><input type="checkbox" checked /> Audit exports and document views</label>
      </article>
    </section>
  `;
}

function renderHomeCard(home) {
  const risk = home.risk || "unknown";
  return `
    <article class="record-card home-card ${escapeHtml(risk)}">
      <div>
        <div class="review-meta"><span class="mini-tag">${escapeHtml(risk)} risk</span><span class="mini-tag">Home #${escapeHtml(home.home_id || "?")}</span></div>
        <h4>${escapeHtml(home.home_name || "Unnamed home")}</h4>
        <p>Incidents: ${escapeHtml(home.incidents || 0)} · Safeguarding: ${escapeHtml(home.safeguarding || 0)} · Missing: ${escapeHtml(home.missing || 0)}</p>
        <small>Evidence gaps: ${escapeHtml(home.evidence_gaps || 0)} · Document gaps: ${escapeHtml(home.document_gaps || 0)} · Review queue: ${escapeHtml(home.review_queue || 0)}</small>
      </div>
      <div class="record-actions"><button type="button" onclick="document.querySelector('[data-view=intelligence]')?.click()">Open home intelligence</button></div>
    </article>
  `;
}

function renderSignals(signals) {
  if (!signals.length) return empty("No risk signals returned.");
  return signals.map(signal => `
    <article class="alert ${escapeHtml(signal.level || "low")}">
      <strong>${escapeHtml(signal.message || signal.title || "Signal")}</strong>
      <p>${escapeHtml(signal.action || signal.recommended_action || "Review source records.")}</p>
    </article>
  `).join("");
}

function renderAssistantInsights(items) {
  if (!items.length) return empty("No assistant usage insights yet.");
  return `<ul class="clean-list">${items.map(item => `<li><strong>${escapeHtml(item.question || "Query")}</strong> (${escapeHtml(item.count || 0)})<br><small>${escapeHtml(item.insight || "Review whether staff need clearer guidance.")}</small></li>`).join("")}</ul>`;
}

function listGaps(gaps) {
  if (!gaps.length) return empty("No gaps returned.");
  return `<ul class="clean-list">${gaps.map(gap => `<li><strong>${escapeHtml(gap.area || "Gap")}:</strong> ${escapeHtml(gap.gap || "Review required")}</li>`).join("")}</ul>`;
}

function listActions(actions) {
  if (!actions.length) return empty("No recommended actions returned.");
  return `<ul class="clean-list">${actions.map(action => `<li><strong>${escapeHtml(action.priority || "review")}:</strong> ${escapeHtml(action.action || JSON.stringify(action))}</li>`).join("")}</ul>`;
}

function listItems(items) {
  return `<ul class="clean-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function metric(label, value, help) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`;
}

function panel(title, body) {
  return `<article class="panel"><h3>${escapeHtml(title)}</h3>${body}</article>`;
}

function empty(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

async function getJson(url) {
  try {
    const response = await fetch(url, { credentials: "include" });
    return await response.json();
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function setViewHeading(title, subtitle) {
  if (viewTitle) viewTitle.textContent = title;
  if (viewSubtitle) viewSubtitle.textContent = subtitle;
}

function showLoading() {
  if (viewMain) viewMain.innerHTML = `<div class="skeleton"><span></span><span></span><span></span></div>`;
}

function showError(message) {
  if (viewMain) viewMain.innerHTML = `<div class="warning-banner">${escapeHtml(message)}</div>`;
}

function toast(message) {
  if (assistantOutput) assistantOutput.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
