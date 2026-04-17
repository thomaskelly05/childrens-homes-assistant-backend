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

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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
  const normalised = String(status || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (
    [
      "overdue",
      "critical",
      "high",
      "danger",
      "failed",
      "missing",
      "escalated",
      "vacant",
      "vacancy",
      "absent",
      "sick",
      "blocked",
      "cancelled",
      "incident",
      "offline",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "due",
      "due_soon",
      "review_due",
      "attention",
      "limited",
      "agency",
      "bank_staff",
      "planned",
      "open",
      "pending",
      "in_progress",
      "awaiting",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "success",
      "good",
      "active",
      "on_shift",
      "available",
      "booked",
      "confirmed",
      "current",
      "completed",
      "resolved",
      "ok",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(aValue) - toTime(bValue);
  });
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.young_people) && data.young_people.length > 0) return true;
  if (Array.isArray(data.team) && data.team.length > 0) return true;
  if (Array.isArray(data.staff) && data.staff.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.shifts) && data.shifts.length > 0) return true;
  if (Array.isArray(data.rota) && data.rota.length > 0) return true;
  if (Array.isArray(data.absences) && data.absences.length > 0) return true;
  if (Array.isArray(data.maintenance) && data.maintenance.length > 0) return true;
  if (Array.isArray(data.communications) && data.communications.length > 0) return true;
  if (Array.isArray(data.home_incidents) && data.home_incidents.length > 0) return true;
  if (Array.isArray(data.incidents) && data.incidents.length > 0) return true;
  if (Array.isArray(data.visitors) && data.visitors.length > 0) return true;
  if (Array.isArray(data.transport) && data.transport.length > 0) return true;
  if (Array.isArray(data.inspection_actions) && data.inspection_actions.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.home && typeof data.home === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.dashboard || data.home_summary || {};
}

function normaliseYoungPeople(data = {}) {
  return toArray(data.young_people, [data.items]).map((item) => ({
    ...item,
    id: item.id ?? item.young_person_id ?? null,
    record_type: item.record_type || "young_person",
    full_name:
      item.full_name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
      item.preferred_name ||
      "Young person",
    preferred_name:
      item.preferred_name ||
      item.first_name ||
      item.full_name ||
      "Young person",
    placement_status: item.placement_status || "active",
    summary_risk_level: item.summary_risk_level || "unknown",
  }));
}

