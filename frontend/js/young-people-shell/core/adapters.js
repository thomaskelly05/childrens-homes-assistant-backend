import {
  getDisplayName,
  normaliseImagePath,
} from "./utils.js";
import {
  pickFirst,
  arrayify,
  toBool,
  cleanText,
  truncateText,
  toJsonObject,
  toJsonArray,
  unique,
  compactTextList,
  parseDateValue,
  isOverdue,
  isDueSoon,
  normaliseToken,
} from "./helpers.js";
import {
  RECORD_TYPES,
  WORKFLOW_STATUS,
  COMPLIANCE_STATUS,
  normaliseRecordType,
  getRecordTypeWorkspace,
  normaliseWorkflowStatus,
  normaliseSeverity,
  normaliseSignificance,
} from "./contracts.js";

function joinSignals(parts = []) {
  return parts
    .map((part) => normaliseToken(part))
    .filter(Boolean)
    .join(":");
}

function compact(values = []) {
  return compactTextList(values);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeString(value, fallback = "") {
  const cleaned = cleanText(value);
  return cleaned || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function canonicalRecordType(value, fallback = "record") {
  return normaliseRecordType(value) || cleanText(value) || fallback;
}

function safeJsonObject(value) {
  return toJsonObject(value) || {};
}

function safeJsonArray(value) {
  return toJsonArray(value) || [];
}

function toDateValue(...values) {
  for (const value of values) {
    const parsed = parseDateValue(value);
    if (parsed) return parsed;
  }
  return null;
}

function getId(raw = {}) {
  const safe = safeObject(raw);
  return pickFirst(
    safe.id,
    safe.record_id,
    safe.source_id,
    safe.task_id,
    safe.document_id,
    safe.young_person_id
  );
}

function getYoungPersonId(raw = {}) {
  const safe = safeObject(raw);
  return pickFirst(
    safe.young_person_id,
    safe.child_id,
    safe.person_id,
    safe.yp_id
  );
}

function getHomeId(raw = {}) {
  const safe = safeObject(raw);
  return pickFirst(safe.home_id, safe.homeId, safe.setting_id);
}

function buildBaseRecord(raw = {}, overrides = {}) {
  const safe = safeObject(raw);
  const overrideSafe = safeObject(overrides);

  const recordType = canonicalRecordType(
    overrideSafe.record_type ?? safe.record_type ?? safe.type,
    "record"
  );

  const title =
    safeString(overrideSafe.title) ||
    safeString(safe.title) ||
    safeString(safe.name) ||
    safeString(safe.subject) ||
    safeString(safe.summary) ||
    safeString(safe.description) ||
    "Untitled record";

  const date =
    overrideSafe.date ??
    safe.date ??
    safe.created_at ??
    safe.updated_at ??
    safe.completed_at ??
    safe.due_date ??
    null;

  return {
    ...safe,
    ...overrideSafe,
    id: overrideSafe.id ?? safe.id ?? safe.record_id ?? safe.source_id ?? null,
    record_id:
      overrideSafe.record_id ?? safe.record_id ?? safe.id ?? safe.source_id ?? null,
    record_type: recordType,
    young_person_id:
      overrideSafe.young_person_id ?? getYoungPersonId(safe) ?? null,
    home_id: overrideSafe.home_id ?? getHomeId(safe) ?? null,
    title,
    label: safeString(overrideSafe.label) || safeString(safe.label) || title,
    summary:
      safeString(overrideSafe.summary) ||
      safeString(safe.summary) ||
      safeString(safe.description) ||
      safeString(safe.notes) ||
      "",
    description:
      safeString(overrideSafe.description) ||
      safeString(safe.description) ||
      safeString(safe.summary) ||
      "",
    date,
    created_at: overrideSafe.created_at ?? safe.created_at ?? date,
    updated_at: overrideSafe.updated_at ?? safe.updated_at ?? null,
    status:
      normaliseWorkflowStatus(overrideSafe.status ?? safe.status) ||
      safeString(overrideSafe.status) ||
      safeString(safe.status),
    severity:
      normaliseSeverity(overrideSafe.severity ?? safe.severity) ||
      safeString(overrideSafe.severity) ||
      safeString(safe.severity),
    significance:
      normaliseSignificance(overrideSafe.significance ?? safe.significance) ||
      safeString(overrideSafe.significance) ||
      safeString(safe.significance),
    section:
      safeString(overrideSafe.section) ||
      safeString(safe.section) ||
      inferSectionFromRecordType(recordType, safe),
  };
}

export function inferSectionFromRecordType(recordType = "", raw = {}) {
  const safeRecordType = canonicalRecordType(recordType, "");

  const map = {
    daily_note: "daily-notes",
    incident: "incidents",
    safeguarding_record: "safeguarding",
    risk: "risk",
    health_record: "health",
    education_record: "education",
    family_contact: "family",
    keywork: "keywork",
    appointment: "appointments",
    achievement_record: "achievements",
    missing_episode: "missing",
    chronology_event: "timeline",
    compliance_item: "compliance",
    ai_generated_report: "reports",
    monthly_review: "reviews",
    handover_record: "handover",
    manager_action: "actions",
    task: "tasks",
    document: "documents",
    statutory_document: "documents",
    medication_profile: "medication",
    medication_record: "medication",
  };

  if (map[safeRecordType]) return map[safeRecordType];

  const safe = safeObject(raw);
  if (safe.section) return cleanText(safe.section);

  return getRecordTypeWorkspace(safeRecordType) || "workspace";
}

export function mapDailyNote(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.daily_note,
    title:
      safeString(safe.title) ||
      safeString(safe.note_type) ||
      safeString(safe.category) ||
      "Daily note",
    summary: compact([
      safe.summary,
      safe.note,
      safe.body,
      safe.content,
      safe.presentation,
      safe.mood,
    ]),
    date: toDateValue(safe.date, safe.note_date, safe.created_at),
  });
}

