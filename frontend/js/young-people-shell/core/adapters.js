import {
  getDisplayName,
  normaliseImagePath,
} from "./utils.js";
import {
  RECORD_TYPES,
  WORKFLOW_STATUS,
  COMPLIANCE_STATUS,
  normaliseWorkflowStatus,
  normaliseSeverity,
  normaliseSignificance,
} from "./contracts.js";

function pickFirst(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return null;
}

function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function toBool(value) {
  return Boolean(value);
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object" && !Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function unique(values = []) {
  return [...new Set(arrayify(values).filter(Boolean))];
}

function compact(values = []) {
  return arrayify(values).map(cleanText).filter(Boolean);
}

function parseDateValue(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}

function daysFromNow(value) {
  const time = parseDateValue(value);
  if (!time) return null;

  const now = Date.now();
  const diff = time - now;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function isOverdue(value) {
  const days = daysFromNow(value);
  return days !== null && days < 0;
}

function isDueSoon(value, thresholdDays = 7) {
  const days = daysFromNow(value);
  return days !== null && days >= 0 && days <= thresholdDays;
}

function inferUrgencyLevel(record = {}) {
  const severity = cleanText(record.severity).toLowerCase();
  const significance = cleanText(record.significance).toLowerCase();
  const workflow = cleanText(record.workflow_status).toLowerCase();
  const status = cleanText(record.status).toLowerCase();

  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (significance === "critical") return "critical";
  if (significance === "high") return "high";
  if (record.safeguarding_flag) return "high";
  if (record.follow_up_required && isOverdue(record.due_date || record.review_date || record.next_action_date)) {
    return "high";
  }
  if (status === "overdue") return "high";
  if (workflow === "pending_review") return "medium";
  if (record.follow_up_required) return "medium";
  return "low";
}

function buildBaseRecord(raw = {}, overrides = {}) {
  return {
    id: raw.id ?? null,
    source_id: raw.source_id ?? raw.id ?? null,
    source_table: raw.source_table || "",
    record_type: overrides.record_type || raw.record_type || "",
    title: overrides.title || raw.title || "Record",
    summary: overrides.summary || raw.summary || "",
    workflow_status: overrides.workflow_status || raw.workflow_status || "",
    status: overrides.status || raw.status || "",
    approval_status: overrides.approval_status || raw.approval_status || "",
    significance: overrides.significance || raw.significance || "",
    severity: overrides.severity || raw.severity || "",
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    linked_plan_id: raw.linked_plan_id ?? null,
    linked_appointment_id: raw.linked_appointment_id ?? null,
    child_voice: raw.child_voice || raw.young_person_voice || raw.child_views || "",
    raw,
    ...overrides,
  };
}

export function inferSectionFromRecordType(recordType = "", raw = {}) {
  const map = {
    [RECORD_TYPES.daily_note]: "workspace",
    [RECORD_TYPES.incident]: "timeline",
    [RECORD_TYPES.support_plan]: "workspace",
    [RECORD_TYPES.risk_assessment]: "manager",
    [RECORD_TYPES.health_record]: "health",
    [RECORD_TYPES.education_record]: "education",
    [RECORD_TYPES.family_contact_record]: "family",
    [RECORD_TYPES.keywork_session]: "workspace",
    [RECORD_TYPES.appointment]: "calendar",
    [RECORD_TYPES.achievement_record]: "education",
    [RECORD_TYPES.safeguarding_record]: "manager",
    [RECORD_TYPES.missing_episode]: "timeline",
    [RECORD_TYPES.chronology_event]: "timeline",
    [RECORD_TYPES.compliance_item]: "compliance",
    [RECORD_TYPES.ai_generated_report]: "reports",
    [RECORD_TYPES.monthly_review]: "reports",
    [RECORD_TYPES.handover_record]: "handover",
    [RECORD_TYPES.manager_action]: "manager",
    [RECORD_TYPES.task]: "readiness",
    [RECORD_TYPES.medication_profile]: "health",
    [RECORD_TYPES.medication_record]: "health",
    inspection_pack_job: "reports",
    review_meeting: "reports",
    statutory_document: "documents",
    document: "documents",
    communication: "communication",
    therapy: "therapy",
    team: "team",
    supervision: "supervision",
  };

  if (map[recordType]) return map[recordType];

  const sourceTable = cleanText(raw.source_table || "").toLowerCase();

  if (sourceTable.includes("document")) return "documents";
  if (sourceTable.includes("communication")) return "communication";
  if (sourceTable.includes("therapy")) return "therapy";
  if (sourceTable.includes("team")) return "team";
  if (sourceTable.includes("supervision")) return "supervision";
  if (sourceTable.includes("compliance")) return "compliance";

  return "workspace";
}

function buildAssistantSummary(record = {}) {
  const recordType = record.record_type || "";

  const map = {
    [RECORD_TYPES.daily_note]: () =>
      pickFirst(
        cleanText(record.presentation),
        cleanText(record.activities),
        cleanText(record.actions_required),
        cleanText(record.summary),
        "Daily note recorded."
      ),

    [RECORD_TYPES.incident]: () =>
      pickFirst(
        cleanText(record.description),
        cleanText(record.outcome),
        cleanText(record.actions_taken),
        "Important event recorded."
      ),

    [RECORD_TYPES.support_plan]: () =>
      pickFirst(
        cleanText(record.presenting_need),
        cleanText(record.proactive_strategies),
        cleanText(record.summary),
        "Support plan available."
      ),

    [RECORD_TYPES.risk_assessment]: () =>
      pickFirst(
        cleanText(record.concern_summary),
        cleanText(record.current_controls),
        cleanText(record.response_actions),
        "Risk assessment available."
      ),

    [RECORD_TYPES.health_record]: () =>
      pickFirst(
        cleanText(record.summary),
        cleanText(record.outcome),
        "Health record available."
      ),

    [RECORD_TYPES.education_record]: () =>
      pickFirst(
        cleanText(record.learning_engagement),
        cleanText(record.issue_raised),
        cleanText(record.behaviour_summary),
        "Education record available."
      ),

    [RECORD_TYPES.family_contact_record]: () =>
      pickFirst(
        cleanText(record.post_contact_presentation),
        cleanText(record.concerns),
        cleanText(record.child_voice),
        "Family contact recorded."
      ),

    [RECORD_TYPES.keywork_session]: () =>
      pickFirst(
        cleanText(record.summary),
        cleanText(record.reflective_analysis),
        cleanText(record.actions_agreed),
        "Keywork session recorded."
      ),

    [RECORD_TYPES.appointment]: () =>
      pickFirst(
        cleanText(record.summary),
        cleanText(record.purpose),
        cleanText(record.follow_up_actions),
        "Appointment recorded."
      ),

    [RECORD_TYPES.achievement_record]: () =>
      pickFirst(
        cleanText(record.description),
        cleanText(record.child_voice),
        "Achievement recorded."
      ),

    [RECORD_TYPES.safeguarding_record]: () =>
      pickFirst(
        cleanText(record.concern_details),
        cleanText(record.immediate_action_taken),
        cleanText(record.outcome),
        "Safeguarding concern recorded."
      ),

    [RECORD_TYPES.missing_episode]: () =>
      pickFirst(
        cleanText(record.outcome),
        cleanText(record.actions_taken),
        cleanText(record.trigger_factors),
        "Missing episode recorded."
      ),

    [RECORD_TYPES.chronology_event]: () =>
      pickFirst(
        cleanText(record.summary),
        cleanText(record.title),
        "Chronology event recorded."
      ),

    [RECORD_TYPES.compliance_item]: () =>
      `Due ${cleanText(record.due_date || "date not set")}`,

    [RECORD_TYPES.ai_generated_report]: () =>
      pickFirst(
        cleanText(record.report_text),
        cleanText(record.summary),
        "AI report available."
      ),

    [RECORD_TYPES.monthly_review]: () =>
      pickFirst(
        cleanText(record.summary_of_month),
        cleanText(record.progress_summary),
        cleanText(record.child_voice_summary),
        "Monthly review available."
      ),

    [RECORD_TYPES.handover_record]: () =>
      pickFirst(
        cleanText(record.summary_text),
        cleanText(record.summary),
        "Handover recorded."
      ),

    [RECORD_TYPES.manager_action]: () =>
      pickFirst(
        cleanText(record.note),
        cleanText(record.summary),
        "Manager action recorded."
      ),

    [RECORD_TYPES.task]: () =>
      pickFirst(
        cleanText(record.task),
        cleanText(record.summary),
        "Task recorded."
      ),

    [RECORD_TYPES.medication_profile]: () =>
      pickFirst(
        [
          cleanText(record.medication_name),
          cleanText(record.dosage || record.dose),
          cleanText(record.frequency),
        ]
          .filter(Boolean)
          .join(" • "),
        "Medication profile available."
      ),

    [RECORD_TYPES.medication_record]: () =>
      pickFirst(
        [
          cleanText(record.medication_name),
          cleanText(record.dose),
          cleanText(record.status),
        ]
          .filter(Boolean)
          .join(" • "),
        "Medication administration recorded."
      ),

    inspection_pack_job: () =>
      pickFirst(cleanText(record.summary), "Inspection pack activity recorded."),

    review_meeting: () =>
      pickFirst(
        cleanText(record.decisions),
        cleanText(record.actions),
        "Review meeting recorded."
      ),

    statutory_document: () =>
      pickFirst(
        cleanText(record.description),
        cleanText(record.summary),
        "Statutory document available."
      ),
  };

  if (map[recordType]) return map[recordType]();
  return cleanText(record.summary) || cleanText(record.title) || "Record available.";
}

function buildContextualSignals(record = {}) {
  const signals = [];

  const text = compact([
    record.title,
    record.summary,
    record.description,
    record.concern_details,
    record.outcome,
    record.actions_taken,
    record.actions_required,
    record.follow_up_actions,
    record.review_comment,
    record.manager_review_comment,
    record.note,
  ]).join(" ").toLowerCase();

  if (/ofsted|inspection|annex a|statement of purpose|reg 40|reg40/.test(text)) {
    signals.push("inspection_relevant");
  }

  if (/handover|next shift|shift|presentation/.test(text)) {
    signals.push("handover_relevant");
  }

  if (/follow up|follow-up|review|monitor|book|arrange|contact/.test(text)) {
    signals.push("actionable");
  }

  if (/school|attendance|teacher|pep|ehcp|education/.test(text)) {
    signals.push("education_relevant");
  }

  if (/gp|doctor|camhs|dentist|optician|medication|health|hospital/.test(text)) {
    signals.push("health_relevant");
  }

  if (/family|mum|mother|dad|father|contact|visit|call/.test(text)) {
    signals.push("family_relevant");
  }

  return signals;
}

export function buildAssistantTags(record = {}) {
  const tags = [];

  if (record.record_type) tags.push(record.record_type);
  if (record.source_table) tags.push(`table:${record.source_table}`);

  if (record.severity) tags.push(`severity:${record.severity}`);
  if (record.significance) tags.push(`significance:${record.significance}`);
  if (record.workflow_status) tags.push(`workflow:${record.workflow_status}`);
  if (record.status) tags.push(`status:${record.status}`);
  if (record.approval_status) tags.push(`approval:${record.approval_status}`);

  if (record.safeguarding_flag) tags.push("safeguarding");
  if (record.follow_up_required) tags.push("follow_up_required");
  if (record.review_required) tags.push("review_required");
  if (record.referral_made) tags.push("referral_made");
  if (record.completed === false) tags.push("open_task");
  if (record.completed === true) tags.push("completed");
  if (record.archived) tags.push("archived");
  if (record.auto_generated) tags.push("auto_generated");
  if (record.police_involved) tags.push("police_involved");
  if (record.ofsted_notified) tags.push("ofsted_notified");
  if (record.requires_reg40) tags.push("reg40");
  if (record.compliance_generated) tags.push("compliance_generated");
  if (record.return_interview_completed) tags.push("return_interview_completed");

  const recordSection = inferSectionFromRecordType(record.record_type, record.raw || record);
  if (recordSection) tags.push(`section:${recordSection}`);

  const dueDate = record.due_date || record.review_date || record.next_action_date || record.expiry_date;
  if (dueDate) {
    if (isOverdue(dueDate)) tags.push("status:overdue");
    if (isDueSoon(dueDate)) tags.push("status:due_soon");
  }

  const urgency = inferUrgencyLevel(record);
  if (urgency) tags.push(`urgency:${urgency}`);

  tags.push(...buildContextualSignals(record));

  return unique(tags);
}

function inferRecordDate(record = {}) {
  return (
    record.occurred_at ||
    record.event_datetime ||
    record.recorded_at ||
    record.record_date ||
    record.contact_datetime ||
    record.session_date ||
    record.handover_date ||
    record.achievement_date ||
    record.concern_datetime ||
    record.start_datetime ||
    record.start_date ||
    record.meeting_date ||
    record.review_month ||
    record.due_date ||
    record.scheduled_time ||
    record.appointment_date ||
    record.action_at ||
    record.review_date ||
    record.created_at ||
    record.updated_at ||
    null
  );
}

export function toAssistantEvidence(record = {}) {
  const safeRecord = record && typeof record === "object" ? record : {};
  const raw = safeRecord.raw || safeRecord;
  const section = inferSectionFromRecordType(safeRecord.record_type, raw);
  const summary = buildAssistantSummary(safeRecord);
  const tags = buildAssistantTags(safeRecord);

  return {
    id: safeRecord.source_id ?? safeRecord.id ?? null,
    source_id: safeRecord.source_id ?? safeRecord.id ?? null,
    source_table: safeRecord.source_table || "",
    record_type: safeRecord.record_type || "",
    title: safeRecord.title || "Record",
    summary,
    section,
    status:
      safeRecord.workflow_status ||
      safeRecord.status ||
      safeRecord.approval_status ||
      "",
    severity: safeRecord.severity || safeRecord.significance || "",
    urgency: inferUrgencyLevel(safeRecord),
    date: inferRecordDate(safeRecord),
    due_date:
      safeRecord.due_date ||
      safeRecord.review_date ||
      safeRecord.next_action_date ||
      safeRecord.expiry_date ||
      null,
    child_voice:
      safeRecord.child_voice ||
      safeRecord.young_person_voice ||
      safeRecord.child_views ||
      "",
    linked_plan_id: safeRecord.linked_plan_id ?? null,
    linked_appointment_id: safeRecord.linked_appointment_id ?? null,
    tags,
    raw,
  };
}

export function mapYoungPerson(raw = {}, related = {}) {
  return {
    id: raw.id ?? null,
    home_id: raw.home_id ?? null,
    first_name: cleanText(raw.first_name),
    last_name: cleanText(raw.last_name),
    preferred_name: cleanText(raw.preferred_name),
    date_of_birth: raw.date_of_birth || null,
    gender: cleanText(raw.gender),
    ethnicity: cleanText(raw.ethnicity),
    nhs_number: cleanText(raw.nhs_number),
    local_id_number: cleanText(raw.local_id_number),
    admission_date: raw.admission_date || null,
    discharge_date: raw.discharge_date || null,
    placement_status: cleanText(raw.placement_status),
    primary_keyworker_id: raw.primary_keyworker_id ?? null,
    summary_risk_level: cleanText(raw.summary_risk_level),
    photo_url: normaliseImagePath(raw.photo_url || raw.profile_photo_url || ""),
    archived: toBool(raw.archived),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    home_name:
      related.home_name ||
      related.home?.name ||
      raw.home_name ||
      "",
    full_name: getDisplayName(raw),
  };
}

export function mapIdentityProfile(raw = {}) {
  return {
    id: raw.id ?? null,
    young_person_id: raw.young_person_id ?? null,
    record_type: "profile_identity",
    religion_or_faith: cleanText(raw.religion_or_faith),
    cultural_identity: cleanText(raw.cultural_identity),
    first_language: cleanText(raw.first_language),
    dietary_needs: cleanText(raw.dietary_needs),
    interests: cleanText(raw.interests),
    strengths_summary: cleanText(raw.strengths_summary),
    what_matters_to_me: cleanText(raw.what_matters_to_me),
    important_dates: cleanText(raw.important_dates),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    title: "Identity profile",
    summary: pickFirst(
      cleanText(raw.what_matters_to_me),
      cleanText(raw.strengths_summary),
      cleanText(raw.interests),
      "Identity profile available."
    ),
  };
}

export function mapCommunicationProfile(raw = {}) {
  return {
    id: raw.id ?? null,
    young_person_id: raw.young_person_id ?? null,
    record_type: "profile_communication",
    neurodiversity_summary: cleanText(raw.neurodiversity_summary),
    communication_style: cleanText(raw.communication_style),
    sensory_profile: cleanText(raw.sensory_profile),
    processing_needs: cleanText(raw.processing_needs),
    signs_of_distress: cleanText(raw.signs_of_distress),
    what_helps: cleanText(raw.what_helps),
    what_to_avoid: cleanText(raw.what_to_avoid),
    routines_and_predictability: cleanText(raw.routines_and_predictability),
    visual_support_needs: cleanText(raw.visual_support_needs),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    title: "Communication profile",
    summary: pickFirst(
      cleanText(raw.communication_style),
      cleanText(raw.what_helps),
      cleanText(raw.processing_needs),
      "Communication profile available."
    ),
  };
}

export function mapEducationProfile(raw = {}) {
  return {
    id: raw.id ?? null,
    young_person_id: raw.young_person_id ?? null,
    record_type: "profile_education",
    school_name: cleanText(raw.school_name),
    year_group: cleanText(raw.year_group),
    education_status: cleanText(raw.education_status),
    sen_status: cleanText(raw.sen_status),
    ehcp_details: cleanText(raw.ehcp_details),
    designated_teacher: cleanText(raw.designated_teacher),
    attendance_baseline: raw.attendance_baseline ?? null,
    pep_status: cleanText(raw.pep_status),
    support_summary: cleanText(raw.support_summary),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    title: "Education profile",
    summary: pickFirst(
      cleanText(raw.support_summary),
      cleanText(raw.education_status),
      cleanText(raw.school_name),
      "Education profile available."
    ),
  };
}

export function mapHealthProfile(raw = {}) {
  return {
    id: raw.id ?? null,
    young_person_id: raw.young_person_id ?? null,
    record_type: "profile_health",
    gp_name: cleanText(raw.gp_name),
    gp_contact: cleanText(raw.gp_contact),
    dentist_name: cleanText(raw.dentist_name),
    dentist_contact: cleanText(raw.dentist_contact),
    optician_name: cleanText(raw.optician_name),
    optician_contact: cleanText(raw.optician_contact),
    allergies: cleanText(raw.allergies),
    diagnoses: cleanText(raw.diagnoses),
    mental_health_summary: cleanText(raw.mental_health_summary),
    medication_summary: cleanText(raw.medication_summary),
    consent_notes: cleanText(raw.consent_notes),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    title: "Health profile",
    summary: pickFirst(
      cleanText(raw.mental_health_summary),
      cleanText(raw.medication_summary),
      cleanText(raw.diagnoses),
      "Health profile available."
    ),
  };
}

export function mapLegalStatus(raw = {}) {
  return {
    id: raw.id ?? null,
    young_person_id: raw.young_person_id ?? null,
    record_type: "profile_legal",
    legal_status: cleanText(raw.legal_status),
    order_type: cleanText(raw.order_type),
    order_details: cleanText(raw.order_details),
    delegated_authority_details: cleanText(raw.delegated_authority_details),
    restrictions_text: cleanText(raw.restrictions_text),
    consent_arrangements: cleanText(raw.consent_arrangements),
    effective_from: raw.effective_from || null,
    effective_to: raw.effective_to || null,
    is_current: toBool(raw.is_current),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    title: "Legal status",
    summary: pickFirst(
      cleanText(raw.legal_status),
      cleanText(raw.order_type),
      cleanText(raw.order_details),
      "Legal status available."
    ),
  };
}

export function mapFormulation(raw = {}) {
  return {
    id: raw.id ?? null,
    young_person_id: raw.young_person_id ?? null,
    record_type: "profile_formulation",
    presenting_needs: cleanText(raw.presenting_needs),
    developmental_context: cleanText(raw.developmental_context),
    trauma_context: cleanText(raw.trauma_context),
    neurodevelopmental_context: cleanText(raw.neurodevelopmental_context),
    relational_context: cleanText(raw.relational_context),
    meaning_of_behaviour: cleanText(raw.meaning_of_behaviour),
    known_triggers: cleanText(raw.known_triggers),
    early_signs_of_distress: cleanText(raw.early_signs_of_distress),
    protective_factors: cleanText(raw.protective_factors),
    what_helps: cleanText(raw.what_helps),
    what_adults_should_avoid: cleanText(raw.what_adults_should_avoid),
    regulation_strategies: cleanText(raw.regulation_strategies),
    child_voice_summary: cleanText(raw.child_voice_summary),
    review_date: raw.review_date || null,
    is_current: toBool(raw.is_current),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    title: "Formulation",
    summary: pickFirst(
      cleanText(raw.presenting_needs),
      cleanText(raw.meaning_of_behaviour),
      cleanText(raw.what_helps),
      "Formulation available."
    ),
  };
}

export function mapYoungPersonContact(raw = {}) {
  return {
    id: raw.id ?? null,
    young_person_id: raw.young_person_id ?? null,
    contact_type: cleanText(raw.contact_type),
    full_name: cleanText(raw.full_name),
    relationship_to_young_person: cleanText(
      raw.relationship_to_young_person || raw.relationship_to_child
    ),
    phone: cleanText(raw.phone || raw.phone_number),
    email: cleanText(raw.email),
    address: cleanText(raw.address),
    is_parental_responsibility_holder: toBool(raw.is_parental_responsibility_holder),
    is_approved_contact: toBool(raw.is_approved_contact),
    is_restricted_contact: toBool(raw.is_restricted_contact),
    supervision_level: cleanText(raw.supervision_level),
    notes: cleanText(raw.notes || raw.contact_notes),
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
  };
}

export function mapDailyNote(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.daily_note,
    source_table: raw.source_table || "daily_notes",
    title: `${cleanText(raw.shift_type) || "Daily"} note`,
    summary: pickFirst(
      cleanText(raw.presentation),
      cleanText(raw.activities),
      cleanText(raw.positives),
      cleanText(raw.actions_required),
      "Daily note"
    ),
    record_date: raw.note_date || null,
    recorded_at: raw.created_at || raw.updated_at || raw.note_date || null,
    workflow_status: normaliseWorkflowStatus(raw.workflow_status),
    significance: normaliseSignificance(raw.significance),
    mood: cleanText(raw.mood),
    presentation: cleanText(raw.presentation),
    activities: cleanText(raw.activities),
    education_update: cleanText(raw.education_update),
    health_update: cleanText(raw.health_update),
    family_update: cleanText(raw.family_update),
    behaviour_update: cleanText(raw.behaviour_update),
    young_person_voice: cleanText(raw.young_person_voice),
    positives: cleanText(raw.positives),
    actions_required: cleanText(raw.actions_required),
    quality_standards_tags: arrayify(raw.quality_standards_tags),
    manager_review_comment: cleanText(raw.manager_review_comment),
    submitted_at: raw.submitted_at || null,
    approved_at: raw.approved_at || null,
    returned_at: raw.returned_at || null,
    follow_up_required: !!cleanText(raw.actions_required),
  });
}

