import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  normaliseRecords,
  sortNormalisedRecordsNewestFirst,
} from "../core/record-normaliser.js";
import { openRecordDetail } from "../ui/records.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentRole() {
  return String(state.userRole || "staff").trim().toLowerCase();
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.currentYoungPersonId ||
    state.selectedYoungPerson?.id ||
    state.selectedYoungPerson?.young_person_id ||
    state.youngPerson?.id ||
    null
  );
}

function getHomeId() {
  return (
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.selectedHomeId ||
    state.currentHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    state.youngPerson?.home_id ||
    null
  );
}

function getScopeTitle() {
  if (getCurrentScope() === "child") {
    const person = state.selectedYoungPerson || state.youngPerson || {};
    return (
      person.full_name ||
      person.name ||
      [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
      person.preferred_name ||
      "Young person"
    );
  }

  return (
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (getHomeId() ? `Home ${getHomeId()}` : "Home")
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

function normaliseToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getStatusTone(status = "") {
  const token = normaliseToken(status);

  if (
    [
      "overdue",
      "failed",
      "returned",
      "rejected",
      "critical",
      "high",
      "inadequate",
      "escalated",
    ].includes(token)
  ) {
    return "danger";
  }

  if (
    [
      "draft",
      "submitted",
      "pending_review",
      "in_progress",
      "requires_improvement",
      "open",
      "warning",
      "medium",
    ].includes(token)
  ) {
    return "warning";
  }

  if (
    [
      "completed",
      "complete",
      "approved",
      "published",
      "closed",
      "resolved",
      "good",
      "outstanding",
      "ready",
    ].includes(token)
  ) {
    return "success";
  }

  return "muted";
}

async function safeGet(path) {
  if (!path) return { __error: false, items: [] };

  try {
    return (await apiGet(path, { skipCache: true })) || {};
  } catch {
    return { __error: true, items: [] };
  }
}

function sortNewest(items = []) {
  return sortNormalisedRecordsNewestFirst(normaliseRecords(items));
}

function renderEmptyState(message = "No reports found.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">▣</div>
        <h3>No reports found</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStats(stats = []) {
  return `
    <div class="overview-stats-grid">
      ${stats
        .map((stat) => {
          const toneClass =
            stat.tone && ["warning", "danger", "success"].includes(stat.tone)
              ? `overview-stat-card--${stat.tone}`
              : "";

          return `
            <article class="overview-stat-card ${toneClass}">
              <span class="overview-stat-label">${safeText(stat.label)}</span>
              <strong class="overview-stat-value">${safeText(stat.value)}</strong>
              <span class="overview-stat-note">${safeText(stat.note || "")}</span>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSection(title = "", subtitle = "", body = "") {
  return `
    <section class="overview-section-card">
      <div class="overview-section-head">
        <h3>${safeText(title)}</h3>
        <p>${safeText(subtitle)}</p>
      </div>
      ${body}
    </section>
  `;
}

function renderReportRows(items = [], emptyMessage = "No reports found.", limit = 10) {
  const rows = normaliseRecords(items);

  if (!rows.length) return renderEmptyState(emptyMessage);

  return `
    <div class="record-list">
      ${rows
        .slice(0, limit)
        .map((item) => {
          const id = item.id ?? item.record_id ?? item.source_id ?? "";
          const type = item.type || item.record_type || "report";
          const status = item.status || "recorded";
          const tone = getStatusTone(status);
          const date =
            item.date ||
            item.generated_at ||
            item.created_at ||
            item.updated_at ||
            item.review_date ||
            item.review_month ||
            "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(id)}"
              data-record-type="${safeText(type)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(item.title || item.label || "Report")}</div>
                <div class="record-row-summary">${safeText(item.summary || "No summary available.")}</div>
                <div class="record-row-meta">
                  <span class="row-pill muted">${safeText(String(type).replaceAll("_", " "))}</span>
                  ${date ? `<span>${safeText(formatDate(date))}</span>` : ""}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(status)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function normaliseReportRows(data = {}, fallbackType = "report") {
  return normaliseRecords(
    toArray(data.items, [
      data.reports,
      data.records,
      data.ai_generated_reports,
      data.monthly_reviews,
      data.inspection_reports,
      data.review_outputs,
      data.outputs,
    ]).map((item) => {
      const type = item.record_type || item.type || fallbackType;
      const date =
        item.generated_at ||
        item.created_at ||
        item.updated_at ||
        item.review_date ||
        item.review_month ||
        item.period_end ||
        null;

      return {
        ...item,
        id: item.id ?? item.report_id ?? item.review_id ?? item.source_id ?? null,
        record_id:
          item.record_id ??
          item.id ??
          item.report_id ??
          item.review_id ??
          item.source_id ??
          null,
        type,
        record_type: type,
        title:
          item.title ||
          item.report_title ||
          item.report_type ||
          item.review_title ||
          item.name ||
          "Report",
        summary:
          item.summary ||
          item.description ||
          item.report_text ||
          item.generated_text ||
          item.notes ||
          "Report output available.",
        status: item.status || item.workflow_status || item.approval_status || "completed",
        date,
        generated_at: item.generated_at || null,
        created_at: item.created_at || null,
        updated_at: item.updated_at || null,
        raw: item,
      };
    })
  );
}

function buildScopeBanner(title, subtitle, isDemo = false) {
  return `
    <div class="scope-lens-banner">
      <div class="scope-lens-banner-main">
        <div class="eyebrow">Reports</div>
        <h2>${safeText(title)}</h2>
        <p>${safeText(subtitle)}</p>
        ${isDemo ? `<p class="scope-lens-note">Showing fallback preview data.</p>` : ""}
      </div>
      <div class="scope-lens-badges">
        <span class="scope-lens-badge">${safeText(getCurrentScope())} lens</span>
        <span class="scope-lens-badge">Role: ${safeText(getCurrentRole())}</span>
      </div>
    </div>
  `;
}

function renderReportsPage(model = {}, isDemo = false) {
  return `
    <section class="overview-panel">
      ${buildScopeBanner(model.title, model.subtitle, isDemo)}
      ${renderStats(model.stats || [])}

      <div class="overview-grid">
        <section class="overview-main">
          ${(model.mainSections || [])
            .map((section) =>
              renderSection(section.title, section.subtitle, section.body)
            )
            .join("")}
        </section>

        <aside class="overview-side">
          ${(model.sideSections || [])
            .map((section) =>
              renderSection(section.title, section.subtitle, section.body)
            )
            .join("")}
        </aside>
      </div>
    </section>
  `;
}

async function fetchChildReports(youngPersonId) {
  const [reportsRes, monthlyReviewsRes, documentsRes, tasksRes] =
    await Promise.all([
      safeGet(`/young-people/${youngPersonId}/reports`),
      safeGet(`/young-people/${youngPersonId}/monthly-reviews`),
      safeGet(`/young-people/${youngPersonId}/documents`),
      safeGet(`/young-people/${youngPersonId}/tasks`),
    ]);

  return {
    reports: normaliseReportRows(reportsRes, "report"),
    reviews: normaliseReportRows(monthlyReviewsRes, "monthly_review"),
    documents: normaliseReportRows(documentsRes, "document"),
    tasks: normaliseReportRows(tasksRes, "task"),
  };
}

async function fetchHomeReports(homeId) {
  const [reportsRes, qualityRes, inspectionRes, documentsRes, tasksRes] =
    await Promise.all([
      safeGet(`/homes/${homeId}/reports`),
      safeGet(`/homes/${homeId}/quality-audits`),
      safeGet(`/homes/${homeId}/inspection-scores`),
      safeGet(`/homes/${homeId}/documents`),
      safeGet(`/homes/${homeId}/tasks`),
    ]);

  return {
    reports: normaliseReportRows(reportsRes, "report"),
    quality: normaliseReportRows(qualityRes, "quality_audit"),
    inspection: normaliseReportRows(inspectionRes, "inspection_score"),
    documents: normaliseReportRows(documentsRes, "document"),
    tasks: normaliseReportRows(tasksRes, "task"),
  };
}

async function fetchQualityReports(homeId) {
  const [
    reportsRes,
    auditsRes,
    findingsRes,
    actionsRes,
    inspectionRes,
    documentsRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/reports`),
    safeGet(`/homes/${homeId}/quality-audits`),
    safeGet(`/homes/${homeId}/quality-audit-findings`),
    safeGet(`/homes/${homeId}/quality-audit-actions`),
    safeGet(`/homes/${homeId}/inspection-scores`),
    safeGet(`/homes/${homeId}/documents`),
  ]);

  return {
    reports: normaliseReportRows(reportsRes, "report"),
    audits: normaliseReportRows(auditsRes, "quality_audit"),
    findings: normaliseReportRows(findingsRes, "quality_finding"),
    actions: normaliseReportRows(actionsRes, "quality_action"),
    inspection: normaliseReportRows(inspectionRes, "inspection_score"),
    documents: normaliseReportRows(documentsRes, "document"),
  };
}

async function fetchOfstedReports(homeId) {
  const [
    reportsRes,
    inspectionRes,
    sectionsRes,
    reasonsRes,
    actionsRes,
    briefingRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/reports`),
    safeGet(`/homes/${homeId}/inspection-scores`),
    safeGet(`/homes/${homeId}/inspection-section-scores`),
    safeGet(`/homes/${homeId}/inspection-score-reasons`),
    safeGet(`/homes/${homeId}/inspection-improvement-actions`),
    safeGet(`/homes/${homeId}/inspection-briefing`),
  ]);

  return {
    reports: normaliseReportRows(reportsRes, "report"),
    inspection: normaliseReportRows(inspectionRes, "inspection_score"),
    sections: normaliseReportRows(sectionsRes, "inspection_section_score"),
    reasons: normaliseReportRows(reasonsRes, "inspection_reason"),
    actions: normaliseReportRows(actionsRes, "inspection_action"),
    briefing: normaliseReportRows(briefingRes, "inspection_briefing"),
  };
}

function buildChildModel(data = {}) {
  const reports = sortNewest(data.reports || []);
  const reviews = sortNewest(data.reviews || []);
  const documents = sortNewest(data.documents || []);
  const tasks = sortNewest(data.tasks || []);

  const inProgress = [...reports, ...reviews].filter((item) =>
    ["draft", "submitted", "pending_review", "in_progress"].includes(
      normaliseToken(item.status)
    )
  );

  return {
    title: getScopeTitle(),
    subtitle:
      "Child-level reports, monthly reviews, summaries and outputs linked to this young person.",
    stats: [
      { label: "Reports", value: reports.length, note: "Generated and saved reports" },
      { label: "Reviews", value: reviews.length, note: "Monthly and review outputs" },
      {
        label: "In progress",
        value: inProgress.length,
        note: "Draft or pending reports",
        tone: inProgress.length ? "warning" : "success",
      },
      { label: "Linked documents", value: documents.length, note: "Evidence and attachments" },
    ],
    mainSections: [
      {
        title: "Latest child reports",
        subtitle: "Generated or saved reports for this young person.",
        body: renderReportRows(reports, "No child reports found.", 10),
      },
      {
        title: "Monthly reviews and outputs",
        subtitle: "Review outputs, monthly summaries and progress reports.",
        body: renderReportRows(reviews, "No monthly review outputs found.", 10),
      },
    ],
    sideSections: [
      {
        title: "Drafts and pending reports",
        subtitle: "Reports needing review or completion.",
        body: renderReportRows(inProgress, "No reports currently in progress.", 6),
      },
      {
        title: "Linked evidence",
        subtitle: "Documents and tasks that may support report completion.",
        body: renderReportRows([...documents, ...tasks], "No linked evidence found.", 8),
      },
    ],
    summaryStrip: {
      today: `${reports.length} reports • ${reviews.length} reviews`,
      nextEvent: inProgress[0]?.title || "No report awaiting review",
      lastRecord: reports[0]?.title || reviews[0]?.title || "No recent report",
      openActions: `${inProgress.length} report item${inProgress.length === 1 ? "" : "s"} in progress`,
    },
  };
}

function buildHomeModel(data = {}) {
  const reports = sortNewest(data.reports || []);
  const quality = sortNewest(data.quality || []);
  const inspection = sortNewest(data.inspection || []);
  const documents = sortNewest(data.documents || []);
  const tasks = sortNewest(data.tasks || []);

  const activeTasks = tasks.filter(
    (item) => !["completed", "closed", "resolved"].includes(normaliseToken(item.status))
  );

  return {
    title: getScopeTitle(),
    subtitle:
      "Home-level reporting view across operational outputs, quality summaries and inspection readiness.",
    stats: [
      { label: "Home reports", value: reports.length, note: "Home-level outputs" },
      { label: "Quality outputs", value: quality.length, note: "Audit and QA records" },
      { label: "Inspection records", value: inspection.length, note: "Readiness scoring outputs" },
      {
        label: "Open follow-up",
        value: activeTasks.length,
        note: "Tasks linked to reports and oversight",
        tone: activeTasks.length ? "warning" : "success",
      },
    ],
    mainSections: [
      {
        title: "Latest home reports",
        subtitle: "Operational, management and generated home reports.",
        body: renderReportRows(reports, "No home reports found.", 10),
      },
      {
        title: "Quality and inspection reports",
        subtitle: "Quality and inspection-readiness outputs for this home.",
        body: renderReportRows([...quality, ...inspection], "No quality or inspection reports found.", 10),
      },
    ],
    sideSections: [
      {
        title: "Report follow-up",
        subtitle: "Open tasks and actions linked to management oversight.",
        body: renderReportRows(activeTasks, "No open report follow-up found.", 8),
      },
      {
        title: "Supporting documents",
        subtitle: "Documents that may support report preparation.",
        body: renderReportRows(documents, "No supporting documents found.", 8),
      },
    ],
    summaryStrip: {
      today: `${reports.length} home report${reports.length === 1 ? "" : "s"}`,
      nextEvent: activeTasks[0]?.title || "No report action due",
      lastRecord: reports[0]?.title || quality[0]?.title || "No recent report",
      openActions: `${activeTasks.length} open follow-up`,
    },
  };
}

function buildQualityModel(data = {}) {
  const reports = sortNewest(data.reports || []);
  const audits = sortNewest(data.audits || []);
  const findings = sortNewest(data.findings || []);
  const actions = sortNewest(data.actions || []);
  const inspection = sortNewest(data.inspection || []);
  const documents = sortNewest(data.documents || []);

  const openActions = actions.filter(
    (item) => !["completed", "closed", "resolved"].includes(normaliseToken(item.status))
  );

  const concernFindings = findings.filter((item) =>
    ["high", "critical", "warning", "concern"].includes(normaliseToken(item.status))
  );

  return {
    title: getScopeTitle(),
    subtitle:
      "Quality reporting view for RI oversight, audit trail, improvement actions and evidence outputs.",
    stats: [
      { label: "Quality reports", value: reports.length, note: "Generated governance outputs" },
      { label: "Audits", value: audits.length, note: "Quality audit records" },
      {
        label: "Concern findings",
        value: concernFindings.length,
        note: "Findings needing oversight",
        tone: concernFindings.length ? "warning" : "success",
      },
      {
        label: "Open actions",
        value: openActions.length,
        note: "Quality actions still live",
        tone: openActions.length ? "warning" : "success",
      },
    ],
    mainSections: [
      {
        title: "Quality reports and governance outputs",
        subtitle: "Reports and evidence outputs relevant to RI and quality assurance.",
        body: renderReportRows([...reports, ...audits], "No quality reports found.", 10),
      },
      {
        title: "Findings and readiness outputs",
        subtitle: "Findings, inspection outputs and evidence themes.",
        body: renderReportRows([...findings, ...inspection], "No findings or readiness outputs found.", 10),
      },
    ],
    sideSections: [
      {
        title: "Open improvement actions",
        subtitle: "Quality actions still needing completion or sign-off.",
        body: renderReportRows(openActions, "No open quality actions found.", 8),
      },
      {
        title: "Supporting evidence",
        subtitle: "Documents supporting the quality reporting picture.",
        body: renderReportRows(documents, "No supporting evidence documents found.", 8),
      },
    ],
    summaryStrip: {
      today: `${reports.length} reports • ${audits.length} audits`,
      nextEvent: openActions[0]?.title || "No immediate quality report action",
      lastRecord: reports[0]?.title || audits[0]?.title || "No recent quality report",
      openActions: `${openActions.length} quality action${openActions.length === 1 ? "" : "s"} open`,
    },
  };
}

function buildOfstedModel(data = {}) {
  const reports = sortNewest(data.reports || []);
  const inspection = sortNewest(data.inspection || []);
  const sections = sortNewest(data.sections || []);
  const reasons = sortNewest(data.reasons || []);
  const actions = sortNewest(data.actions || []);
  const briefing = sortNewest(data.briefing || []);

  const openActions = actions.filter(
    (item) => !["completed", "closed", "resolved"].includes(normaliseToken(item.status))
  );

  const concernReasons = reasons.filter((item) =>
    ["concern", "risk", "gap", "weakness", "warning"].includes(
      normaliseToken(item.status || item.reason_type)
    )
  );

  return {
    title: getScopeTitle(),
    subtitle:
      "Inspection-facing reports, readiness outputs, section evidence and preparation briefings.",
    stats: [
      { label: "Inspection outputs", value: reports.length + briefing.length, note: "Reports and briefings" },
      { label: "Readiness scores", value: inspection.length, note: "Inspection score records" },
      { label: "Section evidence", value: sections.length, note: "Judgement area evidence" },
      {
        label: "Evidence gaps",
        value: concernReasons.length,
        note: "Concern or gap reasons",
        tone: concernReasons.length ? "warning" : "success",
      },
    ],
    mainSections: [
      {
        title: "Inspection reports and briefings",
        subtitle: "Outputs that support Ofsted preparation and leadership briefing.",
        body: renderReportRows([...briefing, ...reports], "No inspection reports found.", 10),
      },
      {
        title: "Readiness and section evidence",
        subtitle: "Inspection scoring and section-level readiness records.",
        body: renderReportRows([...inspection, ...sections], "No readiness section evidence found.", 10),
      },
    ],
    sideSections: [
      {
        title: "Evidence gaps and reasons",
        subtitle: "Reasons that may weaken inspection confidence.",
        body: renderReportRows(concernReasons, "No evidence gaps found.", 8),
      },
      {
        title: "Inspection action tracker",
        subtitle: "Open actions linked to readiness and evidence improvement.",
        body: renderReportRows(openActions, "No open inspection actions found.", 8),
      },
    ],
    summaryStrip: {
      today: `${reports.length + briefing.length} inspection output${reports.length + briefing.length === 1 ? "" : "s"}`,
      nextEvent: openActions[0]?.title || "No immediate inspection report action",
      lastRecord: reports[0]?.title || briefing[0]?.title || "No recent inspection report",
      openActions: `${openActions.length} inspection action${openActions.length === 1 ? "" : "s"} open`,
    },
  };
}

async function fetchPayloadForScope(scope, youngPersonId, homeId) {
  if (scope === "child") return fetchChildReports(youngPersonId);
  if (scope === "home") return fetchHomeReports(homeId);
  if (scope === "quality") return fetchQualityReports(homeId);
  return fetchOfstedReports(homeId);
}

function buildModelForScope(scope, payload) {
  if (scope === "child") return buildChildModel(payload);
  if (scope === "home") return buildHomeModel(payload);
  if (scope === "quality") return buildQualityModel(payload);
  return buildOfstedModel(payload);
}

function getPayloadRecords(payload = {}) {
  return [
    ...toArray(payload.reports),
    ...toArray(payload.reviews),
    ...toArray(payload.documents),
    ...toArray(payload.tasks),
    ...toArray(payload.quality),
    ...toArray(payload.inspection),
    ...toArray(payload.audits),
    ...toArray(payload.findings),
    ...toArray(payload.actions),
    ...toArray(payload.sections),
    ...toArray(payload.reasons),
    ...toArray(payload.briefing),
  ];
}

function bindReportRowEvents(records = []) {
  if (!els.viewContent) return;

  const normalised = normaliseRecords(records);
  const byKey = new Map();

  normalised.forEach((record) => {
    byKey.set(`${record.type || record.record_type}:${record.id}`, record);
  });

  els.viewContent.querySelectorAll("[data-open-record='true']").forEach((row) => {
    const open = () => {
      const type = row.getAttribute("data-record-type") || "";
      const id = row.getAttribute("data-record-id") || "";
      const record = byKey.get(`${type}:${id}`);

      if (record) openRecordDetail(record);
    };

    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function renderNoContext(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message)}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No report context",
    nextEvent: "No report due",
    lastRecord: "No reports loaded",
    openActions: "No actions loaded",
  });
}

function renderLoading() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading reports…</p>
        </div>
      </div>
    </section>
  `;
}

function getFallbackPayload(scope) {
  if (scope === "child") {
    return {
      reports: normaliseRecords([
        {
          id: "demo-child-report-1",
          type: "report",
          record_type: "report",
          title: "Child journey summary",
          summary: "Preview report showing child progress, key risks and next steps.",
          status: "completed",
          date: "2026-04-15T10:00:00Z",
        },
      ]),
      reviews: [],
      documents: [],
      tasks: [],
    };
  }

  if (scope === "quality") {
    return {
      reports: normaliseRecords([
        {
          id: "demo-quality-report-1",
          type: "report",
          record_type: "report",
          title: "Quality assurance summary",
          summary: "Preview quality report showing strengths, risks and improvement actions.",
          status: "completed",
          date: "2026-04-15T10:00:00Z",
        },
      ]),
      audits: [],
      findings: [],
      actions: [],
      inspection: [],
      documents: [],
    };
  }

  if (scope === "ofsted") {
    return {
      reports: normaliseRecords([
        {
          id: "demo-ofsted-report-1",
          type: "report",
          record_type: "report",
          title: "Inspection preparation report",
          summary: "Preview Ofsted readiness report showing evidence gaps and preparation actions.",
          status: "completed",
          date: "2026-04-15T10:00:00Z",
        },
      ]),
      inspection: [],
      sections: [],
      reasons: [],
      actions: [],
      briefing: [],
    };
  }

  return {
    reports: normaliseRecords([
      {
        id: "demo-home-report-1",
        type: "report",
        record_type: "report",
        title: "Home management overview",
        summary: "Preview home report showing operations, incidents, staffing and open actions.",
        status: "completed",
        date: "2026-04-15T10:00:00Z",
      },
    ]),
    quality: [],
    inspection: [],
    documents: [],
    tasks: [],
  };
}

export async function loadReports() {
  if (!els.viewContent) return;

  const scope = getCurrentScope();
  const youngPersonId = getYoungPersonId();
  const homeId = getHomeId();

  if (scope === "child" && !youngPersonId) {
    renderNoContext("Select a young person before opening reports.");
    return;
  }

  if (scope !== "child" && !homeId) {
    renderNoContext("Select a home before opening reports.");
    return;
  }

  renderLoading();

  try {
    const payload = await fetchPayloadForScope(scope, youngPersonId, homeId);
    const model = buildModelForScope(scope, payload);

    els.viewContent.innerHTML = renderReportsPage(model, false);
    bindReportRowEvents(getPayloadRecords(payload));
    updateWorkspaceSummaryStrip(model.summaryStrip);
  } catch {
    const fallbackPayload = getFallbackPayload(scope);
    const model = buildModelForScope(scope, fallbackPayload);

    els.viewContent.innerHTML = renderReportsPage(model, true);
    bindReportRowEvents(getPayloadRecords(fallbackPayload));
    updateWorkspaceSummaryStrip({
      ...model.summaryStrip,
      lastRecord: "Using fallback preview data",
    });
  }
}

export const loadCurrentView = loadReports;