function normaliseTeamItems(data = {}) {
  return toArray(data.items, [data.team, data.staff, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "team",
    full_name:
      item.full_name ||
      item.staff_member ||
      item.name ||
      item.title ||
      "Staff member",
    staff_member:
      item.staff_member ||
      item.full_name ||
      item.name ||
      "Staff member",
    role: item.role || item.job_title || "",
    status: item.status || item.employment_status || "active",
    summary:
      item.summary ||
      item.notes ||
      `${item.role || "Team member"} status recorded.`,
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "task",
    title: item.title || item.task || "Task",
    task: item.task || item.title || "Task",
    summary:
      item.summary ||
      item.notes ||
      item.description ||
      item.task ||
      "Task recorded.",
    status: item.status || (item.completed ? "completed" : "open"),
    completed: Boolean(item.completed),
    due_date: item.due_date || null,
    assigned_role: item.assigned_role || "",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseShiftItems(data = {}) {
  return toArray(data.items, [data.shifts, data.rota, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "shift",
    title: item.shift_name || item.shift || "Shift",
    shift_name: item.shift_name || item.shift || "Shift",
    date: item.date || item.rota_date || item.shift_date || null,
    lead: item.lead || item.shift_lead || "",
    status: item.status || "planned",
    summary:
      item.summary ||
      item.note ||
      [item.start_time, item.end_time].filter(Boolean).join(" – ") ||
      "Shift recorded.",
    start_time: item.start_time || "",
    end_time: item.end_time || "",
    staff: Array.isArray(item.staff) ? item.staff : [],
    young_people_present: Array.isArray(item.young_people_present)
      ? item.young_people_present
      : [],
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseAbsenceItems(data = {}) {
  return toArray(data.items, [data.absences, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "absence",
    title: item.staff_member || item.title || "Absence",
    staff_member: item.staff_member || item.name || "Staff member",
    absence_type: item.absence_type || "",
    status: item.status || "recorded",
    start_date: item.start_date || null,
    end_date: item.end_date || null,
    impact: item.impact || "",
    cover_plan: item.cover_plan || "",
    summary:
      item.summary ||
      item.cover_plan ||
      item.absence_type ||
      "Absence recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseMaintenanceItems(data = {}) {
  return toArray(data.items, [data.maintenance, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "maintenance",
    title: item.title || "Maintenance item",
    priority: item.priority || "",
    status: item.status || "open",
    reported_date: item.reported_date || item.created_at || null,
    due_date: item.due_date || item.reported_date || null,
    summary:
      item.summary ||
      item.notes ||
      item.description ||
      "Maintenance item recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseCommunicationItems(data = {}) {
  return toArray(data.items, [data.communications, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "communication",
    title: item.title || item.contact_type || "Communication",
    status: item.status || "recorded",
    summary: item.summary || item.notes || "Communication logged.",
    contact_datetime: item.contact_datetime || item.created_at || null,
    communication_type: item.communication_type || item.contact_type || "",
    organisation: item.organisation || "",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseIncidentItems(data = {}) {
  return toArray(data.items, [data.home_incidents, data.incidents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "home_incident",
    title: item.title || item.incident_type || "Home incident",
    incident_type: item.incident_type || item.title || "Incident",
    status: item.status || "recorded",
    severity: item.severity || "",
    date: item.date || item.incident_datetime || item.created_at || null,
    summary:
      item.summary ||
      item.description ||
      "Home incident recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseVisitorItems(data = {}) {
  return toArray(data.items, [data.visitors, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "visitor",
    title: item.visitor_name || item.title || "Visitor",
    visitor_name: item.visitor_name || "",
    organisation: item.organisation || "",
    visit_date: item.visit_date || null,
    status: item.status || "recorded",
    purpose: item.purpose || "",
    summary:
      item.summary ||
      item.purpose ||
      "Visitor activity recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTransportItems(data = {}) {
  return toArray(data.items, [data.transport, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "transport",
    title: item.journey || item.title || "Transport",
    journey: item.journey || "",
    driver: item.driver || "",
    date: item.date || null,
    status: item.status || "recorded",
    summary:
      item.summary ||
      item.notes ||
      item.journey ||
      "Transport activity recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseInspectionActions(data = {}) {
  return toArray(data.items, [data.inspection_actions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.source_id ?? null,
    record_type: item.record_type || "inspection_action",
    title: item.action_title || item.title || "Inspection action",
    status: item.status || item.priority || "open",
    priority: item.priority || "",
    due_date: item.due_date || null,
    owner_user_name: item.owner_user_name || item.owner_staff_name || "",
    summary:
      item.summary ||
      item.action_description ||
      item.evidence_required ||
      "Inspection action available.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  youngPeople = [],
  openTasks = [],
  liveShifts = [],
  activeIncidents = [],
  absences = [],
  urgentMaintenance = [],
}) {
  return [
    {
      label: "Children in home",
      value: youngPeople.length,
      note: "Current live children",
      tone: "muted",
    },
    {
      label: "Open actions",
      value: openTasks.length,
      note: "Tasks needing completion",
      tone: openTasks.length ? "warning" : "success",
    },
    {
      label: "Live shifts",
      value: liveShifts.length,
      note: "Operational shift records",
      tone: "muted",
    },
    {
      label: "Recent incidents",
      value: activeIncidents.length,
      note: "Operational issues recorded",
      tone: activeIncidents.length ? "warning" : "success",
    },
    {
      label: "Staff absent",
      value: absences.length,
      note: "Absence affecting cover",
      tone: absences.length ? "warning" : "success",
    },
    {
      label: "Urgent maintenance",
      value: urgentMaintenance.length,
      note: "Premises issues needing action",
      tone: urgentMaintenance.length ? "danger" : "success",
    },
  ];
}

function buildOperationsKpis({
  tasks = [],
  shifts = [],
  incidents = [],
  maintenance = [],
  absences = [],
  inspectionActions = [],
}) {
  const completedTasks = tasks.filter((item) => item.completed).length;
  const taskPercent = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;

  const activeShifts = shifts.filter((item) =>
    ["planned", "active", "confirmed", "on_shift"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const shiftPercent = shifts.length
    ? Math.round((activeShifts / shifts.length) * 100)
    : 0;

  const resolvedIncidents = incidents.filter((item) =>
    ["resolved", "closed", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const incidentPercent = incidents.length
    ? Math.round((resolvedIncidents / incidents.length) * 100)
    : 100;

  const closedMaintenance = maintenance.filter((item) =>
    ["resolved", "completed", "closed", "reviewed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const maintenancePercent = maintenance.length
    ? Math.round((closedMaintenance / maintenance.length) * 100)
    : 100;

  const coveredAbsences = absences.filter((item) =>
    item.cover_plan || ["covered", "resolved"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const absencePercent = absences.length
    ? Math.round((coveredAbsences / absences.length) * 100)
    : 100;

  const resolvedInspection = inspectionActions.filter((item) =>
    ["completed", "resolved", "closed"].includes(
      String(item.status || item.priority || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const inspectionPercent = inspectionActions.length
    ? Math.round((resolvedInspection / inspectionActions.length) * 100)
    : 100;

  return [
    {
      label: "Task completion",
      value: `${taskPercent}%`,
      percent: taskPercent,
      tone: taskPercent >= 85 ? "success" : taskPercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Shift coverage",
      value: `${shiftPercent}%`,
      percent: shiftPercent,
      tone: shiftPercent >= 90 ? "success" : shiftPercent >= 70 ? "warning" : "danger",
    },
    {
      label: "Incident resolution",
      value: `${incidentPercent}%`,
      percent: incidentPercent,
      tone: incidentPercent >= 85 ? "success" : incidentPercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Maintenance closure",
      value: `${maintenancePercent}%`,
      percent: maintenancePercent,
      tone:
        maintenancePercent >= 85 ? "success" : maintenancePercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Absence cover",
      value: `${absencePercent}%`,
      percent: absencePercent,
      tone: absencePercent >= 85 ? "success" : absencePercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Inspection actions",
      value: `${inspectionPercent}%`,
      percent: inspectionPercent,
      tone:
        inspectionPercent >= 85 ? "success" : inspectionPercent >= 65 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  openTasks = [],
  urgentIncidents = [],
  absences = [],
  urgentMaintenance = [],
  inspectionActions = [],
}) {
  const items = [];

  inspectionActions.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || "Inspection action",
      summary:
        item.summary ||
        (item.due_date ? `Due ${formatDate(item.due_date)}` : "Inspection action requires follow-up."),
    });
  });

  urgentIncidents.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || item.incident_type || "Incident",
      summary:
        item.summary ||
        (item.date ? `Recorded ${formatDateTime(item.date)}` : "Incident needs review."),
    });
  });

  urgentMaintenance.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || "Maintenance issue",
      summary:
        item.summary ||
        (item.due_date ? `Due ${formatDate(item.due_date)}` : "Maintenance needs attention."),
    });
  });

  absences.slice(0, 1).forEach((item) => {
    items.push({
      title: item.staff_member || "Staff absence",
      summary:
        item.cover_plan ||
        item.summary ||
        "Cover arrangements require review.",
    });
  });

  openTasks.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || item.task || "Open task",
      summary:
        item.summary ||
        (item.due_date ? `Due ${formatDate(item.due_date)}` : "Outstanding operational action."),
    });
  });

  return items.slice(0, 8);
}

function buildMiniMetrics({
  openTasks = [],
  liveShifts = [],
  recentCommunications = [],
  visitors = [],
  transport = [],
  incidents = [],
}) {
  return [
    { label: "Tasks", value: openTasks.length },
    { label: "Shifts", value: liveShifts.length },
    { label: "Comms", value: recentCommunications.length },
    { label: "Visitors", value: visitors.length },
    { label: "Transport", value: transport.length },
    { label: "Incidents", value: incidents.length },
  ];
}

function renderEmptyState(message = "No operational data available.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">◌</div>
        <h3>No operational data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
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
                  class="analytics-progress-bar analytics-progress-bar--${safeText(
                    card.tone || "muted"
                  )}"
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

function renderRows(items = [], options = {}) {
  const {
    emptyMessage = "Nothing to show right now.",
    titleKey = "title",
    summaryKey = "summary",
    metaBuilder = null,
    statusKey = "status",
    recordType = "",
  } = options;

  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>Nothing to show</h3>
          <p>${safeText(emptyMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item?.[titleKey] ||
            item?.name ||
            item?.staff_member ||
            item?.visitor_name ||
            item?.journey ||
            item?.shift_name ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.role ||
            item?.organisation ||
            "No summary available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
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
                <span class="row-pill ${safeText(tone)}">${safeText(
                  status || "Recorded"
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
        <p>No urgent operational issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title)}</strong>
              <p>${safeText(item.summary)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMiniChart(title, items = [], key = "value") {
  const max = Math.max(...items.map((item) => toNumber(item?.[key], 0)), 1);

  return `
    <section class="overview-side-card">
      <div class="overview-section-head">
        <h3>${safeText(title)}</h3>
        <p>Quick visual comparison.</p>
      </div>

      <div class="mini-chart">
        ${items
          .map((item) => {
            const value = toNumber(item?.[key], 0);
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

function renderOperationsHtml({
  homeName = "Operations",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  youngPeople = [],
  openTasks = [],
  liveShifts = [],
  absenceItems = [],
  incidentItems = [],
  maintenanceItems = [],
  communicationItems = [],
  visitorItems = [],
  transportItems = [],
  inspectionActions = [],
  miniMetrics = [],
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--operations">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Operations</div>
          <h2>${safeText(homeName)}</h2>
          <p>A live operational view across shifts, staffing, absences, incidents, visitors, transport, maintenance and readiness actions.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Operational performance</h3>
          <p>A quick visual read across daily running, cover and follow-up.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Needs attention now</h3>
              <p>The most urgent operational issues across the home.</p>
            </div>
            ${renderPriorityList(priorityItems)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Children present</h3>
              <p>Current live children and placement context.</p>
            </div>
            ${renderRows(youngPeople, {
              emptyMessage: "No child records found.",
              titleKey: "preferred_name",
              summaryKey: "full_name",
              recordType: "young_person",
              metaBuilder: (item) =>
                [
                  item.summary_risk_level ? `Risk ${item.summary_risk_level}` : "",
                  item.placement_status || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "placement_status",
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Shift view</h3>
              <p>Current and upcoming operational shifts.</p>
            </div>
            ${renderRows(liveShifts, {
              emptyMessage: "No shift records found.",
              titleKey: "shift_name",
              summaryKey: "summary",
              recordType: "shift",
              metaBuilder: (item) =>
                [
                  item.date ? formatDate(item.date) : "",
                  item.lead ? `Lead ${item.lead}` : "",
                  item.start_time && item.end_time
                    ? `${item.start_time} – ${item.end_time}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open operational actions</h3>
              <p>Tasks and follow-up work needing completion.</p>
            </div>
            ${renderRows(openTasks, {
              emptyMessage: "No open tasks found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.assigned_role || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Incidents and disruptions</h3>
              <p>Operational incidents affecting the running of the home.</p>
            </div>
            ${renderRows(incidentItems, {
              emptyMessage: "No incident records found.",
              titleKey: "incident_type",
              summaryKey: "summary",
              recordType: "home_incident",
              metaBuilder: (item) =>
                [
                  item.date ? formatDateTime(item.date) : "",
                  item.severity || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "status",
            })}
          </div>
        </section>

        <aside class="overview-side">
          ${renderMiniChart("Operational activity", miniMetrics, "value")}

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Absence and cover</h3>
              <p>Current absences and operational impact.</p>
            </div>
            ${renderRows(absenceItems, {
              emptyMessage: "No absence records found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "absence",
              metaBuilder: (item) =>
                [
                  item.absence_type || "",
                  item.start_date ? formatDate(item.start_date) : "",
                  item.end_date ? `to ${formatDate(item.end_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Maintenance</h3>
              <p>Environment and repair issues affecting the home.</p>
            </div>
            ${renderRows(maintenanceItems, {
              emptyMessage: "No maintenance issues found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "maintenance",
              metaBuilder: (item) =>
                [
                  item.priority || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Visitors and transport</h3>
              <p>Movements and external activity affecting the day.</p>
            </div>
            ${renderRows([...visitorItems, ...transportItems].slice(0, 8), {
              emptyMessage: "No visitor or transport records found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "operations",
              metaBuilder: (item) =>
                [
                  item.visit_date ? formatDateTime(item.visit_date) : "",
                  item.date ? formatDateTime(item.date) : "",
                  item.organisation || item.driver || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent communication</h3>
              <p>Latest liaison with professionals and partners.</p>
            </div>
            ${renderRows(communicationItems, {
              emptyMessage: "No recent communication found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "communication",
              metaBuilder: (item) =>
                [
                  item.organisation || "",
                  item.contact_datetime ? formatDateTime(item.contact_datetime) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Inspection-linked actions</h3>
              <p>Operational work that may affect readiness and inspection confidence.</p>
            </div>
            ${renderRows(inspectionActions, {
              emptyMessage: "No inspection-linked operational actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_action",
              metaBuilder: (item) =>
                [
                  item.owner_user_name || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "priority",
            })}
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
      ${renderEmptyState("A home ID is needed before operations can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No operations context",
    nextEvent: "No home loaded",
    lastRecord: "No operational data",
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
          <p>Loading operations…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading operations view",
    nextEvent: "Checking next operational event",
    lastRecord: "Loading latest operational record",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "The operations view could not be loaded.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Operations unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No operational data",
    openActions: "Check API routes",
  });
}

function buildFallbackData(homeId) {
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

  const now = new Date();
  const minusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const plusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      home: { id: homeId, name: homeName, home_name: homeName },
      summary: { home_name: homeName },
      young_people: [
        {
          id: 1,
          preferred_name: "Jay",
          full_name: "Jay Smith",
          placement_status: "active",
          summary_risk_level: "medium",
        },
        {
          id: 2,
          preferred_name: "Amira",
          full_name: "Amira Khan",
          placement_status: "active",
          summary_risk_level: "high",
        },
      ],
    },
    teamData: {
      items: [
        { id: 11, full_name: "Sarah Jones", role: "Manager", status: "on_shift" },
        { id: 12, full_name: "Leah Brown", role: "Senior RSW", status: "on_shift" },
        { id: 13, full_name: "Ben Carter", role: "RSW", status: "sick" },
      ],
    },
    taskData: {
      items: [
        {
          id: 21,
          title: "Update handover summary",
          status: "open",
          completed: false,
          due_date: plusDays(0, 18, 0),
          assigned_role: "Shift lead",
        },
        {
          id: 22,
          title: "Check missing return paperwork",
          status: "overdue",
          completed: false,
          due_date: minusDays(1, 12, 0),
          assigned_role: "Manager",
        },
      ],
    },
    shiftData: {
      items: [
        {
          id: 31,
          shift_name: "Day shift",
          status: "on_shift",
          date: plusDays(0, 8, 0),
          lead: "Sarah Jones",
          start_time: "08:00",
          end_time: "20:00",
        },
        {
          id: 32,
          shift_name: "Night shift",
          status: "planned",
          date: plusDays(0, 20, 0),
          lead: "Tom Patel",
          start_time: "20:00",
          end_time: "08:00",
        },
      ],
    },
    absenceData: {
      items: [
        {
          id: 41,
          staff_member: "Ben Carter",
          absence_type: "Sickness",
          status: "absent",
          start_date: minusDays(1),
          cover_plan: "Agency cover booked.",
        },
      ],
    },
    maintenanceData: {
      items: [
        {
          id: 51,
          title: "Boiler pressure issue",
          priority: "high",
          status: "open",
          due_date: plusDays(1),
          summary: "Engineer booked for tomorrow morning.",
        },
      ],
    },
    communicationData: {
      items: [
        {
          id: 61,
          title: "School liaison",
          organisation: "School",
          status: "sent",
          contact_datetime: minusDays(0, 14, 20),
          summary: "Updated school regarding attendance plan.",
        },
      ],
    },
    incidentData: {
      items: [
        {
          id: 71,
          incident_type: "Missing from care",
          status: "review_due",
          severity: "high",
          date: minusDays(2, 19, 10),
          summary: "Returned safely. Follow-up interview required.",
        },
      ],
    },
    visitorData: {
      items: [
        {
          id: 81,
          visitor_name: "Priya Shah",
          organisation: "Therapy",
          visit_date: plusDays(1, 11, 0),
          status: "booked",
          purpose: "Clinical consultation",
        },
      ],
    },
    transportData: {
      items: [
        {
          id: 91,
          journey: "School transport",
          driver: "Leah Brown",
          date: plusDays(0, 7, 45),
          status: "planned",
        },
      ],
    },
    inspectionActionsData: {
      items: [
        {
          id: 101,
          action_title: "Evidence shift leadership oversight",
          priority: "high",
          due_date: plusDays(3),
          owner_user_name: "Sarah Jones",
          action_description: "Complete and upload operational oversight evidence.",
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/dashboard`),
    safeGet(`/homes/${homeId}/team`),
    safeGet(`/homes/${homeId}/tasks`),
    safeGet(`/homes/${homeId}/rota`),
    safeGet(`/homes/${homeId}/absences`),
    safeGet(`/homes/${homeId}/maintenance`),
    safeGet(`/homes/${homeId}/communications`),
    safeGet(`/homes/${homeId}/incidents`),
    safeGet(`/homes/${homeId}/visitors`),
    safeGet(`/homes/${homeId}/transport`),
    safeGet(`/inspection/ui/homes/${homeId}/actions`),
  ];

  const [
    summaryData,
    teamData,
    taskData,
    shiftData,
    absenceData,
    maintenanceData,
    communicationData,
    incidentData,
    visitorData,
    transportData,
    inspectionActionsData,
  ] = await Promise.all(requests);

  const responses = [
    summaryData,
    teamData,
    taskData,
    shiftData,
    absenceData,
    maintenanceData,
    communicationData,
    incidentData,
    visitorData,
    transportData,
    inspectionActionsData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: summaryData || {},
    teamData: teamData || { items: [] },
    taskData: taskData || { items: [] },
    shiftData: shiftData || { items: [] },
    absenceData: absenceData || { items: [] },
    maintenanceData: maintenanceData || { items: [] },
    communicationData: communicationData || { items: [] },
    incidentData: incidentData || { items: [] },
    visitorData: visitorData || { items: [] },
    transportData: transportData || { items: [] },
    inspectionActionsData: inspectionActionsData || { items: [] },
    isFallback: false,
  };
}

export async function loadOperations() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      teamData,
      taskData,
      shiftData,
      absenceData,
      maintenanceData,
      communicationData,
      incidentData,
      visitorData,
      transportData,
      inspectionActionsData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);
    const youngPeople = normaliseYoungPeople(summaryData);

    const teamItems = sortNewestFirst(normaliseTeamItems(teamData), [
      "updated_at",
      "created_at",
    ]);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);
    const openTasks = taskItems.filter((item) => !item.completed);

    const shiftItems = sortSoonestFirst(normaliseShiftItems(shiftData), [
      "date",
      "updated_at",
      "created_at",
    ]);
    const liveShifts = shiftItems.slice(0, 8);

    const absenceItems = sortNewestFirst(normaliseAbsenceItems(absenceData), [
      "start_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const maintenanceItems = sortSoonestFirst(
      normaliseMaintenanceItems(maintenanceData),
      ["due_date", "reported_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const communicationItems = sortNewestFirst(
      normaliseCommunicationItems(communicationData),
      ["contact_datetime", "updated_at", "created_at"]
    ).slice(0, 6);

    const incidentItems = sortNewestFirst(normaliseIncidentItems(incidentData), [
      "date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const visitorItems = sortSoonestFirst(normaliseVisitorItems(visitorData), [
      "visit_date",
      "updated_at",
      "created_at",
    ]).slice(0, 4);

    const transportItems = sortSoonestFirst(normaliseTransportItems(transportData), [
      "date",
      "updated_at",
      "created_at",
    ]).slice(0, 4);

    const inspectionActions = sortSoonestFirst(
      normaliseInspectionActions(inspectionActionsData),
      ["due_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const urgentIncidents = incidentItems.filter((item) =>
      ["high", "critical"].includes(String(item.severity || "").toLowerCase()) ||
      ["review_due", "overdue", "escalated", "open"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    );

    const urgentMaintenance = maintenanceItems.filter((item) =>
      ["high", "critical"].includes(String(item.priority || "").toLowerCase()) ||
      ["open", "overdue", "blocked"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    );

    const topStats = buildTopStats({
      youngPeople,
      openTasks,
      liveShifts,
      activeIncidents: incidentItems,
      absences: absenceItems,
      urgentMaintenance,
    });

    const progressCards = buildOperationsKpis({
      tasks: taskItems,
      shifts: shiftItems,
      incidents: incidentItems,
      maintenance: maintenanceItems,
      absences: absenceItems,
      inspectionActions,
    });

    const priorityItems = buildPriorityItems({
      openTasks,
      urgentIncidents,
      absences: absenceItems,
      urgentMaintenance,
      inspectionActions,
    });

    const miniMetrics = buildMiniMetrics({
      openTasks,
      liveShifts,
      recentCommunications: communicationItems,
      visitors: visitorItems,
      transport: transportItems,
      incidents: incidentItems,
    });

    const homeName =
      summary.home_name ||
      summaryData?.home?.home_name ||
      summaryData?.home?.name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId}`;

    els.viewContent.innerHTML = renderOperationsHtml({
      homeName,
      topStats,
      progressCards,
      priorityItems,
      youngPeople,
      openTasks: openTasks.slice(0, 8),
      liveShifts,
      absenceItems,
      incidentItems,
      maintenanceItems,
      communicationItems,
      visitorItems,
      transportItems,
      inspectionActions,
      miniMetrics,
    });

    const nextEvent =
      inspectionActions[0]?.due_date ||
      openTasks[0]?.due_date ||
      liveShifts[0]?.date ||
      null;

    const latestRecord =
      communicationItems[0]?.contact_datetime ||
      incidentItems[0]?.date ||
      maintenanceItems[0]?.reported_date ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${youngPeople.length} children • ${openTasks.length} open actions • demo preview`
        : `${youngPeople.length} children • ${openTasks.length} open actions`,
      nextEvent: nextEvent
        ? `Next event ${formatDateTime(nextEvent)}`
        : "No immediate event loaded",
      lastRecord: latestRecord
        ? `Latest update ${formatDateTime(latestRecord)}`
        : "No recent operational record loaded",
      openActions: `${openTasks.length} open • ${inspectionActions.length} inspection-linked`,
    });
  } catch (error) {
    console.error("[operations] load failed", error);
    renderErrorState(error?.message || "The operations view could not be loaded.");
  }
}