import {
  RECORD_TYPES,
  RECORD_TABLES,
  WORKSPACE_TO_RECORD_TYPE,
  RECORD_TYPE_TO_WORKSPACE,
  normaliseRecordType,
  getRecordTable,
} from "./contracts.js";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function freeze(value) {
  return Object.freeze(value);
}

export const RECORD_CONTRACTS = freeze({
  support_plan: {
    type: RECORD_TYPES.support_plan,
    label: "Support plan",
    pluralLabel: "Support plans",
    table: RECORD_TABLES.support_plan,
    route: "/young-people/{youngPersonId}/plans",
    section: "plans",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: true,
    primaryDateField: "review_date",
    titleField: "title",
    summaryField: "summary",
  },

  daily_note: {
    type: RECORD_TYPES.daily_note,
    label: "Daily note",
    pluralLabel: "Daily notes",
    table: RECORD_TABLES.daily_note,
    route: "/young-people/{youngPersonId}/daily-notes",
    section: "daily-notes",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "note_date",
    titleField: "shift_type",
    summaryField: "presentation",
  },

  incident: {
    type: RECORD_TYPES.incident,
    label: "Incident",
    pluralLabel: "Incidents",
    table: RECORD_TABLES.incident,
    route: "/young-people/{youngPersonId}/incidents",
    section: "incidents",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: true,
    primaryDateField: "incident_datetime",
    titleField: "incident_type",
    summaryField: "description",
  },

  safeguarding_record: {
    type: RECORD_TYPES.safeguarding_record,
    label: "Safeguarding record",
    pluralLabel: "Safeguarding records",
    table: RECORD_TABLES.safeguarding_record,
    route: "/young-people/{youngPersonId}/safeguarding",
    section: "safeguarding",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: true,
    primaryDateField: "concern_datetime",
    titleField: "safeguarding_category",
    summaryField: "concern_details",
  },

  risk: {
    type: RECORD_TYPES.risk,
    label: "Risk assessment",
    pluralLabel: "Risk assessments",
    table: RECORD_TABLES.risk,
    route: "/young-people/{youngPersonId}/risk",
    section: "risk",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: true,
    primaryDateField: "review_date",
    titleField: "title",
    summaryField: "concern_summary",
  },

  keywork: {
    type: RECORD_TYPES.keywork,
    label: "Key work session",
    pluralLabel: "Key work sessions",
    table: RECORD_TABLES.keywork,
    route: "/young-people/{youngPersonId}/keywork",
    section: "keywork",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "session_date",
    titleField: "topic",
    summaryField: "summary",
  },

  health_record: {
    type: RECORD_TYPES.health_record,
    label: "Health record",
    pluralLabel: "Health records",
    table: RECORD_TABLES.health_record,
    route: "/young-people/{youngPersonId}/health",
    section: "health",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: true,
    primaryDateField: "event_datetime",
    titleField: "title",
    summaryField: "summary",
  },

  education_record: {
    type: RECORD_TYPES.education_record,
    label: "Education record",
    pluralLabel: "Education records",
    table: RECORD_TABLES.education_record,
    route: "/young-people/{youngPersonId}/education",
    section: "education",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "record_date",
    titleField: "provision_name",
    summaryField: "behaviour_summary",
  },

  family_contact: {
    type: RECORD_TYPES.family_contact,
    label: "Family contact",
    pluralLabel: "Family contacts",
    table: RECORD_TABLES.family_contact,
    route: "/young-people/{youngPersonId}/family",
    section: "family",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "contact_datetime",
    titleField: "contact_type",
    summaryField: "post_contact_presentation",
  },

  appointment: {
    type: RECORD_TYPES.appointment,
    label: "Appointment",
    pluralLabel: "Appointments",
    table: RECORD_TABLES.appointment,
    route: "/young-people/{youngPersonId}/appointments",
    section: "appointments",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "appointment_date",
    titleField: "title",
    summaryField: "summary",
  },

  missing_episode: {
    type: RECORD_TYPES.missing_episode,
    label: "Missing episode",
    pluralLabel: "Missing episodes",
    table: RECORD_TABLES.missing_episode,
    route: "/young-people/{youngPersonId}/missing-episodes",
    section: "safeguarding",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: true,
    primaryDateField: "start_datetime",
    titleField: "police_reference",
    summaryField: "outcome",
  },

  chronology_event: {
    type: RECORD_TYPES.chronology_event,
    label: "Chronology event",
    pluralLabel: "Chronology events",
    table: RECORD_TABLES.chronology_event,
    route: "/young-people/{youngPersonId}/timeline",
    section: "timeline",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "event_datetime",
    titleField: "title",
    summaryField: "summary",
  },

  task: {
    type: RECORD_TYPES.task,
    label: "Task",
    pluralLabel: "Tasks",
    table: RECORD_TABLES.task,
    route: "/young-people/{youngPersonId}/tasks",
    section: "tasks",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: false,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "due_date",
    titleField: "title",
    summaryField: "task",
  },

  document: {
    type: RECORD_TYPES.document,
    label: "Document",
    pluralLabel: "Documents",
    table: RECORD_TABLES.document,
    route: "/young-people/{youngPersonId}/documents",
    section: "documents",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: false,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "created_at",
    titleField: "title",
    summaryField: "description",
  },

  statutory_document: {
    type: RECORD_TYPES.statutory_document,
    label: "Statutory document",
    pluralLabel: "Statutory documents",
    table: RECORD_TABLES.statutory_document,
    route: "/young-people/{youngPersonId}/statutory-documents",
    section: "documents",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: false,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "review_date",
    titleField: "document_type",
    summaryField: "summary",
  },

  medication_record: {
    type: RECORD_TYPES.medication_record,
    label: "Medication record",
    pluralLabel: "Medication records",
    table: RECORD_TABLES.medication_record,
    route: "/young-people/{youngPersonId}/medication-records",
    section: "medication",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: true,
    primaryDateField: "administered_time",
    titleField: "medication_name",
    summaryField: "status",
  },

  handover_record: {
    type: RECORD_TYPES.handover_record,
    label: "Handover record",
    pluralLabel: "Handover records",
    table: RECORD_TABLES.handover_record,
    route: "/young-people/{youngPersonId}/handover",
    section: "handover",
    requiresYoungPerson: true,
    requiresHome: false,
    assistantReadable: true,
    listable: true,
    createable: true,
    timelineVisible: true,
    ofstedRelevant: true,
    riskRelevant: false,
    primaryDateField: "handover_date",
    titleField: "title",
    summaryField: "summary_text",
  },
});

