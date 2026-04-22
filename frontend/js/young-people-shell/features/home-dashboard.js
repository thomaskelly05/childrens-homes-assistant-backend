import { state, resolveAccessibleHomeId } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getHomeId() {
  return resolveAccessibleHomeId();
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

function buildRecordPayloadAttr(item = {}) {
  try {
    return encodeURIComponent(JSON.stringify(item));
  } catch {
    return "";
  }
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
      "high",
      "critical",
      "escalated",
      "missing",
      "danger",
      "expired",
      "failed",
      "non_compliant",
      "absent",
      "sick",
      "off_shift",
      "annual_leave",
      "vacant",
      "vacancy",
      "inadequate",
      "requires_improvement",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due",
      "due_soon",
      "warning",
      "medium",
      "review_due",
      "attention",
      "bank_staff",
      "agency",
      "working_remotely",
      "visiting_professional",
      "limited",
      "in_progress",
      "open",
      "received",
      "sent",
      "planned",
      "good",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "completed",
      "active",
      "booked",
      "compliant",
      "ok",
      "current",
      "reviewed",
      "on_shift",
      "available",
      "confirmed",
      "outstanding",
      "resolved",
      "closed",
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
    const aTime = aValue ? toTime(aValue) : Number.POSITIVE_INFINITY;
    const bTime = bValue ? toTime(bValue) : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function normaliseHomeSummary(data = {}) {
  return data.summary || data.home_summary || data.dashboard || {};
}

function normaliseYoungPeople(data = {}) {
  return toArray(data.young_people, [data.items]).map((item) => ({
    ...item,
    id: item.id ?? item.young_person_id ?? null,
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
    home_name: item.home_name || "",
    placement_status: item.placement_status || "active",
    summary_risk_level: item.summary_risk_level || "unknown",
    record_type: item.record_type || "young_person",
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
    title: item.title || item.task_title || item.task || "Task",
    task: item.task || item.title || "Task",
    status: item.status || (item.completed ? "completed" : "open"),
    completed: Boolean(item.completed),
    due_date: item.due_date || item.task_due_date || item.action_due_date || null,
    assigned_role: item.assigned_role || item.owner_role || "",
    summary:
      item.summary ||
      item.action_title ||
      item.notes ||
      item.description ||
      item.task ||
      "Task recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.statutory_documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "document",
    title: item.title || item.document_type || "Document",
    document_type: item.document_type || "",
    status: item.status || "active",
    review_date: item.review_date || item.expiry_date || null,
    expiry_date: item.expiry_date || null,
    summary:
      item.summary ||
      item.description ||
      "Document available for review.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "supervision",
    staff_member: item.staff_member || item.name || "Staff member",
    role: item.role || "",
    status: item.status || "recorded",
    due_date: item.due_date || item.next_due_date || item.review_date || null,
    summary:
      item.summary ||
      (item.due_date || item.next_due_date
        ? `Supervision due ${formatDate(item.due_date || item.next_due_date)}`
        : "Supervision record."),
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseReportItems(data = {}) {
  return toArray(data.items, [data.reports, data.monthly_reviews, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "report",
    title: item.title || item.review_title || "Report",
    summary:
      item.summary ||
      item.summary_of_month ||
      item.progress_summary ||
      item.report_text ||
      "Report available.",
    review_month: item.review_month || null,
    status: item.status || "completed",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance_items, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "compliance_item",
    title: item.title || "Compliance item",
    summary:
      item.summary ||
      `${item.status || "Status recorded"}${item.due_date ? ` • Due ${formatDate(item.due_date)}` : ""}`,
    status: item.status || "active",
    severity: item.severity || "",
    due_date: item.due_date || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseInspectionCards(data = {}) {
  return toArray(data.items, [data.inspection_scores, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.home_id ?? item.source_id ?? null,
    home_id: item.home_id ?? item.id ?? null,
    record_type: item.record_type || "inspection_score",
    title: item.home_name || "Inspection score",
    status: item.overall_band || "recorded",
    overall_score: item.overall_score ?? 0,
    confidence_score: item.confidence_score ?? 0,
    open_actions: item.open_actions ?? 0,
    overdue_actions: item.overdue_actions ?? 0,
    summary:
      item.summary ||
      item.narrative_summary ||
      `${item.overall_band || "Band"} • Score ${item.overall_score ?? 0}`,
    updated_at: item.updated_at || item.created_at || null,
  }));
}

function normaliseInspectionActions(data = {}) {
  return toArray(data.items, [data.inspection_improvement_actions, data.actions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.source_id ?? null,
    record_type: item.record_type || "inspection_action",
    title: item.action_title || item.title || "Inspection action",
    status: item.status || item.priority || "open",
    priority: item.priority || "",
    due_date: item.due_date || null,
    owner_user_name: item.owner_user_name || item.owner_staff_name || "",
    projected_section_band: item.projected_section_band || "",
    summary:
      item.summary ||
      item.action_description ||
      item.evidence_required ||
      "Inspection action available.",
    updated_at: item.updated_at || item.created_at || null,
  }));
}

function buildTopStats({
  youngPeople = [],
  openTasks = [],
  overdueItems = [],
  dueSupervisions = [],
  recentDocuments = [],
  inspectionActions = [],
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
      label: "Overdue",
      value: overdueItems.length,
      note: "Items needing urgent attention",
      tone: overdueItems.length ? "danger" : "success",
    },
    {
      label: "Supervision due",
      value: dueSupervisions.length,
      note: "Staff oversight to complete",
      tone: dueSupervisions.length ? "warning" : "muted",
    },
    {
      label: "Documents",
      value: recentDocuments.length,
      note: "Recent or review-sensitive records",
      tone: "muted",
    },
    {
      label: "Inspection actions",
      value: inspectionActions.length,
      note: "Readiness actions open",
      tone: inspectionActions.length ? "warning" : "success",
    },
  ];
}

function buildOperationalCounts({
  team = [],
  tasks = [],
  documents = [],
  compliance = [],
  inspectionActions = [],
}) {
  const openVacancies = team.filter((item) =>
    ["vacant", "vacancy"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const absentStaff = team.filter((item) =>
    ["off_shift", "annual_leave", "sick", "absent"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const openActions = tasks.filter((item) => !item.completed).length;

  const docReviewsDue = documents.filter((item) => {
    const status = String(item.status || "").toLowerCase().replaceAll(" ", "_");
    return ["review_due", "due_soon", "overdue", "expired", "missing"].includes(status);
  }).length;

  const urgentCompliance = compliance.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase()) ||
    ["overdue", "escalated", "review_due", "missing"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const urgentInspection = inspectionActions.filter((item) =>
    ["critical", "high", "overdue"].includes(
      String(item.priority || item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  return {
    openVacancies,
    absentStaff,
    openActions,
    docReviewsDue,
    urgentCompliance,
    urgentInspection,
  };
}

function buildPriorityItems({
  overdueTasks = [],
  dueSupervisions = [],
  expiringDocuments = [],
  urgentCompliance = [],
  urgentInspection = [],
}) {
  const items = [];

  urgentInspection.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || "Urgent inspection action",
      summary:
        item.summary ||
        (item.due_date
          ? `Due ${formatDate(item.due_date)}`
          : "Inspection action needs immediate review."),
    });
  });

  urgentCompliance.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || "Urgent compliance item",
      summary:
        item.summary ||
        (item.due_date
          ? `Due ${formatDate(item.due_date)}`
          : "Needs immediate review."),
    });
  });

  overdueTasks.slice(0, 2).forEach((task) => {
    items.push({
      title: task.title || task.task || "Overdue task",
      summary: task.summary || `Due ${formatDate(task.due_date)}`,
    });
  });

  dueSupervisions.slice(0, 1).forEach((item) => {
    items.push({
      title: item.staff_member || "Supervision due",
      summary: item.due_date
        ? `Supervision due ${formatDate(item.due_date)}`
        : "Supervision needs booking or completion.",
    });
  });

  expiringDocuments.slice(0, 1).forEach((doc) => {
    items.push({
      title: doc.title || doc.document_type || "Document review due",
      summary: doc.review_date
        ? `Review due ${formatDate(doc.review_date)}`
        : "Document review is approaching.",
    });
  });

  if (!items.length) {
    items.push({
      title: "No major pressure points",
      summary: "No urgent home-wide issues are showing right now.",
    });
  }

  return items.slice(0, 8);
}

function buildHomeKpis({
  tasks = [],
  documents = [],
  supervisions = [],
  compliance = [],
  inspectionCards = [],
}) {
  const urgentCompliance = compliance.filter((item) =>
    ["overdue", "escalated", "review_due", "missing"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const compliancePercent =
    compliance.length > 0
      ? Math.max(
          0,
          Math.round(
            ((compliance.length - urgentCompliance) / compliance.length) * 100
          )
        )
      : 0;

  const completedTasks = tasks.filter((item) => item.completed).length;
  const totalTasks = tasks.length || 0;
  const completionPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const reviewedDocs = documents.filter((item) =>
    ["current", "reviewed", "compliant", "active"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const docsPercent =
    documents.length > 0
      ? Math.round((reviewedDocs / documents.length) * 100)
      : 0;

  const completedSupervisions = supervisions.filter((item) =>
    ["completed", "done", "active", "current"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const supervisionPercent =
    supervisions.length > 0
      ? Math.round((completedSupervisions / supervisions.length) * 100)
      : 0;

  const inspectionScore = inspectionCards[0]?.overall_score ?? 0;

  return [
    {
      label: "Home compliance",
      value: `${compliancePercent}%`,
      percent: compliancePercent,
      tone:
        compliancePercent >= 90
          ? "success"
          : compliancePercent >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Task completion",
      value: `${completionPercent}%`,
      percent: completionPercent,
      tone:
        completionPercent >= 85
          ? "success"
          : completionPercent >= 65
          ? "warning"
          : "danger",
    },
    {
      label: "Document readiness",
      value: `${docsPercent}%`,
      percent: docsPercent,
      tone:
        docsPercent >= 90 ? "success" : docsPercent >= 70 ? "warning" : "danger",
    },
    {
      label: "Supervision completion",
      value: `${supervisionPercent}%`,
      percent: supervisionPercent,
      tone:
        supervisionPercent >= 90
          ? "success"
          : supervisionPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Inspection score",
      value: inspectionScore ? `${inspectionScore}` : "—",
      percent: Math.min(Math.max(Number(inspectionScore) || 0, 0), 100),
      tone:
        inspectionScore >= 85
          ? "success"
          : inspectionScore >= 70
          ? "warning"
          : inspectionScore > 0
          ? "danger"
          : "muted",
    },
  ];
}

function buildMiniMetrics({
  openTasks = [],
  dueSupervisions = [],
  recentDocuments = [],
  recentCommunications = [],
  inspectionActions = [],
}) {
  return [
    { label: "Tasks", value: openTasks.length },
    { label: "Supervisions", value: dueSupervisions.length },
    { label: "Documents", value: recentDocuments.length },
    { label: "Comms", value: recentCommunications.length },
    { label: "Inspection", value: inspectionActions.length },
  ];
}

function renderEmptyState(message = "No home dashboard data available.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">▥</div>
        <h3>No home dashboard data</h3>
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
            item?.contact_person ||
            item?.document_type ||
            item?.full_name ||
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
          const recordPayload = buildRecordPayloadAttr(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
              data-title="${safeText(title)}"
              data-record-summary="${safeText(summary)}"
              data-record-status="${safeText(status || "")}"
              data-record-date="${safeText(item?.due_date || item?.updated_at || item?.created_at || "")}"
              data-record-payload="${safeText(recordPayload)}"
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
        <p>No urgent home-wide issues are showing right now.</p>
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

async function fetchVisibility(homeId) {
  if (!homeId) {
    return {
      signals: [],
      highlights: [],
      queues: { urgent: [], due_soon: [], monitor: [] },
      counts: {},
      pressures: {},
    };
  }
  try {
    return (await apiGet(`/visibility/homes/${homeId}`)) || {};
  } catch {
    return {
      signals: [],
      highlights: [],
      queues: { urgent: [], due_soon: [], monitor: [] },
      counts: {},
      pressures: {},
    };
  }
}

function renderVisibilitySignals(signals = []) {
  if (!signals.length) {
    return `
      <div class="empty-state">
        <p>No high-priority home alerts are active right now.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${signals
        .slice(0, 6)
        .map((signal) => {
          const tone = getStatusTone(signal.severity || "medium");
          return `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  signal.title || "Visibility signal"
                )}</div>
                <div class="record-row-summary">${safeText(
                  signal.description || "Requires management visibility."
                )}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${tone}">${safeText(signal.count || 0)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderHomeDashboardHtml({
  homeName = "Home",
  topStats = [],
  operationalCounts = {},
  priorityItems = [],
  recentDocuments = [],
  openTasks = [],
  dueSupervisions = [],
  teamItems = [],
  progressCards = [],
  miniMetrics = [],
  youngPeople = [],
  recentReports = [],
  inspectionCards = [],
  inspectionActions = [],
  visibilitySignals = [],
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Home dashboard</div>
          <h2>${safeText(homeName)}</h2>
          <p>A live home-wide management view across children, staffing, documents, inspection readiness and oversight.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Performance snapshot</h3>
          <p>A quick visual read across completion, compliance, readiness and inspection position.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Operational picture</h3>
              <p>The quickest view of staffing, actions, inspection pressure and document review pressure.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open vacancies</div>
                  <div class="record-row-summary">Known vacancies across the home.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.openVacancies > 0 ? "warning" : "muted"}">${safeText(operationalCounts.openVacancies)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Staff absent</div>
                  <div class="record-row-summary">Staff currently off, sick or unavailable.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.absentStaff > 0 ? "warning" : "muted"}">${safeText(operationalCounts.absentStaff)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Urgent compliance</div>
                  <div class="record-row-summary">High-severity or overdue compliance items.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.urgentCompliance > 0 ? "danger" : "muted"}">${safeText(operationalCounts.urgentCompliance)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Urgent inspection actions</div>
                  <div class="record-row-summary">Inspection readiness actions needing urgent focus.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.urgentInspection > 0 ? "danger" : "muted"}">${safeText(operationalCounts.urgentInspection)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open actions</div>
                  <div class="record-row-summary">Outstanding management and operational tasks.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.openActions > 0 ? "warning" : "muted"}">${safeText(operationalCounts.openActions)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Document reviews due</div>
                  <div class="record-row-summary">Policies, statutory documents or records needing review.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${operationalCounts.docReviewsDue > 0 ? "warning" : "muted"}">${safeText(operationalCounts.docReviewsDue)}</span>
                </div>
              </article>
            </div>
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Children in home</h3>
              <p>Current live children and headline placement context.</p>
            </div>
            ${renderRows(youngPeople, {
              emptyMessage: "No live child records found.",
              titleKey: "preferred_name",
              summaryKey: "home_name",
              recordType: "young_person",
              metaBuilder: (item) =>
                [item.full_name || "", item.summary_risk_level ? `Risk ${item.summary_risk_level}` : "", item.placement_status || ""]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "placement_status",
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open tasks</h3>
              <p>Management and operational actions still needing completion.</p>
            </div>
            ${renderRows(openTasks, {
              emptyMessage: "No open tasks found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "task",
              metaBuilder: (item) =>
                [item.assigned_role || "", item.due_date ? `Due ${formatDate(item.due_date)}` : ""]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Team overview</h3>
              <p>Latest team and staffing context across the home.</p>
            </div>
            ${renderRows(teamItems, {
              emptyMessage: "No team updates found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "team",
              metaBuilder: (item) =>
                [item.role || "", item.status || ""].filter(Boolean).join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Inspection readiness</h3>
              <p>Current inspection scorecards and readiness position.</p>
            </div>
            ${renderRows(inspectionCards, {
              emptyMessage: "No inspection scorecards are available right now.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_score",
              metaBuilder: (item) =>
                [`Confidence ${item.confidence_score ?? 0}`, `${item.open_actions ?? 0} open actions`, `${item.overdue_actions ?? 0} overdue`]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "status",
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Visibility alerts</h3>
              <p>Operational pressure surfaced from overdue, repeated and unresolved issues.</p>
            </div>
            ${renderVisibilitySignals(visibilitySignals)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent management issues across the home.</p>
            </div>
            ${renderPriorityList(priorityItems)}
          </section>

          ${renderMiniChart("Management activity", miniMetrics, "value")}

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Inspection actions</h3>
              <p>Actions most likely to affect inspection confidence and readiness.</p>
            </div>
            ${renderRows(inspectionActions, {
              emptyMessage: "No open inspection actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "inspection_action",
              metaBuilder: (item) =>
                [item.owner_user_name || "", item.due_date ? `Due ${formatDate(item.due_date)}` : "", item.projected_section_band || ""]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "priority",
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Supervision due</h3>
              <p>Upcoming or overdue staff supervision and oversight.</p>
            </div>
            ${renderRows(dueSupervisions, {
              emptyMessage: "No supervision items are currently due.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "supervision",
              metaBuilder: (item) =>
                [item.role || "", item.due_date ? `Due ${formatDate(item.due_date)}` : ""]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Documents</h3>
              <p>Recent uploads and review-sensitive records.</p>
            </div>
            ${renderRows(recentDocuments, {
              emptyMessage: "No documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [item.document_type || "", item.review_date ? `Review ${formatDate(item.review_date)}` : ""]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent reports</h3>
              <p>Latest home-level reports and review outputs.</p>
            </div>
            ${renderRows(recentReports, {
              emptyMessage: "No reports found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "report",
              metaBuilder: (item) =>
                [item.review_month ? formatDate(item.review_month) : "", item.status || ""]
                  .filter(Boolean)
                  .join(" • "),
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
      ${renderEmptyState("A home ID is needed before the home dashboard can load.")}
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
      ${renderEmptyState(message || "The home dashboard could not be loaded.")}
    </section>
  `;
  updateWorkspaceSummaryStrip({
    today: "Home dashboard unavailable",
    nextEvent: "No event loaded",
    lastRecord: "No record loaded",
    openActions: "No actions loaded",
  });
}

async function fetchDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/dashboard`),
    safeGet(`/homes/${homeId}/team`),
    safeGet(`/homes/${homeId}/documents`),
    safeGet(`/homes/${homeId}/supervisions`),
    safeGet(`/homes/${homeId}/reports`),
    safeGet(`/homes/${homeId}/compliance-items`),
    safeGet(`/homes/${homeId}/inspection-scores`),
    safeGet(`/homes/${homeId}/inspection-improvement-actions`),
  ];

  const [
    summaryData,
    teamData,
    documentData,
    supervisionData,
    reportData,
    complianceData,
    inspectionCardsData,
    inspectionActionsData,
  ] = await Promise.all(requests);

  return {
    summaryData: summaryData || {},
    teamData: teamData || { items: [] },
    documentData: documentData || { items: [] },
    supervisionData: supervisionData || { items: [] },
    reportData: reportData || { items: [] },
    complianceData: complianceData || { items: [] },
    inspectionCardsData: inspectionCardsData || { items: [] },
    inspectionActionsData: inspectionActionsData || { items: [] },
  };
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
    const [dataset, visibility] = await Promise.all([
      fetchDataset(homeId),
      fetchVisibility(homeId),
    ]);

    const {
      summaryData,
      teamData,
      documentData,
      supervisionData,
      reportData,
      complianceData,
      inspectionCardsData,
      inspectionActionsData,
    } = dataset;

    const summary = normaliseHomeSummary(summaryData);
    const youngPeople = normaliseYoungPeople(summaryData);

    const teamItems = sortNewestFirst(normaliseTeamItems(teamData), [
      "updated_at",
      "created_at",
    ]).slice(0, 12);

    const taskItems = sortSoonestFirst(normaliseTaskItems(inspectionActionsData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const openTasks = taskItems.filter((item) => !item.completed);

    const overdueTasks = openTasks.filter((item) =>
      ["overdue", "escalated"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    );

    const documentItems = sortSoonestFirst(normaliseDocumentItems(documentData), [
      "review_date",
      "expiry_date",
      "updated_at",
      "created_at",
    ]);

    const recentDocuments = documentItems.slice(0, 6);

    const expiringDocuments = documentItems.filter((item) =>
      ["review_due", "due_soon", "overdue", "expired", "missing"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    );

    const supervisionItems = sortSoonestFirst(
      normaliseSupervisionItems(supervisionData),
      ["due_date", "updated_at", "created_at"]
    );

    const dueSupervisions = supervisionItems.filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    );

    const recentReports = sortNewestFirst(normaliseReportItems(reportData), [
      "created_at",
      "updated_at",
    ]).slice(0, 6);

    const complianceItems = sortSoonestFirst(
      normaliseComplianceItems(complianceData),
      ["due_date", "updated_at", "created_at"]
    );

    const urgentCompliance = complianceItems.filter((item) =>
      ["high", "critical"].includes(String(item.severity || "").toLowerCase()) ||
      ["overdue", "escalated", "review_due", "missing"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    );

    const inspectionCards = sortNewestFirst(
      normaliseInspectionCards(inspectionCardsData),
      ["updated_at", "created_at"]
    ).slice(0, 1);

    const inspectionActions = sortSoonestFirst(
      normaliseInspectionActions(inspectionActionsData),
      ["due_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const urgentInspection = inspectionActions.filter((item) =>
      ["critical", "high", "overdue"].includes(
        String(item.priority || item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    );

    const topStats = buildTopStats({
      youngPeople,
      openTasks,
      overdueItems: [...overdueTasks, ...urgentCompliance, ...urgentInspection],
      dueSupervisions,
      recentDocuments,
      inspectionActions,
    });

    const operationalCounts = buildOperationalCounts({
      team: teamItems,
      tasks: taskItems,
      documents: documentItems,
      compliance: complianceItems,
      inspectionActions,
    });

    const priorityItems = buildPriorityItems({
      overdueTasks,
      dueSupervisions,
      expiringDocuments,
      urgentCompliance,
      urgentInspection,
    });

    const progressCards = buildHomeKpis({
      tasks: taskItems,
      documents: documentItems,
      supervisions: supervisionItems,
      compliance: complianceItems,
      inspectionCards,
    });

    const miniMetrics = buildMiniMetrics({
      openTasks,
      dueSupervisions,
      recentDocuments,
      recentCommunications: [],
      inspectionActions,
    });

    const homeName =
      summary.home_name ||
      summaryData?.home?.home_name ||
      summaryData?.home?.name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId}`;

    els.viewContent.innerHTML = renderHomeDashboardHtml({
      homeName,
      topStats,
      operationalCounts,
      priorityItems,
      recentDocuments,
      openTasks: openTasks.slice(0, 8),
      dueSupervisions: dueSupervisions.slice(0, 6),
      teamItems,
      progressCards,
      miniMetrics,
      youngPeople,
      recentReports,
      inspectionCards,
      inspectionActions,
      visibilitySignals: toArray(visibility?.signals).slice(0, 6),
    });

    const nextDueSupervision = dueSupervisions[0];
    const nextInspectionAction = inspectionActions[0];
    const todaySummary = `${youngPeople.length} children • ${openTasks.length} open actions`;

    updateWorkspaceSummaryStrip({
      today: todaySummary,
      nextEvent: nextInspectionAction?.due_date
        ? `Inspection action due ${formatDate(nextInspectionAction.due_date)}`
        : nextDueSupervision?.due_date
        ? `Supervision due ${formatDate(nextDueSupervision.due_date)}`
        : "No immediate event loaded",
      lastRecord:
        recentReports[0]?.created_at || recentReports[0]?.updated_at
          ? `Latest report ${formatDateTime(recentReports[0].created_at || recentReports[0].updated_at)}`
          : "No recent home record loaded",
      openActions: `${openTasks.length} open • ${urgentCompliance.length + urgentInspection.length} urgent`,
      pressure: toArray(visibility?.queues?.urgent).length
        ? `${toArray(visibility?.queues?.urgent).length} management alerts`
        : toNumber(visibility?.pressures?.total, 0)
        ? `${toNumber(visibility?.pressures?.total, 0)} pressure score`
        : "No active alerts",
    });
  } catch (error) {
    console.error("[home-dashboard] load failed", error);
    renderErrorState(error?.message || "The home dashboard could not be loaded.");
  }
}
