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
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "completed",
      "good",
      "active",
      "booked",
      "compliant",
      "ok",
      "current",
      "reviewed",
      "on_shift",
      "available",
      "confirmed",
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
    title: item.title || item.task || "Task",
    task: item.task || item.title || "Task",
    status: item.status || (item.completed ? "completed" : "open"),
    completed: Boolean(item.completed),
    due_date: item.due_date || null,
    assigned_role: item.assigned_role || "",
    summary:
      item.summary ||
      item.notes ||
      item.description ||
      "Task recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseCommunicationItems(data = {}) {
  return toArray(data.items, [data.communications, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "communication",
    title: item.title || "Communication",
    status: item.status || "recorded",
    summary: item.summary || "Communication logged.",
    contact_datetime: item.contact_datetime || item.created_at || null,
    communication_type: item.communication_type || "",
    organisation: item.organisation || "",
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

function normaliseTherapyItems(data = {}) {
  return toArray(data.items, [data.therapy, data.therapy_records, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "therapy",
    service_name: item.title || item.service_name || "Therapeutic input",
    title: item.title || item.service_name || "Therapeutic input",
    professional_name: item.professional_name || "",
    status: item.status || "active",
    session_date: item.session_date || item.created_at || null,
    summary:
      item.summary ||
      item.notes ||
      "Therapeutic input recorded.",
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

function buildTopStats({
  youngPeople = [],
  openTasks = [],
  overdueItems = [],
  dueSupervisions = [],
  recentCommunications = [],
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
      label: "Recent comms",
      value: recentCommunications.length,
      note: "Latest liaison activity",
      tone: "muted",
    },
  ];
}

function buildOperationalCounts({
  team = [],
  tasks = [],
  documents = [],
  compliance = [],
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

  return {
    openVacancies,
    absentStaff,
    openActions,
    docReviewsDue,
    urgentCompliance,
  };
}

function buildPriorityItems({
  overdueTasks = [],
  dueSupervisions = [],
  expiringDocuments = [],
  urgentCompliance = [],
}) {
  const items = [];

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

  return items.slice(0, 6);
}

function buildHomeKpis({
  tasks = [],
  documents = [],
  supervisions = [],
  therapy = [],
  compliance = [],
}) {
  const urgentCompliance = compliance.filter((item) =>
    ["overdue", "escalated", "review_due", "missing"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const compliancePercent =
    compliance.length > 0
      ? Math.max(0, Math.round(((compliance.length - urgentCompliance) / compliance.length) * 100))
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
    ["completed", "done", "active"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const supervisionPercent =
    supervisions.length > 0
      ? Math.round((completedSupervisions / supervisions.length) * 100)
      : 0;

  const activeTherapy = therapy.filter((item) =>
    ["active", "booked", "open", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

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
      label: "Therapeutic input",
      value: activeTherapy,
      percent: Math.min(activeTherapy * 20, 100),
      tone: activeTherapy > 0 ? "muted" : "warning",
    },
  ];
}

function buildMiniMetrics({
  openTasks = [],
  dueSupervisions = [],
  recentDocuments = [],
  therapyItems = [],
  recentCommunications = [],
}) {
  return [
    { label: "Tasks", value: openTasks.length },
    { label: "Supervisions", value: dueSupervisions.length },
    { label: "Documents", value: recentDocuments.length },
    { label: "Therapy", value: therapyItems.length },
    { label: "Comms", value: recentCommunications.length },
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
    <div class="overview-stats-grid overview-stats-grid--five">
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
            item?.service_name ||
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

function renderHomeDashboardHtml({
  homeName = "Home",
  topStats = [],
  operationalCounts = {},
  priorityItems = [],
  recentCommunications = [],
  openTasks = [],
  dueSupervisions = [],
  recentDocuments = [],
  therapyItems = [],
  teamItems = [],
  progressCards = [],
  miniMetrics = [],
  youngPeople = [],
  recentReports = [],
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Home dashboard</div>
          <h2>${safeText(homeName)}</h2>
          <p>A live home-wide management view across children, staffing, communication, documents, therapy and oversight.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Performance snapshot</h3>
          <p>A quick visual read across completion, compliance and readiness.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Operational picture</h3>
              <p>The quickest view of workforce, actions, vacancies and document review pressure.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open vacancies</div>
                  <div class="record-row-summary">Known vacancies across the home.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    operationalCounts.openVacancies > 0 ? "warning" : "muted"
                  }">${safeText(operationalCounts.openVacancies)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Staff absent</div>
                  <div class="record-row-summary">Staff currently off, sick or unavailable.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    operationalCounts.absentStaff > 0 ? "warning" : "muted"
                  }">${safeText(operationalCounts.absentStaff)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Urgent compliance</div>
                  <div class="record-row-summary">High-severity or overdue compliance items.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    operationalCounts.urgentCompliance > 0 ? "danger" : "muted"
                  }">${safeText(operationalCounts.urgentCompliance)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open actions</div>
                  <div class="record-row-summary">Outstanding management and operational tasks.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    operationalCounts.openActions > 0 ? "warning" : "muted"
                  }">${safeText(operationalCounts.openActions)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Document reviews due</div>
                  <div class="record-row-summary">Policies, statutory documents or records needing review.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    operationalCounts.docReviewsDue > 0 ? "warning" : "muted"
                  }">${safeText(operationalCounts.docReviewsDue)}</span>
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
                [
                  item.full_name || "",
                  item.summary_risk_level ? `Risk ${item.summary_risk_level}` : "",
                  item.placement_status || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusBuilder: (item) => item.placement_status || "active",
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent communication</h3>
              <p>Latest liaison with professionals, families and partner agencies.</p>
            </div>

            ${renderRows(recentCommunications, {
              emptyMessage: "No recent communication records found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "communication",
              metaBuilder: (item) =>
                [
                  item.organisation || "",
                  item.communication_type || "",
                  formatDateTime(item.contact_datetime || item.created_at),
                ]
                  .filter(Boolean)
                  .join(" • "),
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
        </section>

        <aside class="overview-side">
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
              <h3>Supervision due</h3>
              <p>Upcoming or overdue staff supervision and oversight.</p>
            </div>

            ${renderRows(dueSupervisions, {
              emptyMessage: "No supervision items are currently due.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "supervision",
              metaBuilder: (item) =>
                [
                  item.role || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
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
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Therapeutic services</h3>
              <p>Recent therapeutic input, recommendations and follow-up.</p>
            </div>

            ${renderRows(therapyItems, {
              emptyMessage: "No therapeutic service records found.",
              titleKey: "service_name",
              summaryKey: "summary",
              recordType: "therapy",
              metaBuilder: (item) =>
                [
                  item.professional_name || "",
                  item.session_date ? formatDate(item.session_date) : "",
                ]
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
                [
                  item.review_month || "",
                  item.status || "",
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
  const dateOnly = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  return {
    summaryData: {
      home: {
        id: homeId,
        name: homeName,
        home_name: homeName,
      },
      summary: {
        children_count: 3,
        home_name: homeName,
      },
      young_people: [
        {
          id: 101,
          preferred_name: "Jay",
          full_name: "Jay Smith",
          home_name: homeName,
          placement_status: "active",
          summary_risk_level: "medium",
        },
        {
          id: 102,
          preferred_name: "Amira",
          full_name: "Amira Khan",
          home_name: homeName,
          placement_status: "active",
          summary_risk_level: "high",
        },
        {
          id: 103,
          preferred_name: "Luca",
          full_name: "Luca Brown",
          home_name: homeName,
          placement_status: "active",
          summary_risk_level: "low",
        },
      ],
    },
    teamData: {
      items: [
        { id: 1, full_name: "Sarah Jones", role: "Registered Manager", status: "On shift" },
        { id: 2, full_name: "Tom Patel", role: "Deputy Manager", status: "On shift" },
        { id: 3, full_name: "Priya Shah", role: "Therapist", status: "Visiting professional" },
        { id: 4, full_name: "Leah Brown", role: "Senior Residential Worker", status: "On shift" },
        { id: 5, full_name: "Amir Hussain", role: "Residential Worker", status: "On shift" },
        { id: 6, full_name: "Chloe Davies", role: "Residential Worker", status: "On shift" },
        { id: 7, full_name: "Michael Osei", role: "Residential Worker", status: "Annual leave" },
        { id: 8, full_name: "Helen Morris", role: "Residential Worker", status: "On shift" },
        { id: 9, full_name: "Danielle Green", role: "Residential Worker", status: "Working remotely" },
        { id: 10, full_name: "Chris Walker", role: "Waking Night", status: "On shift" },
        { id: 11, full_name: "Amina Yusuf", role: "Waking Night", status: "Available" },
        { id: 12, full_name: "Ben Carter", role: "Bank Staff", status: "Bank staff" },
        { id: 13, full_name: "Grace Thomas", role: "Residential Worker", status: "On shift" },
      ],
    },
    taskData: {
      items: [
        { id: 201, title: "Complete fire drill log", status: "open", completed: false, due_date: dateOnly(-1) },
        { id: 202, title: "Update rota gap cover", status: "open", completed: false, due_date: dateOnly(1) },
        { id: 203, title: "Book supervision for Ben Carter", status: "open", completed: false, due_date: dateOnly(2) },
        { id: 204, title: "Review missing-from-care protocol", status: "completed", completed: true, due_date: dateOnly(-2) },
      ],
    },
    communicationData: {
      items: [
        {
          id: 301,
          title: "IRO update",
          summary: "Updated on progress and actions from recent review.",
          contact_datetime: minusDays(1, 10, 30),
          status: "Sent",
          communication_type: "email",
          organisation: "IRO",
        },
        {
          id: 302,
          title: "School safeguarding query",
          summary: "School asked for clarification on incident follow-up.",
          contact_datetime: minusDays(2, 14, 15),
          status: "Received",
          communication_type: "phone",
          organisation: "School",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: 401,
          title: "Statement of Purpose",
          document_type: "Governance",
          summary: "Annual review due shortly.",
          status: "review_due",
          review_date: dateOnly(4),
        },
        {
          id: 402,
          title: "Medication Audit",
          document_type: "Health",
          summary: "Latest audit filed.",
          status: "active",
          review_date: dateOnly(18),
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: 501,
          staff_member: "Ben Carter",
          role: "Bank Staff",
          status: "overdue",
          due_date: dateOnly(-3),
          summary: "Supervision overdue.",
        },
        {
          id: 502,
          staff_member: "Grace Thomas",
          role: "Residential Worker",
          status: "due_soon",
          due_date: dateOnly(3),
          summary: "Supervision due this week.",
        },
      ],
    },
    therapyData: {
      items: [
        {
          id: 601,
          title: "Clinical consultation",
          service_name: "Clinical consultation",
          professional_name: "Priya Shah",
          status: "completed",
          session_date: minusDays(5, 11, 0),
          summary: "Practical recommendations shared with staff.",
        },
      ],
    },
    reportData: {
      items: [
        {
          id: 701,
          title: "Monthly home summary",
          summary: "Summary of incidents, staffing and quality themes.",
          review_month: "2026-03",
          status: "completed",
          created_at: minusDays(8, 9, 0),
        },
      ],
    },
    complianceData: {
      items: [
        {
          id: 801,
          title: "Regulation 44 visit due",
          status: "overdue",
          severity: "high",
          due_date: dateOnly(-2),
        },
        {
          id: 802,
          title: "Training matrix update",
          status: "due_soon",
          severity: "medium",
          due_date: dateOnly(5),
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/dashboard`).catch(() => null),
    apiGet(`/homes/${homeId}/team`).catch(() => null),
    apiGet(`/homes/${homeId}/tasks`).catch(() => null),
    apiGet(`/homes/${homeId}/communications`).catch(() => null),
    apiGet(`/homes/${homeId}/documents`).catch(() => null),
    apiGet(`/homes/${homeId}/supervisions`).catch(() => null),
    apiGet(`/homes/${homeId}/therapy`).catch(() => null),
    apiGet(`/homes/${homeId}/reports`).catch(() => null),
    apiGet(`/homes/${homeId}/compliance`).catch(() => null),
  ];

  const [
    summaryData,
    teamData,
    taskData,
    communicationData,
    documentData,
    supervisionData,
    therapyData,
    reportData,
    complianceData,
  ] = await Promise.all(requests);

  const hasLiveSuccess = [
    summaryData,
    teamData,
    taskData,
    communicationData,
    documentData,
    supervisionData,
    therapyData,
    reportData,
    complianceData,
  ].some(Boolean);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: summaryData || {},
    teamData: teamData || { items: [] },
    taskData: taskData || { items: [] },
    communicationData: communicationData || { items: [] },
    documentData: documentData || { items: [] },
    supervisionData: supervisionData || { items: [] },
    therapyData: therapyData || { items: [] },
    reportData: reportData || { items: [] },
    complianceData: complianceData || { items: [] },
    isFallback: false,
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
    const {
      summaryData,
      teamData,
      taskData,
      communicationData,
      documentData,
      supervisionData,
      therapyData,
      reportData,
      complianceData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseHomeSummary(summaryData);
    const youngPeople = normaliseYoungPeople(summaryData);

    const teamItems = sortNewestFirst(normaliseTeamItems(teamData), [
      "updated_at",
      "created_at",
    ]).slice(0, 12);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
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

    const communicationItems = sortNewestFirst(
      normaliseCommunicationItems(communicationData),
      ["contact_datetime", "updated_at", "created_at"]
    ).slice(0, 6);

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

    const therapyItems = sortNewestFirst(normaliseTherapyItems(therapyData), [
      "session_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

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

    const topStats = buildTopStats({
      youngPeople,
      openTasks,
      overdueItems: [...overdueTasks, ...urgentCompliance],
      dueSupervisions,
      recentCommunications: communicationItems,
    });

    const operationalCounts = buildOperationalCounts({
      team: teamItems,
      tasks: taskItems,
      documents: documentItems,
      compliance: complianceItems,
    });

    const priorityItems = buildPriorityItems({
      overdueTasks,
      dueSupervisions,
      expiringDocuments,
      urgentCompliance,
    });

    const progressCards = buildHomeKpis({
      tasks: taskItems,
      documents: documentItems,
      supervisions: supervisionItems,
      therapy: therapyItems,
      compliance: complianceItems,
    });

    const miniMetrics = buildMiniMetrics({
      openTasks,
      dueSupervisions,
      recentDocuments,
      therapyItems,
      recentCommunications: communicationItems,
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
      recentCommunications: communicationItems,
      openTasks: openTasks.slice(0, 8),
      dueSupervisions: dueSupervisions.slice(0, 6),
      recentDocuments,
      therapyItems,
      teamItems,
      progressCards,
      miniMetrics,
      youngPeople,
      recentReports,
    });

    const nextDueSupervision = dueSupervisions[0];
    const latestCommunication = communicationItems[0];
    const todaySummary = `${youngPeople.length} children • ${openTasks.length} open actions`;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${todaySummary} • demo preview`
        : todaySummary,
      nextEvent: nextDueSupervision?.due_date
        ? `Supervision due ${formatDate(nextDueSupervision.due_date)}`
        : "No immediate event loaded",
      lastRecord:
        latestCommunication?.contact_datetime || latestCommunication?.created_at
          ? `Latest comms ${formatDateTime(
              latestCommunication.contact_datetime || latestCommunication.created_at
            )}`
          : "No recent home record loaded",
      openActions: `${openTasks.length} open • ${urgentCompliance.length} urgent compliance`,
    });
  } catch (error) {
    console.error("[home-dashboard] load failed", error);
    renderErrorState(error?.message || "The home dashboard could not be loaded.");
  }
}