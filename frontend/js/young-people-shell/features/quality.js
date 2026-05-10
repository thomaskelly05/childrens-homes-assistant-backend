import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import {
  normaliseRecords,
  sortNormalisedRecordsNewestFirst,
} from "../core/record-normaliser.js";
import { openRecordDetail } from "../ui/records.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";
import { buildInspectionUiEndpoints } from "../core/config.js";

const SAFE_EMPTY = Object.freeze({ items: [] });

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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
    .replaceAll("-", " ")
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

function isOverdue(value) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return date.getTime() < now.getTime();
}

function getHomeId() {
  const toSafeHomeId = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const preferredHomeId = toSafeHomeId(
    state.readinessSelectedHomeId ||
      state.homeId ||
      state.selectedHomeId ||
      state.currentHomeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      state.selectedYoungPerson?.home_id ||
      null
  );

  const allowedHomeIds = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (allowedHomeIds.length) {
    if (preferredHomeId && allowedHomeIds.includes(preferredHomeId)) {
      return preferredHomeId;
    }

    return allowedHomeIds[0];
  }

  return preferredHomeId;
}

function isProviderLevelQualityUser() {
  const role = String(state.userRole || "").toLowerCase();

  return [
    "admin",
    "ri",
    "responsible_individual",
    "super_admin",
    "superadmin",
  ].includes(role);
}

function hasProviderContext() {
  const providerId = Number(
    state.providerId ||
      state.currentUser?.provider_id ||
      state.currentUser?.providerId ||
      null
  );

  return Number.isFinite(providerId) && providerId > 0;
}

function qualityVisibilityPath(homeId) {
  if (homeId) {
    return `/visibility/quality?home_id=${encodeURIComponent(
      homeId
    )}&all_accessible_homes=false`;
  }

  return "/visibility/quality?all_accessible_homes=true";
}

async function safeGet(path) {
  try {
    return (await apiGet(path, { skipCache: true })) || SAFE_EMPTY;
  } catch (error) {
    console.warn("[quality] failed loading", path, error);
    return SAFE_EMPTY;
  }
}

async function fetchVisibility(homeId) {
  try {
    return (await apiGet(qualityVisibilityPath(homeId), { skipCache: true })) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function pickItems(response, keys = []) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.records)) return response.records;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;

  return [];
}