export function mapIncident(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.incident,
    source_table: raw.source_table || "incidents",
    title: cleanText(raw.incident_type) || cleanText(raw.title) || "Important event",
    summary: pickFirst(
      cleanText(raw.description),
      cleanText(raw.outcome),
      cleanText(raw.trauma_informed_formulation),
      "Important event"
    ),
    occurred_at: raw.incident_datetime || raw.created_at || null,
    workflow_status: normaliseWorkflowStatus(raw.workflow_status || raw.manager_review_status),
    severity: normaliseSeverity(raw.severity),
    location: cleanText(raw.location),
    incident_type: cleanText(raw.incident_type),
    description: cleanText(raw.description),
    antecedent: cleanText(raw.antecedent),
    staff_response: cleanText(raw.staff_response),
    child_response: cleanText(raw.child_response),
    outcome: cleanText(raw.outcome),
    presentation: cleanText(raw.presentation),
    trauma_informed_formulation: cleanText(raw.trauma_informed_formulation),
    child_voice: cleanText(raw.child_voice),
    restorative_follow_up: cleanText(raw.restorative_follow_up),
    actions_taken: cleanText(raw.actions_taken),
    injury_flag: toBool(raw.injury_flag),
    property_damage_flag: toBool(raw.property_damage_flag),
    police_involved: toBool(raw.police_involved),
    safeguarding_flag: toBool(raw.safeguarding_flag),
    follow_up_required: toBool(raw.follow_up_required),
    police_notified: toBool(raw.police_notified),
    lado_notified: toBool(raw.lado_notified),
    ofsted_notified: toBool(raw.ofsted_notified),
    requires_reg40: toBool(raw.requires_reg40),
    requires_notification: toBool(raw.requires_notification),
    review_comment: cleanText(raw.review_comment),
    submitted_at: raw.submitted_at || null,
    reviewed_at: raw.reviewed_at || null,
    returned_at: raw.returned_at || null,
  });
}

