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

function sortNewest(items = [], dateKeys = []) {
  return [...items].sort((a, b) => {
    const aValue = dateKeys.map((key) => a?.[key]).find(Boolean);
    const bValue = dateKeys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], dateKey) {
  return [...items].sort((a, b) => {
    const aDate = a?.[dateKey] ? new Date(a[dateKey]).getTime() : Number.POSITIVE_INFINITY;
    const bDate = b?.[dateKey] ? new Date(b[dateKey]).getTime() : Number.POSITIVE_INFINITY;
    return aDate - bDate;
  });
}

function badgeClass(value) {
  const v = lower(value);

  if (
    [
      "critical",
      "high",
      "urgent",
      "overdue",
      "inadequate",
      "requires_action",
      "requires action",
      "open",
      "not_started",
      "not started",
      "due",
      "problematic",
      "red",
      "unsafe",
      "declined",
      "cancelled",
      "late",
      "stale",
      "missing",
      "critical_action",
      "critical action",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "medium",
      "warning",
      "in_progress",
      "in progress",
      "pending",
      "planned",
      "draft",
      "amber",
      "awaiting_review",
      "awaiting review",
      "monitor",
      "submitted",
      "scheduled",
      "active",
      "under_review",
      "under review",
      "ri",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "completed",
      "approved",
      "resolved",
      "good",
      "outstanding",
      "pass",
      "closed",
      "green",
      "safe",
      "done",
      "ok",
      "satisfied",
      "up_to_date",
      "up to date",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

/* -------------------------------- mappers -------------------------------- */

function mapQualityAudit(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    audit_type: record.audit_type || "",
    audit_title: record.audit_title || "Quality audit",
    audit_date: record.audit_date || null,
    period_start: record.period_start || null,
    period_end: record.period_end || null,
    completed_by: record.completed_by || record.auditor_user_id || null,
    overall_outcome: record.overall_outcome || record.overall_rating || "",
    summary: record.summary || "",
    strengths: record.strengths || "",
    concerns: record.concerns || "",
    recommendations: record.recommendations || "",
    status: record.status || "",
    title: record.audit_title || titleCase(record.audit_type || "Quality audit"),
    record_type: "quality_audit",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapQualityAuditFinding(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    audit_id: record.audit_id || null,
    home_id: record.home_id || null,
    finding_type: record.finding_type || "",
    priority: record.priority || "",
    title: record.title || "Audit finding",
    details: record.details || "",
    action_required: toBool(record.action_required),
    linked_record_type: record.linked_record_type || "",
    linked_record_id: record.linked_record_id || null,
    record_type: "quality_audit_finding",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapQualityAuditAction(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    quality_audit_id: record.quality_audit_id || null,
    home_id: record.home_id || null,
    action_title: record.action_title || "Audit action",
    action_description: record.action_description || "",
    priority: record.priority || "",
    owner_user_id: record.owner_user_id || null,
    due_date: record.due_date || null,
    status: record.status || "",
    completed_at: record.completed_at || null,
    linked_task_id: record.linked_task_id || null,
    completion_notes: record.completion_notes || "",
    finding_id: record.finding_id || null,
    title: record.action_title || "Audit action",
    summary: record.action_description || record.completion_notes || "Quality action recorded.",
    record_type: "quality_audit_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapComplianceItem(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    young_person_id: record.young_person_id || null,
    rule_id: record.rule_id || null,
    record_type_name: record.record_type || "",
    source_table: record.source_table || "",
    source_id: record.source_id || null,
    title: record.title || "Compliance item",
    owner_id: record.owner_id || null,
    due_date: record.due_date || null,
    completed_date: record.completed_date || null,
    status: record.status || "",
    severity: record.severity || "",
    escalation_level: record.escalation_level ?? 0,
    title_text: record.title || "Compliance item",
    summary: record.title || "Compliance item raised.",
    record_type: "compliance_item",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReg44Visit(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    visit_date: record.visit_date || null,
    independent_person_name: record.independent_person_name || "",
    overall_summary: record.overall_summary || "",
    recommendations_summary: record.recommendations_summary || "",
    report_document_id: record.report_document_id || null,
    title: `Reg 44 visit${record.visit_date ? ` - ${formatDate(record.visit_date)}` : ""}`,
    summary:
      record.overall_summary ||
      record.recommendations_summary ||
      "Reg 44 visit recorded.",
    record_type: "reg44_visit",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReg44Finding(record = {}) {
  return {
    id: record.id,
    reg44_visit_id: record.reg44_visit_id || null,
    finding_type: record.finding_type || "",
    judgement_area: record.judgement_area || "",
    finding_text: record.finding_text || "",
    priority: record.priority || "",
    requires_action: toBool(record.requires_action),
    title: titleCase(record.finding_type || "Reg 44 finding"),
    summary: record.finding_text || "Reg 44 finding recorded.",
    record_type: "reg44_finding",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReg44Action(record = {}) {
  return {
    id: record.id,
    reg44_finding_id: record.reg44_finding_id || null,
    home_id: record.home_id || null,
    action_title: record.action_title || "Reg 44 action",
    action_description: record.action_description || "",
    owner_user_id: record.owner_user_id || null,
    due_date: record.due_date || null,
    status: record.status || "",
    completed_at: record.completed_at || null,
    title: record.action_title || "Reg 44 action",
    summary:
      record.action_description ||
      "Reg 44 action recorded.",
    record_type: "reg44_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReg45Review(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    review_period_start: record.review_period_start || null,
    review_period_end: record.review_period_end || null,
    review_status: record.review_status || "",
    reviewed_by_user_id: record.reviewed_by_user_id || null,
    approved_by_user_id: record.approved_by_user_id || null,
    approved_at: record.approved_at || null,
    overall_quality_summary: record.overall_quality_summary || "",
    action_plan_summary: record.action_plan_summary || "",
    report_document_id: record.report_document_id || null,
    title: "Reg 45 review",
    summary:
      record.overall_quality_summary ||
      record.action_plan_summary ||
      "Reg 45 review recorded.",
    record_type: "reg45_review",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReg45Action(record = {}) {
  return {
    id: record.id,
    reg45_review_id: record.reg45_review_id || null,
    home_id: record.home_id || null,
    action_title: record.action_title || "Reg 45 action",
    action_description: record.action_description || "",
    owner_user_id: record.owner_user_id || null,
    due_date: record.due_date || null,
    priority: record.priority || "",
    status: record.status || "",
    completed_at: record.completed_at || null,
    title: record.action_title || "Reg 45 action",
    summary: record.action_description || "Reg 45 action recorded.",
    record_type: "reg45_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInspectionScore(record = {}) {
  return {
    id: record.id,
    run_id: record.run_id || null,
    framework_id: record.framework_id || null,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    period_start: record.period_start || null,
    period_end: record.period_end || null,
    overall_band: record.overall_band || "",
    overall_score: record.overall_score ?? null,
    confidence_score: record.confidence_score ?? null,
    data_completeness_score: record.data_completeness_score ?? null,
    evidence_freshness_score: record.evidence_freshness_score ?? null,
    limiting_judgement_triggered: toBool(record.limiting_judgement_triggered),
    limiting_reason: record.limiting_reason || "",
    narrative_summary: record.narrative_summary || "",
    strengths_summary: record.strengths_summary || "",
    concerns_summary: record.concerns_summary || "",
    generated_by: record.generated_by || "",
    title: "Inspection readiness",
    summary:
      record.narrative_summary ||
      record.concerns_summary ||
      record.strengths_summary ||
      "Inspection readiness score recorded.",
    record_type: "inspection_score",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInspectionSectionScore(record = {}) {
  return {
    id: record.id,
    inspection_score_id: record.inspection_score_id || null,
    section_id: record.section_id || null,
    section_code: record.section_code || "",
    section_name: record.section_name || "",
    score_value: record.score_value ?? null,
    score_band: record.score_band || "",
    confidence_score: record.confidence_score ?? null,
    data_completeness_score: record.data_completeness_score ?? null,
    evidence_freshness_score: record.evidence_freshness_score ?? null,
    limiting_issue_present: toBool(record.limiting_issue_present),
    summary_text: record.summary_text || "",
    strengths_text: record.strengths_text || "",
    concerns_text: record.concerns_text || "",
    title: record.section_name || record.section_code || "Inspection section",
    summary:
      record.concerns_text ||
      record.summary_text ||
      record.strengths_text ||
      "Inspection section scored.",
    record_type: "inspection_section_score",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInspectionReason(record = {}) {
  return {
    id: record.id,
    inspection_score_id: record.inspection_score_id || null,
    section_score_id: record.section_score_id || null,
    descriptor_id: record.descriptor_id || null,
    reason_type: record.reason_type || "",
    priority: record.priority ?? 0,
    title: record.title || "Inspection reason",
    description: record.description || "",
    impact_weight: record.impact_weight ?? null,
    source_table: record.source_table || "",
    source_record_id: record.source_record_id || null,
    evidence_fact_id: record.evidence_fact_id || null,
    record_type: "inspection_reason",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInspectionLineOfEnquiry(record = {}) {
  return {
    id: record.id,
    inspection_score_id: record.inspection_score_id || null,
    section_score_id: record.section_score_id || null,
    home_id: record.home_id || null,
    provider_id: record.provider_id || null,
    priority: record.priority || "",
    line_of_enquiry: record.line_of_enquiry || "",
    rationale: record.rationale || "",
    linked_reason_id: record.linked_reason_id || null,
    status: record.status || "",
    owner_user_id: record.owner_user_id || null,
    due_date: record.due_date || null,
    title: record.line_of_enquiry || "Line of enquiry",
    summary: record.rationale || "Inspection line of enquiry recorded.",
    record_type: "inspection_line_of_enquiry",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInspectionAction(record = {}) {
  return {
    id: record.id,
    inspection_score_id: record.inspection_score_id || null,
    line_of_enquiry_id: record.line_of_enquiry_id || null,
    home_id: record.home_id || null,
    provider_id: record.provider_id || null,
    action_title: record.action_title || "Inspection action",
    action_description: record.action_description || "",
    action_type: record.action_type || "",
    priority: record.priority || "",
    owner_user_id: record.owner_user_id || null,
    owner_staff_id: record.owner_staff_id || null,
    due_date: record.due_date || null,
    started_at: record.started_at || null,
    completed_at: record.completed_at || null,
    status: record.status || "",
    completion_notes: record.completion_notes || "",
    evidence_required: record.evidence_required || "",
    linked_task_id: record.linked_task_id || null,
    title: record.action_title || "Inspection action",
    summary:
      record.action_description ||
      record.evidence_required ||
      record.completion_notes ||
      "Inspection action recorded.",
    record_type: "inspection_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapManagerReviewRecord(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id || null,
    home_id: record.home_id || null,
    young_person_id: record.young_person_id || null,
    source_table: record.source_table || "",
    source_id: record.source_id || null,
    record_type_name: record.record_type || "",
    workflow_status: record.workflow_status || "",
    priority: record.priority || "",
    assigned_manager_user_id: record.assigned_manager_user_id || null,
    due_date: record.due_date || null,
    review_reason: record.review_reason || "",
    title: titleCase(record.record_type || "Manager review"),
    summary:
      record.review_reason ||
      `Awaiting manager review for ${titleCase(record.record_type || "record")}.`,
    record_type: "manager_review_queue",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
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

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
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

function renderCard(item = {}) {
  const status =
    item.status ||
    item.priority ||
    item.overall_band ||
    item.score_band ||
    item.severity ||
    item.review_status ||
    item.workflow_status ||
    item.overall_outcome ||
    "";

  const primaryDate =
    item.due_date ||
    item.audit_date ||
    item.visit_date ||
    item.review_period_end ||
    item.review_date ||
    item.period_end ||
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
            item.priority
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Priority</div>
                  <div class="details-grid-value">${safeText(titleCase(item.priority))}</div>
                </div>
              `
              : ""
          }

          ${
            item.due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due date</div>
                  <div class="details-grid-value">${safeText(formatDate(item.due_date))}</div>
                </div>
              `
              : ""
          }

          ${
            item.overall_score !== null && item.overall_score !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Overall score</div>
                  <div class="details-grid-value">${safeText(toNumber(item.overall_score).toFixed(1))}</div>
                </div>
              `
              : ""
          }

          ${
            item.confidence_score !== null && item.confidence_score !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Confidence</div>
                  <div class="details-grid-value">${safeText(toNumber(item.confidence_score).toFixed(1))}</div>
                </div>
              `
              : ""
          }

          ${
            item.section_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Section</div>
                  <div class="details-grid-value">${safeText(item.section_name)}</div>
                </div>
              `
              : ""
          }

          ${
            item.owner_user_id
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">User #${safeText(item.owner_user_id)}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.action_description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action</div>
                <div>${safeText(item.action_description)}</div>
              </div>
            `
            : ""
        }

        ${
          item.description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Detail</div>
                <div>${safeText(item.description)}</div>
              </div>
            `
            : ""
        }

        ${
          item.concerns
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Concerns</div>
                <div>${safeText(item.concerns)}</div>
              </div>
            `
            : ""
        }

        ${
          item.recommendations
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Recommendations</div>
                <div>${safeText(item.recommendations)}</div>
              </div>
            `
            : ""
        }

        ${
          item.review_reason
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Reason</div>
                <div>${safeText(item.review_reason)}</div>
              </div>
            `
            : ""
        }

        ${
          item.evidence_required
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Evidence required</div>
                <div>${safeText(item.evidence_required)}</div>
              </div>
            `
            : ""
        }

        ${
          item.limiting_reason
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Limiting judgement reason</div>
                <div>${safeText(item.limiting_reason)}</div>
              </div>
            `
            : ""
        }

        ${
          item.completion_notes
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Completion notes</div>
                <div>${safeText(item.completion_notes)}</div>
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
      "No quality activity yet",
      "There is no recent quality, compliance or inspection activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.due_date ||
            item.audit_date ||
            item.visit_date ||
            item.review_period_end ||
            item.review_date ||
            item.period_end ||
            item.created_at ||
            item.updated_at;

          const status =
            item.status ||
            item.priority ||
            item.overall_band ||
            item.score_band ||
            item.severity ||
            item.workflow_status ||
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
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Quality and readiness</div>
          <h2>Audit, compliance, Reg 44, Reg 45 and inspection readiness</h2>
          <p class="overview-panel-subtitle">
            Oversight of home quality activity, open actions, inspection pressure and management review needs.
          </p>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Overdue compliance", overdueCompliance.length)}
        ${renderStatCard("Open quality actions", openQualityActions.length)}
        ${renderStatCard("Reg 44 actions open", reg44OpenActions.length)}
        ${renderStatCard("Reg 45 actions open", reg45OpenActions.length)}
        ${renderStatCard("Manager review items", managerReviewItems.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Urgent inspection actions",
            renderCardList(
              urgentInspectionActions,
              "No urgent inspection actions",
              "There are no urgent inspection actions recorded for this home."
            )
          )}

          ${renderSection(
            "Open lines of enquiry",
            renderCardList(
              openLinesOfEnquiry,
              "No open lines of enquiry",
              "There are no current open lines of enquiry."
            )
          )}

          ${renderSection(
            "Overdue compliance items",
            renderCardList(
              overdueCompliance,
              "No overdue compliance",
              "There are no overdue compliance items at the moment."
            )
          )}

          ${renderSection("Quality timeline", renderTimeline(recentTimeline))}
        </div>

        <aside>
          ${renderSection(
            "Open quality audit actions",
            renderCardList(
              openQualityActions,
              "No open quality actions",
              "There are no open quality audit actions recorded."
            )
          )}

          ${renderSection(
            "Reg 44 open actions",
            renderCardList(
              reg44OpenActions,
              "No Reg 44 actions open",
              "There are no outstanding Reg 44 actions currently open."
            )
          )}

          ${renderSection(
            "Reg 45 open actions",
            renderCardList(
              reg45OpenActions,
              "No Reg 45 actions open",
              "There are no outstanding Reg 45 actions currently open."
            )
          )}

          ${renderSection(
            "Manager review queue",
            renderCardList(
              managerReviewItems,
              "No manager review items",
              "There are no records currently waiting for manager review."
            )
          )}

          ${latestAudit.length
            ? renderSection("Latest quality audit", renderCardList(latestAudit, "", ""))
            : ""}

          ${latestInspection.length
            ? renderSection("Latest inspection readiness", renderCardList(latestInspection, "", ""))
            : ""}

          ${renderSection(
            "Recent findings and concerns",
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

/* -------------------------------- fetch -------------------------------- */

async function fetchAll(homeId) {
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
    safeGet(`/homes/${homeId}/quality-audits`),
    safeGet(`/homes/${homeId}/quality-audit-findings`),
    safeGet(`/homes/${homeId}/quality-audit-actions`),
    safeGet(`/homes/${homeId}/compliance-items`),
    safeGet(`/homes/${homeId}/reg44-visits`),
    safeGet(`/homes/${homeId}/reg44-findings`),
    safeGet(`/homes/${homeId}/reg44-actions`),
    safeGet(`/homes/${homeId}/reg45-reviews`),
    safeGet(`/homes/${homeId}/reg45-actions`),
    safeGet(`/homes/${homeId}/inspection-scores`),
    safeGet(`/homes/${homeId}/inspection-section-scores`),
    safeGet(`/homes/${homeId}/inspection-score-reasons`),
    safeGet(`/homes/${homeId}/inspection-lines-of-enquiry`),
    safeGet(`/homes/${homeId}/inspection-improvement-actions`),
    safeGet(`/homes/${homeId}/manager-review-queue`),
  ]);

  return {
    qualityAudits: pickItems(qualityAuditsRes, ["quality_audits", "items"]).map(
      mapQualityAudit
    ),
    qualityAuditFindings: pickItems(
      qualityAuditFindingsRes,
      ["quality_audit_findings", "items"]
    ).map(mapQualityAuditFinding),
    qualityAuditActions: pickItems(
      qualityAuditActionsRes,
      ["quality_audit_actions", "items"]
    ).map(mapQualityAuditAction),
    complianceItems: pickItems(
      complianceItemsRes,
      ["compliance_items", "items"]
    ).map(mapComplianceItem),
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
    inspectionScores: pickItems(
      inspectionScoresRes,
      ["inspection_scores", "items"]
    ).map(mapInspectionScore),
    inspectionSectionScores: pickItems(
      inspectionSectionScoresRes,
      ["inspection_section_scores", "items"]
    ).map(mapInspectionSectionScore),
    inspectionReasons: pickItems(
      inspectionReasonsRes,
      ["inspection_score_reasons", "items"]
    ).map(mapInspectionReason),
    inspectionLines: pickItems(
      inspectionLinesRes,
      ["inspection_lines_of_enquiry", "items"]
    ).map(mapInspectionLineOfEnquiry),
    inspectionActions: pickItems(
      inspectionActionsRes,
      ["inspection_improvement_actions", "items"]
    ).map(mapInspectionAction),
    managerReviewQueue: pickItems(
      managerReviewQueueRes,
      ["manager_review_queue", "items"]
    ).map(mapManagerReviewRecord),
  };
}

/* ------------------------------- selectors ------------------------------- */

function buildOverdueCompliance(data) {
  return sortSoonest(
    data.complianceItems.filter((item) => {
      const status = lower(item.status);
      return (
        !["completed", "closed", "resolved"].includes(status) &&
        isOverdue(item.due_date)
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
      const status = lower(item.workflow_status);
      return !["approved", "completed", "closed"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildLatestAudit(data) {
  return sortNewest(data.qualityAudits, ["audit_date", "created_at", "updated_at"]).slice(0, 1);
}

function buildLatestInspection(data) {
  return sortNewest(
    data.inspectionScores,
    ["period_end", "created_at", "updated_at"]
  ).slice(0, 1);
}

function buildUrgentInspectionActions(data) {
  return sortSoonest(
    data.inspectionActions.filter((item) => {
      const priority = lower(item.priority);
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
    ["created_at", "updated_at"]
  ).slice(0, 10);
}

function buildTimeline(data) {
  return sortNewest(
    [
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
    ],
    [
      "due_date",
      "audit_date",
      "visit_date",
      "review_period_end",
      "review_date",
      "period_end",
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
      "Select a home to view quality, compliance and readiness information."
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
    });

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
        ? `${safeText(titleCase(latestInspectionRecord.overall_band || "unknown"))} readiness`
        : `${overdueCompliance.length} compliance items overdue`,
      nextEvent: nextPriorityAction?.due_date
        ? formatDate(nextPriorityAction.due_date)
        : "No due quality action",
      lastRecord: recentTimeline[0]
        ? formatDate(
            recentTimeline[0].audit_date ||
              recentTimeline[0].visit_date ||
              recentTimeline[0].review_period_end ||
              recentTimeline[0].period_end ||
              recentTimeline[0].created_at
          )
        : "None",
      openActions: `${openQualityActions.length + reg44OpenActions.length + reg45OpenActions.length + urgentInspectionActions.length} quality actions open`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error(error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load quality",
      "Something went wrong while loading quality and readiness records."
    );
  }
}