function sortNewest(items = [], dateKeys = []) {
  return [...items].sort((a, b) => {
    const aValue = dateKeys.map((key) => a?.[key]).find(Boolean);
    const bValue = dateKeys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], dateKey = "due_date") {
  return [...items].sort((a, b) => {
    const aDate = a?.[dateKey]
      ? new Date(a[dateKey]).getTime()
      : Number.POSITIVE_INFINITY;

    const bDate = b?.[dateKey]
      ? new Date(b[dateKey]).getTime()
      : Number.POSITIVE_INFINITY;

    return aDate - bDate;
  });
}

function badgeClass(value) {
  const v = lower(value).replaceAll(" ", "_");

  if (
    [
      "critical",
      "high",
      "urgent",
      "overdue",
      "inadequate",
      "requires_action",
      "open",
      "not_started",
      "due",
      "red",
      "unsafe",
      "late",
      "stale",
      "missing",
      "expired",
      "escalated",
      "failed",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "warning",
      "in_progress",
      "pending",
      "planned",
      "draft",
      "amber",
      "awaiting_review",
      "monitor",
      "submitted",
      "scheduled",
      "active",
      "under_review",
      "review_due",
      "awaiting_approval",
      "requires_improvement",
      "good",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "completed",
      "approved",
      "resolved",
      "outstanding",
      "pass",
      "closed",
      "green",
      "safe",
      "done",
      "ok",
      "satisfied",
      "up_to_date",
      "current",
      "compliant",
      "strong",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function signalTone(signal = {}) {
  const token = lower(signal.severity || signal.status || "");

  if (["critical", "high", "overdue", "danger"].includes(token)) {
    return "danger";
  }

  if (["medium", "warning", "due_soon", "planned", "good"].includes(token)) {
    return "warning";
  }

  if (["low", "success", "strong"].includes(token)) {
    return "success";
  }

  return "muted";
}

function mapRecord(record = {}, type = "quality_record") {
  const title =
    record.title ||
    record.audit_title ||
    record.action_title ||
    record.line_of_enquiry ||
    record.section_name ||
    record.overall_band ||
    record.finding_type ||
    record.record_type ||
    titleCase(type);

  const summary =
    record.summary ||
    record.description ||
    record.details ||
    record.action_description ||
    record.rationale ||
    record.narrative_summary ||
    record.overall_summary ||
    record.recommendations_summary ||
    record.finding_text ||
    record.review_reason ||
    record.concerns_summary ||
    record.strengths_summary ||
    record.overall_quality_summary ||
    record.action_plan_summary ||
    record.title ||
    "";

  const date =
    record.due_date ||
    record.audit_date ||
    record.visit_date ||
    record.review_period_end ||
    record.review_date ||
    record.period_end ||
    record.created_at ||
    record.updated_at ||
    null;

  return {
    ...record,
    id: record.id ?? record.record_id ?? record.source_id ?? null,
    record_id: record.record_id ?? record.id ?? record.source_id ?? null,
    type,
    record_type: type,
    title: title || titleCase(type),
    label: title || titleCase(type),
    summary: summary || `${titleCase(type)} recorded.`,
    description: summary || "",
    date,
    status:
      record.status ||
      record.priority ||
      record.overall_band ||
      record.score_band ||
      record.severity ||
      record.review_status ||
      record.workflow_status ||
      record.overall_outcome ||
      "",
    severity: record.severity || record.priority || "",
    raw: record,
  };
}

function mapQualityAudit(record = {}) {
  return mapRecord(record, "quality_audit");
}

function mapQualityAuditFinding(record = {}) {
  return mapRecord(record, "quality_audit_finding");
}

function mapQualityAuditAction(record = {}) {
  return mapRecord(record, "quality_audit_action");
}

function mapComplianceItem(record = {}) {
  return mapRecord(record, "compliance_item");
}

function mapReg44Visit(record = {}) {
  return mapRecord(record, "reg44_visit");
}

function mapReg44Finding(record = {}) {
  return mapRecord(record, "reg44_finding");
}

function mapReg44Action(record = {}) {
  return mapRecord(record, "reg44_action");
}

function mapReg45Review(record = {}) {
  return mapRecord(record, "reg45_review");
}

function mapReg45Action(record = {}) {
  return mapRecord(record, "reg45_action");
}

function mapInspectionScore(record = {}) {
  return mapRecord(record, "inspection_score");
}

function mapInspectionSectionScore(record = {}) {
  return mapRecord(record, "inspection_section_score");
}

function mapInspectionReason(record = {}) {
  return mapRecord(record, "inspection_reason");
}

function mapInspectionLineOfEnquiry(record = {}) {
  return mapRecord(record, "inspection_line_of_enquiry");
}

function mapInspectionAction(record = {}) {
  return mapRecord(record, "inspection_action");
}

function mapManagerReviewRecord(record = {}) {
  return mapRecord(record, "manager_review_queue");
}

function hasLiveData(data = {}) {
  return (
    data.qualityAudits.length ||
    data.qualityAuditFindings.length ||
    data.qualityAuditActions.length ||
    data.complianceItems.length ||
    data.reg44Visits.length ||
    data.reg44Findings.length ||
    data.reg44Actions.length ||
    data.reg45Reviews.length ||
    data.reg45Actions.length ||
    data.inspectionScores.length ||
    data.inspectionSectionScores.length ||
    data.inspectionReasons.length ||
    data.inspectionLines.length ||
    data.inspectionActions.length ||
    data.managerReviewQueue.length
  );
}

function renderEmpty(title, message) {
  return `
    <div class="quality-empty-state">
      <div class="empty-state-icon" aria-hidden="true">○</div>
      <h3>${safeText(title)}</h3>
      <p>${safeText(message)}</p>
    </div>
  `;
}

function renderMetricCard(label, value, note = "", tone = "") {
  return `
    <article class="quality-metric-card ${tone ? `quality-metric-card--${safeText(tone)}` : ""}">
      <span class="quality-metric-label">${safeText(label)}</span>
      <strong class="quality-metric-value">${safeText(value)}</strong>
      ${note ? `<span class="quality-metric-note">${safeText(note)}</span>` : ""}
    </article>
  `;
}

function renderPanelSection(title, subtitle, content) {
  return `
    <section class="quality-section-card">
      <div class="quality-section-head">
        <div>
          <h3>${safeText(title)}</h3>
          ${subtitle ? `<p>${safeText(subtitle)}</p>` : ""}
        </div>
      </div>
      <div class="quality-section-body">
        ${content}
      </div>
    </section>
  `;
}

function renderRecordCard(item = {}) {
  const status = item.status || "";
  const primaryDate = item.date || item.due_date || item.created_at || item.updated_at || "";

  const meta = [
    item.record_type ? titleCase(item.record_type) : "",
    primaryDate ? formatDateTime(primaryDate) : "",
    item.owner_user_name || "",
  ]
    .filter(Boolean)
    .join(" • ");

  return `
    <article
      class="quality-record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.type || item.record_type || "record")}"
      role="button"
      tabindex="0"
    >
      <div class="quality-record-head">
        <div>
          <h4 class="quality-record-title">${safeText(item.title || "Record")}</h4>
          <p class="quality-record-meta">${safeText(meta || "Quality record")}</p>
        </div>
        ${
          status
            ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>`
            : ""
        }
      </div>

      <p class="quality-record-summary">${safeText(item.summary || "No summary available.")}</p>

      <div class="quality-record-facts">
        ${
          item.priority
            ? `
              <span>
                <strong>Priority</strong>
                ${safeText(titleCase(item.priority))}
              </span>
            `
            : ""
        }

        ${
          item.due_date
            ? `
              <span>
                <strong>Due</strong>
                ${safeText(formatDate(item.due_date))}
              </span>
            `
            : ""
        }

        ${
          item.overall_score !== null && item.overall_score !== undefined
            ? `
              <span>
                <strong>Score</strong>
                ${safeText(toNumber(item.overall_score).toFixed(1))}
              </span>
            `
            : ""
        }

        ${
          item.confidence_score !== null && item.confidence_score !== undefined
            ? `
              <span>
                <strong>Confidence</strong>
                ${safeText(toNumber(item.confidence_score).toFixed(1))}
              </span>
            `
            : ""
        }

        ${
          item.section_name
            ? `
              <span>
                <strong>Section</strong>
                ${safeText(item.section_name)}
              </span>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);

  return `
    <div class="quality-record-list">
      ${items.map(renderRecordCard).join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No urgent quality issues",
      "No urgent quality issues are showing right now."
    );
  }

  return `
    <div class="quality-priority-list">
      ${items
        .slice(0, 6)
        .map(
          (item) => `
            <article class="quality-priority-item">
              <strong>${safeText(item.title || "Quality issue")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderVisibilitySignals(signals = []) {
  if (!signals.length) {
    return renderEmpty(
      "No active escalation signals",
      "No active quality escalation signals are currently showing."
    );
  }

  return `
    <div class="quality-record-list">
      ${signals
        .slice(0, 6)
        .map(
          (signal) => `
            <article class="quality-signal-row">
              <div>
                <h4>${safeText(signal.title || "Quality signal")}</h4>
                <p>${safeText(
                  signal.description || "Quality signal needs attention."
                )}</p>
              </div>
              <span class="row-pill ${safeText(signalTone(signal))}">
                ${safeText(signal.count ?? 0)}
              </span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInsightStory(story = "") {
  const text = String(story || "").trim();

  if (!text) {
    return renderEmpty("No quality narrative", "No quality narrative is available yet.");
  }

  return `
    <article class="quality-narrative-card">
      <p>${safeText(text)}</p>
    </article>
  `;
}

function renderTrendRows(trends = []) {
  if (!trends.length) {
    return renderEmpty("No trend movement", "No trend movement is available yet.");
  }

  return `
    <div class="quality-record-list">
      ${trends
        .slice(0, 4)
        .map((item) => {
          const delta = toNumber(item?.delta, 0);
          const sign = delta > 0 ? "+" : "";
          const direction = lower(item?.direction || "flat");
          const assessment = lower(item?.assessment || "stable");

          const tone =
            direction === "up" && assessment === "declining"
              ? "danger"
              : direction === "down" && assessment === "improving"
              ? "success"
              : "muted";

          return `
            <article class="quality-signal-row">
              <div>
                <h4>${safeText(item?.label || "Trend")}</h4>
                <p>
                  ${safeText(item?.assessment || "stable")} •
                  ${safeText(item?.current ?? 0)} now vs
                  ${safeText(item?.previous ?? 0)} before
                </p>
              </div>
              <span class="row-pill ${safeText(tone)}">${safeText(`${sign}${delta}`)}</span>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSimpleRows(items = [], emptyTitle, emptyMessage, titleKey = "title") {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);

  return `
    <div class="quality-record-list">
      ${items
        .slice(0, 6)
        .map(
          (item) => `
            <article class="quality-signal-row">
              <div>
                <h4>${safeText(item?.[titleKey] || item?.title || item?.label || "Item")}</h4>
                <p>${safeText(item?.evidence || item?.summary || item?.description || item?.text || "")}</p>
                ${
                  item?.suggested_action
                    ? `<small>${safeText(item.suggested_action)}</small>`
                    : ""
                }
              </div>
              ${
                item?.severity || item?.status
                  ? `<span class="row-pill ${safeText(signalTone(item))}">${safeText(item.severity || item.status)}</span>`
                  : ""
              }
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No quality activity yet",
      "There is no recent quality, compliance or inspection activity to display."
    );
  }

  return `
    <div class="quality-timeline">
      ${items
        .map((item) => {
          const dateValue = item.date || item.due_date || item.created_at || item.updated_at;
          const status = item.status || "";

          return `
            <article
              class="quality-timeline-item"
              data-open-record="true"
              data-record-id="${safeText(item.id || "")}"
              data-record-type="${safeText(item.type || item.record_type || "record")}"
              role="button"
              tabindex="0"
            >
              <div class="quality-timeline-date">${safeText(
                formatDateTime(dateValue, "No date")
              )}</div>
              <div class="quality-timeline-body">
                <div class="quality-timeline-title-row">
                  <strong class="quality-timeline-title">${safeText(
                    item.title || "Record"
                  )}</strong>
                  ${
                    status
                      ? `<span class="${badgeClass(status)}">${safeText(
                          titleCase(status)
                        )}</span>`
                      : ""
                  }
                </div>
                <p class="quality-timeline-summary">${safeText(item.summary || "")}</p>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildHeroNarrative({
  latestInspection = [],
  overdueCompliance = [],
  openQualityActions = [],
  managerReviewItems = [],
}) {
  const inspection = latestInspection[0];

  if (inspection?.summary) return inspection.summary;

  if (overdueCompliance.length || openQualityActions.length || managerReviewItems.length) {
    return "The quality view is showing live operational pressure. Focus should be on overdue compliance, open actions, manager review items and evidence that proves follow-through.";
  }

  return "Quality oversight is not currently surfacing urgent pressure. Continue monitoring compliance, audit actions, Reg 44, Reg 45 and inspection readiness.";
}

function renderWorkspace(payload) {
  const {
    overdueCompliance,
    openQualityActions,
    reg44OpenActions,
    reg45OpenActions,
    managerReviewItems,
    latestAudit,
    latestInspection,
    urgentInspectionActions,
    openLinesOfEnquiry,
    recentTimeline,
    recentFindings,
    priorityItems,
    visibilitySignals,
    insightStory,
    changing,
    patterns,
    decisionSupport,
    qualityDriftIndicators,
    qualityInsightBlocks,
    missingItems,
  } = payload;

  const latestInspectionRecord = latestInspection[0] || {};
  const latestAuditRecord = latestAudit[0] || {};

  const readinessScore =
    latestInspectionRecord.overall_score !== null &&
    latestInspectionRecord.overall_score !== undefined
      ? `${toNumber(latestInspectionRecord.overall_score).toFixed(0)}%`
      : "—";

  const confidenceScore =
    latestInspectionRecord.confidence_score !== null &&
    latestInspectionRecord.confidence_score !== undefined
      ? `${toNumber(latestInspectionRecord.confidence_score).toFixed(0)}%`
      : "—";

  const heroNarrative = buildHeroNarrative({
    latestInspection,
    overdueCompliance,
    openQualityActions,
    managerReviewItems,
  });

  return `
    <section class="quality-dashboard-shell">
      <section class="quality-hero-card">
        <div class="quality-hero-main">
          <div class="eyebrow">Quality operating picture</div>
          <h2>Audit, compliance, Reg 44, Reg 45 and inspection readiness</h2>
          <p>${safeText(heroNarrative)}</p>
        </div>

        <div class="quality-hero-side">
          <div class="quality-hero-score">
            <span>Readiness</span>
            <strong>${safeText(readinessScore)}</strong>
          </div>
          <div class="quality-hero-score">
            <span>Confidence</span>
            <strong>${safeText(confidenceScore)}</strong>
          </div>
          <div class="quality-hero-meta">
            <span>${safeText(
              latestInspectionRecord.status
                ? titleCase(latestInspectionRecord.status)
                : "No inspection score"
            )}</span>
            <span>${safeText(
              latestAuditRecord.date
                ? `Latest audit ${formatDate(latestAuditRecord.date)}`
                : "No recent audit"
            )}</span>
          </div>
        </div>
      </section>

      <div class="quality-metric-grid">
        ${renderMetricCard(
          "Overdue compliance",
          overdueCompliance.length,
          "Items outside expected timescales",
          overdueCompliance.length ? "danger" : "success"
        )}
        ${renderMetricCard(
          "Open quality actions",
          openQualityActions.length,
          "Audit actions still live",
          openQualityActions.length ? "warning" : "success"
        )}
        ${renderMetricCard(
          "Reg 44 actions",
          reg44OpenActions.length,
          "Independent visitor actions open",
          reg44OpenActions.length ? "warning" : "success"
        )}
        ${renderMetricCard(
          "Reg 45 actions",
          reg45OpenActions.length,
          "Quality of care review actions open",
          reg45OpenActions.length ? "warning" : "success"
        )}
        ${renderMetricCard(
          "Manager review",
          managerReviewItems.length,
          "Records waiting for management oversight",
          managerReviewItems.length ? "warning" : "success"
        )}
      </div>

      <div class="quality-dashboard-grid">
        <main class="quality-main-column">
          ${renderPanelSection(
            "Urgent inspection actions",
            "Inspection actions that are high priority, urgent or close to affecting readiness.",
            renderCardList(
              urgentInspectionActions,
              "No urgent inspection actions",
              "There are no urgent inspection actions recorded for this home."
            )
          )}

          ${renderPanelSection(
            "Open lines of enquiry",
            "Likely inspection questions or evidence themes that still need follow-through.",
            renderCardList(
              openLinesOfEnquiry,
              "No open lines of enquiry",
              "There are no current open lines of enquiry."
            )
          )}

          ${renderPanelSection(
            "Overdue compliance items",
            "Compliance items that may weaken confidence if left unresolved.",
            renderCardList(
              overdueCompliance,
              "No overdue compliance",
              "There are no overdue compliance items at the moment."
            )
          )}

          ${renderPanelSection(
            "Quality timeline",
            "A chronological view of quality, inspection, compliance, Reg 44, Reg 45 and management review activity.",
            renderTimeline(recentTimeline)
          )}
        </main>

        <aside class="quality-side-column">
          ${renderPanelSection(
            "Story right now",
            "A simple narrative of the current quality position.",
            renderInsightStory(insightStory)
          )}

          ${renderPanelSection(
            "What is changing",
            "Movement in the quality picture over time.",
            renderTrendRows(changing)
          )}

          ${renderPanelSection(
            "Repeating patterns",
            "Repeated issues that may suggest drift, weakness or inconsistent follow-through.",
            renderSimpleRows(
              patterns,
              "No repeated quality pattern",
              "No repeated quality pattern has crossed threshold yet."
            )
          )}

          ${renderPanelSection(
            "Decision support",
            "Evidence-backed prompts for leadership decisions.",
            renderSimpleRows(
              decisionSupport,
              "No decision support",
              "No decision-support prompts are available yet.",
              "question"
            )
          )}

          ${renderPanelSection(
            "Quality drift indicators",
            "Indicators that help spot whether practice is strengthening or slipping.",
            renderSimpleRows(
              qualityDriftIndicators,
              "No drift indicators",
              "No drift indicators are available yet.",
              "label"
            )
          )}

          ${renderPanelSection(
            "Quality insight blocks",
            "Generated or grouped insight from quality signals.",
            renderSimpleRows(
              qualityInsightBlocks,
              "No insight blocks",
              "No quality insight blocks are available yet."
            )
          )}

          ${renderPanelSection(
            "Visibility signals",
            "Calm, prioritised alerts across quality and readiness.",
            renderVisibilitySignals(visibilitySignals)
          )}

          ${renderPanelSection(
            "Needs attention",
            "The most important quality issues to pick up next.",
            renderPriorityList(priorityItems)
          )}

          ${renderPanelSection(
            "What is missing",
            "Gaps likely to weaken quality assurance if left open.",
            renderSimpleRows(
              missingItems.map((text, index) => ({
                id: `missing-${index}`,
                title: "Missing evidence",
                summary: text,
              })),
              "No missing follow-through gaps",
              "No missing quality follow-through gaps are currently highlighted."
            )
          )}

          ${renderPanelSection(
            "Open quality audit actions",
            "Live actions from quality audit activity.",
            renderCardList(
              openQualityActions,
              "No open quality actions",
              "There are no open quality audit actions recorded."
            )
          )}

          ${renderPanelSection(
            "Reg 44 open actions",
            "Independent visitor actions still requiring follow-up.",
            renderCardList(
              reg44OpenActions,
              "No Reg 44 actions open",
              "There are no outstanding Reg 44 actions currently open."
            )
          )}

          ${renderPanelSection(
            "Reg 45 open actions",
            "Quality of care review actions still requiring follow-up.",
            renderCardList(
              reg45OpenActions,
              "No Reg 45 actions open",
              "There are no outstanding Reg 45 actions currently open."
            )
          )}

          ${renderPanelSection(
            "Manager review queue",
            "Records waiting for manager review, challenge or sign-off.",
            renderCardList(
              managerReviewItems,
              "No manager review items",
              "There are no records currently waiting for manager review."
            )
          )}

          ${
            latestAudit.length
              ? renderPanelSection(
                  "Latest quality audit",
                  "Most recent audit position.",
                  renderCardList(latestAudit, "", "")
                )
              : ""
          }

          ${
            latestInspection.length
              ? renderPanelSection(
                  "Latest inspection readiness",
                  "Most recent inspection-readiness score and narrative.",
                  renderCardList(latestInspection, "", "")
                )
              : ""
          }

          ${renderPanelSection(
            "Recent findings and concerns",
            "Recent audit, Reg 44 and inspection reasons that may need leadership attention.",
            renderCardList(
              recentFindings,
              "No recent findings",
              "No recent quality or regulatory findings were returned."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

async function fetchAll(homeId) {
  const endpoints = buildInspectionUiEndpoints(homeId);

  if (!endpoints) {
    return {
      qualityAudits: [],
      qualityAuditFindings: [],
      qualityAuditActions: [],
      complianceItems: [],
      reg44Visits: [],
      reg44Findings: [],
      reg44Actions: [],
      reg45Reviews: [],
      reg45Actions: [],
      inspectionScores: [],
      inspectionSectionScores: [],
      inspectionReasons: [],
      inspectionLines: [],
      inspectionActions: [],
      managerReviewQueue: [],
    };
  }

  const [
    qualityAuditsRes,
    qualityAuditFindingsRes,
    qualityAuditActionsRes,
    complianceItemsRes,
    reg44VisitsRes,
    reg44FindingsRes,
    reg44ActionsRes,
    reg45ReviewsRes,
    reg45ActionsRes,
    inspectionScoresRes,
    inspectionSectionScoresRes,
    inspectionReasonsRes,
    inspectionLinesRes,
    inspectionActionsRes,
    managerReviewQueueRes,
  ] = await Promise.all([
    safeGet(endpoints.qualityAudits),
    safeGet(endpoints.qualityAuditFindings),
    safeGet(endpoints.qualityAuditActions),
    safeGet(endpoints.complianceItems),
    safeGet(endpoints.reg44Visits),
    safeGet(endpoints.reg44Findings),
    safeGet(endpoints.reg44Actions),
    safeGet(endpoints.reg45Reviews),
    safeGet(endpoints.reg45Actions),
    safeGet(endpoints.inspectionScores),
    safeGet(endpoints.inspectionSectionScores),
    safeGet(endpoints.inspectionScoreReasons),
    safeGet(endpoints.inspectionLinesOfEnquiry),
    safeGet(endpoints.inspectionImprovementActions),
    safeGet(endpoints.managerReviewQueue),
  ]);

  return {
    qualityAudits: pickItems(qualityAuditsRes, ["quality_audits", "items"]).map(
      mapQualityAudit
    ),
    qualityAuditFindings: pickItems(qualityAuditFindingsRes, [
      "quality_audit_findings",
      "items",
    ]).map(mapQualityAuditFinding),
    qualityAuditActions: pickItems(qualityAuditActionsRes, [
      "quality_audit_actions",
      "items",
    ]).map(mapQualityAuditAction),
    complianceItems: pickItems(complianceItemsRes, [
      "compliance_items",
      "items",
    ]).map(mapComplianceItem),
    reg44Visits: pickItems(reg44VisitsRes, ["reg44_visits", "items"]).map(
      mapReg44Visit
    ),
    reg44Findings: pickItems(reg44FindingsRes, ["reg44_findings", "items"]).map(
      mapReg44Finding
    ),
    reg44Actions: pickItems(reg44ActionsRes, ["reg44_actions", "items"]).map(
      mapReg44Action
    ),
    reg45Reviews: pickItems(reg45ReviewsRes, ["reg45_reviews", "items"]).map(
      mapReg45Review
    ),
    reg45Actions: pickItems(reg45ActionsRes, ["reg45_actions", "items"]).map(
      mapReg45Action
    ),
    inspectionScores: pickItems(inspectionScoresRes, [
      "inspection_scores",
      "items",
    ]).map(mapInspectionScore),
    inspectionSectionScores: pickItems(inspectionSectionScoresRes, [
      "inspection_section_scores",
      "items",
    ]).map(mapInspectionSectionScore),
    inspectionReasons: pickItems(inspectionReasonsRes, [
      "inspection_score_reasons",
      "inspection_reasons",
      "items",
    ]).map(mapInspectionReason),
    inspectionLines: pickItems(inspectionLinesRes, [
      "inspection_lines_of_enquiry",
      "items",
    ]).map(mapInspectionLineOfEnquiry),
    inspectionActions: pickItems(inspectionActionsRes, [
      "inspection_improvement_actions",
      "inspection_actions",
      "items",
    ]).map(mapInspectionAction),
    managerReviewQueue: pickItems(managerReviewQueueRes, [
      "manager_review_queue",
      "items",
    ]).map(mapManagerReviewRecord),
  };
}

async function fetchDataset(homeId) {
  const live = await fetchAll(homeId);
  return { ...live, isFallback: !hasLiveData(live) };
}

function buildOverdueCompliance(data) {
  return sortSoonest(
    data.complianceItems.filter((item) => {
      const status = lower(item.status);
      return (
        !["completed", "closed", "resolved"].includes(status) &&
        isOverdue(item.due_date || item.date)
      );
    }),
    "due_date"
  ).slice(0, 12);
}

function buildOpenQualityActions(data) {
  return sortSoonest(
    data.qualityAuditActions.filter((item) => {
      const status = lower(item.status);
      return !["completed", "closed", "cancelled"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildReg44OpenActions(data) {
  return sortSoonest(
    data.reg44Actions.filter((item) => {
      const status = lower(item.status);
      return !["completed", "closed", "cancelled"].includes(status);
    }),
    "due_date"
  ).slice(0, 8);
}

function buildReg45OpenActions(data) {
  return sortSoonest(
    data.reg45Actions.filter((item) => {
      const status = lower(item.status);
      return !["completed", "closed", "cancelled"].includes(status);
    }),
    "due_date"
  ).slice(0, 8);
}

function buildManagerReviewItems(data) {
  return sortSoonest(
    data.managerReviewQueue.filter((item) => {
      const status = lower(item.workflow_status || item.status);
      return !["approved", "completed", "closed"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildLatestAudit(data) {
  return sortNewest(data.qualityAudits, ["audit_date", "date", "created_at", "updated_at"]).slice(0, 1);
}

function buildLatestInspection(data) {
  return sortNewest(data.inspectionScores, ["period_end", "date", "created_at", "updated_at"]).slice(0, 1);
}

function buildUrgentInspectionActions(data) {
  return sortSoonest(
    data.inspectionActions.filter((item) => {
      const priority = lower(item.priority || item.severity);
      const status = lower(item.status);

      return (
        !["completed", "closed", "cancelled"].includes(status) &&
        ["critical", "high", "urgent"].includes(priority)
      );
    }),
    "due_date"
  ).slice(0, 10);
}

function buildOpenLinesOfEnquiry(data) {
  return sortSoonest(
    data.inspectionLines.filter((item) => {
      const status = lower(item.status);
      return !["closed", "completed", "resolved"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildRecentFindings(data) {
  return sortNewest(
    [
      ...data.qualityAuditFindings,
      ...data.reg44Findings,
      ...data.inspectionReasons,
    ],
    ["created_at", "updated_at", "date"]
  ).slice(0, 10);
}

function buildPriorityItems(data) {
  const items = [];

  buildUrgentInspectionActions(data)
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Inspection action",
        summary: item.due_date
          ? `${item.summary || "Inspection action open."} Due ${formatDate(
              item.due_date
            )}`
          : item.summary || "Inspection action open.",
      });
    });

  buildOverdueCompliance(data)
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Compliance item",
        summary: item.due_date
          ? `Overdue since ${formatDate(item.due_date)}`
          : item.summary || "Compliance item overdue.",
      });
    });

  buildManagerReviewItems(data)
    .filter((item) => ["high", "critical"].includes(lower(item.priority || item.severity)))
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Manager review item",
        summary: item.summary || item.review_reason || "Manager review needed.",
      });
    });

  buildReg44OpenActions(data)
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Reg 44 action",
        summary: item.summary || "Reg 44 action still open.",
      });
    });

  buildReg45OpenActions(data)
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Reg 45 action",
        summary: item.summary || "Reg 45 action still open.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major quality pressure",
      summary:
        "Quality and readiness are not currently surfacing urgent issues.",
    });
  }

  return items.slice(0, 6);
}

function buildTimeline(data) {
  return sortNormalisedRecordsNewestFirst(
    normaliseRecords([
      ...data.qualityAudits,
      ...data.qualityAuditActions,
      ...data.complianceItems,
      ...data.reg44Visits,
      ...data.reg44Actions,
      ...data.reg45Reviews,
      ...data.reg45Actions,
      ...data.inspectionScores,
      ...data.inspectionSectionScores,
      ...data.inspectionLines,
      ...data.inspectionActions,
      ...data.managerReviewQueue,
    ])
  ).slice(0, 25);
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = renderEmpty(
    "No home selected",
    "Select a home to view quality, compliance and readiness information."
  );

  updateWorkspaceSummaryStrip({
    today: "No quality context",
    nextEvent: "No due quality action",
    lastRecord: "No quality data",
    openActions: "No quality actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="quality-dashboard-shell">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading quality dashboard…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading quality",
    nextEvent: "Checking actions",
    lastRecord: "Loading latest quality record",
    openActions: "Loading quality actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = renderEmpty(
    "Unable to load quality",
    message || "Something went wrong while loading quality and readiness records."
  );

  updateWorkspaceSummaryStrip({
    today: "Quality unavailable",
    nextEvent: "No due quality action",
    lastRecord: "No quality data",
    openActions: "Check quality routes",
  });
}

function bindQualityRecordEvents(records = []) {
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

export async function loadQualityDashboard() {
  return loadCurrentView();
}

export async function loadQuality() {
  return loadCurrentView();
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const homeId = getHomeId();
  const providerLevel = isProviderLevelQualityUser();

  if (!homeId && !providerLevel) {
    renderNoHomeContext();
    return;
  }

  if (providerLevel && !homeId && !hasProviderContext()) {
    renderErrorState(
      "Quality view could not load because no provider or home context is available for this user."
    );
    return;
  }

  renderLoadingState();

  try {
    const [data, visibility] = await Promise.all([
      homeId
        ? fetchDataset(homeId)
        : Promise.resolve({
            qualityAudits: [],
            qualityAuditFindings: [],
            qualityAuditActions: [],
            complianceItems: [],
            reg44Visits: [],
            reg44Findings: [],
            reg44Actions: [],
            reg45Reviews: [],
            reg45Actions: [],
            inspectionScores: [],
            inspectionSectionScores: [],
            inspectionReasons: [],
            inspectionLines: [],
            inspectionActions: [],
            managerReviewQueue: [],
            isFallback: true,
          }),
      fetchVisibility(homeId),
    ]);

    const overdueCompliance = buildOverdueCompliance(data);
    const openQualityActions = buildOpenQualityActions(data);
    const reg44OpenActions = buildReg44OpenActions(data);
    const reg45OpenActions = buildReg45OpenActions(data);
    const managerReviewItems = buildManagerReviewItems(data);
    const latestAudit = buildLatestAudit(data);
    const latestInspection = buildLatestInspection(data);
    const urgentInspectionActions = buildUrgentInspectionActions(data);
    const openLinesOfEnquiry = buildOpenLinesOfEnquiry(data);
    const recentFindings = buildRecentFindings(data);
    const recentTimeline = buildTimeline(data);
    const priorityItems = buildPriorityItems(data);

    const changing = toArray(visibility?.what_is_changing || visibility?.trends);
    const patterns = toArray(visibility?.patterns);
    const decisionSupport = toArray(visibility?.decision_support);
    const qualityDriftIndicators = toArray(visibility?.quality_drift_indicators);
    const qualityInsightBlocks = toArray(visibility?.quality_insight_blocks);
    const missingItems = toArray(visibility?.what_is_missing);

    els.viewContent.innerHTML = renderWorkspace({
      overdueCompliance,
      openQualityActions,
      reg44OpenActions,
      reg45OpenActions,
      managerReviewItems,
      latestAudit,
      latestInspection,
      urgentInspectionActions,
      openLinesOfEnquiry,
      recentTimeline,
      recentFindings,
      priorityItems,
      visibilitySignals: toArray(visibility?.signals).slice(0, 6),
      insightStory: visibility?.insight_story || "",
      changing,
      patterns,
      decisionSupport,
      qualityDriftIndicators,
      qualityInsightBlocks,
      missingItems,
    });

    bindQualityRecordEvents([
      ...overdueCompliance,
      ...openQualityActions,
      ...reg44OpenActions,
      ...reg45OpenActions,
      ...managerReviewItems,
      ...latestAudit,
      ...latestInspection,
      ...urgentInspectionActions,
      ...openLinesOfEnquiry,
      ...recentTimeline,
      ...recentFindings,
    ]);

    const latestInspectionRecord = latestInspection[0] || null;

    const nextPriorityAction =
      urgentInspectionActions[0] ||
      openQualityActions[0] ||
      reg44OpenActions[0] ||
      reg45OpenActions[0] ||
      overdueCompliance[0] ||
      null;

    updateWorkspaceSummaryStrip({
      today: latestInspectionRecord
        ? `${titleCase(latestInspectionRecord.status || "unknown")} readiness`
        : `${overdueCompliance.length} compliance items overdue`,
      nextEvent: nextPriorityAction?.due_date
        ? `Due ${formatDate(nextPriorityAction.due_date)}`
        : "No due quality action",
      lastRecord: recentTimeline[0]
        ? `Latest quality activity ${formatDate(recentTimeline[0].date)}`
        : "No recent quality activity",
      openActions: `${
        openQualityActions.length +
        reg44OpenActions.length +
        reg45OpenActions.length +
        urgentInspectionActions.length
      } quality actions open`,
      pressure: toArray(visibility?.queues?.urgent).length
        ? `${toArray(visibility?.queues?.urgent).length} escalation alerts`
        : toNumber(visibility?.pressures?.total, 0)
        ? `${toNumber(visibility?.pressures?.total, 0)} pressure score`
        : "No active alerts",
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[quality] load failed", error);
    renderErrorState(
      error?.message ||
        "Something went wrong while loading quality and readiness records."
    );
  }
}

export const loadCurrentViewAlias = loadCurrentView;