export function mapSupportPlan(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.support_plan,
    source_table: raw.source_table || "support_plans",
    title: cleanText(raw.title) || cleanText(raw.plan_type) || "Support plan",
    summary: pickFirst(
      cleanText(raw.summary),
      cleanText(raw.presenting_need),
      cleanText(raw.proactive_strategies),
      "Support plan"
    ),
    start_date: raw.start_date || null,
    review_date: raw.review_date || null,
    status: cleanText(raw.status),
    approval_status: cleanText(raw.approval_status),
    workflow_status: normaliseWorkflowStatus(raw.approval_status || raw.status),
    presenting_need: cleanText(raw.presenting_need),
    child_voice: cleanText(raw.child_voice),
    proactive_strategies: cleanText(raw.proactive_strategies),
    pace_guidance: cleanText(raw.pace_guidance),
    triggers: cleanText(raw.triggers),
    protective_factors: cleanText(raw.protective_factors),
    review_comment: cleanText(raw.review_comment),
    version_number: raw.version_number ?? null,
    archived: toBool(raw.archived),
  });
}

export function mapRiskAssessment(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.risk_assessment,
    source_table: raw.source_table || "risk_assessments",
    title: cleanText(raw.title) || cleanText(raw.category) || "Risk assessment",
    summary: pickFirst(
      cleanText(raw.concern_summary),
      cleanText(raw.current_controls),
      cleanText(raw.response_actions),
      "Risk assessment"
    ),
    category: cleanText(raw.category),
    concern_summary: cleanText(raw.concern_summary),
    known_triggers: cleanText(raw.known_triggers),
    early_warning_signs: cleanText(raw.early_warning_signs),
    contextual_factors: cleanText(raw.contextual_factors),
    current_controls: cleanText(raw.current_controls),
    deescalation_strategies: cleanText(raw.deescalation_strategies),
    response_actions: cleanText(raw.response_actions),
    child_views: cleanText(raw.child_views),
    review_date: raw.review_date || null,
    status: cleanText(raw.status),
    approval_status: cleanText(raw.approval_status),
    workflow_status: normaliseWorkflowStatus(raw.approval_status || raw.status),
    severity: normaliseSeverity(raw.severity),
    likelihood: cleanText(raw.likelihood),
    review_comment: cleanText(raw.review_comment),
    archived: toBool(raw.archived),
    review_required: !!raw.review_date,
  });
}

