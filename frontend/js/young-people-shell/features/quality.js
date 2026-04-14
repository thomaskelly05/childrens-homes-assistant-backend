import { state } from "../state.js";
import { els } from "../dom.js";
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
  const normalised = String(status || "").toLowerCase().replaceAll(" ", "_");

  if (
    ["overdue", "high", "critical", "escalated", "missing", "non_compliant", "failed"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["due_soon", "warning", "medium", "review_due", "attention", "at_risk"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["completed", "good", "active", "booked", "compliant", "ok", "passed"].includes(
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

function normaliseQualitySummary(data = {}) {
  return data.summary || data.quality_summary || data.dashboard || data || {};
}

function normaliseAuditItems(data = {}) {
  return toArray(data.items, [data.audits, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    audit_name: item.audit_name || item.title || item.name || "Audit",
    finding: item.finding || item.summary || item.notes || "Audit recorded.",
    status: item.status || "recorded",
    audit_date: item.audit_date || item.review_date || item.created_at || null,
    auditor: item.auditor || item.owner || "",
    record_type: item.record_type || "audit",
  }));
}

function normaliseIncidentItems(data = {}) {
  return toArray(data.items, [data.incidents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    incident_type: item.incident_type || item.title || "Incident",
    description: item.description || item.summary || item.notes || "Incident recorded.",
    location: item.location || "",
    status: item.status || "recorded",
    incident_datetime: item.incident_datetime || item.created_at || null,
    record_type: item.record_type || "incident",
  }));
}

function normaliseSafeguardingItems(data = {}) {
  return toArray(data.items, [data.safeguarding, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    safeguarding_category:
      item.safeguarding_category || item.title || item.category || "Safeguarding",
    concern_details:
      item.concern_details || item.summary || item.notes || "Safeguarding concern recorded.",
    concern_datetime: item.concern_datetime || item.created_at || null,
    referral_made: Boolean(item.referral_made),
    status: item.status || "open",
    record_type: item.record_type || "safeguarding",
  }));
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.task || "Task",
    task: item.task || item.summary || item.title || "Task",
    assigned_role: item.assigned_role || "",
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    record_type: item.record_type || "task",
  }));
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance, data.compliance_items, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.area || "Compliance item",
    summary: item.summary || item.notes || "Compliance item recorded.",
    area: item.area || "",
    review_date: item.review_date || item.due_date || null,
    due_date: item.due_date || item.review_date || null,
    severity: item.severity || "",
    status: item.status || "recorded",
    record_type: item.record_type || "compliance",
  }));
}

function normaliseReportItems(data = {}) {
  return toArray(data.items, [data.reports, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    title: item.title || item.report_type || "Report",
    summary: item.summary || item.notes || "Report recorded.",
    report_type: item.report_type || "",
    status: item.status || "completed",
    created_at: item.created_at || item.updated_at || null,
    updated_at: item.updated_at || null,
    record_type: item.record_type || "report",
  }));
}

