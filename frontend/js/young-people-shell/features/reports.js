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
} from "../core/adapters.js";

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
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function buildEvidenceOverview({
  aiReports = [],
  monthlyReviews = [],
  handovers = [],
  inspectionPacks = [],
  chronology = [],
  compliance = [],
  tasks = [],
}) {
  const safeguardingLinked = chronology.filter((item) => item.safeguarding_flag).length;
  const overdueReadiness = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  ).length;
  const openTasks = tasks.filter((item) => !item.completed).length;

  return {
    aiReports: aiReports.length,
    monthlyReviews: monthlyReviews.length,
    safeguardingLinked,
    overdueReadiness,
    openTasks,
    inspectionPacks: inspectionPacks.length,
  };
}

function buildReadinessEvidenceRows({
  compliance = [],
  tasks = [],
  chronology = [],
}) {
  const overdue = compliance.filter((item) =>
    ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
  );

  const taskRows = tasks.filter((item) => !item.completed);

  const chronologyRows = chronology
    .filter((item) => {
      const significance = String(item.significance || "").toLowerCase();
      const severity = String(item.severity || "").toLowerCase();
      return (
        ["high", "critical"].includes(significance) ||
        ["high", "critical"].includes(severity) ||
        item.safeguarding_flag
      );
    })
    .slice(0, 6);

  return [...overdue, ...taskRows, ...chronologyRows].slice(0, 12);
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
      "Record",
    summary:
      item.summary ||
      item.description ||
      item.outcome ||
      item.notes ||
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
    ["overdue", "escalated", "critical", "returned"].includes(status) ||
    ["high", "critical"].includes(severity) ||
    ["high", "critical"].includes(significance)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["completed", "approved", "active", "submitted"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: status ? status.replaceAll("_", " ") : "Recorded", tone: "muted" };
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
                ${item.summary ? `<div class="record-row-summary">${toText(item.summary)}</div>` : ""}
                ${getRowDate(item) ? `<div class="record-row-meta">${toText(formatDateValue(getRowDate(item)))}</div>` : ""}
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
}) {
  const overview = buildEvidenceOverview({
    aiReports,
    monthlyReviews,
    handovers,
    inspectionPacks,
    chronology,
    compliance,
    tasks,
  });

  const evidenceRows = buildReadinessEvidenceRows({
    compliance,
    tasks,
    chronology,
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
  const inspectionPackRows = normaliseReportRows(inspectionPacks, "inspection_pack");
  const evidenceLinkedRows = normaliseReportRows(evidenceRows, "linked_evidence");
  const chronologyRows = normaliseReportRows(chronology.slice(0, 8), "chronology_event");

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Reports</div>
          <h2>Reports and review packs</h2>
          <p>Generated outputs, formal reviews and linked evidence that support oversight and inspection readiness.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">AI reports</span>
              <strong class="overview-stat-value">${toText(aiReports.length)}</strong>
              <span class="overview-stat-note">Generated summaries and narrative outputs</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Monthly reviews</span>
              <strong class="overview-stat-value">${toText(monthlyReviews.length)}</strong>
              <span class="overview-stat-note">Structured monthly review records</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Handovers</span>
              <strong class="overview-stat-value">${toText(handovers.length)}</strong>
              <span class="overview-stat-note">Shift continuity records</span>
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
              <p>The quickest picture of reporting outputs, safeguarding-linked evidence and readiness gaps.</p>
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
                  <div class="record-row-summary">Structured monthly review records.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(overview.monthlyReviews)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Safeguarding-linked evidence</div>
                  <div class="record-row-summary">Chronology items with safeguarding flags.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.safeguardingLinked > 0 ? "warning" : "muted"}">${toText(overview.safeguardingLinked)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Readiness gaps</div>
                  <div class="record-row-summary">Overdue or escalated items affecting readiness.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.overdueReadiness > 0 ? "warning" : "muted"}">${toText(overview.overdueReadiness)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Open follow-up tasks</div>
                  <div class="record-row-summary">Actions still needing completion.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${overview.openTasks > 0 ? "warning" : "muted"}">${toText(overview.openTasks)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Inspection packs</div>
                  <div class="record-row-summary">Generated inspection or evidence outputs.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(overview.inspectionPacks)}</span>
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
              <p>Narrative outputs generated for this young person.</p>
            </div>

            ${renderRecordRows(aiReportRows, "No AI generated reports found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Monthly reviews</h3>
              <p>Structured monthly summaries, progress, concerns and next steps.</p>
            </div>

            ${renderRecordRows(monthlyReviewRows, "No monthly reviews found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Handover records</h3>
              <p>Shift summaries and continuity records that support day-to-day care.</p>
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
              <p>Overdue readiness, open follow-up tasks and significant chronology that should influence reports and reviews.</p>
            </div>

            ${renderRecordRows(evidenceLinkedRows, "No evidence gaps or urgent linked items found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent chronology for reporting</h3>
              <p>Recent chronology items that may need to be reflected in reports, reviews or handovers.</p>
            </div>

            ${renderRecordRows(chronologyRows, "No chronology items found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadReports() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading reports...</p>
      </div>
    </div>
  `;

  try {
    const [
      aiReportsData,
      monthlyReviewsData,
      handoversData,
      inspectionPacksData,
      timelineData,
      complianceData,
      tasksData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/monthly-reviews`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/handover-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/inspection-packs`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/timeline`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/tasks`).catch(() => ({ items: [] })),
    ]);

    const aiReports = sortNewestFirst(
      (
        aiReportsData.items ||
        aiReportsData.records ||
        aiReportsData.ai_generated_reports ||
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
      (
        tasksData.items ||
        tasksData.records ||
        tasksData.tasks ||
        []
      ).map(mapTask),
      ["due_date", "created_at"]
    );

    els.viewContent.innerHTML = renderReportsHtml({
      aiReports,
      monthlyReviews,
      handovers,
      inspectionPacks,
      chronology,
      compliance,
      tasks,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load reports.")}</p>
      </div>
    `;
  }
}