export function mapHealthRecord(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.health_record,
    source_table: raw.source_table || "health_records",
    title: cleanText(raw.title) || cleanText(raw.record_type) || "Health record",
    summary: pickFirst(
      cleanText(raw.summary),
      cleanText(raw.outcome),
      "Health record"
    ),
    event_datetime: raw.event_datetime || raw.created_at || null,
    workflow_status: normaliseWorkflowStatus(raw.workflow_status),
    significance: normaliseSignificance(raw.significance),
    professional_name: cleanText(raw.professional_name),
    outcome: cleanText(raw.outcome),
    follow_up_required: toBool(raw.follow_up_required),
    next_action_date: raw.next_action_date || null,
    linked_appointment_id: raw.linked_appointment_id ?? null,
  });
}

export function mapEducationRecord(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.education_record,
    source_table: raw.source_table || "education_records",
    title: cleanText(raw.provision_name) || "Education record",
    summary: pickFirst(
      cleanText(raw.learning_engagement),
      cleanText(raw.behaviour_summary),
      cleanText(raw.issue_raised),
      "Education record"
    ),
    record_date: raw.record_date || raw.created_at || null,
    workflow_status: normaliseWorkflowStatus(raw.workflow_status),
    significance: normaliseSignificance(raw.significance),
    attendance_status: cleanText(raw.attendance_status),
    provision_name: cleanText(raw.provision_name),
    behaviour_summary: cleanText(raw.behaviour_summary),
    learning_engagement: cleanText(raw.learning_engagement),
    issue_raised: cleanText(raw.issue_raised),
    action_taken: cleanText(raw.action_taken),
    professional_involved: cleanText(raw.professional_involved),
    achievement_note: cleanText(raw.achievement_note),
    child_voice: cleanText(raw.child_voice),
    follow_up_required: toBool(raw.follow_up_required),
  });
}

