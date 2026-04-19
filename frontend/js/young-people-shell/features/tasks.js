import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

const SAFE_EMPTY = Object.freeze({ items: [] });

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function plainText(value, fallback = "") {
  return String(value ?? fallback ?? "");
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;

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

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(value) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return date.getTime() < now.getTime();
}

function badgeClass(value) {
  const v = lower(value);

  if (
    [
      "critical",
      "high",
      "urgent",
      "overdue",
      "blocked",
      "open",
      "not_started",
      "action_required",
      "late",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "due_today",
      "scheduled",
      "awaiting",
      "in_progress",
      "pending",
      "warning",
      "amber",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "low",
      "done",
      "completed",
      "resolved",
      "closed",
      "success",
      "green",
      "current",
      "active",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function getHomeId() {
  return (
    state.homeId ||
    state.selectedHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    state.youngPerson?.home_id ||
    null
  );
}

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function pickItems(response, keys = []) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);

    const aTime = aValue
      ? new Date(aValue).getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = bValue
      ? new Date(bValue).getTime()
      : Number.POSITIVE_INFINITY;

    return aTime - bTime;
  });
}

function hasUsableData(data = {}) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.open_tasks) && data.open_tasks.length > 0) return true;
  if (Array.isArray(data.completed_tasks) && data.completed_tasks.length > 0) {
    return true;
  }
  return false;
}

function canOpenRecord(item = {}) {
  return Boolean(item.id && item.record_type);
}

function buildRecordAttrs(item = {}) {
  if (!canOpenRecord(item)) {
    return `class="record-card"`;
  }

  return `
    class="record-card"
    data-open-record="true"
    data-record-id="${safeText(item.id || "")}"
    data-record-type="${safeText(item.record_type || "task")}"
    data-title="${safeText(item.title || "Task")}"
    role="button"
    tabindex="0"
  `;
}

