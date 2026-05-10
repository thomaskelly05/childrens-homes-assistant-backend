import { normaliseToken, cleanText } from "./helpers.js";

export const RECORD_TYPES = Object.freeze({
  daily_note: "daily_note",
  incident: "incident",

  support_plan: "support_plan",
  support_plans: "support_plan",
  plan: "support_plan",
  plans: "support_plan",

  risk_assessment: "risk",
  risk: "risk",

  health_record: "health_record",
  health: "health_record",

  education_record: "education_record",
  education: "education_record",

  family_contact_record: "family_contact",
  family_contact: "family_contact",
  family: "family_contact",

  keywork_session: "keywork",
  keywork: "keywork",

  appointment: "appointment",
  achievement_record: "achievement_record",

  safeguarding_record: "safeguarding_record",
  safeguarding: "safeguarding_record",

  missing_episode: "missing_episode",

  chronology_event: "chronology_event",
  chronology: "chronology_event",

  compliance_item: "compliance_item",
  ai_generated_report: "ai_generated_report",
  monthly_review: "monthly_review",

  handover_record: "handover_record",
  handover: "handover_record",

  manager_action: "manager_action",
  task: "task",

  document: "document",
  statutory_document: "statutory_document",

  medication_profile: "medication_profile",
  medication_record: "medication_record",
});

export const RECORD_TABLES = Object.freeze({
  daily_note: "daily_notes",
  incident: "incidents",
  support_plan: "support_plans",
  risk: "risk_assessments",
  health_record: "health_records",
  education_record: "education_records",
  family_contact: "family_contact_records",
  keywork: "keywork_sessions",
  appointment: "young_person_appointments",
  achievement_record: "achievement_records",
  safeguarding_record: "safeguarding_records",
  missing_episode: "missing_episodes",
  chronology_event: "chronology_events",
  task: "tasks",
  document: "documents",
  statutory_document: "statutory_documents",
  handover_record: "handover_records",
  medication_profile: "medication_profiles",
  medication_record: "medication_records",
});

export const WORKSPACE_TO_RECORD_TYPE = Object.freeze({
  workspace: null,
  profile: null,

  plans: RECORD_TYPES.support_plan,
  "support-plans": RECORD_TYPES.support_plan,
  "support-plan": RECORD_TYPES.support_plan,

  "daily-notes": RECORD_TYPES.daily_note,
  "daily-life": RECORD_TYPES.daily_note,

  incidents: RECORD_TYPES.incident,
  incident: RECORD_TYPES.incident,

  safeguarding: RECORD_TYPES.safeguarding_record,

  risk: RECORD_TYPES.risk,
  "risk-assessments": RECORD_TYPES.risk,

  keywork: RECORD_TYPES.keywork,

  education: RECORD_TYPES.education_record,
  health: RECORD_TYPES.health_record,
  family: RECORD_TYPES.family_contact,

  documents: RECORD_TYPES.document,
  timeline: RECORD_TYPES.chronology_event,
  chronology: RECORD_TYPES.chronology_event,

  tasks: RECORD_TYPES.task,
  actions: RECORD_TYPES.task,

  medication: RECORD_TYPES.medication_record,
  handover: RECORD_TYPES.handover_record,
  appointments: RECORD_TYPES.appointment,
});

export const RECORD_TYPE_TO_WORKSPACE = Object.freeze({
  support_plan: "plans",
  daily_note: "daily-notes",
  incident: "incidents",
  safeguarding_record: "safeguarding",
  risk: "risk",
  keywork: "keywork",
  education_record: "education",
  health_record: "health",
  family_contact: "family",
  document: "documents",
  statutory_document: "documents",
  chronology_event: "timeline",
  task: "tasks",
  medication_record: "medication",
  handover_record: "handover",
  appointment: "appointments",
});

export const WORKFLOW_STATUS = Object.freeze({
  draft: "draft",
  active: "active",
  submitted: "submitted",
  pending_review: "pending_review",
  approved: "approved",
  returned: "returned",
  completed: "completed",
  archived: "archived",
  cancelled: "cancelled",
});

export const COMPLIANCE_STATUS = Object.freeze({
  pending: "pending",
  due_soon: "due_soon",
  overdue: "overdue",
  escalated: "escalated",
  completed: "completed",
});