export function mapIncidentRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.incident,
    title:
      safeString(safe.title) ||
      safeString(safe.incident_type) ||
      safeString(safe.category) ||
      "Incident",
    summary: compact([
      safe.summary,
      safe.description,
      safe.what_happened,
      safe.actions_taken,
      safe.outcome,
    ]),
    severity: normaliseSeverity(safe.severity || safe.risk_level),
    significance: normaliseSignificance(safe.significance),
    date: toDateValue(safe.incident_date, safe.date, safe.created_at),
  });
}

export function mapSafeguardingRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.safeguarding_record,
    title:
      safeString(safe.title) ||
      safeString(safe.concern_type) ||
      safeString(safe.category) ||
      "Safeguarding concern",
    summary: compact([
      safe.summary,
      safe.concern,
      safe.description,
      safe.action_taken,
      safe.outcome,
    ]),
    severity: normaliseSeverity(safe.severity || safe.risk_level),
    significance: normaliseSignificance(safe.significance || safe.level),
    date: toDateValue(safe.concern_date, safe.date, safe.created_at),
  });
}

export function mapRiskAssessment(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.risk,
    title:
      safeString(safe.title) ||
      safeString(safe.category) ||
      "Risk assessment",
    summary: compact([
      safe.concern_summary,
      safe.summary,
      safe.known_triggers,
      safe.early_warning_signs,
      safe.current_controls,
      safe.review_notes,
    ]),
    severity: normaliseSeverity(safe.risk_level || safe.severity),
    significance: normaliseSignificance(safe.significance),
    date: toDateValue(safe.review_date, safe.created_at, safe.updated_at),
  });
}

export function mapHealthRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.health_record,
    title:
      safeString(safe.title) ||
      safeString(safe.health_type) ||
      safeString(safe.category) ||
      "Health record",
    summary: compact([
      safe.summary,
      safe.description,
      safe.need,
      safe.plan,
      safe.outcome,
    ]),
    date: toDateValue(safe.date, safe.appointment_date, safe.created_at),
  });
}