export function mapFamilyContactRecord(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.family_contact_record,
    source_table: raw.source_table || "family_contact_records",
    title: cleanText(raw.contact_person) || cleanText(raw.contact_type) || "Family contact",
    summary: pickFirst(
      cleanText(raw.post_contact_presentation),
      cleanText(raw.concerns),
      cleanText(raw.child_voice),
      "Family contact record"
    ),
    contact_datetime: raw.contact_datetime || raw.created_at || null,
    workflow_status: normaliseWorkflowStatus(raw.workflow_status),
    significance: normaliseSignificance(raw.significance),
    contact_type: cleanText(raw.contact_type),
    contact_person: cleanText(raw.contact_person),
    supervision_level: cleanText(raw.supervision_level),
    location: cleanText(raw.location),
    pre_contact_presentation: cleanText(raw.pre_contact_presentation),
    post_contact_presentation: cleanText(raw.post_contact_presentation),
    concerns: cleanText(raw.concerns),
    child_voice: cleanText(raw.child_voice),
    follow_up_required: toBool(raw.follow_up_required),
    linked_contact_id: raw.linked_contact_id ?? null,
  });
}

export function mapKeyworkSession(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.keywork_session,
    source_table: raw.source_table || "keywork_sessions",
    title: cleanText(raw.topic) || "Keywork session",
    summary: pickFirst(
      cleanText(raw.summary),
      cleanText(raw.reflective_analysis),
      cleanText(raw.actions_agreed),
      "Keywork session"
    ),
    session_date: raw.session_date || raw.created_at || null,
    workflow_status: normaliseWorkflowStatus(raw.workflow_status || raw.status),
    topic: cleanText(raw.topic),
    purpose: cleanText(raw.purpose),
    child_voice: cleanText(raw.child_voice),
    reflective_analysis: cleanText(raw.reflective_analysis),
    actions_agreed: cleanText(raw.actions_agreed),
    next_session_date: raw.next_session_date || null,
    archived: toBool(raw.archived),
    manager_review_comment: cleanText(raw.manager_review_comment),
    follow_up_required: !!cleanText(raw.actions_agreed),
  });
}

export function mapAppointment(raw = {}) {
  const start =
    raw.start_datetime ||
    raw.appointment_date ||
    raw.scheduled_time ||
    null;

  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.appointment,
    source_table:
      raw.source_table ||
      (raw.professional_name || raw.professional_role ? "young_person_appointments" : "appointments"),
    title: cleanText(raw.title) || cleanText(raw.appointment_type) || "Appointment",
    summary: pickFirst(
      cleanText(raw.summary),
      cleanText(raw.description),
      cleanText(raw.purpose),
      cleanText(raw.notes),
      "Appointment"
    ),
    appointment_type: cleanText(raw.appointment_type),
    start_datetime: start,
    end_datetime: raw.end_datetime || null,
    location: cleanText(raw.location),
    professional_name: cleanText(raw.professional_name),
    professional_role: cleanText(raw.professional_role),
    status: cleanText(raw.status),
    outcome_notes: cleanText(raw.outcome_notes || raw.outcome),
    preparation_notes: cleanText(raw.preparation_notes),
    follow_up_actions: cleanText(raw.follow_up_actions),
    reminder_minutes_before: raw.reminder_minutes_before ?? null,
    completed_at: raw.completed_at || null,
    cancelled_at: raw.cancelled_at || null,
    follow_up_required: !!cleanText(raw.follow_up_actions),
  });
}

export function mapAchievementRecord(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.achievement_record,
    source_table: raw.source_table || "achievement_records",
    title: cleanText(raw.title) || cleanText(raw.achievement_type) || "Achievement",
    summary: pickFirst(
      cleanText(raw.description),
      cleanText(raw.child_voice),
      cleanText(raw.significance),
      "Achievement record"
    ),
    achievement_date: raw.achievement_date || raw.created_at || null,
    achievement_type: cleanText(raw.achievement_type),
    source: cleanText(raw.source),
    significance: normaliseSignificance(raw.significance),
    linked_target_id: raw.linked_target_id ?? null,
    archived: toBool(raw.archived),
  });
}

