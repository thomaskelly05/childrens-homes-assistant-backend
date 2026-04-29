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
      "risk_area",
      "health_area",
      "education_area",
      "contact_type",
      "appointment_type",
      "document_type",
      "medication_name",
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
    "details",
    "concern_summary",
    "concern_details",
    "incident_summary",
    "outcome",
    "actions_taken",
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
    "appointment_date",
    "session_date",
    "record_date",
    "contact_datetime",
    "missing_from",
    "administered_at",
    "handover_datetime",
  ]);

  return normaliseDateValue(value);
}

function inferStatus(row = {}) {
  const safe = safeObject(row);

  return (
    normaliseWorkflowStatus(safe.workflow_status) ||
    normaliseWorkflowStatus(safe.status) ||
    normaliseWorkflowStatus(safe.state) ||
    cleanText(safe.status) ||
    ""
  );
}

function inferSeverity(row = {}) {
  const safe = safeObject(row);

  return (
    normaliseSeverity(safe.severity) ||
    normaliseSeverity(safe.risk_level) ||
    normaliseSeverity(safe.level) ||
    normaliseSeverity(safe.priority) ||
    ""
  );
}

export function normaliseRecord(row = {}, fallbackType = "") {
  const safe = safeObject(row);
  const recordType = inferRecordType(safe, fallbackType);
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