export const ASSISTANT_SCOPE = Object.freeze({
  child: "child",
  young_person: "young_person",
  home: "home",
  quality: "quality",
  ofsted: "ofsted",
  global: "global",
});

export const ASSISTANT_RESPONSE_MODE = Object.freeze({
  concise: "concise",
  balanced: "balanced",
  deep: "deep",
});

export const ASSISTANT_ACTION_TYPE = Object.freeze({
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
});

export const WORKFLOW_ALIASES = Object.freeze({
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
});

export const SEVERITY_ALIASES = Object.freeze({
  low: "low",
  medium: "medium",
  moderate: "medium",
  high: "high",
  critical: "critical",
  urgent: "critical",
});

export const SIGNIFICANCE_ALIASES = Object.freeze({
  low: "low",
  medium: "medium",
  moderate: "medium",
  high: "high",
  critical: "critical",
  significant: "high",
});

export const RECORD_TYPE_ALIASES = Object.freeze({
  daily_note: RECORD_TYPES.daily_note,
  dailynote: RECORD_TYPES.daily_note,
  daily_notes: RECORD_TYPES.daily_note,
  daily_life: RECORD_TYPES.daily_note,

  incident: RECORD_TYPES.incident,
  incidents: RECORD_TYPES.incident,

  support_plan: RECORD_TYPES.support_plan,
  support_plans: RECORD_TYPES.support_plan,
  plan: RECORD_TYPES.support_plan,
  plans: RECORD_TYPES.support_plan,

  risk: RECORD_TYPES.risk,
  risk_assessment: RECORD_TYPES.risk,
  risk_assessments: RECORD_TYPES.risk,

  appointment: RECORD_TYPES.appointment,
  appointments: RECORD_TYPES.appointment,
  young_person_appointment: RECORD_TYPES.appointment,
  young_person_appointments: RECORD_TYPES.appointment,

  health: RECORD_TYPES.health_record,
  health_record: RECORD_TYPES.health_record,
  health_records: RECORD_TYPES.health_record,

  education: RECORD_TYPES.education_record,
  education_record: RECORD_TYPES.education_record,
  education_records: RECORD_TYPES.education_record,

  family: RECORD_TYPES.family_contact,
  family_contact: RECORD_TYPES.family_contact,
  family_contact_record: RECORD_TYPES.family_contact,
  family_contact_records: RECORD_TYPES.family_contact,

  keywork: RECORD_TYPES.keywork,
  keywork_session: RECORD_TYPES.keywork,
  keywork_sessions: RECORD_TYPES.keywork,

  safeguarding: RECORD_TYPES.safeguarding_record,
  safeguarding_record: RECORD_TYPES.safeguarding_record,
  safeguarding_records: RECORD_TYPES.safeguarding_record,

  missing: RECORD_TYPES.missing_episode,
  missing_episode: RECORD_TYPES.missing_episode,
  missing_episodes: RECORD_TYPES.missing_episode,
  missing_from_care: RECORD_TYPES.missing_episode,

  chronology: RECORD_TYPES.chronology_event,
  chronology_event: RECORD_TYPES.chronology_event,
  chronology_events: RECORD_TYPES.chronology_event,
  timeline: RECORD_TYPES.chronology_event,

  document: RECORD_TYPES.document,
  documents: RECORD_TYPES.document,

  statutory_document: RECORD_TYPES.statutory_document,
  statutory_documents: RECORD_TYPES.statutory_document,

  task: RECORD_TYPES.task,
  tasks: RECORD_TYPES.task,
  action: RECORD_TYPES.task,
  actions: RECORD_TYPES.task,

  handover: RECORD_TYPES.handover_record,
  handover_record: RECORD_TYPES.handover_record,
  handover_records: RECORD_TYPES.handover_record,

  medication: RECORD_TYPES.medication_record,
  medication_record: RECORD_TYPES.medication_record,
  medication_records: RECORD_TYPES.medication_record,
});