export function mapSafeguardingRecord(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.safeguarding_record,
    source_table: raw.source_table || "safeguarding_records",
    title: cleanText(raw.safeguarding_category) || "Safeguarding record",
    summary: pickFirst(
      cleanText(raw.concern_details),
      cleanText(raw.disclosure_details),
      cleanText(raw.immediate_action_taken),
      "Safeguarding concern"
    ),
    concern_datetime: raw.concern_datetime || raw.created_at || null,
    safeguarding_category: cleanText(raw.safeguarding_category),
    concern_details: cleanText(raw.concern_details),
    disclosure_details: cleanText(raw.disclosure_details),
    immediate_action_taken: cleanText(raw.immediate_action_taken),
    referral_made: toBool(raw.referral_made),
    referral_details: cleanText(raw.referral_details),
    outcome: cleanText(raw.outcome),
    manager_review_status: cleanText(raw.manager_review_status),
    closed_at: raw.closed_at || null,
    incident_id: raw.incident_id ?? null,
    safeguarding_flag: true,
    follow_up_required: !raw.closed_at,
  });
}

export function mapMissingEpisode(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.missing_episode,
    source_table: raw.source_table || "missing_episodes",
    title: "Missing episode",
    summary: pickFirst(
      cleanText(raw.outcome),
      cleanText(raw.actions_taken),
      cleanText(raw.trigger_factors),
      "Missing episode"
    ),
    start_datetime: raw.start_datetime || null,
    reported_datetime: raw.reported_datetime || null,
    return_datetime: raw.return_datetime || null,
    police_reference: cleanText(raw.police_reference),
    return_interview_completed: toBool(raw.return_interview_completed),
    trigger_factors: cleanText(raw.trigger_factors),
    push_pull_factors: cleanText(raw.push_pull_factors),
    actions_taken: cleanText(raw.actions_taken),
    outcome: cleanText(raw.outcome),
    review_required: toBool(raw.review_required),
    workflow_status: normaliseWorkflowStatus(raw.workflow_status || raw.manager_review_status),
    manager_review_status: cleanText(raw.manager_review_status),
    child_voice: cleanText(raw.child_voice),
    return_interview_date: raw.return_interview_date || null,
    linked_risk_assessment_id: raw.linked_risk_assessment_id ?? null,
    follow_up_required: !toBool(raw.return_interview_completed) || toBool(raw.review_required),
  });
}

export function mapChronologyEvent(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.chronology_event,
    source_table: raw.source_table || "chronology_events",
    title: cleanText(raw.title) || cleanText(raw.category) || "Chronology event",
    summary: cleanText(raw.summary),
    event_datetime: raw.event_datetime || raw.created_at || null,
    category: cleanText(raw.category),
    subcategory: cleanText(raw.subcategory),
    significance: normaliseSignificance(raw.significance),
    workflow_status: normaliseWorkflowStatus(raw.workflow_status || raw.event_status),
    severity: normaliseSeverity(raw.severity),
    safeguarding_flag: toBool(raw.safeguarding_flag),
    child_voice_present: toBool(raw.child_voice_present),
    auto_generated: toBool(raw.auto_generated),
    is_visible: raw.is_visible !== false,
    event_status: cleanText(raw.event_status),
    tags_json: toJsonArray(raw.tags_json),
    metadata_json: toJsonObject(raw.metadata_json),
    linked_standard: cleanText(raw.linked_standard),
    linked_judgement_area: cleanText(raw.linked_judgement_area),
    linked_document_id: raw.linked_document_id ?? null,
    linked_review_id: raw.linked_review_id ?? null,
    linked_action_id: raw.linked_action_id ?? null,
    recorded_by_name: cleanText(raw.recorded_by_name),
    primary_record_type: cleanText(raw.primary_record_type),
  });
}

export function mapComplianceItem(raw = {}) {
  const status = cleanText(raw.status).toLowerCase();
  const normalisedStatus = Object.values(COMPLIANCE_STATUS).includes(status)
    ? status
    : COMPLIANCE_STATUS.pending;

  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.compliance_item,
    source_table: raw.source_table || "compliance_items",
    title: cleanText(raw.title) || "Compliance item",
    summary: `Due ${raw.due_date || "date not set"}`,
    due_date: raw.due_date || null,
    completed_date: raw.completed_date || null,
    status: normalisedStatus,
    severity: normaliseSeverity(raw.severity),
    owner_id: raw.owner_id ?? null,
    escalation_level: raw.escalation_level ?? null,
    rule_id: raw.rule_id ?? null,
    record_type_source: cleanText(raw.record_type),
    metadata_json: toJsonObject(raw.metadata_json),
    manager_notified_at: raw.manager_notified_at || null,
    last_notification_at: raw.last_notification_at || null,
    follow_up_required: normalisedStatus !== COMPLIANCE_STATUS.completed,
    review_required: normalisedStatus === COMPLIANCE_STATUS.overdue || normalisedStatus === COMPLIANCE_STATUS.escalated,
  });
}

export function mapAiReport(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.ai_generated_report,
    source_table: raw.source_table || "ai_generated_reports",
    title: cleanText(raw.title) || cleanText(raw.report_type) || "AI generated report",
    summary: cleanText(raw.report_text),
    report_type: cleanText(raw.report_type),
    review_month: raw.review_month || null,
    status: cleanText(raw.status),
    generated_by: raw.generated_by ?? null,
    auto_generated: true,
  });
}

export function mapMonthlyReview(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.monthly_review,
    source_table: raw.source_table || "monthly_reviews",
    title: cleanText(raw.review_title) || "Monthly review",
    summary: pickFirst(
      cleanText(raw.summary_of_month),
      cleanText(raw.progress_summary),
      cleanText(raw.child_voice_summary),
      "Monthly review"
    ),
    review_month: raw.review_month || null,
    status: cleanText(raw.status),
    progress_summary: cleanText(raw.progress_summary),
    child_voice_summary: cleanText(raw.child_voice_summary),
    concerns_and_risks: cleanText(raw.concerns_and_risks),
    education_summary: cleanText(raw.education_summary),
    health_summary: cleanText(raw.health_summary),
    family_summary: cleanText(raw.family_summary),
    keywork_summary: cleanText(raw.keywork_summary),
    behaviour_summary: cleanText(raw.behaviour_summary),
    achievements_summary: cleanText(raw.achievements_summary),
    actions_for_next_month: cleanText(raw.actions_for_next_month),
    manager_analysis: cleanText(raw.manager_analysis),
    approved_by: raw.approved_by ?? null,
    approved_at: raw.approved_at || null,
  });
}

export function mapHandoverRecord(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.handover_record,
    source_table: raw.source_table || "handover_records",
    title: cleanText(raw.title) || "Handover",
    summary: cleanText(raw.summary_text) || "Handover record",
    handover_date: raw.handover_date || null,
    shift_type: cleanText(raw.shift_type),
    status: cleanText(raw.status),
    source_window_start: raw.source_window_start || null,
    source_window_end: raw.source_window_end || null,
    approved_by: raw.approved_by ?? null,
  });
}

export function mapInspectionPackJob(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: "inspection_pack_job",
    source_table: raw.source_table || "inspection_pack_jobs",
    title: cleanText(raw.pack_type) || "Inspection pack",
    summary:
      cleanText(raw.status) === "completed"
        ? "Inspection pack generated"
        : "Inspection pack in progress",
    scope_type: cleanText(raw.scope_type),
    scope_id: raw.scope_id ?? null,
    pack_type: cleanText(raw.pack_type),
    status: cleanText(raw.status),
    requested_by: raw.requested_by ?? null,
    generated_file_path: cleanText(raw.generated_file_path),
    summary_json: toJsonObject(raw.summary_json),
    completed_at: raw.completed_at || null,
    auto_generated: true,
  });
}

