const homeNav = document.getElementById("workspace-nav");
const homeMain = document.getElementById("workspace-main");
const homeTitle = document.getElementById("view-title");
const homeSubtitle = document.getElementById("view-subtitle");
const homeAssistantOutput = document.getElementById("assistant-output");

if (homeNav) {
  homeNav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='home']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderHomeDashboard();
  }, true);
}

window.renderHomeDashboard = renderHomeDashboard;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderHomeDashboard);
} else {
  renderHomeDashboard();
}

async function renderHomeDashboard() {
  if (homeTitle) homeTitle.textContent = "Home dashboard";
  if (homeSubtitle) homeSubtitle.textContent = "Live overview of the home, care records, alerts and key actions.";
  if (!homeMain) return;

  homeMain.innerHTML = `<div class="panel">Loading home dashboard...</div>`;

  const [alerts, daily, incidents, safeguarding, missing] = await Promise.all([
    getJson("/alerts/active"),
    getJson("/workspace-records/daily?limit=5"),
    getJson("/workspace-records/incident?limit=5"),
    getJson("/workspace-records/safeguarding?limit=5"),
    getJson("/workspace-records/missing?limit=5"),
  ]);

  const alertList = alerts?.alerts || [];
  const records = [
    ...(daily?.records || []),
    ...(incidents?.records || []),
    ...(safeguarding?.records || []),
    ...(missing?.records || []),
  ].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

  const highAlerts = alertList.filter((alert) => ["critical", "high"].includes(alert.level)).length;
  const awaitingReview = records.filter((record) => String(record.status || "").includes("review")).length;

  homeMain.innerHTML = `
    <section class="hero-card dashboard-hero">
      <div>
        <p class="eyebrow">Today in the home</p>
        <h3>What needs attention?</h3>
        <p>Start with risks, missing records, manager review and the latest child journey evidence.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-home-action="daily">Daily log</button>
        <button type="button" class="secondary-action" data-home-action="incident">Incident</button>
        <button type="button" class="secondary-action" data-home-action="safeguarding">Safeguarding</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(alertList.length, "Active alerts", `${highAlerts} high or critical`)}
      ${metric(records.length, "Recent records", "Across daily, incidents and safeguarding")}
      ${metric(awaitingReview, "Manager review", "Submitted records needing oversight")}
      ${metric(missing?.records?.length || 0, "Missing episodes", "Recent missing-from-care records")}
    </section>

    <section class="two-column">
      <article class="panel">
        <div class="section-header-row">
          <div><p class="eyebrow">Live risk</p><h3>Priority alerts</h3></div>
          <button type="button" class="secondary-action" data-home-nav="alerts">Open alerts</button>
        </div>
        ${alertList.length ? alertList.slice(0, 4).map(alertCard).join("") : `<div class="empty-state">No active alerts returned. Keep recording and checking the timeline.</div>`}
      </article>

      <article class="panel">
        <div class="section-header-row">
          <div><p class="eyebrow">Quick work</p><h3>Staff actions</h3></div>
        </div>
        <div class="quick-action-grid">
          <button type="button" data-home-action="daily">Record daily note</button>
          <button type="button" data-home-action="incident">Record incident</button>
          <button type="button" data-home-action="missing">Missing episode</button>
          <button type="button" data-home-nav="child-timeline">Open child timeline</button>
          <button type="button" data-home-nav="knowledge">Ask documents</button>
          <button type="button" data-home-nav="intelligence">Manager intelligence</button>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Latest evidence</p><h3>Recent records</h3></div>
        <button type="button" class="secondary-action" data-home-nav="daily">View all records</button>
      </div>
      <div class="record-list">
        ${records.length ? records.slice(0, 8).map(recordCard).join("") : `<div class="empty-state">No recent records found. Create a daily log to start building evidence.</div>`}
      </div>
    </section>
  `;

  homeMain.querySelectorAll("[data-home-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.homeAction;
      if (window.openWorkspaceForm) window.openWorkspaceForm(action);
    });
  });

  homeMain.querySelectorAll("[data-home-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`[data-view='${button.dataset.homeNav}']`)?.click();
    });
  });

  homeMain.querySelectorAll(".home-record-card").forEach((card) => {
    card.addEventListener("click", () => showHomeRecordDetail(JSON.parse(card.dataset.record || "{}")));
  });
}

function metric(value, label, help) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`;
}

function alertCard(alert) {
  return `
    <article class="alert ${escapeHtml(alert.level || "low")}">
      <strong>${escapeHtml(alert.title || alert.message || "Alert")}</strong>
      <p>${escapeHtml(alert.recommended_action || alert.why || "Review and decide next steps.")}</p>
    </article>
  `;
}

function recordCard(record) {
  const data = escapeHtml(JSON.stringify(record));
  return `
    <article class="record-card clickable-record home-record-card" data-record="${data}">
      <div>
        <div class="review-meta">
          <span class="mini-tag">${escapeHtml(record.record_type || "record")}</span>
          <span class="mini-tag">${escapeHtml(record.status || "submitted")}</span>
        </div>
        <h4>${escapeHtml(record.title || "Untitled record")}</h4>
        <p>${escapeHtml(record.summary || "Open this record for full detail.")}</p>
        <small>${escapeHtml(record.updated_at || record.created_at || "No date")}</small>
      </div>
      <div class="record-actions"><button type="button">Open</button></div>
    </article>
  `;
}

function showHomeRecordDetail(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `
    <div class="record-detail-card">
      <div class="modal-header">
        <div><p class="eyebrow">${escapeHtml(record.record_type || "record")}</p><h3>${escapeHtml(record.title || "Record detail")}</h3></div>
        <button type="button" class="icon-button" data-close-home-record>x</button>
      </div>
      <div class="detail-grid">
        <div class="detail-item"><strong>Status</strong><br>${escapeHtml(record.status || "unknown")}</div>
        <div class="detail-item"><strong>Young person</strong><br>#${escapeHtml(record.young_person_id || "?")}</div>
        <div class="detail-item"><strong>Created</strong><br>${escapeHtml(record.created_at || "unknown")}</div>
        <div class="detail-item"><strong>Updated</strong><br>${escapeHtml(record.updated_at || "unknown")}</div>
      </div>
      <h4>Summary</h4>
      <p>${escapeHtml(record.summary || "No summary recorded.")}</p>
      <h4>Full record</h4>
      <div class="panel">${Object.entries(content).map(([key, value]) => `<p><strong>${escapeHtml(humanise(key))}:</strong> ${escapeHtml(value)}</p>`).join("") || "No structured content."}</div>
    </div>
  `;
  overlay.querySelector("[data-close-home-record]").addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

async function getJson(url) {
  try {
    const response = await fetch(url, { credentials: "include" });
    return await response.json();
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function humanise(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
