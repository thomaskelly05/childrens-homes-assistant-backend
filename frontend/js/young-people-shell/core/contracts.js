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

export const ASSISTANT_SCOPE = {
  child: "child",
  home: "home",
  quality: "quality",
  young_person: "young_person",
  global: "global",
};

export const ASSISTANT_RESPONSE_MODE = {
  concise: "concise",
  balanced: "balanced",
  deep: "deep",
};

export const ASSISTANT_ACTION_TYPE = {
  summarise_section: "summarise_section",
  draft_handover: "draft_handover",
  draft_note: "draft_note",
  draft_summary: "draft_summary",
  create_task: "create_task",
  open_record: "open_record",
  open_section: "open_section",
  review_incidents: "review_incidents",
  review_compliance: "review_compliance",
  review_documents: "review_documents",
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

const ASSISTANT_SCOPE_ALIASES = {
  child: ASSISTANT_SCOPE.child,
  young_person: ASSISTANT_SCOPE.young_person,
  youngperson: ASSISTANT_SCOPE.young_person,
  home: ASSISTANT_SCOPE.home,
  quality: ASSISTANT_SCOPE.quality,
  global: ASSISTANT_SCOPE.global,
};

const ASSISTANT_RESPONSE_MODE_ALIASES = {
  concise: ASSISTANT_RESPONSE_MODE.concise,
  short: ASSISTANT_RESPONSE_MODE.concise,
  balanced: ASSISTANT_RESPONSE_MODE.balanced,
  standard: ASSISTANT_RESPONSE_MODE.balanced,
  deep: ASSISTANT_RESPONSE_MODE.deep,
  detailed: ASSISTANT_RESPONSE_MODE.deep,
};

function normaliseToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function normaliseWorkflowStatus(value) {
  const key = normaliseToken(value);
  return WORKFLOW_ALIASES[key] || key || "";
}

export function normaliseSeverity(value) {
  const key = normaliseToken(value);
  return SEVERITY_ALIASES[key] || key || "";
}

export function normaliseSignificance(value) {
  const key = normaliseToken(value);
  return SIGNIFICANCE_ALIASES[key] || key || "";
}

export function normaliseAssistantScope(value) {
  const key = normaliseToken(value);
  return ASSISTANT_SCOPE_ALIASES[key] || key || ASSISTANT_SCOPE.global;
}

export function normaliseAssistantResponseMode(value) {
  const key = normaliseToken(value);
  return ASSISTANT_RESPONSE_MODE_ALIASES[key] || key || ASSISTANT_RESPONSE_MODE.balanced;
}

export function createAssistantSource(source = {}) {
  return {
    type: source.type || "source",
    label: source.label || source.title || source.document_title || "Source",
    excerpt: source.excerpt || "",
    section: source.section || "",
    page_number:
      source.page_number != null && source.page_number !== ""
        ? source.page_number
        : null,
    record_type: source.record_type || null,
    record_id: source.record_id || source.source_id || source.id || null,
    url: source.url || null,
  };
}

export function createAssistantAction(action = {}) {
  return {
    type: action.type || ASSISTANT_ACTION_TYPE.summarise_section,
    label: action.label || "Suggested action",
    section: action.section || null,
    record_type: action.record_type || null,
    record_id: action.record_id || null,
    payload: action.payload || null,
  };
}

export function createAssistantRuntime(runtime = {}) {
  return {
    mode: runtime.mode || "standard",
    provider: runtime.provider || null,
    model: runtime.model || null,
    latency_ms: runtime.latency_ms ?? null,
    cached: Boolean(runtime.cached),
  };
}

export function createAssistantExplainability(explainability = {}) {
  return {
    scope: explainability.scope || null,
    section: explainability.section || null,
    reasoning_summary: explainability.reasoning_summary || "",
    evidence_summary: explainability.evidence_summary || "",
    safety_notes: Array.isArray(explainability.safety_notes)
      ? explainability.safety_notes
      : [],
  };
}

export function createAssistantResponse(response = {}) {
  return {
    answer: response.answer || "",
    summary: response.summary || "",
    sources: Array.isArray(response.sources)
      ? response.sources.map(createAssistantSource)
      : [],
    suggested_actions: Array.isArray(response.suggested_actions)
      ? response.suggested_actions.map(createAssistantAction)
      : [],
    runtime: createAssistantRuntime(response.runtime || {}),
    explainability: createAssistantExplainability(response.explainability || {}),
    warnings: Array.isArray(response.warnings) ? response.warnings : [],
    assistant_scope: response.assistant_scope || {},
    assistant_context: response.assistant_context || {},
  };
}
