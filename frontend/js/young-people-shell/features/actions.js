import { els } from "../dom.js";
import { state, resolveAccessibleHomeId } from "../state.js";
import { apiGet, apiSend } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

const SAFE_EMPTY = Object.freeze({ items: [] });
const OPEN_STATUSES = new Set(["open", "in_progress", "overdue"]);

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function normaliseToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function titleCase(value = "") {
  const text = String(value || "")
    .replaceAll("_", " ")
    .trim();
  if (!text) return "";
  return text.replace(/\b\w/g, (match) => match.toUpperCase());
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

function priorityRank(value = "") {
  const token = normaliseToken(value);
  if (token === "critical") return 4;
  if (token === "high") return 3;
  if (token === "medium") return 2;
  if (token === "low") return 1;
  return 0;
}

function statusRank(value = "") {
  const token = normaliseToken(value);
  if (token === "overdue") return 4;
  if (token === "open") return 3;
  if (token === "in_progress") return 2;
  if (token === "completed") return 1;
  return 0;
}

function getScopeConfig() {
  const scope = state.currentScope || "child";
  const youngPersonId =
    state.youngPersonId || state.selectedYoungPerson?.id || null;
  const homeId = resolveAccessibleHomeId();

  if (scope === "child") {
    return {
      scope: "child",
      title: "Child follow-through actions",
      subtitle:
        "Follow-up linked to this child so incidents, notes and concerns become accountable action.",
      entityLabel: "Child scope",
      endpoint: youngPersonId
        ? `/actions?scope=child&young_person_id=${encodeURIComponent(
            youngPersonId
          )}&include_completed=true&limit=250`
        : null,
      visibilityEndpoint: youngPersonId
        ? `/visibility/young-people/${encodeURIComponent(youngPersonId)}`
        : null,
      canCreate: Boolean(youngPersonId),
      createPrefill: {
        scope: "child",
        young_person_id: youngPersonId,
        home_id: state.selectedYoungPerson?.home_id || homeId || null,
      },
    };
  }

  if (scope === "home") {
    return {
      scope: "home",
      title: "Home operations actions",
      subtitle:
        "Operational follow-through for the home across staffing, incidents, readiness and daily running.",
      entityLabel: "Home scope",
      endpoint: homeId
        ? `/actions?scope=home&home_id=${encodeURIComponent(
            homeId
          )}&include_completed=true&limit=300`
        : null,
      visibilityEndpoint: homeId
        ? `/visibility/homes/${encodeURIComponent(homeId)}`
        : null,
      canCreate: Boolean(homeId),
      createPrefill: {
        scope: "home",
        home_id: homeId,
      },
    };
  }

  if (scope === "quality") {
    return {
      scope: "quality",
      title: "Quality and audit actions",
      subtitle:
        "Audit, quality and RI actions with visibility of overdue risk and closure discipline.",
      entityLabel: "Quality scope",
      endpoint: homeId
        ? `/actions?scope=quality&home_id=${encodeURIComponent(
            homeId
          )}&include_completed=true&include_inspection_actions=true&limit=350`
        : `/actions?scope=quality&include_completed=true&include_inspection_actions=true&limit=350`,
      visibilityEndpoint: homeId
        ? `/visibility/quality?home_id=${encodeURIComponent(
            homeId
          )}&all_accessible_homes=false`
        : "/visibility/quality?all_accessible_homes=true",
      canCreate: Boolean(homeId),
      createPrefill: {
        scope: "quality",
        home_id: homeId,
        task_type: "quality_improvement",
      },
    };
  }

  return {
    scope: "ofsted",
    title: "Ofsted preparation actions",
    subtitle:
      "Inspection-focused action planning to close evidence gaps and reduce risk before inspection activity.",
    entityLabel: "Ofsted scope",
    endpoint: homeId
      ? `/actions?scope=ofsted&home_id=${encodeURIComponent(
          homeId
        )}&include_completed=true&include_inspection_actions=true&limit=350`
      : `/actions?scope=ofsted&include_completed=true&include_inspection_actions=true&limit=350`,
    visibilityEndpoint: homeId
      ? `/visibility/ofsted?home_id=${encodeURIComponent(
          homeId
        )}&all_accessible_homes=false`
      : "/visibility/ofsted?all_accessible_homes=true",
    canCreate: Boolean(homeId),
    createPrefill: {
      scope: "ofsted",
      home_id: homeId,
      task_type: "inspection_improvement",
    },
  };
}

async function safeGet(path) {
  if (!path) return SAFE_EMPTY;
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch (error) {
    console.warn("[actions] api read failed", path, error);
    return SAFE_EMPTY;
  }
}

function getActionRows(payload = {}) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.actions)) return payload.actions;
  if (Array.isArray(payload)) return payload;
  return [];
}