export function mapEducationRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.education_record,
    title:
      safeString(safe.title) ||
      safeString(safe.school) ||
      safeString(safe.category) ||
      "Education record",
    summary: compact([
      safe.summary,
      safe.description,
      safe.progress,
      safe.attendance,
      safe.support_required,
    ]),
    date: toDateValue(safe.date, safe.review_date, safe.created_at),
  });
}

export function mapFamilyContactRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.family_contact,
    title:
      safeString(safe.title) ||
      safeString(safe.contact_name) ||
      safeString(safe.relationship) ||
      "Family contact",
    summary: compact([
      safe.summary,
      safe.description,
      safe.contact_type,
      safe.outcome,
      safe.observations,
    ]),
    date: toDateValue(safe.contact_date, safe.date, safe.created_at),
  });
}

export function mapKeyworkSession(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.keywork,
    title:
      safeString(safe.title) ||
      safeString(safe.topic) ||
      "Keywork session",
    summary: compact([
      safe.summary,
      safe.notes,
      safe.discussion,
      safe.actions,
      safe.outcome,
    ]),
    date: toDateValue(safe.session_date, safe.date, safe.created_at),
  });
}

export function mapAppointment(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.appointment,
    title:
      safeString(safe.title) ||
      safeString(safe.appointment_type) ||
      "Appointment",
    summary: compact([
      safe.summary,
      safe.description,
      safe.location,
      safe.outcome,
      safe.follow_up,
    ]),
    date: toDateValue(safe.appointment_date, safe.date, safe.created_at),
  });
}

export function mapAchievementRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.achievement_record,
    title:
      safeString(safe.title) ||
      safeString(safe.achievement_type) ||
      "Achievement",
    summary: compact([
      safe.summary,
      safe.description,
      safe.impact,
      safe.next_steps,
    ]),
    date: toDateValue(safe.achievement_date, safe.date, safe.created_at),
  });
}

export function mapMissingEpisode(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.missing_episode,
    title:
      safeString(safe.title) ||
      safeString(safe.episode_type) ||
      "Missing episode",
    summary: compact([
      safe.summary,
      safe.description,
      safe.return_details,
      safe.actions_taken,
      safe.outcome,
    ]),
    severity: normaliseSeverity(safe.severity || safe.risk_level),
    date: toDateValue(safe.missing_from, safe.date, safe.created_at),
  });
}

export function mapChronologyEvent(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.chronology_event,
    title:
      safeString(safe.title) ||
      safeString(safe.event_type) ||
      "Chronology event",
    summary: compact([
      safe.summary,
      safe.description,
      safe.event,
      safe.analysis,
      safe.outcome,
    ]),
    significance: normaliseSignificance(safe.significance),
    date: toDateValue(safe.event_date, safe.date, safe.created_at),
  });
}

export function mapComplianceItem(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.compliance_item,
    title:
      safeString(safe.title) ||
      safeString(safe.requirement) ||
      "Compliance item",
    summary: compact([
      safe.summary,
      safe.description,
      safe.requirement,
      safe.evidence,
      safe.action_required,
    ]),
    status:
      safeString(safe.compliance_status) ||
      safeString(safe.status) ||
      COMPLIANCE_STATUS.pending,
    date: toDateValue(safe.due_date, safe.review_date, safe.created_at),
  });
}

export function mapTaskRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.task,
    title:
      safeString(safe.title) ||
      safeString(safe.task) ||
      safeString(safe.action) ||
      "Task",
    summary: compact([
      safe.summary,
      safe.description,
      safe.task,
      safe.action,
      safe.outcome,
    ]),
    status:
      normaliseWorkflowStatus(safe.status) ||
      safeString(safe.status) ||
      WORKFLOW_STATUS.active,
    severity: normaliseSeverity(safe.severity || safe.priority),
    date: toDateValue(safe.due_date, safe.date, safe.created_at),
    overdue: isOverdue(safe.due_date),
    due_soon: isDueSoon(safe.due_date),
  });
}

export function mapDocumentRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: safeString(safe.document_type) === "statutory"
      ? RECORD_TYPES.statutory_document
      : RECORD_TYPES.document,
    title:
      safeString(safe.title) ||
      safeString(safe.document_title) ||
      safeString(safe.filename) ||
      "Document",
    summary: compact([
      safe.summary,
      safe.description,
      safe.document_type,
      safe.review_status,
    ]),
    date: toDateValue(safe.review_date, safe.created_at, safe.updated_at),
    url: safeString(safe.url),
  });
}

