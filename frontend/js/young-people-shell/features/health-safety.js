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

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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
      "critical",
      "high",
      "danger",
      "overdue",
      "expired",
      "failed",
      "blocked",
      "missing",
      "non_compliant",
      "escalated",
      "incident",
      "open_risk",
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
      "pending",
      "in_progress",
      "scheduled",
      "booked",
      "action_required",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "active",
      "current",
      "complete",
      "completed",
      "resolved",
      "closed",
      "reviewed",
      "compliant",
      "ok",
      "passed",
      "good",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
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
  if (Array.isArray(data.audits) && data.audits.length > 0) return true;
  if (Array.isArray(data.maintenance) && data.maintenance.length > 0) return true;
  if (Array.isArray(data.health_safety) && data.health_safety.length > 0) return true;
  if (Array.isArray(data.risk_assessments) && data.risk_assessments.length > 0) return true;
  if (Array.isArray(data.fire_checks) && data.fire_checks.length > 0) return true;
  if (Array.isArray(data.incidents) && data.incidents.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.health_safety_summary && typeof data.health_safety_summary === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.health_safety_summary || data.dashboard || data || {};
}

function normaliseAuditItems(data = {}) {
  return toArray(data.items, [data.audits, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "audit",
    title: item.title || item.audit_name || "Audit item",
    audit_name: item.audit_name || item.title || "Audit item",
    status: item.status || "recorded",
    priority: item.priority || "",
    audit_date: item.audit_date || item.review_date || item.created_at || null,
    due_date: item.due_date || item.review_date || null,
    owner: item.owner || item.auditor || "",
    summary:
      item.summary ||
      item.finding ||
      item.notes ||
      "Audit item recorded.",
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
    location: item.location || "",
    summary:
      item.summary ||
      item.notes ||
      item.description ||
      "Maintenance item recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseRiskItems(data = {}) {
  return toArray(data.items, [data.risk_assessments, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "risk_assessment",
    title: item.title || item.category || "Risk assessment",
    category: item.category || "",
    severity: item.severity || "",
    status: item.status || item.approval_status || "active",
    review_date: item.review_date || null,
    owner: item.owner || item.assigned_to || "",
    summary:
      item.summary ||
      item.concern_summary ||
      item.notes ||
      "Risk assessment recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseFireCheckItems(data = {}) {
  return toArray(data.items, [data.fire_checks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "fire_check",
    title: item.title || item.check_type || "Fire safety check",
    check_type: item.check_type || "",
    status: item.status || "recorded",
    due_date: item.due_date || item.review_date || item.check_date || null,
    completed_date: item.completed_date || item.check_date || null,
    owner: item.owner || item.checked_by || "",
    summary:
      item.summary ||
      item.notes ||
      item.outcome ||
      "Fire safety check recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseIncidentItems(data = {}) {
  return toArray(data.items, [data.incidents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "health_safety_incident",
    title: item.title || item.incident_type || "Health and safety incident",
    incident_type: item.incident_type || item.title || "Incident",
    severity: item.severity || "",
    status: item.status || "recorded",
    occurred_at: item.occurred_at || item.incident_datetime || item.created_at || null,
    summary:
      item.summary ||
      item.description ||
      item.notes ||
      "Incident recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "document",
    title: item.title || item.document_type || "Document",
    document_type: item.document_type || item.type || "",
    status: item.status || "active",
    review_date: item.review_date || item.expiry_date || null,
    expiry_date: item.expiry_date || null,
    compliance_category: item.compliance_category || "",
    summary:
      item.summary ||
      item.description ||
      item.notes ||
      "Document available.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "task",
    title: item.title || item.task || "Task",
    task: item.task || item.title || "Task",
    assigned_role: item.assigned_role || "",
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.summary ||
      item.notes ||
      item.task ||
      "Task recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  auditItems = [],
  maintenanceItems = [],
  riskItems = [],
  fireCheckItems = [],
  incidentItems = [],
  taskItems = [],
}) {
  const overdueAudits = auditItems.filter((item) =>
    ["overdue", "due_soon", "review_due", "open"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const urgentMaintenance = maintenanceItems.filter((item) =>
    ["high", "critical"].includes(String(item.priority || "").toLowerCase()) ||
    ["open", "overdue", "blocked"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const reviewDueRisks = riskItems.filter((item) =>
    ["review_due", "due_soon", "overdue", "active"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const fireDue = fireCheckItems.filter((item) =>
    ["due", "due_soon", "review_due", "overdue"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const incidentPressure = incidentItems.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase()) ||
    ["open", "overdue", "escalated"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const openTasks = taskItems.filter((item) => !item.completed).length;

  return [
    {
      label: "Audits due",
      value: overdueAudits,
      note: "Health and safety checks needing review",
      tone: overdueAudits ? "warning" : "success",
    },
    {
      label: "Urgent maintenance",
      value: urgentMaintenance,
      note: "Premises issues affecting safety",
      tone: urgentMaintenance ? "danger" : "success",
    },
    {
      label: "Risk reviews due",
      value: reviewDueRisks,
      note: "Assessments needing update",
      tone: reviewDueRisks ? "warning" : "success",
    },
    {
      label: "Fire checks due",
      value: fireDue,
      note: "Safety testing or checks due",
      tone: fireDue ? "warning" : "success",
    },
    {
      label: "Incident pressure",
      value: incidentPressure,
      note: "Safety incidents needing oversight",
      tone: incidentPressure ? "danger" : "success",
    },
    {
      label: "Open actions",
      value: openTasks,
      note: "Outstanding health and safety tasks",
      tone: openTasks ? "warning" : "success",
    },
  ];
}

function buildProgressCards({
  auditItems = [],
  maintenanceItems = [],
  fireCheckItems = [],
  riskItems = [],
}) {
  const completedAudits = auditItems.filter((item) =>
    ["completed", "reviewed", "current", "compliant"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const auditPercent = auditItems.length
    ? Math.round((completedAudits / auditItems.length) * 100)
    : 0;

  const closedMaintenance = maintenanceItems.filter((item) =>
    ["resolved", "completed", "closed", "reviewed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const maintenancePercent = maintenanceItems.length
    ? Math.round((closedMaintenance / maintenanceItems.length) * 100)
    : 0;

  const completeFireChecks = fireCheckItems.filter((item) =>
    ["completed", "reviewed", "current", "passed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const firePercent = fireCheckItems.length
    ? Math.round((completeFireChecks / fireCheckItems.length) * 100)
    : 0;

  const reviewedRisks = riskItems.filter((item) =>
    ["reviewed", "current", "active", "approved"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const riskPercent = riskItems.length
    ? Math.round((reviewedRisks / riskItems.length) * 100)
    : 0;

  return [
    {
      label: "Audit position",
      value: `${auditPercent}%`,
      percent: auditPercent,
      tone: auditPercent >= 85 ? "success" : auditPercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Maintenance closure",
      value: `${maintenancePercent}%`,
      percent: maintenancePercent,
      tone:
        maintenancePercent >= 85 ? "success" : maintenancePercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Fire safety checks",
      value: `${firePercent}%`,
      percent: firePercent,
      tone: firePercent >= 90 ? "success" : firePercent >= 70 ? "warning" : "danger",
    },
    {
      label: "Risk review health",
      value: `${riskPercent}%`,
      percent: riskPercent,
      tone: riskPercent >= 85 ? "success" : riskPercent >= 65 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  auditItems = [],
  maintenanceItems = [],
  riskItems = [],
  fireCheckItems = [],
  incidentItems = [],
  taskItems = [],
}) {
  const items = [];

  auditItems
    .filter((item) =>
      ["overdue", "due_soon", "review_due", "open"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || item.audit_name || "Audit item",
        summary: item.summary || "Audit follow-up is needed.",
      });
    });

  maintenanceItems
    .filter((item) =>
      ["high", "critical"].includes(String(item.priority || "").toLowerCase()) ||
      ["open", "overdue", "blocked"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Maintenance issue",
        summary: item.summary || "Premises safety issue needs action.",
      });
    });

  riskItems
    .filter((item) =>
      ["review_due", "due_soon", "overdue"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Risk review due",
        summary: item.summary || "Risk assessment needs review.",
      });
    });

  fireCheckItems
    .filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Fire safety check due",
        summary: item.summary || "Fire safety check needs completion.",
      });
    });

  incidentItems
    .filter((item) =>
      ["high", "critical"].includes(String(item.severity || "").toLowerCase()) ||
      ["open", "escalated", "overdue"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || item.incident_type || "Incident",
        summary: item.summary || "Health and safety incident needs review.",
      });
    });

  taskItems
    .filter((item) => !item.completed)
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Open action",
        summary: item.summary || "Outstanding health and safety action remains open.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major safety pressure",
      summary: "The health and safety view is not currently surfacing urgent issues.",
    });
  }

  return items.slice(0, 8);
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
            item?.audit_name ||
            item?.incident_type ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
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
        <p>No urgent health and safety issues are showing right now.</p>
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

function renderHealthSafetyHtml({
  title = "Health and safety",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  auditItems = [],
  maintenanceItems = [],
  riskItems = [],
  fireCheckItems = [],
  incidentItems = [],
  taskItems = [],
  documentItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--health-safety">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Health and safety</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across audits, premises issues, fire safety, risk reviews, incidents and safety actions.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live health and safety endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Safety snapshot</h3>
          <p>A quick visual read across audit position, premises safety, fire checks and risk review health.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Audits and checks</h3>
              <p>Health and safety assurance work, audits and review-sensitive checks.</p>
            </div>

            ${renderRows(auditItems, {
              emptyMessage: "No audit or check items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "audit",
              metaBuilder: (item) =>
                [
                  item.owner || "",
                  item.audit_date ? formatDate(item.audit_date) : "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Maintenance and premises safety</h3>
              <p>Environmental and building issues affecting the home.</p>
            </div>

            ${renderRows(maintenanceItems, {
              emptyMessage: "No maintenance safety items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "maintenance",
              metaBuilder: (item) =>
                [
                  item.location || "",
                  item.priority || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Risk assessments</h3>
              <p>Risk controls, reviews and safety planning activity.</p>
            </div>

            ${renderRows(riskItems, {
              emptyMessage: "No risk assessments found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "risk_assessment",
              metaBuilder: (item) =>
                [
                  item.category || "",
                  item.severity || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent health and safety issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Fire safety</h3>
              <p>Fire checks, testing and review-sensitive safety items.</p>
            </div>

            ${renderRows(fireCheckItems, {
              emptyMessage: "No fire safety items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "fire_check",
              metaBuilder: (item) =>
                [
                  item.owner || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                  item.completed_date ? `Done ${formatDate(item.completed_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Incidents</h3>
              <p>Health and safety incidents affecting oversight and action.</p>
            </div>

            ${renderRows(incidentItems, {
              emptyMessage: "No health and safety incidents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "health_safety_incident",
              metaBuilder: (item) =>
                [
                  item.severity || "",
                  item.occurred_at ? formatDateTime(item.occurred_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open actions</h3>
              <p>Tasks linked to audits, premises, fire or safety follow-up.</p>
            </div>

            ${renderRows(taskItems, {
              emptyMessage: "No health and safety tasks found.",
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
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Safety documents</h3>
              <p>Policies, certificates and review-sensitive documents.</p>
            </div>

            ${renderRows(documentItems, {
              emptyMessage: "No safety documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                  item.expiry_date ? `Expiry ${formatDate(item.expiry_date)}` : "",
                ]
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
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">⚠</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before health and safety can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No safety context",
    nextEvent: "No review loaded",
    lastRecord: "No health and safety data",
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
          <p>Loading health and safety…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading health and safety",
    nextEvent: "Checking next safety review",
    lastRecord: "Loading latest safety record",
    openActions: "Loading safety actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load health and safety</h3>
          <p>${safeText(message || "The health and safety view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Health and safety unavailable",
    nextEvent: "No review loaded",
    lastRecord: "No safety data loaded",
    openActions: "No actions loaded",
  });
}

function buildFallbackData(homeId) {
  const now = new Date();
  const plusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const minusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId} health and safety`,
      },
    },
    auditData: {
      items: [
        {
          id: "audit-1",
          title: "Monthly health and safety walkaround",
          status: "due_soon",
          due_date: plusDays(3),
          owner: "Manager",
          summary: "Monthly premises and safety assurance walkaround due this week.",
        },
      ],
    },
    maintenanceData: {
      items: [
        {
          id: "maint-1",
          title: "Rear garden gate lock",
          priority: "high",
          status: "open",
          location: "Garden",
          due_date: plusDays(1),
          summary: "Lock is loose and needs urgent repair.",
        },
      ],
    },
    riskData: {
      items: [
        {
          id: "risk-1",
          title: "Kitchen access risk assessment",
          category: "Environment",
          severity: "medium",
          status: "review_due",
          review_date: plusDays(5),
          summary: "Review safety controls for access during meal preparation.",
        },
      ],
    },
    fireCheckData: {
      items: [
        {
          id: "fire-1",
          title: "Fire alarm weekly test",
          check_type: "Alarm test",
          status: "due_soon",
          due_date: plusDays(2),
          owner: "Deputy manager",
          summary: "Weekly fire alarm test needs completing.",
        },
      ],
    },
    incidentData: {
      items: [
        {
          id: "incident-1",
          title: "Hot water temperature concern",
          incident_type: "Environmental incident",
          severity: "high",
          status: "open",
          occurred_at: minusDays(1),
          summary: "Water temperature exceeded safe range in upstairs bathroom.",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Record fire drill outcome",
          due_date: plusDays(1),
          completed: false,
          status: "open",
          assigned_role: "Shift lead",
          summary: "Upload evidence and observations from last fire drill.",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          title: "Legionella certificate",
          document_type: "Certificate",
          status: "review_due",
          review_date: plusDays(7),
          summary: "Certificate review due next week.",
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/health-safety`),
    safeGet(`/homes/${homeId}/audits`),
    safeGet(`/homes/${homeId}/maintenance`),
    safeGet(`/homes/${homeId}/risk-assessments`),
    safeGet(`/homes/${homeId}/fire-checks`),
    safeGet(`/homes/${homeId}/incidents`),
    safeGet(`/homes/${homeId}/tasks`),
    safeGet(`/homes/${homeId}/documents`),
  ];

  const [
    summaryData,
    auditData,
    maintenanceData,
    riskData,
    fireCheckData,
    incidentData,
    taskData,
    documentData,
  ] = await Promise.all(requests);

  const responses = [
    summaryData,
    auditData,
    maintenanceData,
    riskData,
    fireCheckData,
    incidentData,
    taskData,
    documentData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: summaryData || {},
    auditData: auditData || { items: [] },
    maintenanceData: maintenanceData || { items: [] },
    riskData: riskData || { items: [] },
    fireCheckData: fireCheckData || { items: [] },
    incidentData: incidentData || { items: [] },
    taskData: taskData || { items: [] },
    documentData: documentData || { items: [] },
    isFallback: false,
  };
}

export async function loadHealthSafety() {
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
      auditData,
      maintenanceData,
      riskData,
      fireCheckData,
      incidentData,
      taskData,
      documentData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const auditItems = sortSoonestFirst(normaliseAuditItems(auditData), [
      "due_date",
      "audit_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const maintenanceItems = sortSoonestFirst(
      normaliseMaintenanceItems(maintenanceData),
      ["due_date", "reported_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const riskItems = sortSoonestFirst(normaliseRiskItems(riskData), [
      "review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const fireCheckItems = sortSoonestFirst(
      normaliseFireCheckItems(fireCheckData),
      ["due_date", "completed_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const incidentItems = sortNewestFirst(normaliseIncidentItems(incidentData), [
      "occurred_at",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ])
      .filter((item) => !item.completed)
      .slice(0, 6);

    const documentItems = sortSoonestFirst(normaliseDocumentItems(documentData), [
      "review_date",
      "expiry_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const topStats = buildTopStats({
      auditItems,
      maintenanceItems,
      riskItems,
      fireCheckItems,
      incidentItems,
      taskItems,
    });

    const progressCards = buildProgressCards({
      auditItems,
      maintenanceItems,
      fireCheckItems,
      riskItems,
    });

    const priorityItems = buildPriorityItems({
      auditItems,
      maintenanceItems,
      riskItems,
      fireCheckItems,
      incidentItems,
      taskItems,
    });

    const title =
      summary.title ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} health and safety`;

    els.viewContent.innerHTML = renderHealthSafetyHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      auditItems,
      maintenanceItems,
      riskItems,
      fireCheckItems,
      incidentItems,
      taskItems,
      documentItems,
      isFallback,
    });

    const nextReview =
      auditItems[0]?.due_date ||
      fireCheckItems[0]?.due_date ||
      riskItems[0]?.review_date ||
      taskItems[0]?.due_date ||
      null;

    const latestRecord =
      incidentItems[0]?.occurred_at ||
      maintenanceItems[0]?.updated_at ||
      auditItems[0]?.updated_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${topStats[0].value} audits due • preview mode`
        : `${topStats[0].value} audits due • ${topStats[1].value} urgent maintenance`,
      nextEvent: nextReview
        ? `Next safety date ${formatDate(nextReview)}`
        : "No review date loaded",
      lastRecord: latestRecord
        ? `Latest safety update ${formatDateTime(latestRecord)}`
        : isFallback
        ? "Preview safety data loaded"
        : "No recent safety update",
      openActions: `${taskItems.length} open • ${priorityItems.length} priority`,
    });
  } catch (error) {
    console.error("[health-safety] load failed", error);
    renderErrorState(error?.message || "The health and safety view could not be loaded.");
  }
}