function buildCounts(actions = []) {
  const total = actions.length;
  let open = 0;
  let inProgress = 0;
  let overdue = 0;
  let completed = 0;
  let escalated = 0;

  for (const item of actions) {
    const status = normaliseToken(item.status);
    if (status === "open") open += 1;
    if (status === "in_progress") inProgress += 1;
    if (status === "overdue") overdue += 1;
    if (status === "completed") completed += 1;
    if (item.is_escalated) escalated += 1;
  }

  return { total, open, inProgress, overdue, completed, escalated };
}

function sortActions(actions = []) {
  return [...actions].sort((a, b) => {
    const statusDelta = statusRank(b.status) - statusRank(a.status);
    if (statusDelta !== 0) return statusDelta;
    const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);
    if (priorityDelta !== 0) return priorityDelta;
    return (
      new Date(a.due_date || "9999-12-31").getTime() -
      new Date(b.due_date || "9999-12-31").getTime()
    );
  });
}

function getBadgeClass(type, value = "") {
  const token = normaliseToken(value);
  if (type === "status") {
    if (token === "overdue") return "chip chip-danger";
    if (token === "in_progress") return "chip chip-warning";
    if (token === "completed") return "chip chip-success";
    return "chip";
  }
  if (type === "priority") {
    if (token === "critical" || token === "high") return "chip chip-danger";
    if (token === "medium") return "chip chip-warning";
    if (token === "low") return "chip chip-success";
  }
  return "chip";
}