export function mapHandoverRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.handover_record,
    title:
      safeString(safe.title) ||
      safeString(safe.shift) ||
      "Handover record",
    summary: compact([
      safe.summary,
      safe.notes,
      safe.key_updates,
      safe.risks,
      safe.actions,
    ]),
    date: toDateValue(safe.handover_date, safe.shift_date, safe.date, safe.created_at),
  });
}

export function mapMedicationRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.medication_record,
    title:
      safeString(safe.title) ||
      safeString(safe.medication_name) ||
      "Medication record",
    summary: compact([
      safe.summary,
      safe.medication_name,
      safe.dose,
      safe.reason,
      safe.outcome,
      safe.notes,
    ]),
    date: toDateValue(safe.administered_at, safe.date, safe.created_at),
  });
}

export function mapMedicationProfile(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.medication_profile,
    title:
      safeString(safe.title) ||
      safeString(safe.medication_name) ||
      "Medication profile",
    summary: compact([
      safe.summary,
      safe.medication_name,
      safe.dose,
      safe.frequency,
      safe.instructions,
      safe.side_effects,
    ]),
    date: toDateValue(safe.review_date, safe.created_at, safe.updated_at),
  });
}

export function mapTrainingRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: "training",
    title:
      safeString(safe.title) ||
      safeString(safe.course_name) ||
      safeString(safe.training_name) ||
      "Training record",
    summary: compact([
      safe.summary,
      safe.description,
      safe.course_name,
      safe.provider,
      safe.status,
      safe.expiry_date,
    ]),
    date: toDateValue(safe.completed_at, safe.expiry_date, safe.date, safe.created_at),
  });
}

export function mapReportRecord(raw = {}) {
  const safe = safeObject(raw);
  return buildBaseRecord(safe, {
    record_type: RECORD_TYPES.ai_generated_report,
    title:
      safeString(safe.title) ||
      safeString(safe.report_type) ||
      "Report",
    summary: compact([
      safe.summary,
      safe.description,
      safe.findings,
      safe.recommendations,
    ]),
    date: toDateValue(safe.report_date, safe.date, safe.created_at),
  });
}

export function mapRecordByType(recordType, raw = {}) {
  const safeRecordType = canonicalRecordType(recordType, recordType || "record");

  switch (safeRecordType) {
    case RECORD_TYPES.daily_note:
      return mapDailyNote(raw);
    case RECORD_TYPES.incident:
      return mapIncidentRecord(raw);
    case RECORD_TYPES.safeguarding_record:
      return mapSafeguardingRecord(raw);
    case RECORD_TYPES.risk:
      return mapRiskAssessment(raw);
    case RECORD_TYPES.health_record:
      return mapHealthRecord(raw);
    case RECORD_TYPES.education_record:
      return mapEducationRecord(raw);
    case RECORD_TYPES.family_contact:
      return mapFamilyContactRecord(raw);
    case RECORD_TYPES.keywork:
      return mapKeyworkSession(raw);
    case RECORD_TYPES.appointment:
      return mapAppointment(raw);
    case RECORD_TYPES.achievement_record:
      return mapAchievementRecord(raw);
    case RECORD_TYPES.missing_episode:
      return mapMissingEpisode(raw);
    case RECORD_TYPES.chronology_event:
      return mapChronologyEvent(raw);
    case RECORD_TYPES.compliance_item:
      return mapComplianceItem(raw);
    case RECORD_TYPES.task:
      return mapTaskRecord(raw);
    case RECORD_TYPES.document:
    case RECORD_TYPES.statutory_document:
      return mapDocumentRecord(raw);
    case RECORD_TYPES.handover_record:
      return mapHandoverRecord(raw);
    case RECORD_TYPES.medication_profile:
      return mapMedicationProfile(raw);
    case RECORD_TYPES.medication_record:
      return mapMedicationRecord(raw);
    case RECORD_TYPES.ai_generated_report:
      return mapReportRecord(raw);
    default:
      return buildBaseRecord(raw, {
        record_type: safeRecordType || safeObject(raw).record_type || "record",
      });
  }
}

