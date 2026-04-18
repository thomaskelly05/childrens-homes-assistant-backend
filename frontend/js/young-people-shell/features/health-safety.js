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
      "expired",
      "blocked",
      "unsafe",
      "open_high",
      "non_compliant",
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
      "open",
      "planned",
      "pending",
      "awaiting",
      "booked",
      "in_progress",
      "medium",
      "scheduled",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "success",
      "good",
      "active",
      "current",
      "completed",
      "resolved",
      "ok",
      "closed",
      "compliant",
      "reviewed",
      "passed",
      "safe",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function toTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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
  if (Array.isArray(data.maintenance) && data.maintenance.length > 0) return true;
  if (Array.isArray(data.fire_checks) && data.fire_checks.length > 0) return true;
  if (Array.isArray(data.risk_assessments) && data.risk_assessments.length > 0) return true;
  if (Array.isArray(data.incidents) && data.incidents.length > 0) return true;
  if (Array.isArray(data.home_incidents) && data.home_incidents.length > 0) return true;
  if (Array.isArray(data.visitors) && data.visitors.length > 0) return true;
  if (Array.isArray(data.contractors) && data.contractors.length > 0) return true;
  if (Array.isArray(data.compliance) && data.compliance.length > 0) return true;
  if (Array.isArray(data.compliance_items) && data.compliance_items.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.health_safety_summary && typeof data.health_safety_summary === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.health_safety_summary || data.dashboard || data || {};
}

