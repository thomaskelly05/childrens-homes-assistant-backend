import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import {
  mapAiReport,
  mapMonthlyReview,
  mapHandoverRecord,
  mapInspectionPackJob,
  mapChronologyEvent,
  mapComplianceItem,
  mapTask,
  mapManagerAction,
  mapIncident,
} from "../core/adapters.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    null
  );
}

function getScopeEntityId() {
  if (getCurrentScope() === "child") {
    return state.youngPersonId || null;
  }

  return getHomeId();
}

function getScopeLabel() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home reports";
  if (scope === "quality") return "Quality and RI reports";
  return "Young person reports";
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return (
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      (getHomeId() ? `Home ${getHomeId()}` : "Home")
    );
  }

  if (scope === "quality") {
    return (
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      (getHomeId() ? `Home ${getHomeId()}` : "Quality dashboard")
    );
  }

  const person = state.selectedYoungPerson || state.youngPerson || {};
  return (
    person.full_name ||
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    "Young person"
  );
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDateValue(value) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function getReportEndpoints() {
  const scope = getCurrentScope();
  const id = getScopeEntityId();

  if (!id) {
    return null;
  }

  if (scope === "home") {
    return {
      aiReports: `/homes/${id}/reports`,
      monthlyReviews: `/homes/${id}/monthly-reviews`,
      handovers: `/homes/${id}/handover-records`,
      inspectionPacks: `/homes/${id}/inspection-packs`,
      chronology: `/homes/${id}/timeline`,
      compliance: `/homes/${id}/compliance`,
      tasks: `/homes/${id}/tasks`,
      managerActions: `/homes/${id}/manager-actions`,
      incidents: `/homes/${id}/incidents`,
    };
  }

  if (scope === "quality") {
    return {
      aiReports: `/homes/${id}/reports`,
      monthlyReviews: `/homes/${id}/monthly-reviews`,
      handovers: `/homes/${id}/handover-records`,
      inspectionPacks: `/homes/${id}/inspection-packs`,
      chronology: `/homes/${id}/timeline`,
      compliance: `/homes/${id}/compliance`,
      tasks: `/homes/${id}/tasks`,
      managerActions: `/homes/${id}/manager-actions`,
      incidents: `/homes/${id}/incidents`,
    };
  }

  return {
    aiReports: `/young-people/${id}/reports`,
    monthlyReviews: `/young-people/${id}/monthly-reviews`,
    handovers: `/young-people/${id}/handover-records`,
    inspectionPacks: `/young-people/${id}/inspection-packs`,
    chronology: `/young-people/${id}/timeline`,
    compliance: `/young-people/${id}/compliance`,
    tasks: `/young-people/${id}/tasks`,
    managerActions: `/young-people/${id}/manager-actions`,
    incidents: `/young-people/${id}/incidents`,
  };
}

function buildEvidenceOverview({
  aiReports = [],
  monthlyReviews = [],
  handovers = [],
  inspectionPacks = [],
  chronology = [],
  compliance = [],
  tasks = [],
  incidents = [],
  managerActions = [],
}) {
  const safeguardingLinked = chronology.filter((item) => item.safeguarding_flag).length;

  const overdueReadiness = compliance.filter((item) =>
    ["overdue", "escalated", "due_soon", "missing", "review_due"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const openTasks = tasks.filter((item) => !item.completed).length;

  const highRiskIncidents = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  ).length;

  return {
    aiReports: aiReports.length,
    monthlyReviews: monthlyReviews.length,
    safeguardingLinked,
    overdueReadiness,
    openTasks,
    inspectionPacks: inspectionPacks.length,
    managerActions: managerActions.length,
    highRiskIncidents,
  };
}

function buildReadinessEvidenceRows({
  compliance = [],
  tasks = [],
  chronology = [],
  incidents = [],
  managerActions = [],
}) {
  const overdue = compliance.filter((item) =>
    ["overdue", "escalated", "due_soon", "missing", "review_due"].includes(
      String(item.status || "").toLowerCase()
    )
  );

  const taskRows = tasks.filter((item) => !item.completed);

  const chronologyRows = chronology.filter((item) => {
    const significance = String(item.significance || "").toLowerCase();
    const severity = String(item.severity || "").toLowerCase();

    return (
      ["high", "critical"].includes(significance) ||
      ["high", "critical"].includes(severity) ||
      item.safeguarding_flag
    );
  });

  const incidentRows = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  );

  return [...overdue, ...taskRows, ...chronologyRows, ...incidentRows, ...managerActions].slice(
    0,
    12
  );
}