function renderEmptyState(title, description) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(description)}</p>
      </div>
    </div>
  `;
}

function renderStats(counts) {
  return `
    <div class="overview-stats-grid">
      <article class="overview-stat-card">
        <span class="overview-stat-label">Open</span>
        <strong class="overview-stat-value">${safeText(counts.open)}</strong>
      </article>
      <article class="overview-stat-card">
        <span class="overview-stat-label">In progress</span>
        <strong class="overview-stat-value">${safeText(counts.inProgress)}</strong>
      </article>
      <article class="overview-stat-card">
        <span class="overview-stat-label">Overdue</span>
        <strong class="overview-stat-value">${safeText(counts.overdue)}</strong>
      </article>
      <article class="overview-stat-card">
        <span class="overview-stat-label">Escalated</span>
        <strong class="overview-stat-value">${safeText(counts.escalated)}</strong>
      </article>
      <article class="overview-stat-card">
        <span class="overview-stat-label">Completed</span>
        <strong class="overview-stat-value">${safeText(counts.completed)}</strong>
      </article>
      <article class="overview-stat-card">
        <span class="overview-stat-label">Total</span>
        <strong class="overview-stat-value">${safeText(counts.total)}</strong>
      </article>
    </div>
  `;
}

function renderActionRow(item = {}) {
  const id = item.id || "";
  const recordType = normaliseToken(item.record_type || "task");
  const isTaskRecord = recordType === "task";
  const title = item.title || "Action";
  const summary = item.summary || "";
  const sourceType = item.source_type || item.task_type || item.record_type || "";
  const sourceId = item.source_id || "";
  const owner = item.owner_role || item.owner_user_id || "Unassigned";
  const overdue = normaliseToken(item.status) === "overdue";
  const latestUpdate = item.latest_update?.note || "";

  return `
    <article class="action-row" data-action-id="${safeText(id)}">
      <div class="action-row-main">
        <div class="action-row-head">
          <strong class="action-row-title">${safeText(title)}</strong>
          <div class="action-row-badges">
            <span class="${getBadgeClass("priority", item.priority)}">${safeText(
    titleCase(item.priority || "medium")
  )}</span>
            <span class="${getBadgeClass("status", item.status)}">${safeText(
    titleCase(item.status || "open")
  )}</span>
          </div>
        </div>
        <p class="action-row-summary">${safeText(summary || "No summary recorded.")}</p>
        <div class="action-row-meta">
          <span><strong>Owner:</strong> ${safeText(String(owner))}</span>
          <span><strong>Due:</strong> ${safeText(
            formatDate(item.due_date, "No due date")
          )}</span>
          ${
            sourceType
              ? `<span><strong>Linked from:</strong> ${safeText(
                  titleCase(sourceType)
                )}${sourceId ? ` #${safeText(sourceId)}` : ""}</span>`
              : ""
          }
          ${
            latestUpdate
              ? `<span class="action-row-update"><strong>Latest:</strong> ${safeText(
                  latestUpdate
                )}</span>`
              : ""
          }
        </div>
      </div>
      <div class="action-row-controls">
        ${
          overdue && isTaskRecord
            ? `<button
                type="button"
                class="secondary-btn action-inline-btn"
                data-action-status="in_progress"
                data-action-id="${safeText(id)}"
              >
                Mark in progress
              </button>`
            : ""
        }
        ${
          isTaskRecord && normaliseToken(item.status) !== "completed"
            ? `<button
                type="button"
                class="primary-btn action-inline-btn"
                data-action-complete="${safeText(id)}"
              >
                Complete
              </button>`
            : ""
        }
        ${
          isTaskRecord
            ? `<button
                type="button"
                class="ghost-btn action-inline-btn"
                data-action-add-update="${safeText(id)}"
              >
                Add update
              </button>`
            : `<span class="chip">Inspection board item</span>`
        }
      </div>
    </article>
  `;
}

function renderActionRows(actions = []) {
  if (!actions.length) {
    return renderEmptyState(
      "No actions yet",
      "Create actions from incidents, notes, audits or concerns to make follow-through visible."
    );
  }
  return `<div class="action-row-list">${actions.map(renderActionRow).join("")}</div>`;
}

function visibilitySignalTone(signal = {}) {
  const severity = normaliseToken(signal.severity);
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  if (severity === "low") return "success";
  return "muted";
}

function renderVisibilitySignals(signals = []) {
  if (!signals.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon">○</div>
          <h3>No major alerts</h3>
          <p>Current actions are not surfacing any urgent escalation signals.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${signals
        .slice(0, 6)
        .map(
          (signal) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  signal.title || "Visibility signal"
                )}</div>
                <div class="record-row-summary">${safeText(
                  signal.description || "Signal requires follow-through."
                )}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(visibilitySignalTone(signal))}">
                  ${safeText(signal.count ?? 0)}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPanel(config, counts, actions, visibility = {}) {
  const nextDue = actions.find((item) => OPEN_STATUSES.has(normaliseToken(item.status)));
  const headline = counts.overdue
    ? `${counts.overdue} overdue actions need review`
    : `${counts.open + counts.inProgress} live actions in flow`;
  const visibilitySignals = Array.isArray(visibility?.signals)
    ? visibility.signals
    : [];
  const queueUrgent = Array.isArray(visibility?.queues?.urgent)
    ? visibility.queues.urgent
    : [];

  return `
    <section class="overview-panel action-hub">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">${safeText(config.entityLabel)}</div>
          <h2>${safeText(config.title)}</h2>
          <p>${safeText(config.subtitle)}</p>
        </div>
        <div class="action-hub-head-controls">
          <button
            type="button"
            class="primary-btn"
            data-actions-create="true"
            ${
              config.canCreate
                ? ""
                : "disabled title=\"Select a valid scope context first.\""
            }
          >
            Quick create action
          </button>
        </div>
      </div>

      ${renderStats(counts)}

      <div class="action-hub-banner ${counts.overdue ? "is-danger" : "is-normal"}">
        <div class="action-hub-banner-title">${safeText(headline)}</div>
        <div class="action-hub-banner-meta">
          <span>Next due: ${safeText(
            nextDue ? formatDateTime(nextDue.due_date) : "Nothing due"
          )}</span>
        </div>
      </div>

      <div class="action-hub-grid">
        <section class="action-hub-section">
          <div class="overview-section-head">
            <h3>Action board</h3>
            <p>Track ownership, due dates, status and updates in one place.</p>
          </div>
          ${renderActionRows(actions)}
        </section>
        <section class="action-hub-section">
          <div class="overview-section-head">
            <h3>Operational visibility</h3>
            <p>Escalation-aware signals to keep follow-through visible but calm.</p>
          </div>
          ${renderVisibilitySignals(visibilitySignals)}
          ${
            queueUrgent.length
              ? `<p class="overview-helper-text">${safeText(
                  `${queueUrgent.length} urgent escalation items are currently in scope.`
                )}</p>`
              : ""
          }
        </section>
      </div>
    </section>
  `;
}

async function patchActionStatus(actionId, status, note = "") {
  const payload = { status };
  if (note) payload.update_note = note;
  return apiSend(`/actions/${actionId}`, "PATCH", payload);
}

async function addActionUpdate(actionId, note) {
  return apiSend(`/actions/${actionId}/updates`, "POST", {
    note,
    update_type: "progress",
  });
}

function buildCreatePrefill(config) {
  const sourceType =
    state.activeRecordType ||
    state.composerMeta?.source_record_type ||
    state.assistantMeta?.suggested_actions?.[0]?.source_record_type ||
    "";
  const sourceId =
    state.activeRecordItem?.id ||
    state.composerMeta?.source_record_id ||
    state.assistantMeta?.suggested_actions?.[0]?.source_record_id ||
    null;

  return {
    ...config.createPrefill,
    title: "Follow-up action",
    task: "",
    source_table: sourceType || "",
    source_id: sourceId || null,
  };
}

function bindInlineActions(config) {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll("[data-action-complete]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const actionId = button.dataset.actionComplete;
      if (!actionId) return;
      button.disabled = true;
      try {
        await patchActionStatus(
          actionId,
          "completed",
          "Completed via action board quick control."
        );
        await loadActions();
      } catch (error) {
        console.error("[actions] complete failed", error);
      } finally {
        button.disabled = false;
      }
    });
  });

  els.viewContent.querySelectorAll("[data-action-status]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const actionId = button.dataset.actionId;
      const status = button.dataset.actionStatus;
      if (!actionId || !status) return;
      button.disabled = true;
      try {
        await patchActionStatus(
          actionId,
          status,
          `Status moved to ${titleCase(status)} from action board.`
        );
        await loadActions();
      } catch (error) {
        console.error("[actions] status update failed", error);
      } finally {
        button.disabled = false;
      }
    });
  });

  els.viewContent.querySelectorAll("[data-action-add-update]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const actionId = button.dataset.actionAddUpdate;
      if (!actionId) return;
      const note = window.prompt("Add a progress update note for this action:");
      if (!note || !String(note).trim()) return;
      button.disabled = true;
      try {
        await addActionUpdate(actionId, String(note).trim());
        await loadActions();
      } catch (error) {
        console.error("[actions] add update failed", error);
      } finally {
        button.disabled = false;
      }
    });
  });

  const quickCreateBtn = els.viewContent.querySelector("[data-actions-create='true']");
  if (quickCreateBtn && config.canCreate) {
    quickCreateBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        const composer = await import("../ui/composer.js");
        if (typeof composer.openComposerFor === "function") {
          composer.openComposerFor("task", "create", buildCreatePrefill(config));
        }
      } catch (error) {
        console.error("[actions] quick create failed", error);
      }
    });
  }
}

export async function loadActions() {
  if (!els.viewContent) return;

  const config = getScopeConfig();
  if (!config.endpoint) {
    els.viewContent.innerHTML = renderEmptyState(
      "No scope context",
      "Select a child or home context to load actions."
    );
    updateWorkspaceSummaryStrip({
      today: "No action context",
      nextEvent: "No due actions",
      lastRecord: "No updates",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading actions...</p>
    </div>
  `;

  const [response, visibility] = await Promise.all([
    safeGet(config.endpoint),
    safeGet(config.visibilityEndpoint),
  ]);
  const actions = sortActions(getActionRows(response));
  const counts = buildCounts(actions);

  els.viewContent.innerHTML = renderPanel(config, counts, actions, visibility);
  bindInlineActions(config);

  const nextDue = actions.find((item) => OPEN_STATUSES.has(normaliseToken(item.status)));
  const latestUpdated = [...actions]
    .filter((item) => item.updated_at || item.created_at)
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    )[0];

  updateWorkspaceSummaryStrip({
    today: `${counts.open} open • ${counts.inProgress} in progress`,
    nextEvent: nextDue ? formatDateTime(nextDue.due_date) : "No due actions",
    lastRecord: latestUpdated
      ? formatDateTime(latestUpdated.updated_at || latestUpdated.created_at)
      : "No action updates",
    openActions: counts.overdue
      ? `${counts.overdue} overdue`
      : `${counts.escalated} escalated`,
    pressure: Array.isArray(visibility?.queues?.urgent) &&
      visibility.queues.urgent.length
      ? `${visibility.queues.urgent.length} escalation alerts`
      : Number(visibility?.pressures?.total || 0)
      ? `${Number(visibility.pressures.total)} pressure score`
      : "No active alerts",
  });

  await onAssistantScopeChanged();
  renderAssistantControllerPanels();
}