function mapTask(record = {}, sourceType = "task") {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    assigned_to_user_id: record.assigned_to_user_id || null,
    created_by_user_id: record.created_by_user_id || null,
    title: record.title || "Task",
    summary:
      record.summary ||
      record.description ||
      record.notes ||
      "Task recorded.",
    description: record.description || record.notes || "",
    priority: record.priority || record.severity || "",
    status: record.status || "open",
    due_at: record.due_at || record.due_date || null,
    completed_at: record.completed_at || null,
    category: record.category || record.task_type || "",
    record_type: sourceType,
    source_type: sourceType,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function buildFallbackData(homeId) {
  const now = new Date();

  const minusHours = (hours) => {
    const d = new Date(now);
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  };

  const plusHours = (hours) => {
    const d = new Date(now);
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  };

  return {
    tasks: [
      mapTask({
        id: "task-1",
        home_id: homeId,
        title: "Complete manager review",
        description: "Finish and sign off the outstanding manager review.",
        priority: "high",
        status: "open",
        category: "management",
        due_at: minusHours(4),
        created_at: minusHours(30),
      }),
      mapTask({
        id: "task-2",
        home_id: homeId,
        title: "Update key-work session record",
        description: "Record the latest key-work discussion and actions.",
        priority: "medium",
        status: "in_progress",
        category: "young_person",
        due_at: plusHours(8),
        created_at: minusHours(12),
      }),
      mapTask({
        id: "task-3",
        home_id: homeId,
        title: "Check bedroom risk reduction actions",
        description: "Confirm all room-based actions have been completed.",
        priority: "high",
        status: "open",
        category: "safeguarding",
        due_at: plusHours(3),
        created_at: minusHours(6),
      }),
      mapTask({
        id: "task-4",
        home_id: homeId,
        title: "Upload missing document",
        description: "Add the missing document to the young person's file.",
        priority: "low",
        status: "completed",
        category: "documents",
        completed_at: minusHours(2),
        created_at: minusHours(18),
        updated_at: minusHours(2),
      }),
    ],
    isFallback: true,
  };
}

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderSection(title, content) {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      ${content}
    </section>
  `;
}

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong class="overview-stat-value">${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderTaskCard(item = {}) {
  const dueValue = item.due_at || null;
  const overdue = isOverdue(dueValue) && lower(item.status) !== "completed";

  return `
    <article ${buildRecordAttrs(item)}>
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Task")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(item.created_at, "No date"))}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          ${
            item.priority
              ? `<span class="${badgeClass(item.priority)}">${safeText(
                  titleCase(item.priority)
                )}</span>`
              : ""
          }
          ${
            item.status
              ? `<span class="${badgeClass(
                  overdue ? "overdue" : item.status
                )}">${safeText(
                  overdue ? "Overdue" : titleCase(item.status)
                )}</span>`
              : ""
          }
        </div>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.category
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Category</div>
                  <div class="details-grid-value">${safeText(titleCase(item.category))}</div>
                </div>
              `
              : ""
          }

          ${
            dueValue
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due</div>
                  <div class="details-grid-value ${overdue ? "text-danger" : ""}">
                    ${safeText(formatDateTime(dueValue, "No date"))}
                  </div>
                </div>
              `
              : ""
          }

          ${
            item.completed_at
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Completed</div>
                  <div class="details-grid-value">${safeText(formatDateTime(item.completed_at))}</div>
                </div>
              `
              : ""
          }
        </div>
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items.map(renderTaskCard).join("")}</div>`;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No recent task activity",
      "There is no recent task activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const activityDate =
            item.completed_at || item.updated_at || item.due_at || item.created_at;

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(activityDate, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
                  <strong>${safeText(item.title || "Task")}</strong>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${
                      item.priority
                        ? `<span class="${badgeClass(item.priority)}">${safeText(
                            titleCase(item.priority)
                          )}</span>`
                        : ""
                    }
                    ${
                      item.status
                        ? `<span class="${badgeClass(item.status)}">${safeText(
                            titleCase(item.status)
                          )}</span>`
                        : ""
                    }
                  </div>
                </div>
                <div class="timeline-item-summary">${safeText(item.summary || "")}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    openTasks,
    overdueTasks,
    inProgressTasks,
    completedTasks,
    timeline,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Tasks</div>
          <h2>Open actions, due work, progress and completed activity</h2>
          <p class="overview-panel-subtitle">
            A live workspace for operational task tracking across the home.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live task routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Open tasks", openTasks.length)}
        ${renderStatCard("Overdue tasks", overdueTasks.length)}
        ${renderStatCard("In progress", inProgressTasks.length)}
        ${renderStatCard("Completed", completedTasks.length)}
        ${renderStatCard(
          "Next due",
          overdueTasks[0]?.due_at
            ? formatDate(overdueTasks[0].due_at)
            : openTasks[0]?.due_at
            ? formatDate(openTasks[0].due_at)
            : "None"
        )}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Open tasks",
            renderCardList(
              openTasks,
              "No open tasks",
              "There are no open tasks right now."
            )
          )}

          ${renderSection(
            "Overdue and urgent tasks",
            renderCardList(
              overdueTasks,
              "Nothing overdue",
              "There are no overdue or urgent tasks."
            )
          )}

          ${renderSection("Task activity timeline", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "In progress",
            renderCardList(
              inProgressTasks,
              "Nothing in progress",
              "There are no tasks currently in progress."
            )
          )}

          ${renderSection(
            "Completed tasks",
            renderCardList(
              completedTasks,
              "No completed tasks",
              "There are no recently completed tasks."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

async function fetchAll(homeId) {
  const [tasksRes, homeTasksRes] = await Promise.all([
    safeGet(`/homes/${homeId}/tasks`),
    safeGet(`/tasks?home_id=${encodeURIComponent(homeId)}`),
  ]);

  const hasLiveSuccess = [tasksRes, homeTasksRes].some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  const mergedTasks = [
    ...pickItems(tasksRes, ["tasks", "items"]).map((item) => mapTask(item, "task")),
    ...pickItems(homeTasksRes, ["tasks", "items"]).map((item) =>
      mapTask(item, "task")
    ),
  ];

  const deduped = [];
  const seen = new Set();

  for (const item of mergedTasks) {
    const key = `${item.id || ""}:${item.created_at || ""}:${item.title || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return {
    tasks: deduped,
    isFallback: false,
  };
}

function buildOpenTasks(data) {
  return sortSoonest(
    data.tasks.filter((item) => !["completed", "closed", "done"].includes(lower(item.status))),
    ["due_at", "created_at", "updated_at"]
  ).slice(0, 12);
}

function buildOverdueTasks(data) {
  return sortSoonest(
    data.tasks.filter((item) => {
      const status = lower(item.status);
      const overdue = isOverdue(item.due_at);
      const urgent = ["high", "critical", "urgent"].includes(lower(item.priority));

      return !["completed", "closed", "done"].includes(status) && (overdue || urgent);
    }),
    ["due_at", "created_at", "updated_at"]
  ).slice(0, 12);
}

function buildInProgressTasks(data) {
  return sortSoonest(
    data.tasks.filter((item) => ["in_progress", "pending", "awaiting"].includes(lower(item.status))),
    ["due_at", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildCompletedTasks(data) {
  return sortNewest(
    data.tasks.filter((item) =>
      ["completed", "closed", "done"].includes(lower(item.status)) || item.completed_at
    ),
    ["completed_at", "updated_at", "created_at"]
  ).slice(0, 10);
}

function buildTimeline(data) {
  return sortNewest(data.tasks, ["completed_at", "updated_at", "due_at", "created_at"]).slice(
    0,
    25
  );
}

export async function loadTasks() {
  return loadCurrentView();
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = renderEmpty(
      "No home selected",
      "Select a home to view tasks and actions."
    );

    updateWorkspaceSummaryStrip({
      today: "No task context",
      nextEvent: "No due task",
      lastRecord: "No task data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading tasks...</p>
    </div>
  `;

  try {
    const data = await fetchAll(homeId);

    const openTasks = buildOpenTasks(data);
    const overdueTasks = buildOverdueTasks(data);
    const inProgressTasks = buildInProgressTasks(data);
    const completedTasks = buildCompletedTasks(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      openTasks,
      overdueTasks,
      inProgressTasks,
      completedTasks,
      timeline,
      isFallback: Boolean(data.isFallback),
    });

    const nextTask = openTasks[0] || null;
    const latestActivity = timeline[0] || null;

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${openTasks.length} open • preview mode`
        : `${openTasks.length} open tasks`,
      nextEvent: nextTask?.due_at
        ? formatDateTime(nextTask.due_at)
        : "No due task",
      lastRecord: latestActivity
        ? formatDateTime(
            latestActivity.completed_at ||
              latestActivity.updated_at ||
              latestActivity.due_at ||
              latestActivity.created_at
          )
        : "None",
      openActions: overdueTasks[0]
        ? plainText(overdueTasks[0].title)
        : `${inProgressTasks.length} in progress`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[tasks] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load tasks",
      "Something went wrong while loading tasks."
    );

    updateWorkspaceSummaryStrip({
      today: "Tasks unavailable",
      nextEvent: "No due task",
      lastRecord: "No task data",
      openActions: "Check task routes",
    });
  }
}