export function mapManagerAction(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.manager_action,
    source_table: raw.source_table || "manager_actions",
    title: cleanText(raw.action_type) || "Manager action",
    summary: cleanText(raw.note) || "Manager action",
    action_type: cleanText(raw.action_type),
    related_table: cleanText(raw.related_table),
    related_id: raw.related_id ?? null,
    note: cleanText(raw.note),
    action_by: raw.action_by ?? null,
    action_at: raw.action_at || raw.created_at || null,
  });
}

export function mapTask(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.task,
    source_table: raw.source_table || "tasks",
    title: cleanText(raw.title) || cleanText(raw.task) || "Task",
    summary: cleanText(raw.task) || "Task",
    task_date: raw.task_date || null,
    due_date: raw.due_date || null,
    completed: toBool(raw.completed),
    completed_at: raw.completed_at || null,
    assigned_role: cleanText(raw.assigned_role),
    assigned_to_user_id: raw.assigned_to_user_id ?? null,
    task_type: cleanText(raw.task_type),
    compliance_generated: toBool(raw.compliance_generated),
    status: raw.completed ? WORKFLOW_STATUS.completed : WORKFLOW_STATUS.active,
    follow_up_required: !toBool(raw.completed),
  });
}

export function mapMedicationProfile(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.medication_profile,
    source_table: raw.source_table || "medication_profiles",
    title: cleanText(raw.medication_name) || "Medication profile",
    summary: [
      cleanText(raw.dosage || raw.dose),
      cleanText(raw.frequency),
      cleanText(raw.reason),
    ]
      .filter(Boolean)
      .join(" • ") || "Medication profile",
    medication_name: cleanText(raw.medication_name),
    dosage: cleanText(raw.dosage || raw.dose),
    route: cleanText(raw.route),
    frequency: cleanText(raw.frequency),
    prn_guidance: cleanText(raw.prn_guidance),
    prescribed_by: cleanText(raw.prescribed_by),
    start_date: raw.start_date || null,
    end_date: raw.end_date || null,
    is_active: toBool(raw.is_active),
    notes: cleanText(raw.notes),
    reason: cleanText(raw.reason),
    status: raw.is_active ? WORKFLOW_STATUS.active : WORKFLOW_STATUS.archived,
  });
}

export function mapMedicationRecord(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: RECORD_TYPES.medication_record,
    source_table: raw.source_table || "medication_records",
    title: cleanText(raw.medication_name) || "Medication administration",
    summary: [
      cleanText(raw.dose),
      cleanText(raw.route),
      cleanText(raw.status),
    ]
      .filter(Boolean)
      .join(" • ") || "Medication record",
    scheduled_time: raw.scheduled_time || null,
    administered_time: raw.administered_time || null,
    medication_name: cleanText(raw.medication_name),
    dose: cleanText(raw.dose),
    route: cleanText(raw.route),
    status: cleanText(raw.status),
    refusal_reason: cleanText(raw.refusal_reason),
    omission_reason: cleanText(raw.omission_reason),
    error_flag: toBool(raw.error_flag),
    error_details: cleanText(raw.error_details),
    manager_review_status: cleanText(raw.manager_review_status),
    administered_by: raw.administered_by ?? null,
    follow_up_required: toBool(raw.error_flag),
  });
}

export function mapReviewMeeting(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: "review_meeting",
    source_table: raw.source_table || "review_meetings",
    title: cleanText(raw.meeting_type) || "Review meeting",
    summary: pickFirst(
      cleanText(raw.decisions),
      cleanText(raw.actions),
      cleanText(raw.child_voice),
      "Review meeting"
    ),
    meeting_date: raw.meeting_date || null,
    meeting_type: cleanText(raw.meeting_type),
    chair_person: cleanText(raw.chair_person),
    attendees_json: toJsonArray(raw.attendees_json),
    agenda: cleanText(raw.agenda),
    child_voice: cleanText(raw.child_voice),
    decisions: cleanText(raw.decisions),
    actions: cleanText(raw.actions),
    next_review_date: raw.next_review_date || null,
    follow_up_required: !!cleanText(raw.actions),
  });
}

export function mapStatutoryDocument(raw = {}) {
  return buildBaseRecord(raw, {
    record_type: "statutory_document",
    source_table: raw.source_table || "statutory_documents",
    title: cleanText(raw.title) || cleanText(raw.document_type) || "Statutory document",
    summary: cleanText(raw.description) || "Statutory document",
    document_type: cleanText(raw.document_type),
    file_url: cleanText(raw.file_url),
    file_name: cleanText(raw.file_name),
    file_type: cleanText(raw.file_type),
    issue_date: raw.issue_date || null,
    review_date: raw.review_date || null,
    expiry_date: raw.expiry_date || null,
    status: cleanText(raw.status),
    compliance_category: cleanText(raw.compliance_category),
    linked_standard_code: cleanText(raw.linked_standard_code),
    reviewed_by: raw.reviewed_by ?? null,
    reviewed_at: raw.reviewed_at || null,
    archived: toBool(raw.archived),
    review_required: !!raw.review_date || !!raw.expiry_date,
  });
}

export function mapBundle(raw = {}) {
  return {
    young_person: mapYoungPerson(raw.young_person || raw.youngPerson || raw, raw),
    identity_profile: mapIdentityProfile(raw.identity_profile || raw.young_person_identity_profile || {}),
    communication_profile: mapCommunicationProfile(
      raw.communication_profile || raw.young_person_communication_profile || {}
    ),
    education_profile: mapEducationProfile(
      raw.education_profile || raw.young_person_education_profile || {}
    ),
    health_profile: mapHealthProfile(
      raw.health_profile || raw.young_person_health_profile || {}
    ),
    legal_status: mapLegalStatus(
      raw.legal_status || raw.young_person_legal_status || {}
    ),
    formulation: mapFormulation(
      raw.formulation ||
        raw.young_person_formulation ||
        raw.young_person_formulations ||
        {}
    ),
  };
}

export function mapList(items = [], mapper = (x) => x) {
  return arrayify(items).map(mapper);
}

export function mapReadinessPayload(raw = {}) {
  return {
    compliance_items: mapList(
      raw.compliance_items || raw.items || [],
      mapComplianceItem
    ),
    statutory_documents: mapList(
      raw.statutory_documents || [],
      mapStatutoryDocument
    ),
    tasks: mapList(raw.tasks || [], mapTask),
    approvals_pending: raw.approvals_pending ?? 0,
    overdue_count: raw.overdue_count ?? 0,
    due_soon_count: raw.due_soon_count ?? 0,
    escalation_count: raw.escalation_count ?? 0,
  };
}