function addMappedRecords(target, records, mapper) {
  safeArray(records).forEach((record) => {
    const mapped = mapper(record);
    if (mapped) target.push(mapped);
  });
}

function dedupeRecords(records = []) {
  const seen = new Set();

  return safeArray(records).filter((record) => {
    const safe = safeObject(record);
    const key = joinSignals([
      safe.record_type,
      safe.id || safe.record_id,
      safe.title,
      safe.date,
    ]);

    if (!key) return true;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function buildAssistantEvidenceSet(payload = {}) {
  const safePayload = safeObject(payload);
  const evidence = [];

  const addMapped = (records, mapper) => {
    addMappedRecords(evidence, records, mapper);
  };

  addMapped(safePayload.daily_notes, mapDailyNote);
  addMapped(safePayload.daily_life, mapDailyNote);

  addMapped(safePayload.incidents, mapIncidentRecord);
  addMapped(safePayload.incident_records, mapIncidentRecord);

  addMapped(safePayload.safeguarding, mapSafeguardingRecord);
  addMapped(safePayload.safeguarding_records, mapSafeguardingRecord);

  addMapped(safePayload.risk_assessments, mapRiskAssessment);
  addMapped(safePayload.risks, mapRiskAssessment);

  addMapped(safePayload.health_records, mapHealthRecord);
  addMapped(safePayload.health, mapHealthRecord);

  addMapped(safePayload.education_records, mapEducationRecord);
  addMapped(safePayload.education, mapEducationRecord);

  addMapped(safePayload.family_contact_records, mapFamilyContactRecord);
  addMapped(safePayload.family_contacts, mapFamilyContactRecord);
  addMapped(safePayload.family, mapFamilyContactRecord);

  addMapped(safePayload.keywork_sessions, mapKeyworkSession);
  addMapped(safePayload.keywork, mapKeyworkSession);

  addMapped(safePayload.appointments, mapAppointment);
  addMapped(safePayload.young_person_appointments, mapAppointment);

  addMapped(safePayload.achievement_records, mapAchievementRecord);
  addMapped(safePayload.achievements, mapAchievementRecord);

  addMapped(safePayload.missing_episodes, mapMissingEpisode);
  addMapped(safePayload.missing, mapMissingEpisode);

  addMapped(safePayload.chronology_events, mapChronologyEvent);
  addMapped(safePayload.chronology, mapChronologyEvent);
  addMapped(safePayload.timeline, mapChronologyEvent);

  addMapped(safePayload.compliance_items, mapComplianceItem);
  addMapped(safePayload.compliance, mapComplianceItem);

  addMapped(safePayload.tasks, mapTaskRecord);
  addMapped(safePayload.actions, mapTaskRecord);
  addMapped(safePayload.manager_actions, mapTaskRecord);

  addMapped(safePayload.documents, mapDocumentRecord);
  addMapped(safePayload.statutory_documents, mapDocumentRecord);

  addMapped(safePayload.handover_records, mapHandoverRecord);
  addMapped(safePayload.handovers, mapHandoverRecord);

  addMapped(safePayload.medication_records, mapMedicationRecord);
  addMapped(safePayload.medication, mapMedicationRecord);

  addMapped(safePayload.medication_profiles, mapMedicationProfile);

  addMapped(safePayload.training, mapTrainingRecord);
  addMapped(safePayload.staff_training_records, mapTrainingRecord);

  addMapped(safePayload.reports, mapReportRecord);
  addMapped(safePayload.ai_generated_reports, mapReportRecord);
  addMapped(safePayload.monthly_reviews, mapReportRecord);

  safeArray(safePayload.records).forEach((record) => {
    const safe = safeObject(record);
    evidence.push(mapRecordByType(safe.record_type || safe.type, safe));
  });

  return dedupeRecords(evidence);
}

export function summariseEvidenceSet(records = []) {
  const safeRecords = safeArray(records);

  const byType = safeRecords.reduce((acc, record) => {
    const type = canonicalRecordType(record.record_type, "record");
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const overdue = safeRecords.filter((record) => record.overdue).length;
  const dueSoon = safeRecords.filter((record) => record.due_soon).length;
  const highRisk = safeRecords.filter((record) =>
    ["high", "critical"].includes(normaliseSeverity(record.severity))
  ).length;

  return {
    total: safeRecords.length,
    by_type: byType,
    overdue,
    due_soon: dueSoon,
    high_risk: highRisk,
  };
}

export function buildAssistantEvidencePayload(payload = {}) {
  const evidence = buildAssistantEvidenceSet(payload);

  return {
    evidence,
    summary: summariseEvidenceSet(evidence),
  };
}

export function mapList(items = [], mapper = (x) => x) {
  return safeArray(items).map((item) => mapper(safeObject(item)));
}

export function mapRecordsToEvidence(items = [], mapper = (x) => x) {
  return mapList(items, mapper).map((item) => ({
    ...item,
    evidence_id: item.id || item.record_id || item.source_id || null,
    evidence_type: item.record_type || item.type || "record",
  }));
}

export function mapReadinessEvidence(raw = {}) {
  const safe = safeObject(raw);

  return [
    ...mapList(safe.compliance_items || safe.items || [], mapComplianceItem),
    ...mapList(safe.statutory_documents || safe.documents || [], mapDocumentRecord),
    ...mapList(safe.tasks || safe.actions || [], mapTaskRecord),
  ];
}

export function mapManagerReviewEvidence(raw = {}) {
  const safe = safeObject(raw);

  return [
    ...mapList(safe.manager_actions || [], mapTaskRecord),
    ...mapList(safe.compliance_items || [], mapComplianceItem),
    ...mapList(safe.incidents || [], mapIncidentRecord),
    ...mapList(safe.risk_assessments || safe.risks || [], mapRiskAssessment),
    ...mapList(safe.tasks || [], mapTaskRecord),
  ];
}

export function toAssistantEvidence(payload = {}) {
  return buildAssistantEvidencePayload(payload);
}

export default {
  inferSectionFromRecordType,
  mapRecordByType,
  mapList,
  mapRecordsToEvidence,
  mapReadinessEvidence,
  mapManagerReviewEvidence,
  toAssistantEvidence,
  buildAssistantEvidenceSet,
  buildAssistantEvidencePayload,
  summariseEvidenceSet,
};

function __compatArray(value) {
  return Array.isArray(value) ? value : [];
}

function __compatId(item = {}) {
  return item.id || item.source_id || item.record_id || item.uuid || null;
}

function __compatDate(item = {}) {
  return (
    item.date ||
    item.event_date ||
    item.created_at ||
    item.updated_at ||
    item.review_date ||
    item.due_date ||
    null
  );
}

function __compatTitle(item = {}, fallback = "Record") {
  return (
    item.title ||
    item.name ||
    item.subject ||
    item.heading ||
    item.plan_title ||
    item.document_title ||
    fallback
  );
}

function __compatSummary(item = {}) {
  return (
    item.summary ||
    item.description ||
    item.details ||
    item.notes ||
    item.content ||
    item.body ||
    item.overview ||
    item.reason ||
    item.action ||
    ""
  );
}

function __compatRecord(item = {}, type = "record", fallbackTitle = "Record") {
  const id = __compatId(item);

  return {
    ...item,
    id,
    source_id: item.source_id || id,
    record_id: item.record_id || id,
    record_type: item.record_type || type,
    type: item.type || item.record_type || type,
    title: __compatTitle(item, fallbackTitle),
    summary: __compatSummary(item),
    description: item.description || __compatSummary(item),
    section: item.section || type,
    date: __compatDate(item),
    created_at: item.created_at || item.date || null,
    updated_at: item.updated_at || null,
    status: item.status || item.workflow_status || item.plan_status || "",
    urgency: item.urgency || item.priority || item.severity || "low",
    tags: __compatArray(item.tags).length ? item.tags : [type],
    raw: item.raw || item,
  };
}

function __compatMapYoungPerson(item = {}) {
  return {
    ...__compatRecord(item, "young_person", "Young person"),
    full_name:
      item.full_name ||
      item.name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Young person",
    preferred_name: item.preferred_name || item.first_name || item.name || "",
    home_id: item.home_id || item.homeId || null,
    placement_status: item.placement_status || item.status || "",
    summary_risk_level: item.summary_risk_level || item.risk_level || "",
  };
}

function __compatMapIdentityProfile(item = {}) {
  return __compatRecord(item, "identity_profile", "Identity profile");
}

function __compatMapCommunicationProfile(item = {}) {
  return __compatRecord(item, "communication_profile", "Communication profile");
}

function __compatMapEducationProfile(item = {}) {
  return __compatRecord(item, "education_record", "Education profile");
}

function __compatMapHealthProfile(item = {}) {
  return __compatRecord(item, "health_record", "Health profile");
}

function __compatMapLegalStatus(item = {}) {
  return __compatRecord(item, "legal_status", "Legal status");
}

function __compatMapFormulation(item = {}) {
  return __compatRecord(item, "formulation", "Formulation");
}

function __compatMapYoungPersonContact(item = {}) {
  return __compatRecord(item, "family_contact_record", "Young person contact");
}

function __compatMapIncident(item = {}) {
  return __compatRecord(item, "incident", "Incident");
}

function __compatMapSupportPlan(item = {}) {
  return __compatRecord(item, "support_plan", "Support plan");
}

function __compatMapTask(item = {}) {
  return __compatRecord(item, "task", "Task");
}

function __compatMapCommunicationRecord(item = {}) {
  return __compatRecord(item, "communication_record", "Communication record");
}

function __compatMapStatutoryDocument(item = {}) {
  return __compatRecord(item, "statutory_document", "Statutory document");
}

function __compatMapInspectionAction(item = {}) {
  return __compatRecord(item, "inspection_action", "Inspection action");
}

function __compatMapInspectionTask(item = {}) {
  return __compatRecord(item, "inspection_task", "Inspection task");
}

function __compatMapInspectionHeader(item = {}) {
  return __compatRecord(item, "inspection_header", "Inspection header");
}

function __compatMapInspectionSectionPanel(item = {}) {
  return __compatRecord(
    item,
    "inspection_section_panel",
    "Inspection section"
  );
}

function __compatMapInspectionReason(item = {}) {
  return __compatRecord(item, "inspection_reason", "Inspection reason");
}

function __compatMapInspectionBriefing(item = {}) {
  return __compatRecord(item, "inspection_briefing", "Inspection briefing");
}

function __compatMapInspectionPrep72Hour(item = {}) {
  return __compatRecord(
    item,
    "inspection_prep_72_hour",
    "72-hour inspection prep"
  );
}

export {
  __compatMapYoungPerson as mapYoungPerson,
  __compatMapIdentityProfile as mapIdentityProfile,
  __compatMapCommunicationProfile as mapCommunicationProfile,
  __compatMapEducationProfile as mapEducationProfile,
  __compatMapHealthProfile as mapHealthProfile,
  __compatMapLegalStatus as mapLegalStatus,
  __compatMapFormulation as mapFormulation,
  __compatMapYoungPersonContact as mapYoungPersonContact,
  __compatMapIncident as mapIncident,
  __compatMapSupportPlan as mapSupportPlan,
  __compatMapTask as mapTask,
  __compatMapCommunicationRecord as mapCommunicationRecord,
  __compatMapStatutoryDocument as mapStatutoryDocument,
  __compatMapInspectionAction as mapInspectionAction,
  __compatMapInspectionTask as mapInspectionTask,
  __compatMapInspectionHeader as mapInspectionHeader,
  __compatMapInspectionSectionPanel as mapInspectionSectionPanel,
  __compatMapInspectionReason as mapInspectionReason,
  __compatMapInspectionBriefing as mapInspectionBriefing,
  __compatMapInspectionPrep72Hour as mapInspectionPrep72Hour,
};
