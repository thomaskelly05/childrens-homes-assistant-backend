import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

/* -------------------------------- helpers -------------------------------- */

const SAFE_EMPTY = Object.freeze({ items: [] });

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toBool(value) {
  return Boolean(value);
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;
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

function formatMonth(value, fallback = "No month") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatScore(value, digits = 1) {
  if (value === null || value === undefined || value === "") return "—";
  return toNumber(value).toFixed(digits);
}

function isOverdue(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function badgeClass(value) {
  const v = lower(value);

  if (
    [
      "critical",
      "high",
      "urgent",
      "overdue",
      "failed",
      "error",
      "inadequate",
      "unread",
      "open",
      "pending",
      "red",
      "stale",
      "missing",
      "draft",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "queued",
      "processing",
      "scheduled",
      "submitted",
      "warning",
      "amber",
      "medium",
      "in_progress",
      "in progress",
      "held",
      "partial",
      "ri",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "good",
      "completed",
      "delivered",
      "sent",
      "approved",
      "generated",
      "success",
      "closed",
      "green",
      "outstanding",
      "published",
      "ready",
      "up_to_date",
      "up to date",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function getHomeId() {
  return (
    state.homeId ||
    state.selectedHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    null
  );
}

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function pickItems(response, keys = []) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], key) {
  return [...items].sort((a, b) => {
    const aTime = a?.[key] ? new Date(a[key]).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b?.[key] ? new Date(b[key]).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

/* -------------------------------- mappers -------------------------------- */

function mapMonthlyReview(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    young_person_id: record.young_person_id || null,
    review_month: record.review_month || null,
    status: record.status || "",
    review_title: record.review_title || "Monthly review",
    summary_of_month: record.summary_of_month || "",
    progress_summary: record.progress_summary || "",
    child_voice_summary: record.child_voice_summary || "",
    concerns_and_risks: record.concerns_and_risks || "",
    education_summary: record.education_summary || "",
    health_summary: record.health_summary || "",
    family_summary: record.family_summary || "",
    keywork_summary: record.keywork_summary || "",
    behaviour_summary: record.behaviour_summary || "",
    achievements_summary: record.achievements_summary || "",
    actions_for_next_month: record.actions_for_next_month || "",
    manager_analysis: record.manager_analysis || "",
    approved_by: record.approved_by || null,
    approved_at: record.approved_at || null,
    title: record.review_title || `Monthly review - ${formatMonth(record.review_month)}`,
    summary:
      record.summary_of_month ||
      record.progress_summary ||
      record.child_voice_summary ||
      "Monthly review recorded.",
    record_type: "monthly_review",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapMonthlyReviewAction(record = {}) {
  return {
    id: record.id,
    monthly_review_id: record.monthly_review_id || null,
    action_text: record.action_text || "Monthly review action",
    action_owner_id: record.action_owner_id || null,
    due_date: record.due_date || null,
    status: record.status || "",
    title: record.action_text || "Monthly review action",
    summary: record.action_text || "Monthly review action recorded.",
    record_type: "monthly_review_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    provider_id: record.provider_id || null,
  };
}

function mapAIReport(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    young_person_id: record.young_person_id || null,
    report_type: record.report_type || "",
    title: record.title || "AI report",
    review_month: record.review_month || null,
    report_text: record.report_text || "",
    status: record.status || "",
    generated_by: record.generated_by || null,
    summary:
      record.report_text?.slice(0, 220) ||
      `${titleCase(record.report_type || "report")} generated.`,
    record_type: "ai_generated_report",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReportDelivery(record = {}) {
  return {
    id: record.id,
    report_snapshot_id: record.report_snapshot_id || null,
    ai_generated_report_id: record.ai_generated_report_id || null,
    report_type: record.report_type || "",
    home_id: record.home_id || null,
    provider_id: record.provider_id || null,
    period_start: record.period_start || null,
    period_end: record.period_end || null,
    email_to: record.email_to || "",
    delivery_status: record.delivery_status || "",
    delivery_error: record.delivery_error || "",
    triggered_by: record.triggered_by || null,
    delivered_at: record.delivered_at || null,
    title: `${titleCase(record.report_type || "Report")} delivery`,
    summary:
      record.delivery_error ||
      (record.email_to ? `Delivery for ${record.email_to}` : "Report delivery logged."),
    record_type: "report_delivery_log",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReportFactSnapshot(record = {}) {
  return {
    id: record.id,
    report_type: record.report_type || "",
    home_id: record.home_id || null,
    provider_id: record.provider_id || null,
    access_level: record.access_level || "",
    allowed_home_ids: toArray(record.allowed_home_ids),
    period_start: record.period_start || null,
    period_end: record.period_end || null,
    snapshot_key: record.snapshot_key || "",
    source_updated_at: record.source_updated_at || null,
    facts_json: record.facts_json || null,
    signals_json: record.signals_json || null,
    metrics_json: record.metrics_json || null,
    status: record.status || "",
    generated_by: record.generated_by || null,
    title: `${titleCase(record.report_type || "Report")} snapshot`,
    summary:
      record.snapshot_key ||
      "Report fact snapshot available.",
    record_type: "report_fact_snapshot",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapAIMeetingNote(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    title: record.title || "AI meeting note",
    service_type: record.service_type || "",
    shift_type: record.shift_type || "",
    young_person_name: record.young_person_name || "",
    record_author: record.record_author || "",
    note_status: record.note_status || "",
    safeguarding_flag: toBool(record.safeguarding_flag),
    safeguarding_reason: record.safeguarding_reason || "",
    final_note: record.final_note || "",
    ai_draft: record.ai_draft || "",
    summary:
      record.final_note?.slice(0, 220) ||
      record.ai_draft?.slice(0, 220) ||
      "Meeting note available.",
    record_type: "ai_meeting_note",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapHandoverRecord(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    young_person_id: record.young_person_id || null,
    handover_date: record.handover_date || null,
    shift_type: record.shift_type || "",
    title: record.title || "Handover",
    summary_text: record.summary_text || "",
    status: record.status || "",
    source_window_start: record.source_window_start || null,
    source_window_end: record.source_window_end || null,
    generated_by: record.generated_by || null,
    approved_by: record.approved_by || null,
    summary: record.summary_text || "Handover generated.",
    record_type: "handover_record",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInspectionPackJob(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    scope_type: record.scope_type || "",
    scope_id: record.scope_id || null,
    pack_type: record.pack_type || "",
    status: record.status || "",
    requested_by: record.requested_by || null,
    generated_file_path: record.generated_file_path || "",
    summary_json: record.summary_json || null,
    completed_at: record.completed_at || null,
    title: `${titleCase(record.pack_type || "Inspection")} pack`,
    summary:
      record.generated_file_path ||
      "Inspection pack job recorded.",
    record_type: "inspection_pack_job",
    created_at: record.created_at || null,
    updated_at: record.completed_at || null,
  };
}

/* -------------------------------- render -------------------------------- */

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderSection(title, content) {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      ${content}
    </section>
  `;
}

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderCard(item = {}) {
  const status =
    item.status ||
    item.delivery_status ||
    item.note_status ||
    "";

  const primaryDate =
    item.review_month ||
    item.period_end ||
    item.delivered_at ||
    item.completed_at ||
    item.created_at ||
    item.updated_at;

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "record")}"
      data-title="${safeText(item.title || "Record")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Record")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(primaryDate, "No date"))}</div>
        </div>
        ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.report_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Report type</div>
                  <div class="details-grid-value">${safeText(titleCase(item.report_type))}</div>
                </div>
              `
              : ""
          }

          ${
            item.period_start || item.period_end
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Period</div>
                  <div class="details-grid-value">
                    ${safeText(formatDate(item.period_start, "—"))} to ${safeText(formatDate(item.period_end, "—"))}
                  </div>
                </div>
              `
              : ""
          }

          ${
            item.email_to
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Delivered to</div>
                  <div class="details-grid-value">${safeText(item.email_to)}</div>
                </div>
              `
              : ""
          }

          ${
            item.snapshot_key
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Snapshot key</div>
                  <div class="details-grid-value">${safeText(item.snapshot_key)}</div>
                </div>
              `
              : ""
          }

          ${
            item.young_person_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Young person</div>
                  <div class="details-grid-value">${safeText(item.young_person_name)}</div>
                </div>
              `
              : ""
          }

          ${
            item.shift_type
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Shift</div>
                  <div class="details-grid-value">${safeText(titleCase(item.shift_type))}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.actions_for_next_month
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Actions for next month</div>
                <div>${safeText(item.actions_for_next_month)}</div>
              </div>
            `
            : ""
        }

        ${
          item.manager_analysis
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Manager analysis</div>
                <div>${safeText(item.manager_analysis)}</div>
              </div>
            `
            : ""
        }

        ${
          item.delivery_error
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Delivery issue</div>
                <div>${safeText(item.delivery_error)}</div>
              </div>
            `
            : ""
        }

        ${
          item.safeguarding_flag
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Safeguarding flag</div>
                <div>${safeText(item.safeguarding_reason || "This note includes safeguarding-related content.")}</div>
              </div>
            `
            : ""
        }

        ${
          item.generated_file_path
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Generated file</div>
                <div>${safeText(item.generated_file_path)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items.map(renderCard).join("")}</div>`;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No report activity yet",
      "There is no recent reporting activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.review_month ||
            item.period_end ||
            item.delivered_at ||
            item.completed_at ||
            item.created_at ||
            item.updated_at;

          const status =
            item.status ||
            item.delivery_status ||
            item.note_status ||
            "";

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
                </div>
                <div class="timeline-item-summary">${safeText(item.summary || "")}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    latestMonthlyReviews,
    outstandingMonthlyReviewActions,
    recentAIReports,
    failedDeliveries,
    recentSnapshots,
    recentMeetingNotes,
    recentHandovers,
    inspectionPackJobs,
    timeline,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Reports and outputs</div>
          <h2>Monthly reviews, AI reports, deliveries and generated packs</h2>
          <p class="overview-panel-subtitle">
            Live reporting workspace across operational reporting, generated outputs, snapshots and delivery status.
          </p>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Monthly reviews", latestMonthlyReviews.length)}
        ${renderStatCard("Open review actions", outstandingMonthlyReviewActions.length)}
        ${renderStatCard("Recent AI reports", recentAIReports.length)}
        ${renderStatCard("Failed deliveries", failedDeliveries.length)}
        ${renderStatCard("Recent snapshots", recentSnapshots.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Latest monthly reviews",
            renderCardList(
              latestMonthlyReviews,
              "No monthly reviews",
              "No monthly reviews were returned for this home."
            )
          )}

          ${renderSection(
            "Open monthly review actions",
            renderCardList(
              outstandingMonthlyReviewActions,
              "No open monthly review actions",
              "There are no outstanding monthly review actions at the moment."
            )
          )}

          ${renderSection(
            "Recent AI generated reports",
            renderCardList(
              recentAIReports,
              "No AI reports",
              "No AI generated reports are available yet."
            )
          )}

          ${renderSection("Reporting timeline", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Failed or held deliveries",
            renderCardList(
              failedDeliveries,
              "No failed deliveries",
              "There are no failed or held report deliveries."
            )
          )}

          ${renderSection(
            "Recent report snapshots",
            renderCardList(
              recentSnapshots,
              "No snapshots yet",
              "No report fact snapshots have been generated yet."
            )
          )}

          ${renderSection(
            "Recent AI meeting notes",
            renderCardList(
              recentMeetingNotes,
              "No AI meeting notes",
              "No AI meeting notes were returned for this home."
            )
          )}

          ${renderSection(
            "Recent handover outputs",
            renderCardList(
              recentHandovers,
              "No handover outputs",
              "No generated handover records were returned."
            )
          )}

          ${renderSection(
            "Inspection pack jobs",
            renderCardList(
              inspectionPackJobs,
              "No inspection pack jobs",
              "No inspection pack jobs are currently recorded."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- fetch -------------------------------- */

async function fetchAll(homeId) {
  const [
    monthlyReviewsRes,
    monthlyReviewActionsRes,
    aiReportsRes,
    reportDeliveryRes,
    reportFactSnapshotsRes,
    aiMeetingNotesRes,
    handoverRecordsRes,
    inspectionPackJobsRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/monthly-reviews`),
    safeGet(`/homes/${homeId}/monthly-review-actions`),
    safeGet(`/homes/${homeId}/ai-generated-reports`),
    safeGet(`/homes/${homeId}/report-delivery-log`),
    safeGet(`/homes/${homeId}/report-fact-snapshots`),
    safeGet(`/homes/${homeId}/ai-meeting-notes`),
    safeGet(`/homes/${homeId}/handover-records`),
    safeGet(`/homes/${homeId}/inspection-pack-jobs`),
  ]);

  return {
    monthlyReviews: pickItems(monthlyReviewsRes, ["monthly_reviews", "items"]).map(
      mapMonthlyReview
    ),
    monthlyReviewActions: pickItems(
      monthlyReviewActionsRes,
      ["monthly_review_actions", "items"]
    ).map(mapMonthlyReviewAction),
    aiReports: pickItems(aiReportsRes, ["ai_generated_reports", "items"]).map(
      mapAIReport
    ),
    reportDeliveryLog: pickItems(
      reportDeliveryRes,
      ["report_delivery_log", "items"]
    ).map(mapReportDelivery),
    reportFactSnapshots: pickItems(
      reportFactSnapshotsRes,
      ["report_fact_snapshots", "items"]
    ).map(mapReportFactSnapshot),
    aiMeetingNotes: pickItems(
      aiMeetingNotesRes,
      ["ai_meeting_notes", "items"]
    ).map(mapAIMeetingNote),
    handoverRecords: pickItems(
      handoverRecordsRes,
      ["handover_records", "items"]
    ).map(mapHandoverRecord),
    inspectionPackJobs: pickItems(
      inspectionPackJobsRes,
      ["inspection_pack_jobs", "items"]
    ).map(mapInspectionPackJob),
  };
}

/* ------------------------------- selectors ------------------------------- */

function buildLatestMonthlyReviews(data) {
  return sortNewest(data.monthlyReviews, ["review_month", "created_at", "updated_at"]).slice(0, 10);
}

function buildOutstandingMonthlyReviewActions(data) {
  return sortSoonest(
    data.monthlyReviewActions.filter((item) => {
      const status = lower(item.status);
      return !["completed", "closed", "cancelled"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildRecentAIReports(data) {
  return sortNewest(data.aiReports, ["review_month", "created_at", "updated_at"]).slice(0, 10);
}

function buildFailedDeliveries(data) {
  return sortNewest(
    data.reportDeliveryLog.filter((item) => {
      const status = lower(item.delivery_status);
      return ["failed", "error", "held", "pending"].includes(status) || item.delivery_error;
    }),
    ["delivered_at", "created_at"]
  ).slice(0, 10);
}

function buildRecentSnapshots(data) {
  return sortNewest(
    data.reportFactSnapshots,
    ["source_updated_at", "created_at", "updated_at"]
  ).slice(0, 10);
}

function buildRecentMeetingNotes(data) {
  return sortNewest(data.aiMeetingNotes, ["updated_at", "created_at"]).slice(0, 8);
}

function buildRecentHandovers(data) {
  return sortNewest(
    data.handoverRecords,
    ["handover_date", "created_at", "updated_at"]
  ).slice(0, 8);
}

function buildInspectionPackJobs(data) {
  return sortNewest(data.inspectionPackJobs, ["completed_at", "created_at"]).slice(0, 8);
}

function buildTimeline(data) {
  return sortNewest(
    [
      ...data.monthlyReviews,
      ...data.monthlyReviewActions,
      ...data.aiReports,
      ...data.reportDeliveryLog,
      ...data.reportFactSnapshots,
      ...data.aiMeetingNotes,
      ...data.handoverRecords,
      ...data.inspectionPackJobs,
    ],
    [
      "review_month",
      "period_end",
      "delivered_at",
      "completed_at",
      "source_updated_at",
      "handover_date",
      "created_at",
      "updated_at",
    ]
  ).slice(0, 25);
}

/* -------------------------------- public -------------------------------- */

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = renderEmpty(
      "No home selected",
      "Select a home to view reporting, outputs and generated packs."
    );
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const data = await fetchAll(homeId);

    const latestMonthlyReviews = buildLatestMonthlyReviews(data);
    const outstandingMonthlyReviewActions = buildOutstandingMonthlyReviewActions(data);
    const recentAIReports = buildRecentAIReports(data);
    const failedDeliveries = buildFailedDeliveries(data);
    const recentSnapshots = buildRecentSnapshots(data);
    const recentMeetingNotes = buildRecentMeetingNotes(data);
    const recentHandovers = buildRecentHandovers(data);
    const inspectionPackJobs = buildInspectionPackJobs(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      latestMonthlyReviews,
      outstandingMonthlyReviewActions,
      recentAIReports,
      failedDeliveries,
      recentSnapshots,
      recentMeetingNotes,
      recentHandovers,
      inspectionPackJobs,
      timeline,
    });

    const mostRecentMonthlyReview = latestMonthlyReviews[0] || null;
    const nextOpenAction = outstandingMonthlyReviewActions[0] || null;
    const latestOutput =
      recentAIReports[0] ||
      recentSnapshots[0] ||
      recentMeetingNotes[0] ||
      recentHandovers[0] ||
      null;

    updateWorkspaceSummaryStrip({
      today: mostRecentMonthlyReview
        ? `${safeText(formatMonth(mostRecentMonthlyReview.review_month))} review`
        : `${recentAIReports.length} AI reports`,
      nextEvent: nextOpenAction?.due_date
        ? formatDate(nextOpenAction.due_date)
        : "No review action due",
      lastRecord: latestOutput
        ? formatDate(
            latestOutput.review_month ||
              latestOutput.source_updated_at ||
              latestOutput.created_at
          )
        : "None",
      openActions: `${outstandingMonthlyReviewActions.length} reporting actions open`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error(error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load reports",
      "Something went wrong while loading reports and generated outputs."
    );
  }
}