export function mapManagerReviewPayload(raw = {}) {
  return {
    submitted_records: mapList(raw.submitted_records || [], (item) => item),
    manager_actions: mapList(raw.manager_actions || [], mapManagerAction),
    compliance_items: mapList(raw.compliance_items || [], mapComplianceItem),
    incidents: mapList(raw.incidents || [], mapIncident),
    risks: mapList(raw.risk_assessments || raw.risks || [], mapRiskAssessment),
    tasks: mapList(raw.tasks || [], mapTask),
    pattern_alerts: arrayify(raw.pattern_alerts || []),
  };
}

export function mapRecordByType(recordType, raw = {}) {
  switch (recordType) {
    case RECORD_TYPES.daily_note:
      return mapDailyNote(raw);
    case RECORD_TYPES.incident:
      return mapIncident(raw);
    case RECORD_TYPES.support_plan:
      return mapSupportPlan(raw);
    case RECORD_TYPES.risk_assessment:
      return mapRiskAssessment(raw);
    case RECORD_TYPES.health_record:
      return mapHealthRecord(raw);
    case RECORD_TYPES.education_record:
      return mapEducationRecord(raw);
    case RECORD_TYPES.family_contact_record:
      return mapFamilyContactRecord(raw);
    case RECORD_TYPES.keywork_session:
      return mapKeyworkSession(raw);
    case RECORD_TYPES.appointment:
      return mapAppointment(raw);
    case RECORD_TYPES.achievement_record:
      return mapAchievementRecord(raw);
    case RECORD_TYPES.safeguarding_record:
      return mapSafeguardingRecord(raw);
    case RECORD_TYPES.missing_episode:
      return mapMissingEpisode(raw);
    case RECORD_TYPES.chronology_event:
      return mapChronologyEvent(raw);
    case RECORD_TYPES.compliance_item:
      return mapComplianceItem(raw);
    case RECORD_TYPES.ai_generated_report:
      return mapAiReport(raw);
    case RECORD_TYPES.monthly_review:
      return mapMonthlyReview(raw);
    case RECORD_TYPES.handover_record:
      return mapHandoverRecord(raw);
    case RECORD_TYPES.manager_action:
      return mapManagerAction(raw);
    case RECORD_TYPES.task:
      return mapTask(raw);
    case RECORD_TYPES.medication_profile:
      return mapMedicationProfile(raw);
    case RECORD_TYPES.medication_record:
      return mapMedicationRecord(raw);
    case "inspection_pack_job":
      return mapInspectionPackJob(raw);
    case "review_meeting":
      return mapReviewMeeting(raw);
    case "statutory_document":
      return mapStatutoryDocument(raw);
    default:
      return buildBaseRecord(raw, {
        record_type: recordType || raw.record_type || "record",
        title: cleanText(raw.title) || "Record",
        summary: cleanText(raw.summary) || "",
      });
  }
}

export function mapRecordsToEvidence(items = [], mapper = (x) => x) {
  return mapList(items, mapper).map(toAssistantEvidence);
}

export function mapReadinessEvidence(raw = {}) {
  const payload = mapReadinessPayload(raw);

  return [
    ...payload.compliance_items.map(toAssistantEvidence),
    ...payload.statutory_documents.map(toAssistantEvidence),
    ...payload.tasks.map(toAssistantEvidence),
  ];
}

export function mapManagerReviewEvidence(raw = {}) {
  const payload = mapManagerReviewPayload(raw);

  return [
    ...payload.manager_actions.map(toAssistantEvidence),
    ...payload.compliance_items.map(toAssistantEvidence),
    ...payload.incidents.map(toAssistantEvidence),
    ...payload.risks.map(toAssistantEvidence),
    ...payload.tasks.map(toAssistantEvidence),
  ];
}

export function buildAssistantEvidenceSet(payload = {}) {
  const evidence = [];

  const addMapped = (items, mapper) => {
    evidence.push(...mapList(items || [], mapper).map(toAssistantEvidence));
  };

  addMapped(payload.daily_notes, mapDailyNote);
  addMapped(payload.incidents, mapIncident);
  addMapped(payload.support_plans, mapSupportPlan);
  addMapped(payload.risk_assessments || payload.risks, mapRiskAssessment);
  addMapped(payload.health_records, mapHealthRecord);
  addMapped(payload.education_records, mapEducationRecord);
  addMapped(payload.family_contact_records, mapFamilyContactRecord);
  addMapped(payload.keywork_sessions, mapKeyworkSession);
  addMapped(payload.appointments, mapAppointment);
  addMapped(payload.achievement_records, mapAchievementRecord);
  addMapped(payload.safeguarding_records, mapSafeguardingRecord);
  addMapped(payload.missing_episodes, mapMissingEpisode);
  addMapped(payload.chronology_events || payload.timeline, mapChronologyEvent);
  addMapped(payload.compliance_items, mapComplianceItem);
  addMapped(payload.ai_generated_reports, mapAiReport);
  addMapped(payload.monthly_reviews, mapMonthlyReview);
  addMapped(payload.handover_records, mapHandoverRecord);
  addMapped(payload.manager_actions, mapManagerAction);
  addMapped(payload.tasks, mapTask);
  addMapped(payload.medication_profiles, mapMedicationProfile);
  addMapped(payload.medication_records, mapMedicationRecord);
  addMapped(payload.review_meetings, mapReviewMeeting);
  addMapped(payload.statutory_documents, mapStatutoryDocument);
  addMapped(payload.inspection_pack_jobs, mapInspectionPackJob);

  if (payload.identity_profile || payload.young_person_identity_profile) {
    evidence.push(toAssistantEvidence(mapIdentityProfile(
      payload.identity_profile || payload.young_person_identity_profile
    )));
  }

  if (payload.communication_profile || payload.young_person_communication_profile) {
    evidence.push(toAssistantEvidence(mapCommunicationProfile(
      payload.communication_profile || payload.young_person_communication_profile
    )));
  }

  if (payload.education_profile || payload.young_person_education_profile) {
    evidence.push(toAssistantEvidence(mapEducationProfile(
      payload.education_profile || payload.young_person_education_profile
    )));
  }

  if (payload.health_profile || payload.young_person_health_profile) {
    evidence.push(toAssistantEvidence(mapHealthProfile(
      payload.health_profile || payload.young_person_health_profile
    )));
  }

  if (payload.legal_status || payload.young_person_legal_status) {
    evidence.push(toAssistantEvidence(mapLegalStatus(
      payload.legal_status || payload.young_person_legal_status
    )));
  }

  if (
    payload.formulation ||
    payload.young_person_formulation ||
    payload.young_person_formulations
  ) {
    evidence.push(toAssistantEvidence(mapFormulation(
      payload.formulation ||
        payload.young_person_formulation ||
        payload.young_person_formulations
    )));
  }

  return evidence;
}
