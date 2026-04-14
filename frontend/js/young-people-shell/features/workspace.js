import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";
import {
  mapDailyNote,
  mapIncident,
  mapSupportPlan,
  mapAppointment,
  mapChronologyEvent,
  mapComplianceItem,
  mapTask,
  mapHealthRecord,
  mapEducationRecord,
  mapFamilyContactRecord,
} from "../core/adapters.js";

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

function isToday(value) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isFuture(value) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() >= Date.now();
}

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSummaryDate(value) {
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

function renderEmptyState({
  title = "Nothing to show",
  message = "There is nothing to display right now.",
  actionHtml = "",
} = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>${toText(title)}</h3>
        <p>${toText(message)}</p>
        ${actionHtml ? `<div class="empty-state-actions">${actionHtml}</div>` : ""}
      </div>
    </div>
  `;
}

function getRowTitle(item = {}) {
  return (
    item.title ||
    item.summary ||
    item.appointment_type ||
    item.record_type_label ||
    item.event_type ||
    "Record"
  );
}

function getRowSummary(item = {}) {
  return (
    item.summary ||
    item.presentation ||
    item.description ||
    item.notes ||
    item.outcome ||
    item.actions_required ||
    "No summary available."
  );
}

function getRowMeta(item = {}) {
  return (
    item.record_date ||
    item.start_datetime ||
    item.event_datetime ||
    item.occurred_at ||
    item.contact_datetime ||
    item.created_at ||
    item.updated_at ||
    ""
  );
}

function getRowTypeLabel(item = {}) {
  return (
    item.record_type_label ||
    item.record_type ||
    item.type ||
    item.event_type ||
    item.appointment_type ||
    "Record"
  );
}

function getRowPill(item = {}) {
  const severity = String(item.severity || "").toLowerCase();
  const status = String(item.status || item.workflow_status || "").toLowerCase();

  if (
    ["critical", "high"].includes(severity) ||
    ["overdue", "escalated"].includes(status) ||
    item.safeguarding_flag
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["draft", "pending", "review_due", "due_soon"].includes(status)) {
    return { label: "In progress", tone: "muted" };
  }

  if (["completed", "booked", "confirmed", "approved", "active"].includes(status)) {
    return { label: "Recorded", tone: "success" };
  }

  return { label: "Recorded", tone: "muted" };
}

function getRecordRowVariant(item = {}) {
  const type = String(item.record_type || item.type || "").toLowerCase();
  const eventType = String(item.event_type || "").toLowerCase();

  if (type.includes("incident") || eventType.includes("incident")) {
    return "record-row--incident";
  }

  if (type.includes("health") || type.includes("appointment")) {
    return "record-row--health";
  }

  if (type.includes("family")) {
    return "record-row--family";
  }

  if (type.includes("risk") || item.safeguarding_flag) {
    return "record-row--risk";
  }

  return "record-row--daily";
}

function renderRecordRows(items = [], emptyMessage = "Nothing to show right now.") {
  if (!items.length) {
    return renderEmptyState({
      title: "No records to show",
      message: emptyMessage,
    });
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);
          const id = item.id ?? item.record_id ?? item.source_id ?? "";
          const type = item.record_type || item.type || "";
          const variantClass = getRecordRowVariant(item);
          const formattedDate = formatDate(getRowMeta(item));
          const typeLabel = getRowTypeLabel(item);

          return `
            <article
              class="record-row ${toText(variantClass)}"
              data-record-id="${toText(id)}"
              data-record-type="${toText(type)}"
              data-open-record="true"
              data-title="${toText(getRowTitle(item))}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(getRowTitle(item))}</div>
                <div class="record-row-summary">${toText(getRowSummary(item))}</div>
                <div class="record-row-meta">
                  ${formattedDate ? `<span>${toText(formattedDate)}</span>` : ""}
                  ${typeLabel ? `<span>${toText(typeLabel)}</span>` : ""}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(pill.tone)}">${toText(pill.label)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = [], emptyMessage = "No priority items are showing right now.") {
  if (!items.length) {
    return renderEmptyState({
      title: "Nothing urgent right now",
      message: emptyMessage,
    });
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 4)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${toText(getRowTitle(item))}</strong>
              <p>${toText(getRowSummary(item))}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildPriorityRows({
  incidents = [],
  compliance = [],
  tasks = [],
  chronology = [],
}) {
  const highIncidents = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  );

  const urgentCompliance = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  );

  const openTasks = tasks.filter((item) => !item.completed);

  const safeguardingChronology = chronology.filter((item) => item.safeguarding_flag);

  return [...highIncidents, ...urgentCompliance, ...openTasks, ...safeguardingChronology].slice(0, 12);
}