function buildLatestReportContext({
  aiReports = [],
  monthlyReviews = [],
  handovers = [],
  inspectionPacks = [],
}) {
  const latestAiReport = aiReports[0] || null;
  const latestMonthly = monthlyReviews[0] || null;
  const latestHandover = handovers[0] || null;
  const latestPack = inspectionPacks[0] || null;

  return [
    {
      label: "Latest AI report",
      value: latestAiReport?.title || latestAiReport?.report_type || "No AI reports yet.",
      subtext: latestAiReport?.review_month || latestAiReport?.status || "",
    },
    {
      label: "Latest monthly review",
      value: latestMonthly?.title || latestMonthly?.review_month || "No monthly review yet.",
      subtext: latestMonthly?.status || latestMonthly?.approved_at || "",
    },
    {
      label: "Latest handover",
      value: latestHandover?.title || latestHandover?.shift_type || "No handover record yet.",
      subtext: latestHandover?.handover_date || latestHandover?.status || "",
    },
    {
      label: "Latest inspection pack",
      value: latestPack?.title || latestPack?.pack_type || "No inspection pack yet.",
      subtext: latestPack?.status || latestPack?.completed_at || "",
    },
  ];
}

function normaliseReportRows(items = [], recordTypeFallback = "report") {
  return items.map((item) => ({
    ...item,
    id: item.id ?? item.source_id ?? "",
    record_type: item.record_type || recordTypeFallback,
    title:
      item.title ||
      item.report_type ||
      item.pack_type ||
      item.shift_type ||
      item.action_type ||
      item.incident_type ||
      "Record",
    summary:
      item.summary ||
      item.description ||
      item.outcome ||
      item.notes ||
      item.note ||
      item.status ||
      "Recorded item",
  }));
}

