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

function qualityVisibilityPath(homeId) {
  if (homeId) {
    return `/visibility/quality?home_id=${encodeURIComponent(homeId)}&all_accessible_homes=false`;
  }
  return "/visibility/quality?all_accessible_homes=true";
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

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

async function fetchVisibility(homeId) {
  const path = qualityVisibilityPath(homeId);
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
    const aDate = a?.[dateKey]
      ? new Date(a[dateKey]).getTime()
      : Number.POSITIVE_INFINITY;
    const bDate = b?.[dateKey]
      ? new Date(b[dateKey]).getTime()
      : Number.POSITIVE_INFINITY;
    return aDate - bDate;
  });
}

function dedupeBy(items = [], keyBuilder) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyBuilder(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
      "problematic",
      "red",
      "unsafe",
      "declined",
      "cancelled",
      "late",
      "stale",
      "missing",
      "critical_action",
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
      "ri",
      "review_due",
      "awaiting_approval",
      "requires_improvement",
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
      "current",
      "compliant",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

/* ------------------------------ demo fallback ----------------------------- */

function buildFallbackData(homeId) {
  const now = new Date();

  const plusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const minusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return {
    qualityAudits: [
      mapQualityAudit({
        id: "qa-1",
        home_id: homeId,
        audit_type: "monthly_quality_audit",
        audit_title: "Monthly quality audit",
        audit_date: minusDays(10),
        overall_outcome: "good",
        summary:
          "Overall practice remains stable with clear routines, improved recording consistency and some gaps in review timeliness.",
        strengths:
          "Daily recording quality improved. Team oversight is stronger. Safer escalation pathways are evident.",
        concerns:
          "Two review-sensitive actions remain open and one compliance item is overdue.",
        recommendations:
          "Close overdue action, refresh supervision follow-up, and improve document review discipline.",
        status: "completed",
        created_at: minusDays(10),
        updated_at: minusDays(9),
      }),
    ],

    qualityAuditFindings: [
      mapQualityAuditFinding({
        id: "qf-1",
        audit_id: "qa-1",
        home_id: homeId,
        finding_type: "concern",
        priority: "high",
        title: "Review dates not consistently closed",
        details:
          "A small number of review-linked items remained open beyond target date.",
        action_required: true,
        created_at: minusDays(9),
      }),
      mapQualityAuditFinding({
        id: "qf-2",
        audit_id: "qa-1",
        home_id: homeId,
        finding_type: "strength",
        priority: "medium",
        title: "Improved recording consistency",
        details:
          "Daily records show stronger chronology and clearer professional language.",
        action_required: false,
        created_at: minusDays(8),
      }),
    ],

    qualityAuditActions: [
      mapQualityAuditAction({
        id: "qaa-1",
        quality_audit_id: "qa-1",
        home_id: homeId,
        action_title: "Close overdue review items",
        action_description:
          "Resolve overdue compliance and document review items.",
        priority: "high",
        due_date: plusDays(2),
        status: "open",
        created_at: minusDays(7),
        updated_at: minusDays(6),
      }),
      mapQualityAuditAction({
        id: "qaa-2",
        quality_audit_id: "qa-1",
        home_id: homeId,
        action_title: "Refresh manager oversight tracker",
        action_description:
          "Tighten weekly oversight of open quality actions.",
        priority: "medium",
        due_date: plusDays(6),
        status: "in_progress",
        created_at: minusDays(6),
        updated_at: minusDays(5),
      }),
    ],

    complianceItems: [
      mapComplianceItem({
        id: "ci-1",
        home_id: homeId,
        title: "Statement of purpose review overdue",
        due_date: minusDays(3),
        status: "overdue",
        severity: "high",
        escalation_level: 2,
        created_at: minusDays(12),
        updated_at: minusDays(3),
      }),
      mapComplianceItem({
        id: "ci-2",
        home_id: homeId,
        title: "Annex A update due soon",
        due_date: plusDays(4),
        status: "due_soon",
        severity: "medium",
        escalation_level: 1,
        created_at: minusDays(5),
        updated_at: minusDays(2),
      }),
    ],

    reg44Visits: [
      mapReg44Visit({
        id: "r44-1",
        home_id: homeId,
        visit_date: minusDays(14),
        independent_person_name: "Jane Porter",
        overall_summary:
          "Visit noted warm interactions and predictable routines, with a recommendation to improve evidence of action closure.",
        recommendations_summary:
          "Strengthen tracking of action completion and documentary evidence.",
        created_at: minusDays(14),
        updated_at: minusDays(13),
      }),
    ],

    reg44Findings: [
      mapReg44Finding({
        id: "r44f-1",
        reg44_visit_id: "r44-1",
        finding_type: "recommendation",
        judgement_area: "leadership_and_management",
        finding_text:
          "Action tracking requires greater consistency to evidence completion.",
        priority: "medium",
        requires_action: true,
        created_at: minusDays(13),
      }),
    ],

    reg44Actions: [
      mapReg44Action({
        id: "r44a-1",
        reg44_finding_id: "r44f-1",
        home_id: homeId,
        action_title: "Evidence completion of Reg 44 actions",
        action_description:
          "Upload closure evidence and confirm review of outstanding items.",
        due_date: plusDays(3),
        status: "open",
        created_at: minusDays(12),
      }),
    ],

    reg45Reviews: [
      mapReg45Review({
        id: "r45-1",
        home_id: homeId,
        review_period_start: minusDays(90),
        review_period_end: minusDays(1),
        review_status: "approved",
        overall_quality_summary:
          "Service quality remains broadly positive with improved consistency in practice and ongoing attention required around tracking and review completion.",
        action_plan_summary:
          "Action plan includes documentation freshness, action closure, and sharper audit follow-through.",
        created_at: minusDays(2),
        updated_at: minusDays(1),
      }),
    ],

    reg45Actions: [
      mapReg45Action({
        id: "r45a-1",
        reg45_review_id: "r45-1",
        home_id: homeId,
        action_title: "Complete quarterly action plan review",
        action_description:
          "Check progress across all open quality actions and update evidence.",
        due_date: plusDays(5),
        priority: "medium",
        status: "open",
        created_at: minusDays(1),
      }),
    ],

    inspectionScores: [
      mapInspectionScore({
        id: "is-1",
        home_id: homeId,
        period_start: minusDays(30),
        period_end: minusDays(1),
        overall_band: "good",
        overall_score: 73.4,
        confidence_score: 78.2,
        data_completeness_score: 80.1,
        evidence_freshness_score: 69.8,
        limiting_judgement_triggered: false,
        narrative_summary:
          "Current evidence suggests a good profile overall, with leadership strengthened but action closure still affecting readiness confidence.",
        strengths_summary:
          "Safer routines, stronger chronology, improved leadership grip.",
        concerns_summary:
          "Some evidence freshness and action completion gaps remain.",
        created_at: minusDays(1),
        updated_at: minusDays(1),
      }),
    ],

    inspectionSectionScores: [
      mapInspectionSectionScore({
        id: "iss-1",
        inspection_score_id: "is-1",
        section_code: "leadership_management",
        section_name: "Leadership and management",
        score_value: 71.2,
        score_band: "good",
        confidence_score: 76.0,
        summary_text: "Leadership is stable but some actions remain live.",
        strengths_text: "Clear oversight and better quality assurance rhythm.",
        concerns_text: "Need stronger action closure evidence.",
        created_at: minusDays(1),
      }),
      mapInspectionSectionScore({
        id: "iss-2",
        inspection_score_id: "is-1",
        section_code: "helped_protected",
        section_name: "Helped and protected",
        score_value: 75.8,
        score_band: "good",
        confidence_score: 80.5,
        summary_text: "Safeguarding systems are consistent and visible.",
        strengths_text: "Risk awareness and escalation are clear.",
        concerns_text: "",
        created_at: minusDays(1),
      }),
    ],

    inspectionReasons: [
      mapInspectionReason({
        id: "ir-1",
        inspection_score_id: "is-1",
        section_score_id: "iss-1",
        reason_type: "concern",
        priority: 1,
        title: "Action closure evidence is inconsistent",
        description:
          "A small number of actions remain live without clear closure evidence.",
        impact_weight: 8.4,
        created_at: minusDays(1),
      }),
    ],

    inspectionLines: [
      mapInspectionLineOfEnquiry({
        id: "ile-1",
        inspection_score_id: "is-1",
        home_id: homeId,
        priority: "high",
        line_of_enquiry:
          "How consistently are improvement actions tracked to completion?",
        rationale:
          "Recent quality and Reg 44 activity indicates action closure evidence is variable.",
        status: "open",
        due_date: plusDays(4),
        created_at: minusDays(1),
      }),
    ],

    inspectionActions: [
      mapInspectionAction({
        id: "ia-1",
        inspection_score_id: "is-1",
        line_of_enquiry_id: "ile-1",
        home_id: homeId,
        action_title: "Evidence action completion in quality tracker",
        action_description:
          "Update quality tracker with closure notes and linked evidence.",
        action_type: "quality_improvement",
        priority: "high",
        due_date: plusDays(2),
        status: "open",
        evidence_required: "Closure note and linked documentary evidence.",
        created_at: minusDays(1),
      }),
      mapInspectionAction({
        id: "ia-2",
        inspection_score_id: "is-1",
        line_of_enquiry_id: "ile-1",
        home_id: homeId,
        action_title: "Refresh readiness evidence pack",
        action_description:
          "Bring freshness of evidence pack up to date for current cycle.",
        action_type: "inspection_readiness",
        priority: "medium",
        due_date: plusDays(7),
        status: "planned",
        created_at: minusDays(1),
      }),
    ],

    managerReviewQueue: [
      mapManagerReviewRecord({
        id: "mrq-1",
        home_id: homeId,
        source_table: "quality_audit_actions",
        source_id: "qaa-1",
        record_type: "quality_action",
        workflow_status: "awaiting_review",
        priority: "high",
        due_date: plusDays(1),
        review_reason: "Manager sign-off needed on closure evidence.",
        created_at: minusDays(1),
      }),
    ],
  };
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
    summary: record.details || "Audit finding recorded.",
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
    summary:
      record.action_description ||
      record.completion_notes ||
      "Quality action recorded.",
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
    home_id: record.home_id || null,
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
    title: `Reg 44 visit${
      record.visit_date ? ` - ${formatDate(record.visit_date)}` : ""
    }`,
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
    summary: record.action_description || "Reg 44 action recorded.",
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
    summary: record.description || "Inspection reason recorded.",
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
      ${
        hint
          ? `<div class="overview-stat-subtle">${safeText(hint)}</div>`
          : ""
      }
    </article>
  `;
}

function renderPanelSection(title, content) {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      ${content}
    </section>
  `;
}

function signalTone(signal = {}) {
  const token = lower(signal.severity || "");
  if (["critical", "high"].includes(token)) return "danger";
  if (token === "medium") return "warning";
  if (token === "low") return "success";
  return "muted";
}

function renderVisibilitySignals(signals = []) {
  if (!signals.length) {
    return `
      <div class="empty-state">
        <p>No active quality escalation signals are currently showing.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${signals
        .slice(0, 6)
        .map(
          (signal) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${safeText(signal.title || "Quality signal")}</div>
                <div class="record-row-summary">${safeText(
                  signal.description || "Quality signal needs attention."
                )}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(signalTone(signal))}">
                  ${safeText(signal.count ?? 0)}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
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
          <div class="record-card-meta">${safeText(
            formatDateTime(primaryDate, "No date")
          )}</div>
        </div>
        ${
          status
            ? `<span class="${badgeClass(status)}">${safeText(
                titleCase(status)
              )}</span>`
            : ""
        }
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.priority
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Priority</div>
                  <div class="details-grid-value">${safeText(
                    titleCase(item.priority)
                  )}</div>
                </div>
              `
              : ""
          }

          ${
            item.due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due date</div>
                  <div class="details-grid-value">${safeText(
                    formatDate(item.due_date)
                  )}</div>
                </div>
              `
              : ""
          }

          ${
            item.overall_score !== null && item.overall_score !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Overall score</div>
                  <div class="details-grid-value">${safeText(
                    toNumber(item.overall_score).toFixed(1)
                  )}</div>
                </div>
              `
              : ""
          }

          ${
            item.confidence_score !== null && item.confidence_score !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Confidence</div>
                  <div class="details-grid-value">${safeText(
                    toNumber(item.confidence_score).toFixed(1)
                  )}</div>
                </div>
              `
              : ""
          }

          ${
            item.section_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Section</div>
                  <div class="details-grid-value">${safeText(
                    item.section_name
                  )}</div>
                </div>
              `
              : ""
          }

          ${
            item.owner_user_id
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">User #${safeText(
                    item.owner_user_id
                  )}</div>
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

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent quality issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 6)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title || "Quality issue")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
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
              <div class="timeline-item-date">${safeText(
                formatDateTime(dateValue, "No date")
              )}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  ${
                    status
                      ? `<span class="${badgeClass(status)}">${safeText(
                          titleCase(status)
                        )}</span>`
                      : ""
                  }
                </div>
                <div class="timeline-item-summary">${safeText(
                  item.summary || ""
                )}</div>
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
    priorityItems,
    visibilitySignals,
    isFallback,
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
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live quality endpoints are available.</p>`
              : ""
          }
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
          ${renderPanelSection(
            "Urgent inspection actions",
            renderCardList(
              urgentInspectionActions,
              "No urgent inspection actions",
              "There are no urgent inspection actions recorded for this home."
            )
          )}

          ${renderPanelSection(
            "Open lines of enquiry",
            renderCardList(
              openLinesOfEnquiry,
              "No open lines of enquiry",
              "There are no current open lines of enquiry."
            )
          )}

          ${renderPanelSection(
            "Overdue compliance items",
            renderCardList(
              overdueCompliance,
              "No overdue compliance",
              "There are no overdue compliance items at the moment."
            )
          )}

          ${renderPanelSection("Quality timeline", renderTimeline(recentTimeline))}
        </div>

        <aside>
          ${renderPanelSection(
            "Visibility signals",
            renderVisibilitySignals(visibilitySignals)
          )}

          ${renderPanelSection("Needs attention", renderPriorityList(priorityItems))}

          ${renderPanelSection(
            "Open quality audit actions",
            renderCardList(
              openQualityActions,
              "No open quality actions",
              "There are no open quality audit actions recorded."
            )
          )}

          ${renderPanelSection(
            "Reg 44 open actions",
            renderCardList(
              reg44OpenActions,
              "No Reg 44 actions open",
              "There are no outstanding Reg 44 actions currently open."
            )
          )}

          ${renderPanelSection(
            "Reg 45 open actions",
            renderCardList(
              reg45OpenActions,
              "No Reg 45 actions open",
              "There are no outstanding Reg 45 actions currently open."
            )
          )}

          ${renderPanelSection(
            "Manager review queue",
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
                  renderCardList(latestAudit, "", "")
                )
              : ""
          }

          ${
            latestInspection.length
              ? renderPanelSection(
                  "Latest inspection readiness",
                  renderCardList(latestInspection, "", "")
                )
              : ""
          }

          ${renderPanelSection(
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
      "items",
    ]).map(mapInspectionReason),
    inspectionLines: pickItems(inspectionLinesRes, [
      "inspection_lines_of_enquiry",
      "items",
    ]).map(mapInspectionLineOfEnquiry),
    inspectionActions: pickItems(inspectionActionsRes, [
      "inspection_improvement_actions",
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

  if (hasLiveData(live)) {
    return { ...live, isFallback: false };
  }

  return {
    ...buildFallbackData(homeId),
    isFallback: true,
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
  return sortNewest(data.qualityAudits, ["audit_date", "created_at", "updated_at"]).slice(
    0,
    1
  );
}

function buildLatestInspection(data) {
  return sortNewest(data.inspectionScores, ["period_end", "created_at", "updated_at"]).slice(
    0,
    1
  );
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
    [...data.qualityAuditFindings, ...data.reg44Findings, ...data.inspectionReasons],
    ["created_at", "updated_at"]
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
    .filter((item) => ["high", "critical"].includes(lower(item.priority)))
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
  return sortNewest(
    dedupeBy(
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
      (item) =>
        `${item.record_type}:${item.id}:${item.title || ""}:${item.created_at || ""}`
    ),
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

/* ------------------------------ ui states -------------------------------- */

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
    <div class="loading-state">
      <div class="spinner"></div>
    </div>
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

/* -------------------------------- public -------------------------------- */

export async function loadQualityDashboard() {
  return loadCurrentView();
}

export async function loadQuality() {
  return loadCurrentView();
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const [data, visibility] = await Promise.all([
      fetchDataset(homeId),
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
      isFallback: data.isFallback,
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
      today: data.isFallback
        ? `${overdueCompliance.length} quality issues • preview mode`
        : latestInspectionRecord
        ? `${safeText(
            titleCase(latestInspectionRecord.overall_band || "unknown")
          )} readiness`
        : `${overdueCompliance.length} compliance items overdue`,
      nextEvent: nextPriorityAction?.due_date
        ? `Due ${formatDate(nextPriorityAction.due_date)}`
        : "No due quality action",
      lastRecord: recentTimeline[0]
        ? `Latest quality activity ${formatDate(
            recentTimeline[0].audit_date ||
              recentTimeline[0].visit_date ||
              recentTimeline[0].review_period_end ||
              recentTimeline[0].period_end ||
              recentTimeline[0].created_at
          )}`
        : data.isFallback
        ? "Preview quality data loaded"
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