function buildRecentRows({
  dailyNotes = [],
  incidents = [],
  healthRecords = [],
  educationRecords = [],
  familyRecords = [],
}) {
  return [
    ...dailyNotes.slice(0, 3),
    ...incidents.slice(0, 3),
    ...healthRecords.slice(0, 2),
    ...educationRecords.slice(0, 2),
    ...familyRecords.slice(0, 2),
  ].slice(0, 12);
}

function buildTodayRows({
  appointments = [],
  chronology = [],
  dailyNotes = [],
}) {
  const appointmentRows = appointments.filter((item) => isToday(item.start_datetime));
  const chronologyRows = chronology.filter((item) =>
    isToday(item.event_datetime || item.created_at)
  );
  const dailyNoteRows = dailyNotes.filter((item) =>
    isToday(item.record_date || item.created_at)
  );

  return [...appointmentRows, ...chronologyRows, ...dailyNoteRows].slice(0, 12);
}

function buildUpcomingRows({
  appointments = [],
  plans = [],
  tasks = [],
}) {
  const appointmentRows = appointments.filter(
    (item) =>
      isFuture(item.start_datetime) &&
      !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
  );

  const reviewPlans = plans.filter((item) => item.review_date);
  const dueTasks = tasks.filter((item) => !item.completed);

  return [...appointmentRows, ...reviewPlans, ...dueTasks].slice(0, 12);
}

function buildSummaryCounts({
  priorityRows = [],
  recentRows = [],
  todayRows = [],
  upcomingRows = [],
}) {
  return {
    urgent: priorityRows.length,
    recent: recentRows.length,
    today: todayRows.length,
    upcoming: upcomingRows.length,
  };
}

function buildWorkspaceCounts({
  incidents = [],
  appointments = [],
  plans = [],
  compliance = [],
  tasks = [],
}) {
  const urgentIncidents = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  ).length;

  const openAppointments = appointments.filter(
    (item) => !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
  ).length;

  const activePlans = plans.filter((item) =>
    ["active", "review_due", "submitted", "approved"].includes(
      String(item.status || item.workflow_status || "").toLowerCase()
    )
  ).length;

  const complianceIssues = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  ).length;

  const openTasks = tasks.filter((item) => !item.completed).length;

  return {
    urgentIncidents,
    openAppointments,
    activePlans,
    complianceIssues,
    openTasks,
  };
}

function renderSupportPatterns({ dailyNotes = [], incidents = [], plans = [] }) {
  const patterns = [];

  const latestNote = dailyNotes[0];
  const latestIncident = incidents[0];
  const activePlan = plans.find((item) =>
    ["active", "review_due", "submitted", "approved"].includes(
      String(item.status || item.workflow_status || "").toLowerCase()
    )
  );

  if (latestNote?.presentation) {
    patterns.push(latestNote.presentation);
  }

  if (
    latestIncident?.staff_response ||
    latestIncident?.restorative_follow_up ||
    latestIncident?.trauma_informed_formulation
  ) {
    patterns.push(
      latestIncident.staff_response ||
        latestIncident.restorative_follow_up ||
        latestIncident.trauma_informed_formulation
    );
  }

  if (
    activePlan?.proactive_strategies ||
    activePlan?.summary ||
    activePlan?.presenting_need
  ) {
    patterns.push(
      activePlan.proactive_strategies ||
        activePlan.summary ||
        activePlan.presenting_need
    );
  }

  const cleanPatterns = patterns.filter(Boolean).slice(0, 3);

  if (!cleanPatterns.length) {
    return renderEmptyState({
      title: "No support patterns yet",
      message: "No recent support patterns are showing yet.",
    });
  }

  return `
    <div class="support-pattern-list">
      ${cleanPatterns
        .map(
          (item) => `
            <div class="support-pattern-item">${toText(item)}</div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderWorkspaceHtml({
  priorityRows = [],
  recentRows = [],
  todayRows = [],
  upcomingRows = [],
  counts,
  workspaceCounts,
  supportPatternsHtml,
}) {
  const urgentStatClass =
    counts.urgent > 0
      ? "overview-stat-card overview-stat-card--danger"
      : "overview-stat-card";

  const todayStatClass =
    counts.today > 0
      ? "overview-stat-card overview-stat-card--success"
      : "overview-stat-card";

  const upcomingStatClass =
    counts.upcoming > 0
      ? "overview-stat-card overview-stat-card--warning"
      : "overview-stat-card";

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Workspace</div>
          <h2>Today’s workspace</h2>
          <p>A live view across care, records, appointments and follow-up.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="${urgentStatClass}">
              <span class="overview-stat-label">Urgent</span>
              <strong class="overview-stat-value">${toText(counts.urgent)}</strong>
              <span class="overview-stat-note">Items needing prompt attention</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Recent</span>
              <strong class="overview-stat-value">${toText(counts.recent)}</strong>
              <span class="overview-stat-note">Recently added records</span>
            </article>

            <article class="${todayStatClass}">
              <span class="overview-stat-label">Today</span>
              <