export const RECORD_TYPES = {
  daily_note: "daily_note",
  incident: "incident",
  support_plan: "support_plan",
  risk_assessment: "risk",
  health_record: "health_record",
  education_record: "education_record",
  family_contact_record: "family_contact",
  keywork_session: "keywork",
  appointment: "appointment",
  achievement_record: "achievement_record",
  safeguarding_record: "safeguarding_record",
  missing_episode: "missing_episode",
  chronology_event: "chronology_event",
  compliance_item: "compliance_item",
  ai_generated_report: "ai_generated_report",
  monthly_review: "monthly_review",
  handover_record: "handover_record",
  manager_action: "manager_action",
  task: "task",
  medication_profile: "medication_profile",
  medication_record: "medication_record",
};

export const WORKFLOW_STATUS = {
  draft: "draft",
  active: "active",
  submitted: "submitted",
  pending_review: "pending_review",
  approved: "approved",
  returned: "returned",
  completed: "completed",
  archived: "archived",
  cancelled: "cancelled",
};

export const COMPLIANCE_STATUS = {
  pending: "pending",
  due_soon: "due_soon",
  overdue: "overdue",
  escalated: "escalated",
  completed: "completed",
};

const WORKFLOW_ALIASES = {
  draft: WORKFLOW_STATUS.draft,
  open: WORKFLOW_STATUS.active,
  active: WORKFLOW_STATUS.active,
  in_progress: WORKFLOW_STATUS.active,
  progress: WORKFLOW_STATUS.active,

  submitted: WORKFLOW_STATUS.submitted,
  pending_review: WORKFLOW_STATUS.pending_review,
  pendingreview: WORKFLOW_STATUS.pending_review,
  review: WORKFLOW_STATUS.pending_review,
  awaiting_review: WORKFLOW_STATUS.pending_review,
  awaitingreview: WORKFLOW_STATUS.pending_review,

  approved: WORKFLOW_STATUS.approved,
  complete: WORKFLOW_STATUS.completed,
  completed: WORKFLOW_STATUS.completed,
  done: WORKFLOW_STATUS.completed,

  returned: WORKFLOW_STATUS.returned,
  sent_back: WORKFLOW_STATUS.returned,
  rejected: WORKFLOW_STATUS.returned,

  archived: WORKFLOW_STATUS.archived,
  cancelled: WORKFLOW_STATUS.cancelled,
  canceled: WORKFLOW_STATUS.cancelled,
};

const SEVERITY_ALIASES = {
  low: "low",
  medium: "medium",
  moderate: "medium",
  high: "high",
  critical: "critical",
  urgent: "critical",
};

const SIGNIFICANCE_ALIASES = {
  low: "low",
  medium: "medium",
  moderate: "medium",
  high: "high",
  critical: "critical",
  significant: "high",
};

export function normaliseWorkflowStatus(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

  return WORKFLOW_ALIASES[key] || key || "";
}

export function normaliseSeverity(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

  return SEVERITY_ALIASES[key] || key || "";
}

export function normaliseSignificance(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

  return SIGNIFICANCE_ALIASES[key] || key || "";
}