function normaliseMaintenanceItems(data = {}) {
  return toArray(data.items, [data.maintenance, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "maintenance_item",
    title: item.title || "Maintenance item",
    priority: item.priority || "",
    status: item.status || "open",
    reported_date: item.reported_date || item.created_at || null,
    due_date: item.due_date || item.reported_date || null,
    location: item.location || "",
    contractor_name: item.contractor_name || "",
    summary:
      item.summary ||
      item.notes ||
      item.description ||
      "Maintenance issue recorded.",
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
    check_type: item.check_type || item.title || "Fire check",
    area: item.area || item.location || "",
    completed_at: item.completed_at || item.check_date || item.created_at || null,
    due_date: item.due_date || item.next_due_date || item.review_date || null,
    status: item.status || "recorded",
    outcome: item.outcome || "",
    summary:
      item.summary ||
      item.notes ||
      item.outcome ||
      "Fire safety check recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseRiskItems(data = {}) {
  return toArray(data.items, [data.risk_assessments, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "risk_assessment",
    title: item.title || item.area || item.category || "Risk assessment",
    area: item.area || item.category || "",
    severity: item.severity || "",
    status: item.status || "active",
    review_date: item.review_date || item.due_date || null,
    summary:
      item.summary ||
      item.concern_summary ||
      item.notes ||
      "Risk assessment recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseIncidentItems(data = {}) {
  return toArray(data.items, [data.home_incidents, data.incidents, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "home_incident",
      title: item.title || item.incident_type || "Health and safety incident",
      incident_type: item.incident_type || item.title || "Incident",
      severity: item.severity || "",
      status: item.status || "recorded",
      date: item.date || item.incident_datetime || item.created_at || null,
      summary:
        item.summary ||
        item.description ||
        item.notes ||
        "Incident recorded.",
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })
  );
}

function normaliseVisitorItems(data = {}) {
  return toArray(data.items, [data.visitors, data.contractors, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "visitor_log",
      title:
        item.visitor_name ||
        item.contractor_name ||
        item.organisation ||
        "Visitor / contractor",
      visitor_name: item.visitor_name || "",
      contractor_name: item.contractor_name || "",
      organisation: item.organisation || "",
      visit_date: item.visit_date || item.scheduled_at || item.created_at || null,
      status: item.status || "recorded",
      purpose: item.purpose || "",
      summary:
        item.summary ||
        item.purpose ||
        item.notes ||
        "Visitor or contractor activity recorded.",
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })
  );
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance, data.compliance_items, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "compliance_item",
      title: item.title || item.area || "Compliance item",
      area: item.area || item.compliance_category || "",
      severity: item.severity || "",
      status: item.status || "active",
      due_date: item.due_date || item.review_date || null,
      summary:
        item.summary ||
        item.notes ||
        "Compliance item recorded.",
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })
  );
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
      item.description ||
      item.task ||
      "Task recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  maintenanceItems = [],
  fireCheckItems = [],
  riskItems = [],
  incidentItems = [],
  complianceItems = [],
  openTasks = [],
}) {
  const urgentMaintenance = maintenanceItems.filter((item) =>
    ["high", "critical"].includes(String(item.priority || "").toLowerCase()) ||
    ["open", "overdue", "blocked"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const fireChecksDue = fireCheckItems.filter((item) =>
    ["due", "due_soon", "review_due", "overdue", "missing"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const riskReviewsDue = riskItems.filter((item) =>
    ["due", "due_soon", "review_due", "overdue"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const incidentsOpen = incidentItems.filter((item) =>
    !["resolved", "closed", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const compliancePressure = complianceItems.filter((item) =>
    ["overdue", "escalated", "review_due", "missing", "non_compliant"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  return [
    {
      label: "Urgent maintenance",
      value: urgentMaintenance,
      note: "Premises issues needing action",
      tone: urgentMaintenance ? "danger" : "success",
    },
    {
      label: "Fire checks due",
      value: fireChecksDue,
      note: "Checks needing completion",
      tone: fireChecksDue ? "warning" : "success",
    },
    {
      label: "Risk reviews due",
      value: riskReviewsDue,
      note: "Assessments needing review",
      tone: riskReviewsDue ? "warning" : "success",
    },
    {
      label: "Open incidents",
      value: incidentsOpen,
      note: "Operational safety issues still open",
      tone: incidentsOpen ? "warning" : "success",
    },
    {
      label: "Compliance pressure",
      value: compliancePressure,
      note: "Safety-linked compliance gaps",
      tone: compliancePressure ? "danger" : "success",
    },
    {
      label: "Open actions",
      value: openTasks.length,
      note: "Safety follow-up tasks",
      tone: openTasks.length ? "warning" : "success",
    },
  ];
}

function buildProgressCards({
  maintenanceItems = [],
  fireCheckItems = [],
  riskItems = [],
  complianceItems = [],
}) {
  const resolvedMaintenance = maintenanceItems.filter((item) =>
    ["resolved", "completed", "closed", "reviewed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const maintenancePercent = maintenanceItems.length
    ? Math.round((resolvedMaintenance / maintenanceItems.length) * 100)
    : 100;

  const completedFire = fireCheckItems.filter((item) =>
    ["completed", "passed", "reviewed", "current"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const firePercent = fireCheckItems.length
    ? Math.round((completedFire / fireCheckItems.length) * 100)
    : 100;

  const currentRisks = riskItems.filter((item) =>
    ["active", "current", "reviewed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const riskPercent = riskItems.length
    ? Math.round((currentRisks / riskItems.length) * 100)
    : 100;

  const compliantItems = complianceItems.filter((item) =>
    ["active", "current", "completed", "reviewed", "compliant"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const compliancePercent = complianceItems.length
    ? Math.round((compliantItems / complianceItems.length) * 100)
    : 100;

  return [
    {
      label: "Maintenance closure",
      value: `${maintenancePercent}%`,
      percent: maintenancePercent,
      tone:
        maintenancePercent >= 85 ? "success" : maintenancePercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Fire safety compliance",
      value: `${firePercent}%`,
      percent: firePercent,
      tone: firePercent >= 90 ? "success" : firePercent >= 70 ? "warning" : "danger",
    },
    {
      label: "Risk review health",
      value: `${riskPercent}%`,
      percent: riskPercent,
      tone: riskPercent >= 90 ? "success" : riskPercent >= 70 ? "warning" : "danger",
    },
    {
      label: "Safety compliance",
      value: `${compliancePercent}%`,
      percent: compliancePercent,
      tone:
        compliancePercent >= 90 ? "success" : compliancePercent >= 70 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  maintenanceItems = [],
  fireCheckItems = [],
  riskItems = [],
  incidentItems = [],
  complianceItems = [],
  openTasks = [],
}) {
  const items = [];

  complianceItems
    .filter((item) =>
      ["overdue", "escalated", "review_due", "missing", "non_compliant"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Compliance issue",
        summary:
          item.summary ||
          (item.due_date ? `Due ${formatDate(item.due_date)}` : "Safety compliance needs action."),
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
        title: item.title || "Urgent maintenance",
        summary:
          item.summary ||
          (item.due_date ? `Due ${formatDate(item.due_date)}` : "Maintenance needs urgent attention."),
      });
    });

  fireCheckItems
    .filter((item) =>
      ["due", "due_soon", "review_due", "overdue", "missing"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Fire safety check",
        summary:
          item.summary ||
          (item.due_date ? `Due ${formatDate(item.due_date)}` : "Fire safety check needs completing."),
      });
    });

  incidentItems
    .filter((item) =>
      ["high", "critical"].includes(String(item.severity || "").toLowerCase()) ||
      ["open", "review_due", "overdue"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || item.incident_type || "Incident",
        summary:
          item.summary ||
          (item.date ? `Recorded ${formatDateTime(item.date)}` : "Safety incident needs review."),
      });
    });

  openTasks.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || item.task || "Open action",
      summary:
        item.summary ||
        (item.due_date ? `Due ${formatDate(item.due_date)}` : "Safety action remains open."),
    });
  });

  if (!items.length) {
    items.push({
      title: "No major H&S pressure",
      summary: "The dashboard is not currently surfacing urgent health and safety risks.",
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
            item?.visitor_name ||
            item?.contractor_name ||
            item?.organisation ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.outcome ||
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
  maintenanceItems = [],
  fireCheckItems = [],
  riskItems = [],
  incidentItems = [],
  visitorItems = [],
  complianceItems = [],
  openTasks = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--health-safety">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Health and safety</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across fire checks, premises issues, environmental risks, incidents, visitors, contractors and safety compliance.</p>
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
          <p>A quick visual read across maintenance, fire safety, risk reviews and compliance health.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Premises and maintenance</h3>
              <p>Repairs, hazards and environmental issues affecting safety in the home.</p>
            </div>

            ${renderRows(maintenanceItems, {
              emptyMessage: "No premises or maintenance issues found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "maintenance_item",
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
              <h3>Fire safety checks</h3>
              <p>Alarm tests, drills, equipment checks and related fire safety actions.</p>
            </div>

            ${renderRows(fireCheckItems, {
              emptyMessage: "No fire safety checks found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "fire_check",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.completed_at ? `Completed ${formatDate(item.completed_at)}` : "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Risk assessments</h3>
              <p>Environment and operational risk assessments needing review or attention.</p>
            </div>

            ${renderRows(riskItems, {
              emptyMessage: "No health and safety risk assessments found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "risk_assessment",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.severity || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Incidents and accidents</h3>
              <p>Health and safety events affecting the home environment, staff or children.</p>
            </div>

            ${renderRows(incidentItems, {
              emptyMessage: "No health and safety incidents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "home_incident",
              metaBuilder: (item) =>
                [
                  item.severity || "",
                  item.date ? formatDateTime(item.date) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusKey: "status",
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
              <h3>Visitors and contractors</h3>
              <p>External people on site with safety relevance.</p>
            </div>

            ${renderRows(visitorItems, {
              emptyMessage: "No visitors or contractors found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "visitor_log",
              metaBuilder: (item) =>
                [
                  item.organisation || "",
                  item.visit_date ? formatDateTime(item.visit_date) : "",
                  item.purpose || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Safety compliance</h3>
              <p>Compliance items affecting environmental or operational safety.</p>
            </div>

            ${renderRows(complianceItems, {
              emptyMessage: "No health and safety compliance gaps found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "compliance_item",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.severity || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open actions</h3>
              <p>Follow-up work linked to premises, risks or safety compliance.</p>
            </div>

            ${renderRows(openTasks, {
              emptyMessage: "No open health and safety actions found.",
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
    today: "No H&S context",
    nextEvent: "No safety review loaded",
    lastRecord: "No H&S data",
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
    today: "Loading H&S view",
    nextEvent: "Checking next safety review",
    lastRecord: "Loading latest H&S record",
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
          <h3>Failed to load health and safety</h3>
          <p>${safeText(message || "The health and safety view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "H&S unavailable",
    nextEvent: "No safety review loaded",
    lastRecord: "No H&S record loaded",
    openActions: "No actions loaded",
  });
}

function buildFallbackData(homeId) {
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

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
        title: `${homeName} health and safety`,
        home_name: homeName,
      },
    },
    maintenanceData: {
      items: [
        {
          id: 1,
          title: "Boiler pressure issue",
          location: "Utility room",
          priority: "high",
          status: "open",
          due_date: plusDays(1),
          summary: "Engineer booked for tomorrow morning.",
        },
        {
          id: 2,
          title: "Garden gate latch repair",
          location: "Rear garden",
          priority: "medium",
          status: "planned",
          due_date: plusDays(5),
          summary: "Latch is loose and needs securing.",
        },
      ],
    },
    fireCheckData: {
      items: [
        {
          id: 11,
          title: "Weekly fire alarm test",
          area: "Whole home",
          completed_at: minusDays(6),
          due_date: plusDays(1),
          status: "due_soon",
          summary: "Next weekly fire alarm test due tomorrow.",
        },
        {
          id: 12,
          title: "Emergency lighting check",
          area: "Hallways",
          completed_at: minusDays(20),
          due_date: plusDays(10),
          status: "current",
          summary: "Emergency lighting checks up to date.",
        },
      ],
    },
    riskData: {
      items: [
        {
          id: 21,
          title: "Kitchen environmental risk",
          area: "Kitchen",
          severity: "medium",
          status: "review_due",
          review_date: plusDays(4),
          summary: "Review due on sharp storage and hot surface controls.",
        },
      ],
    },
    incidentData: {
      items: [
        {
          id: 31,
          title: "Slip near rear entrance",
          incident_type: "Environmental incident",
          severity: "high",
          status: "review_due",
          date: minusDays(2, 18, 15),
          summary: "Slip reported during wet weather. Mats and signage reviewed.",
        },
      ],
    },
    visitorData: {
      items: [
        {
          id: 41,
          visitor_name: "Apex Heating",
          organisation: "Apex Heating",
          visit_date: plusDays(1, 10, 30),
          status: "booked",
          purpose: "Boiler repair",
          summary: "Contractor booked to inspect boiler pressure issue.",
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: 51,
          title: "Portable appliance testing",
          area: "Premises safety",
          severity: "high",
          status: "overdue",
          due_date: minusDays(3),
          summary: "PAT testing is overdue and needs booking.",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: 61,
          title: "Upload fire test log",
          task: "Record this week’s fire alarm test.",
          assigned_role: "Shift lead",
          due_date: plusDays(1),
          completed: false,
          status: "open",
          summary: "Weekly fire test evidence still needs uploading.",
        },
        {
          id: 62,
          title: "Complete PAT booking",
          task: "Arrange contractor for PAT testing.",
          assigned_role: "Manager",
          due_date: plusDays(2),
          completed: false,
          status: "due_soon",
          summary: "PAT testing contractor still needs confirming.",
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
    safeGet(`/homes/${homeId}/maintenance`),
    safeGet(`/homes/${homeId}/fire-checks`),
    safeGet(`/homes/${homeId}/risk-assessments`),
    safeGet(`/homes/${homeId}/incidents`),
    safeGet(`/homes/${homeId}/visitors`),
    safeGet(`/homes/${homeId}/compliance`),
    safeGet(`/homes/${homeId}/tasks`),
  ];

  const [
    summaryData,
    maintenanceData,
    fireCheckData,
    riskData,
    incidentData,
    visitorData,
    complianceData,
    taskData,
  ] = await Promise.all(requests);

  const responses = [
    summaryData,
    maintenanceData,
    fireCheckData,
    riskData,
    incidentData,
    visitorData,
    complianceData,
    taskData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: summaryData || {},
    maintenanceData: maintenanceData || { items: [] },
    fireCheckData: fireCheckData || { items: [] },
    riskData: riskData || { items: [] },
    incidentData: incidentData || { items: [] },
    visitorData: visitorData || { items: [] },
    complianceData: complianceData || { items: [] },
    taskData: taskData || { items: [] },
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
      maintenanceData,
      fireCheckData,
      riskData,
      incidentData,
      visitorData,
      complianceData,
      taskData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const maintenanceItems = sortSoonestFirst(
      normaliseMaintenanceItems(maintenanceData),
      ["due_date", "reported_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const fireCheckItems = sortSoonestFirst(
      normaliseFireCheckItems(fireCheckData),
      ["due_date", "completed_at", "updated_at", "created_at"]
    ).slice(0, 8);

    const riskItems = sortSoonestFirst(normaliseRiskItems(riskData), [
      "review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const incidentItems = sortNewestFirst(normaliseIncidentItems(incidentData), [
      "date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const visitorItems = sortSoonestFirst(normaliseVisitorItems(visitorData), [
      "visit_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const complianceItems = sortSoonestFirst(
      normaliseComplianceItems(complianceData),
      ["due_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const openTasks = taskItems.filter((item) => !item.completed).slice(0, 8);

    const topStats = buildTopStats({
      maintenanceItems,
      fireCheckItems,
      riskItems,
      incidentItems,
      complianceItems,
      openTasks,
    });

    const progressCards = buildProgressCards({
      maintenanceItems,
      fireCheckItems,
      riskItems,
      complianceItems,
    });

    const priorityItems = buildPriorityItems({
      maintenanceItems,
      fireCheckItems,
      riskItems,
      incidentItems,
      complianceItems,
      openTasks,
    });

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} health and safety`;

    els.viewContent.innerHTML = renderHealthSafetyHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      maintenanceItems,
      fireCheckItems,
      riskItems,
      incidentItems,
      visitorItems,
      complianceItems,
      openTasks,
      isFallback,
    });

    const nextReview =
      fireCheckItems[0]?.due_date ||
      riskItems[0]?.review_date ||
      complianceItems[0]?.due_date ||
      openTasks[0]?.due_date ||
      null;

    const latestRecord =
      incidentItems[0]?.date ||
      maintenanceItems[0]?.reported_date ||
      fireCheckItems[0]?.completed_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${maintenanceItems.length} premises items • preview mode`
        : `${maintenanceItems.length} premises items • ${openTasks.length} open actions`,
      nextEvent: nextReview
        ? `Next review ${formatDate(nextReview)}`
        : "No immediate safety review loaded",
      lastRecord: latestRecord
        ? `Latest H&S record ${formatDateTime(latestRecord)}`
        : isFallback
        ? "Preview H&S data loaded"
        : "No recent H&S record loaded",
      openActions: `${openTasks.length} open • ${priorityItems.length} priority`,
    });
  } catch (error) {
    console.error("[health-safety] load failed", error);
    renderErrorState(error?.message || "The health and safety view could not be loaded.");
  }
}