function buildTopStats({
  summary = {},
  audits = [],
  incidents = [],
  safeguarding = [],
  openActions = [],
  compliancePressure = [],
}) {
  const overdueAudits = audits.filter((item) =>
    ["overdue", "due_soon", "review_due"].includes(String(item.status || "").toLowerCase().replaceAll(" ", "_"))
  ).length;

  const recentIncidents = incidents.filter((item) => {
    const when = item.incident_datetime || item.created_at || item.updated_at;
    if (!when) return false;
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  const safeguardingOpen = safeguarding.filter((item) =>
    !["closed", "completed", "resolved"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const score = toNumber(summary.audit_score ?? summary.quality_score, 0);

  return [
    {
      label: "Audit score",
      value: score,
      note: "Current quality score",
      tone: score >= 85 ? "success" : score >= 70 ? "warning" : "danger",
    },
    {
      label: "Audits due",
      value: overdueAudits,
      note: "Reviews due or overdue",
      tone: overdueAudits ? "warning" : "success",
    },
    {
      label: "Recent incidents",
      value: recentIncidents,
      note: "Last 30 days",
      tone: recentIncidents > 10 ? "warning" : "muted",
    },
    {
      label: "Open safeguarding",
      value: safeguardingOpen,
      note: "Concerns needing oversight",
      tone: safeguardingOpen ? "danger" : "success",
    },
    {
      label: "Compliance pressure",
      value: compliancePressure.length,
      note: "Items needing assurance",
      tone: compliancePressure.length ? "warning" : "success",
    },
    {
      label: "Open actions",
      value: openActions.length,
      note: "Quality follow-up actions",
      tone: openActions.length ? "warning" : "success",
    },
  ];
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
            item?.audit_name ||
            item?.staff_member ||
            item?.category ||
            item?.type ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.finding ||
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
                <span class="row-pill ${safeText(tone)}">${safeText(status || "Recorded")}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderInsightCards(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>No insights yet</h3>
          <p>Quality insights will appear here as audits, incidents and compliance data builds up.</p>
        </div>
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

function buildInsightItems({ audits = [], incidents = [], safeguarding = [], compliance = [] }) {
  const items = [];

  const overdueAuditCount = audits.filter((item) =>
    ["overdue", "due_soon", "review_due"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  if (overdueAuditCount) {
    items.push({
      title: "Audit pressure",
      summary: `${overdueAuditCount} audit item${overdueAuditCount === 1 ? "" : "s"} due or overdue.`,
    });
  }

  const restrictivePractice = incidents.filter((item) =>
    /restraint|physical intervention|hold/i.test(
      String(item.incident_type || item.title || item.description || "")
    )
  ).length;

  if (restrictivePractice) {
    items.push({
      title: "Restrictive practice pattern",
      summary: `${restrictivePractice} recent incident${restrictivePractice === 1 ? "" : "s"} mention restraint or physical intervention.`,
    });
  }

  const openSafeguarding = safeguarding.filter((item) =>
    !["closed", "completed", "resolved"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  if (openSafeguarding) {
    items.push({
      title: "Safeguarding oversight",
      summary: `${openSafeguarding} safeguarding concern${openSafeguarding === 1 ? "" : "s"} remain open.`,
    });
  }

  const nonCompliant = compliance.filter((item) =>
    ["overdue", "non_compliant", "due_soon", "missing"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  if (nonCompliant) {
    items.push({
      title: "Compliance risk",
      summary: `${nonCompliant} compliance item${nonCompliant === 1 ? "" : "s"} need action or assurance.`,
    });
  }

  if (!items.length) {
    items.push({
      title: "No critical themes showing",
      summary: "The dashboard is not currently surfacing major audit, incident or compliance pressure.",
    });
  }

  return items.slice(0, 6);
}

function renderQualityDashboardHtml({
  title = "Quality and RI dashboard",
  topStats = [],
  insightItems = [],
  auditItems = [],
  incidentItems = [],
  safeguardingItems = [],
  complianceItems = [],
  reportItems = [],
  openActions = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Quality and RI</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across audits, incidents, safeguarding, compliance, reports and service quality themes.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Quality insights</h3>
              <p>The biggest themes rising from audits, incidents and compliance activity.</p>
            </div>
            ${renderInsightCards(insightItems)}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Audits and checks</h3>
              <p>Recent and upcoming audit activity across the service.</p>
            </div>
            ${renderRows(auditItems, {
              emptyMessage: "No audit records found.",
              titleKey: "audit_name",
              summaryKey: "finding",
              recordType: "audit",
              metaBuilder: (item) =>
                [
                  item.auditor || "",
                  item.audit_date ? formatDate(item.audit_date) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open actions</h3>
              <p>Actions raised through quality, compliance and oversight activity.</p>
            </div>
            ${renderRows(openActions, {
              emptyMessage: "No open quality actions found.",
              titleKey: "title",
              summaryKey: "task",
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
              <h3>Reports and review outputs</h3>
              <p>Recent management and quality outputs.</p>
            </div>
            ${renderRows(reportItems, {
              emptyMessage: "No reports found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "report",
              metaBuilder: (item) =>
                [
                  item.report_type || "",
                  item.created_at ? formatDateTime(item.created_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Compliance pressure</h3>
              <p>Items at risk, due soon or overdue.</p>
            </div>
            ${renderRows(complianceItems, {
              emptyMessage: "No compliance pressure items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "compliance",
              metaBuilder: (item) =>
                [
                  item.area || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Safeguarding oversight</h3>
              <p>Current concerns and oversight activity.</p>
            </div>
            ${renderRows(safeguardingItems, {
              emptyMessage: "No safeguarding records found.",
              titleKey: "safeguarding_category",
              summaryKey: "concern_details",
              recordType: "safeguarding",
              metaBuilder: (item) =>
                [
                  item.concern_datetime ? formatDateTime(item.concern_datetime) : "",
                  item.referral_made ? "Referral made" : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Incident themes</h3>
              <p>Recent incidents that need quality attention.</p>
            </div>
            ${renderRows(incidentItems, {
              emptyMessage: "No recent incidents found.",
              titleKey: "incident_type",
              summaryKey: "description",
              recordType: "incident",
              metaBuilder: (item) =>
                [
                  item.location || "",
                  item.incident_datetime ? formatDateTime(item.incident_datetime) : "",
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
          <div class="empty-state-icon" aria-hidden="true">▦</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before the quality dashboard can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No quality context",
    nextEvent: "No audit event loaded",
    lastRecord: "No quality data",
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
          <p>Loading quality dashboard…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading quality view",
    nextEvent: "Checking next audit",
    lastRecord: "Loading latest quality record",
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
          <h3>Failed to load quality dashboard</h3>
          <p>${safeText(message || "The quality dashboard could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Quality dashboard unavailable",
    nextEvent: "No event loaded",
    lastRecord: "No record loaded",
    openActions: "No actions loaded",
  });
}

function buildFallbackQualityData(homeId) {
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
      title: `${homeName} quality dashboard`,
      home_name: homeName,
      audit_score: 78,
      quality_score: 78,
    },
    auditData: {
      items: [
        {
          id: 1,
          audit_name: "Medication audit",
          finding: "Minor recording gaps identified in two entries.",
          status: "due_soon",
          audit_date: plusDays(5),
          auditor: "Quality Lead",
        },
        {
          id: 2,
          audit_name: "File audit",
          finding: "Overall good standard with one missing signature.",
          status: "completed",
          audit_date: minusDays(6),
          auditor: "RI",
        },
      ],
    },
    incidentData: {
      items: [
        {
          id: 11,
          incident_type: "Missing from care",
          description: "Returned safely after 45 minutes. Debrief complete.",
          location: "Community",
          status: "review_due",
          incident_datetime: minusDays(2, 18, 20),
        },
        {
          id: 12,
          incident_type: "Physical intervention",
          description: "Single hold used to prevent injury. Manager review needed.",
          location: "Home",
          status: "attention",
          incident_datetime: minusDays(7, 20, 10),
        },
      ],
    },
    safeguardingData: {
      items: [
        {
          id: 21,
          safeguarding_category: "Peer-on-peer concern",
          concern_details: "Ongoing monitoring with weekly oversight.",
          concern_datetime: minusDays(3, 14, 0),
          referral_made: true,
          status: "open",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: 31,
          title: "Update audit action tracker",
          task: "Record evidence against open audit actions.",
          assigned_role: "Manager",
          due_date: plusDays(2),
          completed: false,
          status: "open",
        },
        {
          id: 32,
          title: "Review restraint debrief quality",
          task: "Check language and reflection quality in latest debrief.",
          assigned_role: "RI",
          due_date: plusDays(4),
          completed: false,
          status: "open",
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: 41,
          title: "Statement of Purpose review",
          summary: "Annual review is overdue.",
          area: "Governance",
          review_date: minusDays(4),
          severity: "high",
          status: "overdue",
        },
        {
          id: 42,
          title: "Training matrix assurance",
          summary: "Two certificates need refreshing.",
          area: "Workforce",
          review_date: plusDays(6),
          severity: "medium",
          status: "due_soon",
        },
      ],
    },
    reportData: {
      items: [
        {
          id: 51,
          title: "Monthly quality review",
          summary: "Themes noted across incidents, staffing and audit quality.",
          report_type: "Monthly review",
          status: "completed",
          created_at: minusDays(8, 10, 0),
        },
      ],
    },
  };
}

async function fetchQualityDataset(homeId) {
  return buildFallbackQualityData(homeId);
}

export async function loadQualityDashboard() {
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
      incidentData,
      safeguardingData,
      taskData,
      complianceData,
      reportData,
    } = await fetchQualityDataset(homeId);

    const summary = normaliseQualitySummary(summaryData);

    const auditItems = sortSoonestFirst(normaliseAuditItems(auditData), [
      "audit_date",
      "review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const incidentItems = sortNewestFirst(normaliseIncidentItems(incidentData), [
      "incident_datetime",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const safeguardingItems = sortNewestFirst(
      normaliseSafeguardingItems(safeguardingData),
      ["concern_datetime", "updated_at", "created_at"]
    ).slice(0, 6);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const openActions = taskItems.filter((item) => !item.completed).slice(0, 8);

    const complianceItems = sortSoonestFirst(
      normaliseComplianceItems(complianceData),
      ["review_date", "due_date", "updated_at", "created_at"]
    )
      .filter((item) =>
        ["overdue", "due_soon", "review_due", "missing", "non_compliant"].includes(
          String(item.status || "").toLowerCase().replaceAll(" ", "_")
        )
      )
      .slice(0, 8);

    const reportItems = sortNewestFirst(normaliseReportItems(reportData), [
      "created_at",
      "updated_at",
    ]).slice(0, 6);

    const topStats = buildTopStats({
      summary,
      audits: auditItems,
      incidents: incidentItems,
      safeguarding: safeguardingItems,
      openActions,
      compliancePressure: complianceItems,
    });

    const insightItems = buildInsightItems({
      audits: auditItems,
      incidents: incidentItems,
      safeguarding: safeguardingItems,
      compliance: complianceItems,
    });

    els.viewContent.innerHTML = renderQualityDashboardHtml({
      title:
        summary.title ||
        summary.home_name ||
        state.currentUser?.home_name ||
        "Quality and RI dashboard",
      topStats,
      insightItems,
      auditItems,
      incidentItems,
      safeguardingItems,
      complianceItems,
      reportItems,
      openActions,
    });

    const nextAudit = auditItems.find((item) => item.audit_date || item.review_date);
    const latestReport = reportItems[0];
    const auditScore = toNumber(summary.audit_score ?? summary.quality_score, 0);

    updateWorkspaceSummaryStrip({
      today: `Audit score ${auditScore} • ${openActions.length} open actions`,
      nextEvent: nextAudit
        ? `Next audit ${formatDate(nextAudit.audit_date || nextAudit.review_date)}`
        : "No audit scheduled",
      lastRecord:
        latestReport?.created_at
          ? `Latest report ${formatDateTime(latestReport.created_at)}`
          : "No recent report loaded",
      openActions: `${openActions.length} open • ${complianceItems.length} compliance pressure`,
    });
  } catch (error) {
    renderErrorState(error?.message || "The quality dashboard could not be loaded.");
  }
}