export const ASSISTANT_SCOPE_ALIASES = Object.freeze({
  child: ASSISTANT_SCOPE.child,
  young_person: ASSISTANT_SCOPE.young_person,
  youngperson: ASSISTANT_SCOPE.young_person,
  home: ASSISTANT_SCOPE.home,
  quality: ASSISTANT_SCOPE.quality,
  ofsted: ASSISTANT_SCOPE.ofsted,
  global: ASSISTANT_SCOPE.global,
});

export const ASSISTANT_RESPONSE_MODE_ALIASES = Object.freeze({
  concise: ASSISTANT_RESPONSE_MODE.concise,
  short: ASSISTANT_RESPONSE_MODE.concise,
  balanced: ASSISTANT_RESPONSE_MODE.balanced,
  standard: ASSISTANT_RESPONSE_MODE.balanced,
  deep: ASSISTANT_RESPONSE_MODE.deep,
  detailed: ASSISTANT_RESPONSE_MODE.deep,
});

const VALID_RECORD_TYPES = new Set(Object.values(RECORD_TYPES));
const VALID_WORKFLOW_STATUS = new Set(Object.values(WORKFLOW_STATUS));
const VALID_COMPLIANCE_STATUS = new Set(Object.values(COMPLIANCE_STATUS));
const VALID_ASSISTANT_SCOPE = new Set(Object.values(ASSISTANT_SCOPE));
const VALID_ASSISTANT_RESPONSE_MODE = new Set(
  Object.values(ASSISTANT_RESPONSE_MODE)
);
const VALID_ASSISTANT_ACTION_TYPE = new Set(
  Object.values(ASSISTANT_ACTION_TYPE)
);

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNullableString(value) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function toNullableId(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : value;
}

function normaliseEnum(value, aliases = {}, fallback = "") {
  const key = normaliseToken(value);
  if (!key) return fallback;
  return aliases[key] || fallback;
}

export function normaliseRecordType(value) {
  const key = normaliseToken(value);
  if (!key) return "";
  if (VALID_RECORD_TYPES.has(key)) return key;
  return RECORD_TYPE_ALIASES[key] || "";
}

export function getRecordTable(recordType) {
  const safeType = normaliseRecordType(recordType);
  return RECORD_TABLES[safeType] || null;
}

export function getWorkspaceRecordType(section) {
  const key = normaliseToken(section);
  return WORKSPACE_TO_RECORD_TYPE[key] || null;
}

export function getRecordTypeWorkspace(recordType) {
  const safeType = normaliseRecordType(recordType);
  return RECORD_TYPE_TO_WORKSPACE[safeType] || "workspace";
}

export function normaliseWorkflowStatus(value) {
  return normaliseEnum(value, WORKFLOW_ALIASES, "");
}

export function normaliseComplianceStatus(value) {
  const key = normaliseToken(value);
  if (!key) return "";
  return VALID_COMPLIANCE_STATUS.has(key) ? key : "";
}

export function normaliseSeverity(value) {
  return normaliseEnum(value, SEVERITY_ALIASES, "");
}

export function normaliseSignificance(value) {
  return normaliseEnum(value, SIGNIFICANCE_ALIASES, "");
}

export function normaliseAssistantScope(value) {
  return normaliseEnum(value, ASSISTANT_SCOPE_ALIASES, ASSISTANT_SCOPE.global);
}

export function normaliseAssistantResponseMode(value) {
  return normaliseEnum(
    value,
    ASSISTANT_RESPONSE_MODE_ALIASES,
    ASSISTANT_RESPONSE_MODE.balanced
  );
}

export function normaliseAssistantActionType(value) {
  const key = normaliseToken(value);
  if (!key) return ASSISTANT_ACTION_TYPE.summarise_section;
  return VALID_ASSISTANT_ACTION_TYPE.has(key)
    ? key
    : ASSISTANT_ACTION_TYPE.summarise_section;
}

export function isRecordType(value) {
  return Boolean(normaliseRecordType(value));
}

export function isWorkflowStatus(value) {
  return VALID_WORKFLOW_STATUS.has(cleanText(value));
}

export function isComplianceStatus(value) {
  return VALID_COMPLIANCE_STATUS.has(cleanText(value));
}

export function isAssistantScope(value) {
  return VALID_ASSISTANT_SCOPE.has(cleanText(value));
}

