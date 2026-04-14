import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function renderEmptyCard(title, message) {
  return `
    <section class="overview-side-card">
      <div class="overview-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      <div class="empty-state">
        <p>${safeText(message)}</p>
      </div>
    </section>
  `;
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--five">
      ${cards
        .map(
          (card) => `
            <article class="overview-stat-card ${
              card.tone === "danger"
                ? "overview-stat-card--danger"
                : card.tone === "warning"
                ? "overview-stat-card--warning"
                : card.tone === "success"
                ? "overview-stat-card--success"
                : ""
            }">
              <span class="overview-stat-label">${safeText(card.label)}</span>
              <strong class="overview-stat-value">${safeText(card.value)}</strong>
              <span class="overview-stat-note">${safeText(card.note)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProgressCards(cards = []) {
  return `
    <div class="analytics-progress-grid">
      ${cards
        .map(
          (card) => `
            <article class="analytics-progress-card">
              <div class="analytics-progress-head">
                <span class="analytics-progress-label">${safeText(card.label)}</span>
                <strong class="analytics-progress-value">${safeText(card.value)}</strong>
              </div>
              <div class="analytics-progress-track">
                <span
                  class="analytics-progress-bar analytics-progress-bar--${safeText(card.tone || "muted")}"
                  style="width: ${safeText(card.percent || 0)}%;"
                ></span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMiniChart(title, items = []) {
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return `
    <section class="overview-side-card">
      <div class="overview-section-head">
        <h3>${safeText(title)}</h3>
        <p>Quick visual comparison.</p>
      </div>
      <div class="mini-chart">
        ${items
          .map((item) => {
            const value = Number(item.value) || 0;
            const width = Math.max(8, Math.round((value / max) * 100));
            return `
              <div class="mini-chart-row">
                <span class="mini-chart-label">${safeText(item.label)}</span>
                <div class="mini-chart-bar-wrap">
                  <span class="mini-chart-bar" style="width: ${safeText(width)}%;"></span>
                </div>
                <strong class="mini-chart-value">${safeText(value)}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function buildStaticDashboardModel() {
  const currentUser = state.currentUser || {};
  const homeName =
    currentUser.home_name ||
    currentUser.homeName ||
    (getHomeId() ? `Home ${getHomeId()}` : "Home dashboard");

  const childrenCount = toNumber(
    currentUser.children_count ||
      currentUser.young_people_count ||
      currentUser.resident_count,
    0
  );

  const topStats = [
    {
      label: "Children in home",
      value: childrenCount,
      note: "Current live children",
      tone: "muted",
    },
    {
      label: "Open actions",
      value: 0,
      note: "Awaiting live task feed",
      tone: "muted",
    },
    {
      label: "Overdue",
      value: 0,
      note: "Awaiting live compliance feed",
      tone: "muted",
    },
    {
      label: "Supervision due",
      value: 0,
      note: "Awaiting live supervision feed",
      tone: "muted",
    },
    {
      label: "Recent comms",
      value: 0,
      note: "Awaiting live communications feed",
      tone: "muted",
    },
  ];

  const progressCards = [
    {
      label: "Home compliance",
      value: "0%",
      percent: 0,
      tone: "muted",
    },
    {
      label: "Task completion",
      value: "0%",
      percent: 0,
      tone: "muted",
    },
    {
      label: "Document readiness",
      value: "0%",
      percent: 0,
      tone: "muted",
    },
    {
      label: "Supervision completion",
      value: "0%",
      percent: 0,
      tone: "muted",
    },
    {
      label: "Therapeutic input",
      value: "0",
      percent: 0,
      tone: "muted",
    },
  ];

  const miniMetrics = [
    { label: "Tasks", value: 0 },
    { label: "Supervisions", value: 0 },
    { label: "Documents", value: 0 },
    { label: "Therapy", value: 0 },
    { label: "Comms", value: 0 },
  ];

  return {
    homeName,
    childrenCount,
    topStats,
    progressCards,
    miniMetrics,
  };
}

function renderHomeDashboardHtml(model) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Home dashboard</div>
          <h2>${safeText(model.homeName)}</h2>
          <p>A live home-wide management view. This page is running in safe mode until real home endpoints are connected.</p>
        </div>
      </div>

      ${renderStatCards(model.topStats)}

      <section class="overview-section-card">
        <div class="overview-section-head">
          <h3>Performance snapshot</h3>
          <p>Visual indicators will populate once real home-level APIs are connected.</p>
        </div>
        ${renderProgressCards(model.progressCards)}
      </section>

      <div class="overview-grid">
        <section class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Operational picture</h3>
              <p>This home dashboard shell is loaded successfully without calling non-existent endpoints.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Home context</div>
                  <div class="record-row-summary">The shell can see the current home and render the dashboard safely.</div>
                  <div class="record-row-meta">Home ID: ${safeText(getHomeId() || "Not set")}</div>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Live children count</div>
                  <div class="record-row-summary">Pulled from available session or state context only.</div>
                  <div class="record-row-meta">${safeText(model.childrenCount)}</div>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Network-safe mode</div>
                  <div class="record-row-summary">No missing home routes are being called from this page.</div>
                  <div class="record-row-meta">404 noise removed</div>
                </div>
              </article>
            </div>
          </section>

          ${renderEmptyCard(
            "Recent communication",
            "Connect a real home communications source or a home bundle endpoint to populate this section."
          )}

          ${renderEmptyCard(
            "Open tasks",
            "Connect a real home task source or include tasks in a home bundle endpoint."
          )}

          ${renderEmptyCard(
            "Team overview",
            "Connect a real workforce/team source or include staffing data in a home bundle endpoint."
          )}
        </section>

        <aside class="overview-side">
          ${renderEmptyCard(
            "Needs attention",
            "Priority items will appear here once live home-wide actions, incidents, and review feeds are wired in."
          )}

          ${renderMiniChart("Management activity", model.miniMetrics)}

          ${renderEmptyCard(
            "Supervision due",
            "Connect supervision data here when that API exists."
          )}

          ${renderEmptyCard(
            "Documents",
            "Connect home documents here when that API exists."
          )}

          ${renderEmptyCard(
            "Therapeutic services",
            "Connect therapy or clinical service data here when that API exists."
          )}
        </aside>
      </div>
    </section>
  `;
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">▥</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before the home dashboard can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No home context",
    nextEvent: "No calendar loaded",
    lastRecord: "No dashboard data",
    openActions: "No actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading home dashboard…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading home view",
    nextEvent: "Checking upcoming activity",
    lastRecord: "Loading latest record",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load home dashboard</h3>
          <p>${safeText(message || "The home dashboard could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Home dashboard unavailable",
    nextEvent: "No event loaded",
    lastRecord: "No record loaded",
    openActions: "No actions loaded",
  });
}

export async function loadHomeDashboard() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const model = buildStaticDashboardModel();

    els.viewContent.innerHTML = renderHomeDashboardHtml(model);

    updateWorkspaceSummaryStrip({
      today: `${model.childrenCount} children • safe mode`,
      nextEvent: "No live home events connected",
      lastRecord: "Dashboard loaded without endpoint errors",
      openActions: "0 open • 0 overdue",
    });
  } catch (error) {
    renderErrorState(error?.message || "The home dashboard could not be loaded.");
  }
}