export const RECORD_CONTRACT_LIST = freeze(Object.values(RECORD_CONTRACTS));

export function getRecordContract(recordType) {
  const type = normaliseRecordType(recordType);
  return RECORD_CONTRACTS[type] || null;
}

export function getRecordContractBySection(section) {
  const key = String(section || "").trim();
  const type = WORKSPACE_TO_RECORD_TYPE[key] || null;
  return type ? getRecordContract(type) : null;
}

export function getRecordSection(recordType) {
  const contract = getRecordContract(recordType);
  const type = normaliseRecordType(recordType);
  return contract?.section || RECORD_TYPE_TO_WORKSPACE[type] || "workspace";
}

export function getRecordLabel(recordType, fallback = "Record") {
  const contract = getRecordContract(recordType);
  return safeString(contract?.label, fallback);
}

export function getRecordPluralLabel(recordType, fallback = "Records") {
  const contract = getRecordContract(recordType);
  return safeString(contract?.pluralLabel, fallback);
}

export function getRecordRoute(recordType, params = {}) {
  const contract = getRecordContract(recordType);
  if (!contract?.route) return "";

  return contract.route
    .replace(
      "{youngPersonId}",
      encodeURIComponent(params.youngPersonId ?? params.childId ?? "")
    )
    .replace(
      "{childId}",
      encodeURIComponent(params.childId ?? params.youngPersonId ?? "")
    )
    .replace("{homeId}", encodeURIComponent(params.homeId ?? ""));
}

export function getRecordPrimaryDateField(recordType) {
  return getRecordContract(recordType)?.primaryDateField || "created_at";
}

export function getRecordTitleField(recordType) {
  return getRecordContract(recordType)?.titleField || "title";
}

export function getRecordSummaryField(recordType) {
  return getRecordContract(recordType)?.summaryField || "summary";
}

export function isRecordAssistantReadable(recordType) {
  return Boolean(getRecordContract(recordType)?.assistantReadable);
}

export function isRecordTimelineVisible(recordType) {
  return Boolean(getRecordContract(recordType)?.timelineVisible);
}

export function isRecordOfstedRelevant(recordType) {
  return Boolean(getRecordContract(recordType)?.ofstedRelevant);
}

export function isRecordRiskRelevant(recordType) {
  return Boolean(getRecordContract(recordType)?.riskRelevant);
}

export function isRecordListable(recordType) {
  return Boolean(getRecordContract(recordType)?.listable);
}

export function isRecordCreateable(recordType) {
  return Boolean(getRecordContract(recordType)?.createable);
}

export function getAssistantReadableContracts() {
  return RECORD_CONTRACT_LIST.filter((contract) => contract.assistantReadable);
}

export function getTimelineContracts() {
  return RECORD_CONTRACT_LIST.filter((contract) => contract.timelineVisible);
}

export function getOfstedRelevantContracts() {
  return RECORD_CONTRACT_LIST.filter((contract) => contract.ofstedRelevant);
}

export function getRiskRelevantContracts() {
  return RECORD_CONTRACT_LIST.filter((contract) => contract.riskRelevant);
}

export function getListableContracts() {
  return RECORD_CONTRACT_LIST.filter((contract) => contract.listable);
}

export function getCreateableContracts() {
  return RECORD_CONTRACT_LIST.filter((contract) => contract.createable);
}

export function getRecordTableFromContract(recordType) {
  const contract = getRecordContract(recordType);
  return contract?.table || getRecordTable(recordType);
}