function getRowDate(item = {}) {
  return (
    item.review_month ||
    item.handover_date ||
    item.completed_at ||
    item.event_datetime ||
    item.occurred_at ||
    item.action_at ||
    item.due_date ||
    item.created_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const status = String(item.status || item.workflow_status || "").toLowerCase();
  const severity = String(item.severity || "").toLowerCase();
  const significance = String(item.significance || "").toLowerCase();

  if (
    ["overdue", "escalated", "critical", "returned", "missing", "review_due"].includes(status) ||
    ["high", "critical"].includes(severity) ||
    ["high", "critical"].includes(significance)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["completed", "approved", "active", "submitted"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return {
    label: status ? status.replaceAll("_", " ") : "Recorded",
    tone: "muted",
  };
}

function renderRecordRows(items = [], emptyMessage = "No records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(item.id)}"
              data-record-type="${toText(item.record_type || "")}"
              data-title="${toText(item.title || "Record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.title || "Record")}</div>
                ${
                  item.summary
                    ? `<div class="record-row-summary">${toText(item.summary)}</div>`
                    : ""
                }
                ${
                  getRowDate(item)
                    ? `<div class="record-row-meta">${toText(formatDateValue(getRowDate(item)))}</div>`
                    : ""
                }
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

function renderInfoRows(items = [], emptyMessage = "No information available.") {
  const visible = items.filter((item) => item.value);

  if (!visible.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${visible
        .map(
          (item) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.label)}</div>
                <div class="record-row-summary">${toText(item.value)}</div>
                ${item.subtext ? `<div class="record-row-meta">${toText(item.subtext)}</div>` : ""}
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Context</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderReportsHtml({
  aiReports = [],
  monthlyReviews = [],
  handovers = [],
  inspectionPacks = [],
  chronology = [],
  compliance = [],
  tasks = [],
  managerActions = [],
  incidents = [],
}) {
  const scope = getCurrentScope();
  const overview = buildEvidenceOverview({
    aiReports,
    monthlyReviews,
    handovers,
    inspectionPacks,
    chronology,
    compliance,
    tasks,
    incidents,
    managerActions,
  });

  const evidenceRows = buildReadinessEvidenceRows({
    compliance,
    tasks,
    chronology,
    incidents,
    managerActions,
  });

  const latestContext = buildLatestReportContext({
    aiReports,
    monthlyReviews,
    handovers,
    inspectionPacks,
  });

  const aiReportRows = normaliseReportRows(aiReports, "ai_report");
  const monthlyReviewRows = normaliseReportRows(monthlyReviews, "monthly_review");
  const handoverRows = normaliseReportRows(handovers, "handover_record");
  const inspectionPackRows = normaliseReportRows(inspectionPacks, "inspection_pack_job");
  const evidenceLinkedRows = normaliseReportRows(evidenceRows, "linked_evidence");
  const chronologyRows = normaliseReportRows(chronology.slice(0, 8), "chronology_event");
  const managerActionRows = normaliseReportRows(managerActions, "manager_action");
  const incidentRows = normaliseReportRows(incidents.slice(0, 8), "incident");

  const introText =
    scope === "child"
      ? "Generated outputs, formal reviews and linked evidence that support care planning, oversight and inspection readiness."
      : scope === "home"
      ? "Service-level outputs, formal reviews and linked evidence that support leadership oversight and readiness."
      : "Quality, RI and inspection-facing outputs with linked evidence, governance actions and reporting context.";

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">${toText(getScopeLabel())}</div>
          <h2>${toText(getScopeTitle())}</h2>
          <p>${toText(introText)}</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">AI reports</span>
              <strong class="overview-stat-value">${toText(aiReports.length)}</strong>
              <span class="overview-stat-note">Generated summaries and outputs</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Monthly reviews</span>
              <strong class="overview-stat-value">${toText(monthlyReviews.length)}</strong>
              <span class="overview-stat-note">Structured review records</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Handovers</span>
              <strong class="overview-stat-value">${toText(handovers.length)}</strong>
              <span class="overview-stat-note">Continuity and operational summaries</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Inspection packs</span>
              <strong class="overview-stat-value">${toText(inspectionPacks.length)}</strong>
              <span class="overview-stat-note">Inspection or evidence outputs</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Reports overview</h3>
              <p>The quickest picture of outputs, linked evidence and readiness pressure.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">AI reports</div>
                  <div class="record-row-summary">Generated summaries and narrative outputs.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(overview.aiReports)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Monthly reviews</div>
                  <div class="record-row-summary">Structured review records.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(overview.monthlyReviews)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Safeguarding-linked evidence</div>
                  <div class="record-row-summary">Chronology or events linked to safeguarding context.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    overview.safeguardingLinked > 0 ? "warning" : "muted"
                  }">${toText(overview.safeguardingLinked)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Readiness gaps</div>
                  <div class="record-row-summary">Overdue, escalated or due-soon items affecting readiness.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    overview.overdueReadiness > 0 ? "warning" : "muted"
                  }">${toText(overview.overdueReadiness)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open follow-up tasks</div>
                  <div class="record-row-summary">Actions still needing completion.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    overview.openTasks > 0 ? "warning" : "muted"
                  }">${toText(overview.openTasks)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">High risk incidents</div>
                  <div class="record-row-summary">Recent incidents that may need to shape reports or oversight.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${
                    overview.highRiskIncidents > 0 ? "warning" : "muted"
                  }">${toText(overview.highRiskIncidents)}</span>
                </div>
              </article>
            </div>
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Latest report context</h3>
              <p>The most recent outputs across AI reports, monthly reviews, handovers and inspection packs.</p>
            </div>

            ${renderInfoRows(latestContext, "No recent report context available yet.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>AI generated reports</h3>
              <p>Narrative outputs and generated summaries.</p>
            </div>

            ${renderRecordRows(aiReportRows, "No AI generated reports found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Monthly reviews</h3>
              <p>Structured reviews, progress, concerns and next steps.</p>
            </div>

            ${renderRecordRows(monthlyReviewRows, "No monthly reviews found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Manager and oversight actions</h3>
              <p>Leadership actions linked to review, escalation or decision-making.</p>
            </div>

            ${renderRecordRows(managerActionRows, "No manager actions found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Handover records</h3>
              <p>Shift or operational summaries that support continuity.</p>
            </div>

            ${renderRecordRows(handoverRows, "No handover records found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Inspection packs</h3>
              <p>Generated inspection evidence packs and related outputs.</p>
            </div>

            ${renderRecordRows(inspectionPackRows, "No inspection packs found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Linked evidence needing attention</h3>
              <p>Readiness gaps, open follow-up tasks and significant chronology or incidents that should influence reports.</p>
            </div>

            ${renderRecordRows(evidenceLinkedRows, "No urgent linked evidence found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent chronology for reporting</h3>
              <p>Chronology items that may need to be reflected in summaries, reviews or inspection packs.</p>
            </div>

            ${renderRecordRows(chronologyRows, "No chronology items found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent incidents</h3>
              <p>Incidents that may affect oversight, management analysis or RI reporting.</p>
            </div>

            ${renderRecordRows(incidentRows, "No recent incidents found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderNoContext() {
  if (!els.viewContent) return;

  const message =
    getCurrentScope() === "child"
      ? "Select a young person before opening reports."
      : "A home ID is needed before reports can load.";

  els.viewContent.innerHTML = `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;

  updateWorkspaceSummaryStrip({
    today: "No reports context",
    nextEvent: "No report schedule loaded",
    lastRecord: "No recent report",
    openActions: "No linked actions",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading reports...</p>
      </div>
    </div>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading reports",
    nextEvent: "Checking review outputs",
    lastRecord: "Loading latest report",
    openActions: "Loading linked actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="empty-state">
      <p>${toText(message || "Failed to load reports.")}</p>
    </div>
  `;

  updateWorkspaceSummaryStrip({
    today: "Reports unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No report data",
    openActions: "Check API routes",
  });
}

export async function loadReports() {
  if (!els.viewContent) return;

  const endpoints = getReportEndpoints();

  if (!endpoints) {
    renderNoContext();
    return;
  }

  renderLoadingState();

  try {
    const [
      aiReportsData,
      monthlyReviewsData,
      handoversData,
      inspectionPacksData,
      timelineData,
      complianceData,
      tasksData,
      managerActionsData,
      incidentsData,
    ] = await Promise.all([
      apiGet(endpoints.aiReports).catch(() => ({ items: [] })),
      apiGet(endpoints.monthlyReviews).catch(() => ({ items: [] })),
      apiGet(endpoints.handovers).catch(() => ({ items: [] })),
      apiGet(endpoints.inspectionPacks).catch(() => ({ items: [] })),
      apiGet(endpoints.chronology).catch(() => ({ items: [] })),
      apiGet(endpoints.compliance).catch(() => ({ items: [] })),
      apiGet(endpoints.tasks).catch(() => ({ items: [] })),
      apiGet(endpoints.managerActions).catch(() => ({ items: [] })),
      apiGet(endpoints.incidents).catch(() => ({ items: [] })),
    ]);

    const aiReports = sortNewestFirst(
      (
        aiReportsData.items ||
        aiReportsData.records ||
        aiReportsData.ai_generated_reports ||
        aiReportsData.reports ||
        []
      ).map(mapAiReport),
      ["review_month", "created_at", "updated_at"]
    );

    const monthlyReviews = sortNewestFirst(
      (
        monthlyReviewsData.items ||
        monthlyReviewsData.records ||
        monthlyReviewsData.monthly_reviews ||
        []
      ).map(mapMonthlyReview),
      ["review_month", "created_at", "updated_at"]
    );

    const handovers = sortNewestFirst(
      (
        handoversData.items ||
        handoversData.records ||
        handoversData.handover_records ||
        []
      ).map(mapHandoverRecord),
      ["handover_date", "created_at", "updated_at"]
    );

    const inspectionPacks = sortNewestFirst(
      (
        inspectionPacksData.items ||
        inspectionPacksData.records ||
        inspectionPacksData.inspection_pack_jobs ||
        []
      ).map(mapInspectionPackJob),
      ["completed_at", "created_at"]
    );

    const chronology = sortNewestFirst(
      (
        timelineData.timeline ||
        timelineData.items ||
        timelineData.records ||
        timelineData.chronology_events ||
        []
      ).map(mapChronologyEvent),
      ["event_datetime", "created_at"]
    );

    const compliance = sortNewestFirst(
      (
        complianceData.items ||
        complianceData.records ||
        complianceData.compliance_items ||
        []
      ).map(mapComplianceItem),
      ["due_date", "created_at"]
    );

    const tasks = sortNewestFirst(
      (tasksData.items || tasksData.records || tasksData.tasks || []).map(mapTask),
      ["due_date", "created_at"]
    );

    const managerActions = sortNewestFirst(
      (
        managerActionsData.items ||
        managerActionsData.records ||
        managerActionsData.manager_actions ||
        []
      ).map(mapManagerAction),
      ["action_at", "created_at"]
    );

    const incidents = sortNewestFirst(
      (
        incidentsData.items ||
        incidentsData.records ||
        incidentsData.incidents ||
        []
      ).map(mapIncident),
      ["occurred_at", "created_at", "updated_at"]
    );

    els.viewContent.innerHTML = renderReportsHtml({
      aiReports,
      monthlyReviews,
      handovers,
      inspectionPacks,
      chronology,
      compliance,
      tasks,
      managerActions,
      incidents,
    });

    const latestReport =
      aiReports[0] || monthlyReviews[0] || handovers[0] || inspectionPacks[0] || null;

    const openTasks = tasks.filter((item) => !item.completed);
    const overdueCompliance = compliance.filter((item) =>
      ["overdue", "escalated", "due_soon", "missing", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    updateWorkspaceSummaryStrip({
      today: `${aiReports.length + monthlyReviews.length} outputs loaded`,
      nextEvent: inspectionPacks[0]?.completed_at
        ? `Latest pack ${formatDateValue(inspectionPacks[0].completed_at)}`
        : "No inspection pack generated",
      lastRecord: latestReport
        ? `${latestReport.title || latestReport.report_type || "Latest report"} • ${
            formatDateTimeValue(
              latestReport.created_at ||
                latestReport.updated_at ||
                latestReport.completed_at ||
                latestReport.handover_date
            ) || "Recorded"
          }`
        : "No recent report loaded",
      openActions: `${openTasks.length} open • ${overdueCompliance.length} readiness gap${
        overdueCompliance.length === 1 ? "" : "s"
      }`,
    });
  } catch (error) {
    renderErrorState(error?.message || "Failed to load reports.");
  }
}