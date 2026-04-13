import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

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

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status = "") {
  const normalised = String(status || "").toLowerCase();

  if (
    ["overdue", "urgent", "critical", "escalated", "failed", "cancelled"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["due_soon", "pending", "awaiting_follow_up", "review_due", "warning"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["active", "booked", "completed", "resolved", "open"].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(aValue).getTime() - new Date(bValue).getTime();
  });
}

function renderEmptyState(message = "No therapy records.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">✦</div>
        <h3>No therapy records</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderRows(items = [], emptyMessage = "No therapy records.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item.service_name ||
            item.title ||
            item.therapy_type ||
            "Therapy record";

          const summary =
            item.summary ||
            item.recommendations ||
            item.notes ||
            item.outcome ||
            "Therapy record";

          const meta = [
            item.professional_name || "",
            item.session_date ? formatDate(item.session_date) : "",
            item.next_session_date ? `Next ${formatDate(item.next_session_date)}` : "",
          ]
            .filter(Boolean)
            .join(" • ");

          const status = item.status || "Recorded";
          const tone = getStatusTone(status);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id || item.record_id || item.source_id || "")}"
              data-record-type="${safeText(item.record_type || "therapy")}"
              data-title="${safeText(title)}"
              tabindex="0"
              role="button"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(status)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildTherapyStats(items = []) {
  const active = items.filter((item) =>
    ["active", "booked", "open"].includes(String(item.status || "").toLowerCase())
  ).length;

  const followUp = items.filter((item) =>
    item.next_session_date ||
    ["pending", "awaiting_follow_up", "review_due"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const completed = items.filter((item) =>
    ["completed", "resolved"].includes(String(item.status || "").toLowerCase())
  ).length;

  const recent = items.filter((item) => {
    const when = item.session_date || item.updated_at || item.created_at;
    if (!when) return false;
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  return {
    active,
    followUp,
    completed,
    recent,
  };
}

function buildAttentionItems(items = []) {
  return sortSoonestFirst(
    items.filter((item) =>
      item.next_session_date ||
      ["pending", "awaiting_follow_up", "review_due", "overdue", "urgent"].includes(
        String(item.status || "").toLowerCase()
      )
    ),
    ["next_session_date", "session_date", "updated_at", "created_at"]
  );
}

function buildRecentItems(items = []) {
  return sortNewestFirst(items, ["session_date", "updated_at", "created_at"]).slice(0, 8);
}

function buildUpcomingItems(items = []) {
  const now = Date.now();

  return sortSoonestFirst(
    items.filter((item) => {
      if (!item.next_session_date) return false;
      const date = new Date(item.next_session_date);
      if (Number.isNaN(date.getTime())) return false;
      return date.getTime() >= now;
    }),
    ["next_session_date", "session_date"]
  );
}

function renderTherapyHtml({
  items = [],
  stats = {},
  attentionItems = [],
  recentItems = [],
  upcomingItems = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Therapy</div>
          <h2>Therapeutic services</h2>
          <p>Therapeutic input, recommendations, outcomes and follow-up across the home.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card ${
              stats.active > 0 ? "overview-stat-card--success" : ""
            }">
              <span class="overview-stat-label">Active therapy</span>
              <strong class="overview-stat-value">${safeText(stats.active)}</strong>
              <span class="overview-stat-note">Current active or booked work</span>
            </article>

            <article class="overview-stat-card ${
              stats.followUp > 0 ? "overview-stat-card--warning" : ""
            }">
              <span class="overview-stat-label">Follow-up needed</span>
              <strong class="overview-stat-value">${safeText(stats.followUp)}</strong>
              <span class="overview-stat-note">Next sessions or action needed</span>
            </article>

            <article class="overview-stat-card ${
              stats.completed > 0 ? "overview-stat-card--success" : ""
            }">
              <span class="overview-stat-label">Completed</span>
              <strong class="overview-stat-value">${safeText(stats.completed)}</strong>
              <span class="overview-stat-note">Resolved or completed input</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Recent activity</span>
              <strong class="overview-stat-value">${safeText(stats.recent)}</strong>
              <span class="overview-stat-note">Therapy records in last 30 days</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent therapeutic input</h3>
              <p>Latest recorded therapeutic sessions, advice and outcomes.</p>
            </div>

            ${renderRows(recentItems, "No recent therapy records found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>All therapy records</h3>
              <p>Full therapy list in newest-first order.</p>
            </div>

            ${renderRows(items, "No therapy records found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>Therapeutic recommendations, overdue items or follow-up that may need action.</p>
            </div>

            ${renderRows(attentionItems, "No urgent therapy follow-up is currently showing.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Upcoming sessions</h3>
              <p>Therapy work with a next planned session date.</p>
            </div>

            ${renderRows(upcomingItems, "No upcoming therapy sessions found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadTherapy() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">✦</div>
            <h3>No home context available</h3>
            <p>A home ID is needed before therapy can load.</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading therapy…</p>
        </div>
      </div>
    </section>
  `;

  try {
    const data = await apiGet(`/homes/${homeId}/therapy`).catch(() => ({ items: [] }));
    const items = sortNewestFirst(data.items || data.therapy || data.records || [], [
      "session_date",
      "updated_at",
      "created_at",
    ]);

    const stats = buildTherapyStats(items);
    const attentionItems = buildAttentionItems(items).slice(0, 8);
    const recentItems = buildRecentItems(items);
    const upcomingItems = buildUpcomingItems(items).slice(0, 8);

    els.viewContent.innerHTML = renderTherapyHtml({
      items,
      stats,
      attentionItems,
      recentItems,
      upcomingItems,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">!</div>
            <h3>Failed to load therapy</h3>
            <p>${safeText(error?.message || "Therapy records could not be loaded.")}</p>
          </div>
        </div>
      </section>
    `;
  }
}