export function isAssistantResponseMode(value) {
  return VALID_ASSISTANT_RESPONSE_MODE.has(cleanText(value));
}

export function createAssistantSource(source = {}) {
  const safe = safeObject(source);
  const recordType = normaliseRecordType(safe.record_type);

  return {
    type: cleanText(safe.type) || "source",
    label:
      cleanText(safe.label) ||
      cleanText(safe.title) ||
      cleanText(safe.document_title) ||
      "Source",
    excerpt: cleanText(safe.excerpt),
    section: cleanText(safe.section),
    page_number:
      safe.page_number !== null &&
      safe.page_number !== undefined &&
      safe.page_number !== ""
        ? safe.page_number
        : null,
    record_type: recordType || toNullableString(safe.record_type),
    record_id: toNullableId(safe.record_id ?? safe.source_id ?? safe.id),
    url: toNullableString(safe.url),
    citation_ref: toNullableString(safe.citation_ref),
    description:
      cleanText(safe.description) ||
      cleanText(safe.summary) ||
      cleanText(safe.excerpt) ||
      "",
    created_at: safe.created_at || safe.date || null,
    evidence_kind: cleanText(safe.evidence_kind) || "direct",
  };
}

export function createAssistantAction(action = {}) {
  const safe = safeObject(action);

  return {
    type: normaliseAssistantActionType(safe.type),
    label: cleanText(safe.label) || "Suggested action",
    section: toNullableString(safe.section),
    record_type:
      normaliseRecordType(safe.record_type) || toNullableString(safe.record_type),
    record_id: toNullableId(safe.record_id),
    payload: safe.payload && typeof safe.payload === "object" ? safe.payload : null,
  };
}

export function createAssistantRuntime(runtime = {}) {
  const safe = safeObject(runtime);

  return {
    mode: cleanText(safe.mode) || "standard",
    provider: toNullableString(safe.provider),
    model: toNullableString(safe.model),
    latency_ms:
      typeof safe.latency_ms === "number" && Number.isFinite(safe.latency_ms)
        ? safe.latency_ms
        : null,
    cached: Boolean(safe.cached),
    intent: toNullableString(safe.intent),
    retrieval_mode: toNullableString(safe.retrieval_mode),
    output_mode: toNullableString(safe.output_mode),
    analysis_lens: toNullableString(safe.analysis_lens),
    evidence_count:
      typeof safe.evidence_count === "number" && Number.isFinite(safe.evidence_count)
        ? safe.evidence_count
        : null,
    chronology_count:
      typeof safe.chronology_count === "number" &&
      Number.isFinite(safe.chronology_count)
        ? safe.chronology_count
        : null,
    confidence: toNullableString(safe.confidence),
  };
}

export function createAssistantExplainability(explainability = {}) {
  const safe = safeObject(explainability);

  return {
    scope: toNullableString(safe.scope),
    section: toNullableString(safe.section),
    reasoning_summary: cleanText(safe.reasoning_summary),
    evidence_summary: cleanText(safe.evidence_summary),
    safety_notes: safeArray(safe.safety_notes)
      .map((item) => cleanText(item))
      .filter(Boolean),
    analysis_lens: toNullableString(safe.analysis_lens),
    fallback_used: Boolean(safe.fallback_used),
    key_concerns: safeArray(safe.key_concerns)
      .map((item) => cleanText(item))
      .filter(Boolean),
  };
}

export function createAssistantResponse(response = {}) {
  const safe = safeObject(response);

  return {
    answer: cleanText(safe.answer),
    summary: cleanText(safe.summary),
    sources: safeArray(safe.sources).map(createAssistantSource),
    suggested_actions: safeArray(safe.suggested_actions).map(createAssistantAction),
    runtime: createAssistantRuntime(safe.runtime || {}),
    explainability: createAssistantExplainability(safe.explainability || {}),
    warnings: safeArray(safe.warnings)
      .map((item) => cleanText(item))
      .filter(Boolean),
    assistant_scope:
      safe.assistant_scope && typeof safe.assistant_scope === "object"
        ? safe.assistant_scope
        : {},
    assistant_context:
      safe.assistant_context && typeof safe.assistant_context === "object"
        ? safe.assistant_context
        : {},
  };
}
