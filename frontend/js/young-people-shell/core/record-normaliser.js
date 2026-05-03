import { cleanText, normaliseToken } from "./helpers.js";
import {
  normaliseRecordType,
  normaliseWorkflowStatus,
  normaliseSeverity,
} from "./contracts.js";
import {
  getRecordContract,
  getRecordLabel,
  getRecordPrimaryDateField,
  getRecordTitleField,
  getRecordSummaryField,
  getRecordSection,
} from "./record-contracts.js";

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function firstValue(row, fields = []) {
  for (const field of fields) {
    const value = row?.[field];
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function firstRawValue(row, fields = []) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function normaliseId(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : value;
}

function normaliseDateValue(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const text = String(value).trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return text;
}

function toDateInputValue(value) {
  const iso = normaliseDateValue(value);
  return iso ? String(iso).slice(0, 10) : "";
}

function toDateTimeLocalValue(value) {
  const iso = normaliseDateValue(value);
  return iso ? String(iso).slice(0, 16) : "";
}

function inferRecordType(row = {}, fallbackType = "") {
  const safe = safeObject(row);

  return (
    normaliseRecordType(fallbackType) ||
    normaliseRecordType(safe.record_type) ||
    normaliseRecordType(safe.type) ||
    normaliseRecordType(safe.category) ||
    normaliseRecordType(safe.source_type) ||
    ""
  );
}

function assignIfMissing(target, key, value) {
  if (!key) return;
  if (target[key] !== null && target[key] !== undefined && target[key] !== "") return;
  if (value === null || value === undefined || value === "") return;
  target[key] = value;
}

function hydrateFormAliases(row = {}, recordType = "") {
  const safe = { ...safeObject(row) };
  const type = normaliseRecordType(recordType);

  if (type === "daily_note") {
    assignIfMissing(safe, "narrative", safe.presentation || safe.summary || safe.note || safe.daily_note);
    assignIfMissing(safe, "child_voice", safe.young_person_voice);
    assignIfMissing(safe, "young_person_voice", safe.child_voice);
    assignIfMissing(safe, "status", safe.workflow_status);
    assignIfMissing(safe, "workflow_status", safe.status);
  }

  if (type === "incident") {
    assignIfMissing(safe, "actions_taken", safe.outcome || safe.actions_required);
    assignIfMissing(safe, "manager_oversight", safe.manager_review_comment);
    assignIfMissing(safe, "deescalation_attempted", safe.staff_response);
    assignIfMissing(safe, "incident_datetime", safe.occurred_at);
    assignIfMissing(safe, "occurred_at", safe.incident_datetime);
    assignIfMissing(safe, "manager_review_status", safe.workflow_status || safe.status);
    assignIfMissing(safe, "workflow_status", safe.manager_review_status || safe.status);
  }

  if (type === "health_record") {
    assignIfMissing(safe, "record_date", toDateInputValue(safe.event_datetime || safe.record_date || safe.created_at));
    assignIfMissing(safe, "health_area", safe.title || safe.area || safe.category);
    assignIfMissing(safe, "professional_name", safe.professional || safe.service || safe.professional_name);
    assignIfMissing(safe, "child_voice", safe.young_person_voice);
    assignIfMissing(safe, "young_person_voice", safe.child_voice);
    assignIfMissing(safe, "next_action_date", toDateInputValue(safe.review_date || safe.next_action_date));
  }

  if (type === "education_record") {
    assignIfMissing(safe, "education_area", safe.provision_name || safe.area || safe.category);
    assignIfMissing(safe, "school_or_provider", safe.provision_name || safe.school_or_provider);
    assignIfMissing(safe, "summary", safe.education_summary || safe.behaviour_summary || safe.summary);
    assignIfMissing(safe, "learning_engagement", safe.engagement_summary);
    assignIfMissing(safe, "child_voice", safe.young_person_voice);
    assignIfMissing(safe, "young_person_voice", safe.child_voice);
    assignIfMissing(safe, "achievement_note", safe.progress_summary || safe.achievement_note);
    assignIfMissing(safe, "action_taken", safe.actions_required || safe.action_taken);
  }

  if (type === "family_contact") {
    assignIfMissing(safe, "summary", safe.post_contact_presentation || safe.summary);
    assignIfMissing(safe, "child_voice", safe.young_person_voice);
    assignIfMissing(safe, "young_person_voice", safe.child_voice);
  }

  if (type === "keywork") {
    assignIfMissing(safe, "actions_agreed", safe.actions_required || safe.actions_agreed);
    assignIfMissing(safe, "reflective_analysis", safe.reflection || safe.reflective_analysis);
    assignIfMissing(safe, "child_voice", safe.young_person_voice);
    assignIfMissing(safe, "young_person_voice", safe.child_voice);
  }

  if (type === "safeguarding_record") {
    assignIfMissing(safe, "concern_type", safe.safeguarding_category || safe.concern_type);
    assignIfMissing(safe, "concern_summary", safe.concern_details || safe.concern_summary);
    assignIfMissing(safe, "disclosure_details", safe.young_person_voice || safe.disclosure_details);
    assignIfMissing(safe, "immediate_action_taken", safe.actions_taken || safe.immediate_action_taken);
    assignIfMissing(safe, "manager_oversight", safe.manager_review_comment || safe.manager_oversight);
  }

  if (type === "appointment") {
    assignIfMissing(safe, "record_date", toDateInputValue(safe.appointment_date || safe.record_date));
    assignIfMissing(safe, "appointment_datetime", safe.appointment_datetime || safe.appointment_date);
    assignIfMissing(safe, "summary", safe.notes || safe.summary || safe.description);
  }

  if (type === "handover_record") {
    assignIfMissing(safe, "handover_date", toDateInputValue(safe.handover_datetime || safe.handover_date));
    assignIfMissing(safe, "summary", safe.summary_text || safe.summary);
  }

  if (type === "chronology_event") {
    assignIfMissing(safe, "event_datetime", safe.occurred_at || safe.date || safe.created_at);
    assignIfMissing(safe, "summary", safe.description || safe.narrative || safe.summary);
  }

  // Keep HTML input-friendly date values available without hiding the original raw values.
  [
    "note_date",
    "record_date",
    "review_date",
    "session_date",
    "contact_date",
    "next_session_date",
    "next_action_date",
    "due_date",
  ].forEach((key) => {
    if (safe[key]) safe[key] = toDateInputValue(safe[key]) || safe[key];
  });

  [
    "incident_datetime",
    "concern_datetime",
    "contact_datetime",
    "event_datetime",
    "appointment_datetime",
    "handover_datetime",
  ].forEach((key) => {
    if (safe[key]) safe[key] = toDateTimeLocalValue(safe[key]) || safe[key];
  });

  return safe;
}

function inferTitle(row = {}, recordType = "") {
  const safe = safeObject(row);
  const titleField = getRecordTitleField(recordType);

  return (
    firstValue(safe, [
      titleField,
      "title",
      "name",
      "subject",
      "heading",
      "topic",
      "incident_type",
      "concern_type",
      "safeguarding_category",
      "risk_area",
      "category",
      "health_area",
      "education_area",
      "provision_name",
      "contact_type",
      "appointment_type",
      "document_type",
      "medication_name",
      "shift_type",
      "shift",
      "task",
    ]) || getRecordLabel(recordType, "Record")
  );
}

function inferSummary(row = {}, recordType = "") {
  const safe = safeObject(row);
  const summaryField = getRecordSummaryField(recordType);

  return firstValue(safe, [
    summaryField,
    "summary",
    "description",
    "notes",
    "note",
    "daily_note",
    "narrative",
    "presentation",
    "details",
    "concern_summary",
    "concern_details",
    "incident_summary",
    "outcome",
    "actions_taken",
    "actions_required",
    "education_summary",
    "behaviour_summary",
    "post_contact_presentation",
    "summary_text",
    "generated_text",
    "input_text",
  ]);
}

function inferDate(row = {}, recordType = "") {
  const safe = safeObject(row);
  const primaryDateField = getRecordPrimaryDateField(recordType);

  const value = firstRawValue(safe, [
    primaryDateField,
    "event_datetime",
    "occurred_at",
    "created_at",
    "updated_at",
    "note_date",
    "incident_datetime",
    "concern_datetime",
    "review_date",
    "due_date",
    "appointment_datetime",
    "appointment_date",
    "session_date",
    "record_date",
    "contact_datetime",
    "missing_from",
    "administered_time",
    "administered_at",
    "handover_datetime",
    "handover_date",
  ]);

  return normaliseDateValue(value);
}

function inferStatus(row = {}) {
  const safe = safeObject(row);

  return (
    normaliseWorkflowStatus(safe.workflow_status) ||
    normaliseWorkflowStatus(safe.status) ||
    normaliseWorkflowStatus(safe.manager_review_status) ||
    normaliseWorkflowStatus(safe.state) ||
    cleanText(safe.status) ||
    cleanText(safe.manager_review_status) ||
    ""
  );
}

function inferSeverity(row = {}) {
  const safe = safeObject(row);

  return (
    normaliseSeverity(safe.severity) ||
    normaliseSeverity(safe.risk_level) ||
    normaliseSeverity(safe.significance) ||
    normaliseSeverity(safe.level) ||
    normaliseSeverity(safe.priority) ||
    ""
  );
}

export function normaliseRecord(row = {}, fallbackType = "") {
  const base = safeObject(row);
  const recordType = inferRecordType(base, fallbackType);
  const safe = hydrateFormAliases(base, recordType);
  const contract = getRecordContract(recordType);

  const id = normaliseId(
    safe.id ?? safe.record_id ?? safe.source_id ?? safe[`${recordType}_id`]
  );

  return {
    id,
    type: recordType,
    record_type: recordType,
    label: getRecordLabel(recordType, "Record"),
    title: inferTitle(safe, recordType),
    summary: inferSummary(safe, recordType),
    date: inferDate(safe, recordType),
    status: inferStatus(safe),
    severity: inferSeverity(safe),
    section: contract?.section || getRecordSection(recordType),
    table: contract?.table || cleanText(safe.source_table),
    source: cleanText(safe.source) || "record",
    source_table: cleanText(safe.source_table) || contract?.table || "",
    young_person_id: normaliseId(safe.young_person_id),
    home_id: normaliseId(safe.home_id),
    provider_id: normaliseId(safe.provider_id),
    created_at: normaliseDateValue(safe.created_at),
    updated_at: normaliseDateValue(safe.updated_at),
    is_overdue: Boolean(safe.is_overdue || safe.overdue),
    is_due_soon: Boolean(safe.is_due_soon || safe.due_soon),
    raw: safe,
  };
}

export function normaliseRecords(rows = [], fallbackType = "") {
  return Array.isArray(rows)
    ? rows.map((row) => normaliseRecord(row, fallbackType))
    : [];
}

export function groupNormalisedRecordsBySection(records = []) {
  return normaliseRecords(records).reduce((groups, record) => {
    const section = record.section || "workspace";
    if (!groups[section]) groups[section] = [];
    groups[section].push(record);
    return groups;
  }, {});
}

export function sortNormalisedRecordsNewestFirst(records = []) {
  return [...normaliseRecords(records)].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
}

export function buildRecordDisplayMeta(record = {}) {
  const safe = safeObject(record);
  const normalised = safe.raw ? safe : normaliseRecord(safe);

  return {
    id: normalised.id,
    title: normalised.title || normalised.label,
    subtitle: [
      normalised.label,
      normalised.status,
      normalised.severity,
      normalised.date,
    ]
      .filter(Boolean)
      .join(" · "),
    summary: normalised.summary,
    section: normalised.section,
    type: normalised.type,
  };
}

export function recordSearchText(record = {}) {
  const normalised = record?.raw ? record : normaliseRecord(record);

  return [
    normalised.title,
    normalised.summary,
    normalised.label,
    normalised.status,
    normalised.severity,
    normalised.section,
    normalised.type,
  ]
    .map((value) => normaliseToken(value))
    .filter(Boolean)
    .join(" ");
}
