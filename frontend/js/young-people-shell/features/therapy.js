import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
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

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
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
    ["cancelled", "missed", "overdue", "escalated", "critical", "paused"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["due", "due_soon", "scheduled", "attention", "review_due", "waiting"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["active", "booked", "completed", "current", "open"].includes(normalised)
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

function normaliseTherapyItems(data = {}) {
  return toArray(data.items, [data.therapy, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "therapy",
    title: item.title || item.service_name || "Therapy record",
    service_name: item.service_name || item.title || "Therapeutic service",
    professional_name: item.professional_name || item.therapist || "",
    therapy_type: item.therapy_type || item.type || "",
    summary:
      item.summary ||
      item.recommendations ||
      item.outcome ||
      item.notes ||
      "Therapeutic record logged.",
    recommendations: item.recommendations || "",
    outcome: item.outcome || "",
    follow_up_actions: item.follow_up_actions || item.actions_required || "",
    session_date: item.session_date || item.event_date || null,
    next_session_date: item.next_session_date || item.review_date || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    status: item.status || "recorded",
  }));
}

function buildTherapyStats(items = []) {
  const active = items.filter((item) =>
    ["active", "booked", "open", "current"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const followUp = items.filter((item) => item.follow_up_actions).length;

  const recommendations = items.filter((item) => item.recommendations).length;

  const dueSoon = items.filter((item) =>
    ["due", "due_soon", "scheduled", "review_due", "waiting"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const concerns = items.filter((item) =>
    ["cancelled", "missed", "overdue", "paused", "escalated"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  return {
    total: items.length,
    active,
    followUp,
    recommendations,
    dueSoon,
    concerns,
  };
}

function buildPriorityItems(items = []) {
  return items.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return (
      ["cancelled", "missed", "overdue", "paused", "escalated", "due", "due_soon"].includes(
        status
      ) ||
      Boolean(item.follow_up_actions) ||
      Boolean(item.recommendations)
    );
  });
}

function buildActionItems(items = []) {
  return items.filter((item) => item.follow_up_actions || item.recommendations);
}

function buildUpcomingItems(items = []) {
  return sortSoonestFirst(items, [
    "next_session_date",
    "session_date",
    "updated_at",
    "created_at",
  ]).filter((item) =>
    ["active", "booked", "open", "due", "due_soon", "scheduled", "waiting"].includes(
      String(item.status || "").toLowerCase()
    )
  );
}

function renderEmptyState(message = "No therapy records.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">✦</div>
        <h3>No therapy data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "No therapy records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const tone = getStatusTone(item.status);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id)}"
              data-record-type="${safeText(item.record_type || "therapy")}"
              data-title="${safeText(item.title || "Therapy record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  item.service_name || item.title || "Therapeutic service"
                )}</div>
                <div class="record-row-summary">${safeText(
                  item.summary || "Therapeutic record logged."
                )}</div>
                <div class="record-row-meta">
                  ${safeText(
                    [
                      item.professional_name || "",
                      item.therapy_type || "",
                      item.next_session_date
                        ? `Next ${formatDate(item.next_session_date)}`
                        : item.session_date
                        ? `Last ${formatDate(item.session_date)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(
                  item.status || "recorded"
                )}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent therapeutic issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 6)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.service_name || "Therapy item")}</strong>
              <p>${safeText(
                item.follow_up_actions ||
                  item.recommendations ||
                  item.summary ||
                  "Therapeutic follow-up needs attention."
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTherapyPage({
  stats,
  recentItems,
  upcomingItems,
  priorityItems,
  actionItems,
  allItems,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Therapy</div>
          <h2>Therapeutic services</h2>
          <p>Therapeutic involvement, recommendations, follow-up and service activity across the home.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">All records</span>
              <strong class="overview-stat-value">${safeText(stats.total)}</strong>
              <span class="overview-stat-note">Therapy records logged</span>
            </article>

            <article class="overview-stat-card ${
              stats.active > 0 ? "overview-stat-card--success" : ""
            }">
              <span class="overview-stat-label">Active input</span>
              <strong class="overview-stat-value">${safeText(stats.active)}</strong>
              <span class="overview-stat-note">Current or booked therapeutic work</span>
            </article>

            <article class="overview-stat-card ${
              stats.followUp > 0 ? "overview-stat-card--warning" : ""
            }">
              <span class="overview-stat-label">Follow-up</span>
              <strong class="overview-stat-value">${safeText(stats.followUp)}</strong>
              <span class="overview-stat-note">Records with follow-up actions</span>
            </article>

            <article class="overview-stat-card ${
              stats.concerns > 0 ? "overview-stat-card--danger" : ""
            }">
              <span class="overview-stat-label">Concerns</span>
              <strong class="overview-stat-value">${safeText(stats.concerns)}</strong>
              <span class="overview-stat-note">Missed, overdue or paused items</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent therapeutic activity</h3>
              <p>The latest therapy sessions, contacts and updates.</p>
            </div>

            ${renderRecordRows(
              recentItems,
              "No recent therapy records found."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Upcoming and active</h3>
              <p>Current therapy work, upcoming sessions and planned follow-up.</p>
            </div>

            ${renderRecordRows(
              upcomingItems,
              "No upcoming or active therapy items found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most important therapeutic issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recommendations and actions</h3>
              <p>Therapeutic recommendations and follow-up actions that need carrying through.</p>
            </div>

            ${renderRecordRows(
              actionItems,
              "No therapy recommendations or action items found."
            )}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All therapy records</h3>
              <p>Full therapy and wellbeing service record list.</p>
            </div>

            ${renderRecordRows(
              allItems,
              "No therapy records found."
            )}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState("A home ID is needed before therapy records can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No therapy context",
    nextEvent: "No therapy view loaded",
    lastRecord: "No therapy data",
    openActions: "No therapy actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

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
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load therapy data.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Therapy unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No therapy data",
    openActions: "Check API routes",
  });
}

export async function loadTherapy() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const data = await apiGet(`/homes/${homeId}/therapy`).catch(() => ({
      items: [],
    }));

    const allItems = sortNewestFirst(normaliseTherapyItems(data), [
      "session_date",
      "updated_at",
      "created_at",
    ]);

    const stats = buildTherapyStats(allItems);
    const recentItems = allItems.slice(0, 8);
    const upcomingItems = buildUpcomingItems(allItems).slice(0, 8);
    const priorityItems = buildPriorityItems(allItems);
    const actionItems = buildActionItems(allItems).slice(0, 8);
    const latest = recentItems[0];

    els.viewContent.innerHTML = renderTherapyPage({
      stats,
      recentItems,
      upcomingItems,
      priorityItems,
      actionItems,
      allItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${stats.active} active therapy item${stats.active === 1 ? "" : "s"}`,
      nextEvent:
        upcomingItems[0]?.next_session_date
          ? `Next session ${formatDate(upcomingItems[0].next_session_date)}`
          : "No upcoming therapy session",
      lastRecord:
        latest?.session_date
          ? `Latest therapy ${formatDateTime(latest.session_date)}`
          : "No recent therapy record",
      openActions: `${stats.followUp} therapy follow-up${stats.followUp === 1 ? "" : "s"}`,
    });
  } catch (error) {
    renderErrorState(error?.message || "Failed to load therapy data.");
  }
}
