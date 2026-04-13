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
    ["overdue", "expired", "missed", "critical", "escalated"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["due", "due_soon", "warning", "review_due", "attention", "scheduled"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["completed", "complete", "active", "up_to_date", "current"].includes(
      normalised
    )
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

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "supervision",
    title: item.title || item.staff_member || "Supervision record",
    staff_member: item.staff_member || item.name || "Staff member",
    supervisor: item.supervisor || "",
    supervision_type: item.supervision_type || item.type || "",
    summary:
      item.summary ||
      item.strengths ||
      item.development_needs ||
      item.actions_agreed ||
      "Supervision record logged.",
    strengths: item.strengths || "",
    development_needs: item.development_needs || "",
    actions_agreed: item.actions_agreed || "",
    session_date: item.session_date || null,
    next_due_date: item.next_due_date || item.review_date || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    status: item.status || "recorded",
  }));
}

function buildSupervisionStats(items = []) {
  const overdue = items.filter((item) =>
    ["overdue", "expired", "missed"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const dueSoon = items.filter((item) =>
    ["due", "due_soon", "review_due", "scheduled"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const completed = items.filter((item) =>
    ["completed", "complete", "up_to_date", "current"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const actions = items.filter((item) => item.actions_agreed).length;

  const uniqueStaff = new Set(
    items.map((item) => item.staff_member).filter(Boolean)
  ).size;

  return {
    total: items.length,
    overdue,
    dueSoon,
    completed,
    actions,
    uniqueStaff,
  };
}

function buildPriorityItems(items = []) {
  return items.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return (
      ["overdue", "expired", "missed", "due", "due_soon", "review_due"].includes(
        status
      ) || Boolean(item.development_needs) || Boolean(item.actions_agreed)
    );
  });
}

function buildActionItems(items = []) {
  return items.filter((item) => item.actions_agreed || item.development_needs);
}

function buildRecentItems(items = []) {
  return sortNewestFirst(items, ["session_date", "updated_at", "created_at"]);
}

function buildDueItems(items = []) {
  return sortSoonestFirst(items, ["next_due_date", "updated_at", "created_at"]);
}

function renderEmptyState(message = "No supervision records.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">⬢</div>
        <h3>No supervision data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "No supervision records found.") {
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
              data-record-type="${safeText(item.record_type || "supervision")}"
              data-title="${safeText(item.title || "Supervision record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  item.staff_member || item.title || "Staff member"
                )}</div>
                <div class="record-row-summary">${safeText(
                  item.summary || "Supervision record logged."
                )}</div>
                <div class="record-row-meta">
                  ${safeText(
                    [
                      item.supervisor ? `Supervisor: ${item.supervisor}` : "",
                      item.supervision_type || "",
                      item.next_due_date ? `Due ${formatDate(item.next_due_date)}` : "",
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
        <p>No urgent supervision issues are showing right now.</p>
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
              <strong>${safeText(item.staff_member || "Supervision item")}</strong>
              <p>${safeText(
                item.actions_agreed ||
                  item.development_needs ||
                  item.summary ||
                  "Supervision item needs attention."
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSupervisionPage({
  stats,
  recentItems,
  dueItems,
  priorityItems,
  actionItems,
  allItems,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Supervision</div>
          <h2>Supervision and development</h2>
          <p>Supervision oversight, due dates, development needs and agreed actions across the home.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">All records</span>
              <strong class="overview-stat-value">${safeText(stats.total)}</strong>
              <span class="overview-stat-note">Supervision records logged</span>
            </article>

            <article class="overview-stat-card ${
              stats.overdue > 0 ? "overview-stat-card--danger" : ""
            }">
              <span class="overview-stat-label">Overdue</span>
              <strong class="overview-stat-value">${safeText(stats.overdue)}</strong>
              <span class="overview-stat-note">Supervisions needing urgent attention</span>
            </article>

            <article class="overview-stat-card ${
              stats.dueSoon > 0 ? "overview-stat-card--warning" : ""
            }">
              <span class="overview-stat-label">Due soon</span>
              <strong class="overview-stat-value">${safeText(stats.dueSoon)}</strong>
              <span class="overview-stat-note">Upcoming supervision pressure</span>
            </article>

            <article class="overview-stat-card ${
              stats.completed > 0 ? "overview-stat-card--success" : ""
            }">
              <span class="overview-stat-label">Completed</span>
              <strong class="overview-stat-value">${safeText(stats.completed)}</strong>
              <span class="overview-stat-note">Up-to-date supervision records</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent supervision records</h3>
              <p>The latest supervision activity and development conversations.</p>
            </div>

            ${renderRecordRows(
              recentItems,
              "No recent supervision records found."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Due and upcoming</h3>
              <p>Supervisions due soon, overdue or needing review.</p>
            </div>

            ${renderRecordRows(
              dueItems,
              "No due or upcoming supervision items found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most important supervision and workforce support issues.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Development and actions</h3>
              <p>Agreed actions and development needs from supervision records.</p>
            </div>

            ${renderRecordRows(
              actionItems,
              "No development actions or supervision follow-up items found."
            )}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All supervision records</h3>
              <p>Full supervision list for the home.</p>
            </div>

            ${renderRecordRows(
              allItems,
              "No supervision records found."
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
      ${renderEmptyState("A home ID is needed before supervision records can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No supervision context",
    nextEvent: "No supervision view loaded",
    lastRecord: "No supervision data",
    openActions: "No supervision actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading supervision…</p>
        </div>
      </div>
    </section>
  `;
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load supervision data.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Supervision unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No supervision data",
    openActions: "Check API routes",
  });
}

export async function loadSupervision() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const data = await apiGet(`/homes/${homeId}/supervisions`).catch(() => ({
      items: [],
    }));

    const allItems = normaliseSupervisionItems(data);
    const stats = buildSupervisionStats(allItems);
    const recentItems = buildRecentItems(allItems).slice(0, 8);
    const dueItems = buildDueItems(allItems)
      .filter((item) =>
        ["overdue", "expired", "missed", "due", "due_soon", "review_due", "scheduled"].includes(
          String(item.status || "").toLowerCase()
        )
      )
      .slice(0, 8);
    const priorityItems = buildPriorityItems(allItems);
    const actionItems = buildActionItems(allItems).slice(0, 8);
    const latest = recentItems[0];

    els.viewContent.innerHTML = renderSupervisionPage({
      stats,
      recentItems,
      dueItems,
      priorityItems,
      actionItems,
      allItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${stats.uniqueStaff} staff in supervision view`,
      nextEvent:
        dueItems[0]?.next_due_date
          ? `Next due ${formatDate(dueItems[0].next_due_date)}`
          : "No urgent supervision due date",
      lastRecord:
        latest?.session_date
          ? `Latest supervision ${formatDateTime(latest.session_date)}`
          : "No recent supervision record",
      openActions: `${stats.actions} supervision action${stats.actions === 1 ? "" : "s"}`,
    });
  } catch (error) {
    renderErrorState(error?.message || "Failed to load supervision data.");
  }
}
