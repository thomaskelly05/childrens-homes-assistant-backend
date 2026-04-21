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

function inferUrgencyLevel(record = {}) {
  const severity = cleanText(record.severity).toLowerCase();
  const significance = cleanText(record.significance).toLowerCase();
  const workflow = cleanText(record.workflow_status).toLowerCase();
  const status = cleanText(record.status).toLowerCase();
  const approval = cleanText(record.approval_status).toLowerCase();
  const priority = cleanText(record.priority).toLowerCase();

  if (priority === "critical") return "critical";
  if (priority === "high") return "high";
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (significance === "critical") return "critical";
  if (significance === "high") return "high";
  if (record.safeguarding_flag) return "high";
  if (record.police_involved || record.ofsted_notified || record.requires_reg40) {
    return "high";
  }

  if (
    record.follow_up_required &&
    isOverdue(
      record.due_date ||
        record.review_date ||
        record.next_action_date ||
        record.expiry_date ||
        record.task_due_date
    )
  ) {
    return "high";
  }

  if (status === "overdue") return "high";
  if (status === "escalated") return "high";
  if (approval === "rejected" || approval === "returned") return "medium";
  if (workflow === "pending_review") return "medium";
  if (record.follow_up_required) return "medium";

  return "low";
}

function buildBaseRecord(raw = {}, overrides = {}) {
  const safeRaw = safeObject(raw);

  return {
    id: safeRaw.id ?? null,
    source_id: safeRaw.source_id ?? safeRaw.id ?? null,
    source_table: safeString(safeRaw.source_table),
    record_type: safeString(overrides.record_type || safeRaw.record_type, "record"),
    title: safeString(overrides.title || safeRaw.title, "Record"),
    summary: safeString(overrides.summary || safeRaw.summary),
    workflow_status: safeString(
      overrides.workflow_status || safeRaw.workflow_status
    ),
    status: safeString(overrides.status || safeRaw.status),
    approval_status: safeString(
      overrides.approval_status || safeRaw.approval_status
    ),
    significance: safeString(overrides.significance || safeRaw.significance),
    severity: safeString(overrides.severity || safeRaw.severity),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    linked_plan_id: safeRaw.linked_plan_id ?? null,
    linked_appointment_id: safeRaw.linked_appointment_id ?? null,
    child_voice:
      safeRaw.child_voice || safeRaw.young_person_voice || safeRaw.child_views || "",
    raw: safeRaw,
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
    onboarding: "team",
    training_record: "supervision",
    probation: "supervision",
    vacancy: "team",
    pipeline_candidate: "team",
    shift: "handover",
    absence: "team",
    maintenance_item: "home-dashboard",
    finance_item: "manager",
    medication_item: "health",
    admission: "manager",
    discharge: "manager",
    visitor_log: "communication",
    staff_file: "documents",
    audit: "quality",
    reg40_item: "quality",
    reg44_item: "quality",
    reg45_item: "reports",
    transport_log: "calendar",
    rota_shift: "team",
    staffing_snapshot: "team",
    home_incident: "timeline",

    inspection_home_header: "inspection-readiness",
    inspection_section_panel: "inspection-readiness",
    inspection_reason: "inspection-readiness",
    inspection_action: "inspection-readiness",
    inspection_task: "inspection-readiness",
    inspection_briefing: "inspection-readiness",
    inspection_prep_72_hour: "inspection-readiness",
    inspection_home_card: "inspection-readiness",
  };

  if (map[recordType]) return map[recordType];

  const sourceTable = cleanText(safeObject(raw).source_table || "").toLowerCase();

  if (sourceTable.includes("inspection")) return "inspection-readiness";
  if (sourceTable.includes("document")) return "documents";
  if (sourceTable.includes("communication")) return "communication";
  if (sourceTable.includes("therapy")) return "therapy";
  if (sourceTable.includes("team")) return "team";
  if (sourceTable.includes("supervision")) return "supervision";
  if (sourceTable.includes("compliance")) return "compliance";
  if (sourceTable.includes("training")) return "supervision";
  if (sourceTable.includes("probation")) return "supervision";
  if (sourceTable.includes("onboarding")) return "team";
  if (sourceTable.includes("pipeline")) return "team";
  if (sourceTable.includes("vacanc")) return "team";
  if (sourceTable.includes("rota")) return "team";
  if (sourceTable.includes("staffing")) return "team";
  if (sourceTable.includes("visitor")) return "communication";
  if (sourceTable.includes("audit")) return "quality";
  if (sourceTable.includes("reg44")) return "quality";
  if (sourceTable.includes("reg45")) return "reports";
  if (sourceTable.includes("reg40")) return "quality";
  if (sourceTable.includes("transport")) return "calendar";
  if (sourceTable.includes("maintenance")) return "home-dashboard";
  if (sourceTable.includes("finance")) return "manager";
  if (sourceTable.includes("incident")) return "timeline";

  return "workspace";
}

function buildAssistantSummary(record = {}) {
  const safeRecord = safeObject(record);
  const recordType = safeRecord.record_type || "";

  const map = {
    [RECORD_TYPES.daily_note]: () =>
      pickFirst(
        cleanText(safeRecord.presentation),
        cleanText(safeRecord.activities),
        cleanText(safeRecord.actions_required),
        cleanText(safeRecord.summary),
        "Daily note recorded."
      ),

    [RECORD_TYPES.incident]: () =>
      pickFirst(
        cleanText(safeRecord.description),
        cleanText(safeRecord.outcome),
        cleanText(safeRecord.actions_taken),
        "Important event recorded."
      ),

    [RECORD_TYPES.support_plan]: () =>
      pickFirst(
        cleanText(safeRecord.presenting_need),
        cleanText(safeRecord.proactive_strategies),
        cleanText(safeRecord.summary),
        "Support plan available."
      ),

    [RECORD_TYPES.risk_assessment]: () =>
      pickFirst(
        cleanText(safeRecord.concern_summary),
        cleanText(safeRecord.current_controls),
        cleanText(safeRecord.response_actions),
        "Risk assessment available."
      ),

    [RECORD_TYPES.health_record]: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.outcome),
        "Health record available."
      ),

    [RECORD_TYPES.education_record]: () =>
      pickFirst(
        cleanText(safeRecord.learning_engagement),
        cleanText(safeRecord.issue_raised),
        cleanText(safeRecord.behaviour_summary),
        "Education record available."
      ),

    [RECORD_TYPES.family_contact_record]: () =>
      pickFirst(
        cleanText(safeRecord.post_contact_presentation),
        cleanText(safeRecord.concerns),
        cleanText(safeRecord.child_voice),
        "Family contact recorded."
      ),

    [RECORD_TYPES.keywork_session]: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.reflective_analysis),
        cleanText(safeRecord.actions_agreed),
        "Keywork session recorded."
      ),

    [RECORD_TYPES.appointment]: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.purpose),
        cleanText(safeRecord.follow_up_actions),
        "Appointment recorded."
      ),

    [RECORD_TYPES.achievement_record]: () =>
      pickFirst(
        cleanText(safeRecord.description),
        cleanText(safeRecord.child_voice),
        "Achievement recorded."
      ),

    [RECORD_TYPES.safeguarding_record]: () =>
      pickFirst(
        cleanText(safeRecord.concern_details),
        cleanText(safeRecord.immediate_action_taken),
        cleanText(safeRecord.outcome),
        "Safeguarding concern recorded."
      ),

    [RECORD_TYPES.missing_episode]: () =>
      pickFirst(
        cleanText(safeRecord.outcome),
        cleanText(safeRecord.actions_taken),
        cleanText(safeRecord.trigger_factors),
        "Missing episode recorded."
      ),

    [RECORD_TYPES.chronology_event]: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.title),
        "Chronology event recorded."
      ),

    [RECORD_TYPES.compliance_item]: () =>
      `Due ${cleanText(safeRecord.due_date || "date not set")}`,

    [RECORD_TYPES.ai_generated_report]: () =>
      pickFirst(
        cleanText(safeRecord.report_text),
        cleanText(safeRecord.summary),
        "AI report available."
      ),

    [RECORD_TYPES.monthly_review]: () =>
      pickFirst(
        cleanText(safeRecord.summary_of_month),
        cleanText(safeRecord.progress_summary),
        cleanText(safeRecord.child_voice_summary),
        "Monthly review available."
      ),

    [RECORD_TYPES.handover_record]: () =>
      pickFirst(
        cleanText(safeRecord.summary_text),
        cleanText(safeRecord.summary),
        "Handover recorded."
      ),

    [RECORD_TYPES.manager_action]: () =>
      pickFirst(
        cleanText(safeRecord.note),
        cleanText(safeRecord.summary),
        "Manager action recorded."
      ),

    [RECORD_TYPES.task]: () =>
      pickFirst(
        cleanText(safeRecord.task),
        cleanText(safeRecord.summary),
        "Task recorded."
      ),

    [RECORD_TYPES.medication_profile]: () =>
      pickFirst(
        [
          cleanText(safeRecord.medication_name),
          cleanText(safeRecord.dosage || safeRecord.dose),
          cleanText(safeRecord.frequency),
        ]
          .filter(Boolean)
          .join(" • "),
        "Medication profile available."
      ),

    [RECORD_TYPES.medication_record]: () =>
      pickFirst(
        [
          cleanText(safeRecord.medication_name),
          cleanText(safeRecord.dose),
          cleanText(safeRecord.status),
        ]
          .filter(Boolean)
          .join(" • "),
        "Medication administration recorded."
      ),

    inspection_pack_job: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        "Inspection pack activity recorded."
      ),

    review_meeting: () =>
      pickFirst(
        cleanText(safeRecord.decisions),
        cleanText(safeRecord.actions),
        "Review meeting recorded."
      ),

    statutory_document: () =>
      pickFirst(
        cleanText(safeRecord.description),
        cleanText(safeRecord.summary),
        "Statutory document available."
      ),

    document: () =>
      pickFirst(
        cleanText(safeRecord.description),
        cleanText(safeRecord.summary),
        "Document available."
      ),

    communication: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.notes),
        cleanText(safeRecord.outcome),
        "Communication record available."
      ),

    therapy: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.notes),
        "Therapy record available."
      ),

    team: () =>
      pickFirst(
        cleanText(safeRecord.staff_member),
        cleanText(safeRecord.role),
        "Team record available."
      ),

    supervision: () =>
      pickFirst(
        cleanText(safeRecord.staff_member),
        cleanText(safeRecord.status),
        "Supervision record available."
      ),

    onboarding: () =>
      pickFirst(
        cleanText(safeRecord.stage),
        cleanText(safeRecord.status),
        cleanText(safeRecord.summary),
        "Onboarding record available."
      ),

    training_record: () =>
      pickFirst(
        cleanText(safeRecord.status),
        cleanText(safeRecord.summary),
        "Training record available."
      ),

    probation: () =>
      pickFirst(
        cleanText(safeRecord.probation_stage),
        cleanText(safeRecord.status),
        "Probation record available."
      ),

    vacancy: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.priority),
        "Vacancy record available."
      ),

    pipeline_candidate: () =>
      pickFirst(
        cleanText(safeRecord.stage),
        cleanText(safeRecord.status),
        "Pipeline candidate available."
      ),

    shift: () =>
      pickFirst(
        cleanText(safeRecord.note),
        cleanText(safeRecord.shift),
        "Shift record available."
      ),

    absence: () =>
      pickFirst(
        cleanText(safeRecord.cover_plan),
        cleanText(safeRecord.absence_type),
        "Absence record available."
      ),

    maintenance_item: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.status),
        "Maintenance record available."
      ),

    finance_item: () =>
      pickFirst(
        [
          cleanText(safeRecord.category),
          cleanText(safeRecord.amount),
          cleanText(safeRecord.period),
        ]
          .filter(Boolean)
          .join(" • "),
        cleanText(safeRecord.summary),
        "Finance record available."
      ),

    medication_item: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.status),
        "Medication item available."
      ),

    admission: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.status),
        "Admission record available."
      ),

    discharge: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.destination),
        "Discharge record available."
      ),

    visitor_log: () =>
      pickFirst(
        cleanText(safeRecord.purpose),
        cleanText(safeRecord.status),
        "Visitor log available."
      ),

    staff_file: () =>
      pickFirst(
        cleanText(safeRecord.file_audit_status),
        cleanText(safeRecord.summary),
        "Staff file record available."
      ),

    audit: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.outcome),
        "Audit record available."
      ),

    reg40_item: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.notification_type),
        "Reg 40 item available."
      ),

    reg44_item: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.recommendations),
        "Reg 44 item available."
      ),

    reg45_item: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.status),
        "Reg 45 item available."
      ),

    transport_log: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.journey),
        "Transport record available."
      ),

    rota_shift: () =>
      pickFirst(
        [
          cleanText(safeRecord.shift_name),
          cleanText(safeRecord.start_time),
          cleanText(safeRecord.end_time),
        ]
          .filter(Boolean)
          .join(" • "),
        cleanText(safeRecord.status),
        "Rota shift available."
      ),

    staffing_snapshot: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.staffing_pressure),
        "Staffing snapshot available."
      ),

    home_incident: () =>
      pickFirst(
        cleanText(safeRecord.summary),
        cleanText(safeRecord.incident_type),
        "Home incident available."
      ),

    inspection_home_header: () =>
      pickFirst(
        cleanText(safeRecord.top_concerns),
        cleanText(safeRecord.narrative_summary),
        cleanText(safeRecord.concerns_summary),
        "Inspection home header available."
      ),

    inspection_section_panel: () =>
      pickFirst(
        cleanText(safeRecord.summary_text),
        cleanText(safeRecord.concerns_text),
        cleanText(safeRecord.strengths_text),
        "Inspection section panel available."
      ),

    inspection_reason: () =>
      pickFirst(
        cleanText(safeRecord.description),
        cleanText(safeRecord.evidence_excerpt),
        "Inspection reason available."
      ),

    inspection_action: () =>
      pickFirst(
        cleanText(safeRecord.action_description),
        cleanText(safeRecord.evidence_required),
        "Inspection action available."
      ),

    inspection_task: () =>
      pickFirst(
        cleanText(safeRecord.task_title),
        cleanText(safeRecord.action_title),
        "Inspection task available."
      ),

    inspection_briefing: () =>
      pickFirst(
        cleanText(safeRecord.headline_summary),
        cleanText(safeRecord.overall_position_statement),
        cleanText(safeRecord.immediate_priority_actions),
        "Inspection briefing available."
      ),

    inspection_prep_72_hour: () =>
      pickFirst(
        cleanText(safeRecord.urgent_actions),
        cleanText(safeRecord.primary_focus_area),
        "72-hour inspection preparation available."
      ),

    inspection_home_card: () =>
      pickFirst(
        cleanText(safeRecord.home_name),
        cleanText(safeRecord.overall_band),
        "Inspection home card available."
      ),
  };

  if (map[recordType]) return map[recordType]();
  return cleanText(safeRecord.summary) || cleanText(safeRecord.title) || "Record available.";
}

function buildContextualSignals(record = {}) {
  const safeRecord = safeObject(record);
  const signals = [];

  const text = compact([
    safeRecord.title,
    safeRecord.summary,
    safeRecord.description,
    safeRecord.concern_details,
    safeRecord.outcome,
    safeRecord.actions_taken,
    safeRecord.actions_required,
    safeRecord.follow_up_actions,
    safeRecord.review_comment,
    safeRecord.manager_review_comment,
    safeRecord.note,
    safeRecord.recommendations,
    safeRecord.manager_analysis,
    safeRecord.concerns_and_risks,
    safeRecord.progress_summary,
    safeRecord.quality_of_care,
    safeRecord.staffing_pressure,
    safeRecord.narrative_summary,
    safeRecord.top_concerns,
    safeRecord.headline_summary,
    safeRecord.urgent_actions,
    safeRecord.action_description,
    safeRecord.evidence_required,
  ]).join(" ").toLowerCase();

  if (/ofsted|inspection|annex a|statement of purpose|reg 40|reg40|reg 44|reg44|reg 45|reg45|sccif/.test(text)) {
    signals.push("inspection_relevant");
  }

  if (/handover|next shift|shift|presentation/.test(text)) {
    signals.push("handover_relevant");
  }

  if (/follow up|follow-up|review|monitor|book|arrange|contact|escalate|complete|restore|resolve/.test(text)) {
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

  if (/staff|training|supervision|rota|vacancy|onboarding|probation|absence/.test(text)) {
    signals.push("workforce_relevant");
  }

  if (/audit|reg 44|reg44|reg 45|reg45|quality|provider|ri/.test(text)) {
    signals.push("quality_relevant");
  }

  if (/missing|abscond|police|safeguard|harm|risk/.test(text)) {
    signals.push("risk_relevant");
  }

  if (/positive|achievement|progress|strength|engagement|outstanding|good/.test(text)) {
    signals.push("strength_relevant");
  }

  return signals;
}

function buildRegulatorySignals(record = {}) {
  const safeRecord = safeObject(record);
  const tags = [];
  const type = cleanText(safeRecord.record_type).toLowerCase();
  const table = cleanText(safeRecord.source_table).toLowerCase();
  const text = compact([
    safeRecord.title,
    safeRecord.summary,
    safeRecord.description,
    safeRecord.notification_type,
    safeRecord.recommendations,
    safeRecord.compliance_category,
    safeRecord.linked_standard_code,
    safeRecord.linked_standard,
    safeRecord.linked_judgement_area,
    safeRecord.section_code,
    safeRecord.section_name,
    safeRecord.reason_type,
    safeRecord.overall_band,
  ]).join(" ").toLowerCase();

  if (
    type === "compliance_item" ||
    table.includes("compliance") ||
    cleanText(safeRecord.compliance_category)
  ) {
    tags.push("regulatory");
  }

  if (
    type === "audit" ||
    type === "reg44_item" ||
    type === "reg45_item" ||
    type.startsWith("inspection_") ||
    text.includes("reg 44") ||
    text.includes("reg44") ||
    text.includes("reg 45") ||
    text.includes("reg45") ||
    text.includes("inspection")
  ) {
    tags.push("inspection_cycle");
  }

  if (
    type === "statutory_document" ||
    table.includes("statutory_document") ||
    table.includes("document")
  ) {
    tags.push("document_control");
  }

  if (
    type === "staff_file" ||
    type === "training_record" ||
    type === "supervision" ||
    type === "onboarding" ||
    type === "probation"
  ) {
    tags.push("workforce_compliance");
  }

  if (
    type === "incident" ||
    type === "safeguarding_record" ||
    type === "missing_episode" ||
    safeRecord.ofsted_notified ||
    safeRecord.requires_reg40
  ) {
    tags.push("notification_relevant");
  }

  return unique(tags);
}

function buildOutcomeSignals(record = {}) {
  const safeRecord = safeObject(record);
  const tags = [];
  const text = compact([
    safeRecord.summary,
    safeRecord.outcome,
    safeRecord.progress_summary,
    safeRecord.achievements_summary,
    safeRecord.achievement_note,
    safeRecord.positives,
    safeRecord.strengths_summary,
    safeRecord.what_matters_to_me,
    safeRecord.child_voice,
    safeRecord.strengths_text,
    safeRecord.concerns_text,
  ]).join(" ").toLowerCase();

  if (/achievement|achieved|progress|positive|strength|well|engaged|improved|outstanding|good/.test(text)) {
    tags.push("positive_outcome");
  }

  if (/decline|worsening|concern|reduced|not attended|missed|deterioration|inadequate/.test(text)) {
    tags.push("negative_outcome");
  }

  if (cleanText(safeRecord.child_voice || safeRecord.young_person_voice || safeRecord.child_views)) {
    tags.push("child_voice_present");
  }

  return unique(tags);
}

export function buildAssistantTags(record = {}) {
  const safeRecord = safeObject(record);
  const tags = [];

  if (safeRecord.record_type) tags.push(safeRecord.record_type);
  if (safeRecord.source_table) tags.push(`table:${safeRecord.source_table}`);

  if (safeRecord.severity) tags.push(`severity:${safeRecord.severity}`);
  if (safeRecord.significance) tags.push(`significance:${safeRecord.significance}`);
  if (safeRecord.workflow_status) tags.push(`workflow:${safeRecord.workflow_status}`);
  if (safeRecord.status) tags.push(`status:${safeRecord.status}`);
  if (safeRecord.approval_status) tags.push(`approval:${safeRecord.approval_status}`);
  if (safeRecord.priority) tags.push(`priority:${safeRecord.priority}`);

  if (safeRecord.safeguarding_flag) tags.push("safeguarding");
  if (safeRecord.follow_up_required) tags.push("follow_up_required");
  if (safeRecord.review_required) tags.push("review_required");
  if (safeRecord.referral_made) tags.push("referral_made");
  if (safeRecord.completed === false) tags.push("open_task");
  if (safeRecord.completed === true) tags.push("completed");
  if (safeRecord.archived) tags.push("archived");
  if (safeRecord.auto_generated) tags.push("auto_generated");
  if (safeRecord.police_involved) tags.push("police_involved");
  if (safeRecord.ofsted_notified) tags.push("ofsted_notified");
  if (safeRecord.requires_reg40) tags.push("reg40");
  if (safeRecord.compliance_generated) tags.push("compliance_generated");
  if (safeRecord.return_interview_completed) tags.push("return_interview_completed");

  const recordSection = inferSectionFromRecordType(
    safeRecord.record_type,
    safeRecord.raw || safeRecord
  );
  if (recordSection) tags.push(`section:${recordSection}`);

  const dueDate =
    safeRecord.due_date ||
    safeRecord.review_date ||
    safeRecord.next_action_date ||
    safeRecord.expiry_date ||
    safeRecord.next_due_date ||
    safeRecord.start_target_date ||
    safeRecord.probation_end_date ||
    safeRecord.return_interview_date ||
    safeRecord.task_due_date ||
    safeRecord.action_due_date;

  if (dueDate) {
    if (isOverdue(dueDate)) tags.push("status:overdue");
    if (isDueSoon(dueDate)) tags.push("status:due_soon");
  }

  const urgency = inferUrgencyLevel(safeRecord);
  if (urgency) tags.push(`urgency:${urgency}`);

  tags.push(...buildContextualSignals(safeRecord));
  tags.push(...buildRegulatorySignals(safeRecord));
  tags.push(...buildOutcomeSignals(safeRecord));

  if (safeRecord.home_id) tags.push(`home:${safeRecord.home_id}`);
  if (safeRecord.young_person_id) tags.push(`young_person:${safeRecord.young_person_id}`);

  if (
    safeRecord.record_type === RECORD_TYPES.incident &&
    safeRecord.safeguarding_flag
  ) {
    tags.push("incident_with_safeguarding");
  }

  if (safeRecord.record_type === RECORD_TYPES.missing_episode) {
    tags.push("missing_from_care");
  }

  if (
    safeRecord.record_type === RECORD_TYPES.appointment &&
    dueDate &&
    isDueSoon(dueDate, 3)
  ) {
    tags.push("upcoming_appointment");
  }

  if (safeRecord.record_type === RECORD_TYPES.task && !safeRecord.completed) {
    tags.push("task_open");
  }

  if (
    safeRecord.record_type === RECORD_TYPES.compliance_item &&
    isOverdue(safeRecord.due_date)
  ) {
    tags.push("compliance_breach_risk");
  }

  if (String(safeRecord.record_type || "").startsWith("inspection_")) {
    tags.push("inspection_ui");
  }

  return unique(tags);
}

function inferRecordDate(record = {}) {
  const safeRecord = safeObject(record);

  return (
    safeRecord.occurred_at ||
    safeRecord.event_datetime ||
    safeRecord.recorded_at ||
    safeRecord.record_date ||
    safeRecord.contact_datetime ||
    safeRecord.session_date ||
    safeRecord.handover_date ||
    safeRecord.achievement_date ||
    safeRecord.concern_datetime ||
    safeRecord.start_datetime ||
    safeRecord.start_date ||
    safeRecord.meeting_date ||
    safeRecord.review_month ||
    safeRecord.due_date ||
    safeRecord.task_due_date ||
    safeRecord.action_due_date ||
    safeRecord.scheduled_time ||
    safeRecord.appointment_date ||
    safeRecord.action_at ||
    safeRecord.review_date ||
    safeRecord.audit_date ||
    safeRecord.visit_date ||
    safeRecord.referral_date ||
    safeRecord.discharge_date ||
    safeRecord.rota_date ||
    safeRecord.reported_date ||
    safeRecord.period_start ||
    safeRecord.period_end ||
    safeRecord.issue_date ||
    safeRecord.completed_date ||
    safeRecord.return_datetime ||
    safeRecord.completed_at ||
    safeRecord.created_at ||
    safeRecord.updated_at ||
    null
  );
}

export function toAssistantEvidence(record = {}) {
  const safeRecord = safeObject(record);
  const raw = safeRecord.raw || safeRecord;
  const section = inferSectionFromRecordType(safeRecord.record_type, raw);
  const summary = truncateText(buildAssistantSummary(safeRecord), 280);
  const tags = buildAssistantTags(safeRecord);
  const recordId = safeRecord.source_id ?? safeRecord.id ?? null;
  const sourceTable = safeString(safeRecord.source_table, "unknown");
  const recordType = safeString(safeRecord.record_type, "record");
  const urgency = inferUrgencyLevel(safeRecord);

  return {
    id: recordId,
    source_id: recordId,
    source_table: sourceTable,
    record_type: recordType,
    title: safeString(safeRecord.title, "Record"),
    source_label: safeString(safeRecord.title, "Record"),
    summary,
    section,
    status:
      safeRecord.workflow_status ||
      safeRecord.status ||
      safeRecord.approval_status ||
      "",
    severity:
      safeRecord.severity ||
      safeRecord.significance ||
      safeRecord.priority ||
      "",
    urgency,
    date: inferRecordDate(safeRecord),
    due_date:
      safeRecord.due_date ||
      safeRecord.review_date ||
      safeRecord.next_action_date ||
      safeRecord.expiry_date ||
      safeRecord.next_due_date ||
      safeRecord.task_due_date ||
      null,
    young_person_id:
      safeRecord.young_person_id ??
      raw.young_person_id ??
      raw.child_id ??
      raw.person_id ??
      null,
    home_id:
      safeRecord.home_id ??
      raw.home_id ??
      raw.service_id ??
      null,
    adult_id:
      safeRecord.adult_id ??
      raw.adult_id ??
      raw.staff_id ??
      raw.assigned_to_user_id ??
      raw.owner_user_id ??
      null,
    child_voice:
      safeRecord.child_voice ||
      safeRecord.young_person_voice ||
      safeRecord.child_views ||
      "",
    linked_plan_id: safeRecord.linked_plan_id ?? null,
    linked_appointment_id: safeRecord.linked_appointment_id ?? null,
    citation_ref: [recordType, sourceTable, recordId ?? "unknown"].join(":"),
    tags,
    signal_key: joinSignals([recordType, sourceTable, recordId ?? "unknown", urgency]),
    raw,
  };
}

export function mapYoungPerson(raw = {}, related = {}) {
  const safeRaw = safeObject(raw);
  const safeRelated = safeObject(related);

  return {
    id: safeRaw.id ?? null,
    home_id: safeRaw.home_id ?? null,
    first_name: cleanText(safeRaw.first_name),
    last_name: cleanText(safeRaw.last_name),
    preferred_name: cleanText(safeRaw.preferred_name),
    date_of_birth: safeRaw.date_of_birth || null,
    gender: cleanText(safeRaw.gender),
    ethnicity: cleanText(safeRaw.ethnicity),
    nhs_number: cleanText(safeRaw.nhs_number),
    local_id_number: cleanText(safeRaw.local_id_number),
    admission_date: safeRaw.admission_date || null,
    discharge_date: safeRaw.discharge_date || null,
    placement_status: cleanText(safeRaw.placement_status),
    primary_keyworker_id: safeRaw.primary_keyworker_id ?? null,
    summary_risk_level: cleanText(safeRaw.summary_risk_level),
    photo_url: normaliseImagePath(safeRaw.photo_url || safeRaw.profile_photo_url || ""),
    archived: toBool(safeRaw.archived),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    home_name:
      safeRelated.home_name ||
      safeRelated.home?.name ||
      safeRaw.home_name ||
      "",
    full_name: getDisplayName(safeRaw),
  };
}

export function mapIdentityProfile(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    id: safeRaw.id ?? null,
    young_person_id: safeRaw.young_person_id ?? null,
    record_type: "profile_identity",
    religion_or_faith: cleanText(safeRaw.religion_or_faith),
    cultural_identity: cleanText(safeRaw.cultural_identity),
    first_language: cleanText(safeRaw.first_language),
    dietary_needs: cleanText(safeRaw.dietary_needs),
    interests: cleanText(safeRaw.interests),
    strengths_summary: cleanText(safeRaw.strengths_summary),
    what_matters_to_me: cleanText(safeRaw.what_matters_to_me),
    important_dates: cleanText(safeRaw.important_dates),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    title: "Identity profile",
    summary: pickFirst(
      cleanText(safeRaw.what_matters_to_me),
      cleanText(safeRaw.strengths_summary),
      cleanText(safeRaw.interests),
      "Identity profile available."
    ),
  };
}

export function mapCommunicationProfile(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    id: safeRaw.id ?? null,
    young_person_id: safeRaw.young_person_id ?? null,
    record_type: "profile_communication",
    neurodiversity_summary: cleanText(safeRaw.neurodiversity_summary),
    communication_style: cleanText(safeRaw.communication_style),
    sensory_profile: cleanText(safeRaw.sensory_profile),
    processing_needs: cleanText(safeRaw.processing_needs),
    signs_of_distress: cleanText(safeRaw.signs_of_distress),
    what_helps: cleanText(safeRaw.what_helps),
    what_to_avoid: cleanText(safeRaw.what_to_avoid),
    routines_and_predictability: cleanText(safeRaw.routines_and_predictability),
    visual_support_needs: cleanText(safeRaw.visual_support_needs),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    title: "Communication profile",
    summary: pickFirst(
      cleanText(safeRaw.communication_style),
      cleanText(safeRaw.what_helps),
      cleanText(safeRaw.processing_needs),
      "Communication profile available."
    ),
  };
}

export function mapEducationProfile(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    id: safeRaw.id ?? null,
    young_person_id: safeRaw.young_person_id ?? null,
    record_type: "profile_education",
    school_name: cleanText(safeRaw.school_name),
    year_group: cleanText(safeRaw.year_group),
    education_status: cleanText(safeRaw.education_status),
    sen_status: cleanText(safeRaw.sen_status),
    ehcp_details: cleanText(safeRaw.ehcp_details),
    designated_teacher: cleanText(safeRaw.designated_teacher),
    attendance_baseline: safeRaw.attendance_baseline ?? null,
    pep_status: cleanText(safeRaw.pep_status),
    support_summary: cleanText(safeRaw.support_summary),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    title: "Education profile",
    summary: pickFirst(
      cleanText(safeRaw.support_summary),
      cleanText(safeRaw.education_status),
      cleanText(safeRaw.school_name),
      "Education profile available."
    ),
  };
}

export function mapHealthProfile(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    id: safeRaw.id ?? null,
    young_person_id: safeRaw.young_person_id ?? null,
    record_type: "profile_health",
    gp_name: cleanText(safeRaw.gp_name),
    gp_contact: cleanText(safeRaw.gp_contact),
    dentist_name: cleanText(safeRaw.dentist_name),
    dentist_contact: cleanText(safeRaw.dentist_contact),
    optician_name: cleanText(safeRaw.optician_name),
    optician_contact: cleanText(safeRaw.optician_contact),
    allergies: cleanText(safeRaw.allergies),
    diagnoses: cleanText(safeRaw.diagnoses),
    mental_health_summary: cleanText(safeRaw.mental_health_summary),
    medication_summary: cleanText(safeRaw.medication_summary),
    consent_notes: cleanText(safeRaw.consent_notes),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    title: "Health profile",
    summary: pickFirst(
      cleanText(safeRaw.mental_health_summary),
      cleanText(safeRaw.medication_summary),
      cleanText(safeRaw.diagnoses),
      "Health profile available."
    ),
  };
}

export function mapLegalStatus(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    id: safeRaw.id ?? null,
    young_person_id: safeRaw.young_person_id ?? null,
    record_type: "profile_legal",
    legal_status: cleanText(safeRaw.legal_status),
    order_type: cleanText(safeRaw.order_type),
    order_details: cleanText(safeRaw.order_details),
    delegated_authority_details: cleanText(safeRaw.delegated_authority_details),
    restrictions_text: cleanText(safeRaw.restrictions_text),
    consent_arrangements: cleanText(safeRaw.consent_arrangements),
    effective_from: safeRaw.effective_from || null,
    effective_to: safeRaw.effective_to || null,
    is_current: toBool(safeRaw.is_current),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    title: "Legal status",
    summary: pickFirst(
      cleanText(safeRaw.legal_status),
      cleanText(safeRaw.order_type),
      cleanText(safeRaw.order_details),
      "Legal status available."
    ),
  };
}

export function mapFormulation(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    id: safeRaw.id ?? null,
    young_person_id: safeRaw.young_person_id ?? null,
    record_type: "profile_formulation",
    presenting_needs: cleanText(safeRaw.presenting_needs),
    developmental_context: cleanText(safeRaw.developmental_context),
    trauma_context: cleanText(safeRaw.trauma_context),
    neurodevelopmental_context: cleanText(safeRaw.neurodevelopmental_context),
    relational_context: cleanText(safeRaw.relational_context),
    meaning_of_behaviour: cleanText(safeRaw.meaning_of_behaviour),
    known_triggers: cleanText(safeRaw.known_triggers),
    early_signs_of_distress: cleanText(safeRaw.early_signs_of_distress),
    protective_factors: cleanText(safeRaw.protective_factors),
    what_helps: cleanText(safeRaw.what_helps),
    what_adults_should_avoid: cleanText(safeRaw.what_adults_should_avoid),
    regulation_strategies: cleanText(safeRaw.regulation_strategies),
    child_voice_summary: cleanText(safeRaw.child_voice_summary),
    review_date: safeRaw.review_date || null,
    is_current: toBool(safeRaw.is_current),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    title: "Formulation",
    summary: pickFirst(
      cleanText(safeRaw.presenting_needs),
      cleanText(safeRaw.meaning_of_behaviour),
      cleanText(safeRaw.what_helps),
      "Formulation available."
    ),
  };
}

export function mapYoungPersonContact(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    id: safeRaw.id ?? null,
    young_person_id: safeRaw.young_person_id ?? null,
    contact_type: cleanText(safeRaw.contact_type),
    full_name: cleanText(safeRaw.full_name),
    relationship_to_young_person: cleanText(
      safeRaw.relationship_to_young_person || safeRaw.relationship_to_child
    ),
    phone: cleanText(safeRaw.phone || safeRaw.phone_number),
    email: cleanText(safeRaw.email),
    address: cleanText(safeRaw.address),
    is_parental_responsibility_holder: toBool(
      safeRaw.is_parental_responsibility_holder
    ),
    is_approved_contact: toBool(safeRaw.is_approved_contact),
    is_restricted_contact: toBool(safeRaw.is_restricted_contact),
    supervision_level: cleanText(safeRaw.supervision_level),
    notes: cleanText(safeRaw.notes || safeRaw.contact_notes),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
  };
}

export function mapCommunicationRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return {
    ...mapYoungPersonContact(safeRaw),
    record_type: "communication",
    title:
      cleanText(safeRaw.title) ||
      cleanText(safeRaw.subject) ||
      cleanText(safeRaw.contact_type) ||
      "Communication",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.notes),
      cleanText(safeRaw.contact_notes),
      cleanText(safeRaw.description),
      cleanText(safeRaw.outcome),
      cleanText(safeRaw.message),
      "Communication record"
    ),
    source_table: safeRaw.source_table || "communications",
    status: cleanText(safeRaw.status),
    communication_type: cleanText(safeRaw.communication_type || safeRaw.contact_type),
    direction: cleanText(safeRaw.direction),
    method: cleanText(safeRaw.method),
    contact_datetime:
      safeRaw.contact_datetime ||
      safeRaw.communication_datetime ||
      safeRaw.sent_at ||
      safeRaw.created_at ||
      null,
    outcome: cleanText(safeRaw.outcome),
    raw: safeRaw,
  };
}

/* Child and home record mappers */

export function mapDailyNote(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.daily_note,
    source_table: safeRaw.source_table || "daily_notes",
    title: `${cleanText(safeRaw.shift_type) || "Daily"} note`,
    summary: pickFirst(
      cleanText(safeRaw.presentation),
      cleanText(safeRaw.activities),
      cleanText(safeRaw.positives),
      cleanText(safeRaw.actions_required),
      "Daily note"
    ),
    record_date: safeRaw.note_date || null,
    recorded_at: safeRaw.created_at || safeRaw.updated_at || safeRaw.note_date || null,
    workflow_status: normaliseWorkflowStatus(safeRaw.workflow_status),
    significance: normaliseSignificance(safeRaw.significance),
    mood: cleanText(safeRaw.mood),
    presentation: cleanText(safeRaw.presentation),
    activities: cleanText(safeRaw.activities),
    education_update: cleanText(safeRaw.education_update),
    health_update: cleanText(safeRaw.health_update),
    family_update: cleanText(safeRaw.family_update),
    behaviour_update: cleanText(safeRaw.behaviour_update),
    young_person_voice: cleanText(safeRaw.young_person_voice),
    positives: cleanText(safeRaw.positives),
    actions_required: cleanText(safeRaw.actions_required),
    quality_standards_tags: arrayify(safeRaw.quality_standards_tags),
    manager_review_comment: cleanText(safeRaw.manager_review_comment),
    submitted_at: safeRaw.submitted_at || null,
    approved_at: safeRaw.approved_at || null,
    returned_at: safeRaw.returned_at || null,
    follow_up_required: !!cleanText(safeRaw.actions_required),
  });
}

export function mapIncident(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.incident,
    source_table: safeRaw.source_table || "incidents",
    title:
      cleanText(safeRaw.incident_type) || cleanText(safeRaw.title) || "Important event",
    summary: pickFirst(
      cleanText(safeRaw.description),
      cleanText(safeRaw.outcome),
      cleanText(safeRaw.trauma_informed_formulation),
      "Important event"
    ),
    occurred_at: safeRaw.incident_datetime || safeRaw.created_at || null,
    workflow_status: normaliseWorkflowStatus(
      safeRaw.workflow_status || safeRaw.manager_review_status
    ),
    severity: normaliseSeverity(safeRaw.severity),
    location: cleanText(safeRaw.location),
    incident_type: cleanText(safeRaw.incident_type),
    description: cleanText(safeRaw.description),
    antecedent: cleanText(safeRaw.antecedent),
    staff_response: cleanText(safeRaw.staff_response),
    child_response: cleanText(safeRaw.child_response),
    outcome: cleanText(safeRaw.outcome),
    presentation: cleanText(safeRaw.presentation),
    trauma_informed_formulation: cleanText(safeRaw.trauma_informed_formulation),
    child_voice: cleanText(safeRaw.child_voice),
    restorative_follow_up: cleanText(safeRaw.restorative_follow_up),
    actions_taken: cleanText(safeRaw.actions_taken),
    injury_flag: toBool(safeRaw.injury_flag),
    property_damage_flag: toBool(safeRaw.property_damage_flag),
    police_involved: toBool(safeRaw.police_involved),
    safeguarding_flag: toBool(safeRaw.safeguarding_flag),
    follow_up_required: toBool(safeRaw.follow_up_required),
    police_notified: toBool(safeRaw.police_notified),
    lado_notified: toBool(safeRaw.lado_notified),
    ofsted_notified: toBool(safeRaw.ofsted_notified),
    requires_reg40: toBool(safeRaw.requires_notification),
    review_comment: cleanText(safeRaw.review_comment),
    submitted_at: safeRaw.submitted_at || null,
    reviewed_at: safeRaw.reviewed_at || null,
    returned_at: safeRaw.returned_at || null,
  });
}

export function mapSupportPlan(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.support_plan,
    source_table: safeRaw.source_table || "support_plans",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.plan_type) || "Support plan",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.presenting_need),
      cleanText(safeRaw.proactive_strategies),
      "Support plan"
    ),
    start_date: safeRaw.start_date || null,
    review_date: safeRaw.review_date || null,
    status: cleanText(safeRaw.status),
    approval_status: cleanText(safeRaw.approval_status),
    workflow_status: normaliseWorkflowStatus(
      safeRaw.approval_status || safeRaw.status
    ),
    presenting_need: cleanText(safeRaw.presenting_need),
    child_voice: cleanText(safeRaw.child_voice),
    proactive_strategies: cleanText(safeRaw.proactive_strategies),
    pace_guidance: cleanText(safeRaw.pace_guidance),
    triggers: cleanText(safeRaw.triggers),
    protective_factors: cleanText(safeRaw.protective_factors),
    review_comment: cleanText(safeRaw.review_comment),
    version_number: safeRaw.version_number ?? null,
    archived: toBool(safeRaw.archived),
  });
}

export function mapRiskAssessment(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.risk_assessment,
    source_table: safeRaw.source_table || "risk_assessments",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.category) || "Risk assessment",
    summary: pickFirst(
      cleanText(safeRaw.concern_summary),
      cleanText(safeRaw.current_controls),
      cleanText(safeRaw.response_actions),
      "Risk assessment"
    ),
    category: cleanText(safeRaw.category),
    concern_summary: cleanText(safeRaw.concern_summary),
    known_triggers: cleanText(safeRaw.known_triggers),
    early_warning_signs: cleanText(safeRaw.early_warning_signs),
    contextual_factors: cleanText(safeRaw.contextual_factors),
    current_controls: cleanText(safeRaw.current_controls),
    deescalation_strategies: cleanText(safeRaw.deescalation_strategies),
    response_actions: cleanText(safeRaw.response_actions),
    child_views: cleanText(safeRaw.child_views),
    review_date: safeRaw.review_date || null,
    status: cleanText(safeRaw.status),
    approval_status: cleanText(safeRaw.approval_status),
    workflow_status: normaliseWorkflowStatus(
      safeRaw.approval_status || safeRaw.status
    ),
    severity: normaliseSeverity(safeRaw.severity),
    likelihood: cleanText(safeRaw.likelihood),
    review_comment: cleanText(safeRaw.review_comment),
    archived: toBool(safeRaw.archived),
    review_required: !!safeRaw.review_date,
  });
}

export function mapHealthRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.health_record,
    source_table: safeRaw.source_table || "health_records",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.record_type) || "Health record",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.outcome),
      "Health record"
    ),
    event_datetime: safeRaw.event_datetime || safeRaw.created_at || null,
    workflow_status: normaliseWorkflowStatus(safeRaw.workflow_status),
    significance: normaliseSignificance(safeRaw.significance),
    professional_name: cleanText(safeRaw.professional_name),
    outcome: cleanText(safeRaw.outcome),
    follow_up_required: toBool(safeRaw.follow_up_required),
    next_action_date: safeRaw.next_action_date || null,
    linked_appointment_id: safeRaw.linked_appointment_id ?? null,
  });
}

export function mapEducationRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.education_record,
    source_table: safeRaw.source_table || "education_records",
    title: cleanText(safeRaw.provision_name) || "Education record",
    summary: pickFirst(
      cleanText(safeRaw.learning_engagement),
      cleanText(safeRaw.behaviour_summary),
      cleanText(safeRaw.issue_raised),
      "Education record"
    ),
    record_date: safeRaw.record_date || safeRaw.created_at || null,
    workflow_status: normaliseWorkflowStatus(safeRaw.workflow_status),
    significance: normaliseSignificance(safeRaw.significance),
    attendance_status: cleanText(safeRaw.attendance_status),
    provision_name: cleanText(safeRaw.provision_name),
    behaviour_summary: cleanText(safeRaw.behaviour_summary),
    learning_engagement: cleanText(safeRaw.learning_engagement),
    issue_raised: cleanText(safeRaw.issue_raised),
    action_taken: cleanText(safeRaw.action_taken),
    professional_involved: cleanText(safeRaw.professional_involved),
    achievement_note: cleanText(safeRaw.achievement_note),
    child_voice: cleanText(safeRaw.child_voice),
    follow_up_required: toBool(safeRaw.follow_up_required),
  });
}

export function mapFamilyContactRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.family_contact_record,
    source_table: safeRaw.source_table || "family_contact_records",
    title:
      cleanText(safeRaw.contact_person) ||
      cleanText(safeRaw.contact_type) ||
      "Family contact",
    summary: pickFirst(
      cleanText(safeRaw.post_contact_presentation),
      cleanText(safeRaw.concerns),
      cleanText(safeRaw.child_voice),
      "Family contact record"
    ),
    contact_datetime: safeRaw.contact_datetime || safeRaw.created_at || null,
    workflow_status: normaliseWorkflowStatus(safeRaw.workflow_status),
    significance: normaliseSignificance(safeRaw.significance),
    contact_type: cleanText(safeRaw.contact_type),
    contact_person: cleanText(safeRaw.contact_person),
    supervision_level: cleanText(safeRaw.supervision_level),
    location: cleanText(safeRaw.location),
    pre_contact_presentation: cleanText(safeRaw.pre_contact_presentation),
    post_contact_presentation: cleanText(safeRaw.post_contact_presentation),
    concerns: cleanText(safeRaw.concerns),
    child_voice: cleanText(safeRaw.child_voice),
    follow_up_required: toBool(safeRaw.follow_up_required),
    linked_contact_id: safeRaw.linked_contact_id ?? null,
  });
}

export function mapKeyworkSession(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.keywork_session,
    source_table: safeRaw.source_table || "keywork_sessions",
    title: cleanText(safeRaw.topic || safeRaw.theme) || "Keywork session",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.reflective_analysis),
      cleanText(safeRaw.actions_agreed),
      "Keywork session"
    ),
    session_date: safeRaw.session_date || safeRaw.created_at || null,
    workflow_status: normaliseWorkflowStatus(safeRaw.workflow_status || safeRaw.status),
    topic: cleanText(safeRaw.topic || safeRaw.theme),
    purpose: cleanText(safeRaw.purpose),
    child_voice: cleanText(safeRaw.child_voice),
    reflective_analysis: cleanText(safeRaw.reflective_analysis),
    actions_agreed: cleanText(safeRaw.actions_agreed),
    next_session_date: safeRaw.next_session_date || null,
    archived: toBool(safeRaw.archived),
    manager_review_comment: cleanText(safeRaw.manager_review_comment),
    follow_up_required: !!cleanText(safeRaw.actions_agreed),
  });
}

export function mapAppointment(raw = {}) {
  const safeRaw = safeObject(raw);
  const start =
    safeRaw.start_datetime || safeRaw.appointment_date || safeRaw.scheduled_time || null;

  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.appointment,
    source_table:
      safeRaw.source_table ||
      (safeRaw.professional_name || safeRaw.professional_role
        ? "young_person_appointments"
        : "appointments"),
    title:
      cleanText(safeRaw.title) || cleanText(safeRaw.appointment_type) || "Appointment",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.description),
      cleanText(safeRaw.purpose),
      cleanText(safeRaw.notes),
      "Appointment"
    ),
    appointment_type: cleanText(safeRaw.appointment_type),
    start_datetime: start,
    end_datetime: safeRaw.end_datetime || null,
    location: cleanText(safeRaw.location),
    professional_name: cleanText(safeRaw.professional_name),
    professional_role: cleanText(safeRaw.professional_role),
    status: cleanText(safeRaw.status),
    outcome_notes: cleanText(safeRaw.outcome_notes || safeRaw.outcome),
    preparation_notes: cleanText(safeRaw.preparation_notes),
    follow_up_actions: cleanText(safeRaw.follow_up_actions),
    reminder_minutes_before: safeRaw.reminder_minutes_before ?? null,
    completed_at: safeRaw.completed_at || null,
    cancelled_at: safeRaw.cancelled_at || null,
    follow_up_required: !!cleanText(safeRaw.follow_up_actions),
  });
}

export function mapAchievementRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.achievement_record,
    source_table: safeRaw.source_table || "achievement_records",
    title:
      cleanText(safeRaw.title) || cleanText(safeRaw.achievement_type) || "Achievement",
    summary: pickFirst(
      cleanText(safeRaw.description),
      cleanText(safeRaw.child_voice),
      cleanText(safeRaw.significance),
      "Achievement record"
    ),
    achievement_date: safeRaw.achievement_date || safeRaw.created_at || null,
    achievement_type: cleanText(safeRaw.achievement_type),
    source: cleanText(safeRaw.source),
    significance: normaliseSignificance(safeRaw.significance),
    linked_target_id: safeRaw.linked_target_id ?? null,
    archived: toBool(safeRaw.archived),
  });
}

export function mapSafeguardingRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.safeguarding_record,
    source_table: safeRaw.source_table || "safeguarding_records",
    title: cleanText(safeRaw.safeguarding_category) || "Safeguarding record",
    summary: pickFirst(
      cleanText(safeRaw.concern_details),
      cleanText(safeRaw.disclosure_details),
      cleanText(safeRaw.immediate_action_taken),
      "Safeguarding concern"
    ),
    concern_datetime: safeRaw.concern_datetime || safeRaw.created_at || null,
    safeguarding_category: cleanText(safeRaw.safeguarding_category),
    concern_details: cleanText(safeRaw.concern_details),
    disclosure_details: cleanText(safeRaw.disclosure_details),
    immediate_action_taken: cleanText(safeRaw.immediate_action_taken),
    referral_made: toBool(safeRaw.referral_made),
    referral_details: cleanText(safeRaw.referral_details),
    outcome: cleanText(safeRaw.outcome),
    manager_review_status: cleanText(safeRaw.manager_review_status),
    closed_at: safeRaw.closed_at || null,
    incident_id: safeRaw.incident_id ?? null,
    safeguarding_flag: true,
    follow_up_required: !safeRaw.closed_at,
  });
}

export function mapMissingEpisode(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.missing_episode,
    source_table: safeRaw.source_table || "missing_episodes",
    title: "Missing episode",
    summary: pickFirst(
      cleanText(safeRaw.outcome),
      cleanText(safeRaw.actions_taken),
      cleanText(safeRaw.trigger_factors),
      "Missing episode"
    ),
    start_datetime: safeRaw.start_datetime || null,
    reported_datetime: safeRaw.reported_datetime || null,
    return_datetime: safeRaw.return_datetime || null,
    police_reference: cleanText(safeRaw.police_reference),
    return_interview_completed: toBool(safeRaw.return_interview_completed),
    trigger_factors: cleanText(safeRaw.trigger_factors),
    push_pull_factors: cleanText(safeRaw.push_pull_factors),
    actions_taken: cleanText(safeRaw.actions_taken),
    outcome: cleanText(safeRaw.outcome),
    review_required: toBool(safeRaw.review_required),
    workflow_status: normaliseWorkflowStatus(
      safeRaw.workflow_status || safeRaw.manager_review_status
    ),
    manager_review_status: cleanText(safeRaw.manager_review_status),
    child_voice: cleanText(safeRaw.child_voice),
    return_interview_date: safeRaw.return_interview_date || null,
    linked_risk_assessment_id: safeRaw.linked_risk_assessment_id ?? null,
    follow_up_required:
      !toBool(safeRaw.return_interview_completed) || toBool(safeRaw.review_required),
  });
}

export function mapChronologyEvent(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.chronology_event,
    source_table: safeRaw.source_table || "chronology_events",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.category) || "Chronology event",
    summary: cleanText(safeRaw.summary),
    event_datetime: safeRaw.event_datetime || safeRaw.created_at || null,
    category: cleanText(safeRaw.category),
    subcategory: cleanText(safeRaw.subcategory),
    significance: normaliseSignificance(safeRaw.significance),
    workflow_status: normaliseWorkflowStatus(
      safeRaw.workflow_status || safeRaw.event_status
    ),
    severity: normaliseSeverity(safeRaw.severity),
    safeguarding_flag: toBool(safeRaw.safeguarding_flag),
    child_voice_present: toBool(safeRaw.child_voice_present),
    auto_generated: toBool(safeRaw.auto_generated),
    is_visible: safeRaw.is_visible !== false,
    event_status: cleanText(safeRaw.event_status),
    tags_json: toJsonArray(safeRaw.tags_json),
    metadata_json: toJsonObject(safeRaw.metadata_json),
    linked_standard: cleanText(safeRaw.linked_standard),
    linked_judgement_area: cleanText(safeRaw.linked_judgement_area),
    linked_document_id: safeRaw.linked_document_id ?? null,
    linked_review_id: safeRaw.linked_review_id ?? null,
    linked_action_id: safeRaw.linked_action_id ?? null,
    recorded_by_name: cleanText(safeRaw.recorded_by_name),
    primary_record_type: cleanText(safeRaw.primary_record_type),
  });
}

export function mapComplianceItem(raw = {}) {
  const safeRaw = safeObject(raw);
  const status = cleanText(safeRaw.status).toLowerCase();
  const normalisedStatus = Object.values(COMPLIANCE_STATUS).includes(status)
    ? status
    : COMPLIANCE_STATUS.pending;

  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.compliance_item,
    source_table: safeRaw.source_table || "compliance_items",
    title: cleanText(safeRaw.title) || "Compliance item",
    summary: `Due ${safeRaw.due_date || "date not set"}`,
    due_date: safeRaw.due_date || null,
    completed_date: safeRaw.completed_date || null,
    status: normalisedStatus,
    severity: normaliseSeverity(safeRaw.severity),
    owner_id: safeRaw.owner_id ?? null,
    escalation_level: safeRaw.escalation_level ?? null,
    rule_id: safeRaw.rule_id ?? null,
    record_type_source: cleanText(safeRaw.record_type),
    metadata_json: toJsonObject(safeRaw.metadata_json),
    manager_notified_at: safeRaw.manager_notified_at || null,
    last_notification_at: safeRaw.last_notification_at || null,
    follow_up_required: normalisedStatus !== COMPLIANCE_STATUS.completed,
    review_required:
      normalisedStatus === COMPLIANCE_STATUS.overdue ||
      normalisedStatus === COMPLIANCE_STATUS.escalated,
  });
}

export function mapAiReport(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.ai_generated_report,
    source_table: safeRaw.source_table || "ai_generated_reports",
    title:
      cleanText(safeRaw.title) ||
      cleanText(safeRaw.report_type) ||
      "AI generated report",
    summary: cleanText(safeRaw.report_text),
    report_type: cleanText(safeRaw.report_type),
    review_month: safeRaw.review_month || null,
    status: cleanText(safeRaw.status),
    generated_by: safeRaw.generated_by ?? null,
    auto_generated: true,
  });
}

export function mapMonthlyReview(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.monthly_review,
    source_table: safeRaw.source_table || "monthly_reviews",
    title: cleanText(safeRaw.review_title) || "Monthly review",
    summary: pickFirst(
      cleanText(safeRaw.summary_of_month),
      cleanText(safeRaw.progress_summary),
      cleanText(safeRaw.child_voice_summary),
      "Monthly review"
    ),
    review_month: safeRaw.review_month || null,
    status: cleanText(safeRaw.status),
    progress_summary: cleanText(safeRaw.progress_summary),
    child_voice_summary: cleanText(safeRaw.child_voice_summary),
    concerns_and_risks: cleanText(safeRaw.concerns_and_risks),
    education_summary: cleanText(safeRaw.education_summary),
    health_summary: cleanText(safeRaw.health_summary),
    family_summary: cleanText(safeRaw.family_summary),
    keywork_summary: cleanText(safeRaw.keywork_summary),
    behaviour_summary: cleanText(safeRaw.behaviour_summary),
    achievements_summary: cleanText(safeRaw.achievements_summary),
    actions_for_next_month: cleanText(safeRaw.actions_for_next_month),
    manager_analysis: cleanText(safeRaw.manager_analysis),
    approved_by: safeRaw.approved_by ?? null,
    approved_at: safeRaw.approved_at || null,
  });
}

export function mapHandoverRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.handover_record,
    source_table: safeRaw.source_table || "handover_records",
    title: cleanText(safeRaw.title) || "Handover",
    summary: cleanText(safeRaw.summary_text) || "Handover record",
    handover_date: safeRaw.handover_date || null,
    shift_type: cleanText(safeRaw.shift_type),
    status: cleanText(safeRaw.status),
    source_window_start: safeRaw.source_window_start || null,
    source_window_end: safeRaw.source_window_end || null,
    approved_by: safeRaw.approved_by ?? null,
  });
}

export function mapInspectionPackJob(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "inspection_pack_job",
    source_table: safeRaw.source_table || "inspection_pack_jobs",
    title: cleanText(safeRaw.pack_type) || "Inspection pack",
    summary:
      cleanText(safeRaw.status) === "completed"
        ? "Inspection pack generated"
        : "Inspection pack in progress",
    scope_type: cleanText(safeRaw.scope_type),
    scope_id: safeRaw.scope_id ?? null,
    pack_type: cleanText(safeRaw.pack_type),
    status: cleanText(safeRaw.status),
    requested_by: safeRaw.requested_by ?? null,
    generated_file_path: cleanText(safeRaw.generated_file_path),
    summary_json: toJsonObject(safeRaw.summary_json),
    completed_at: safeRaw.completed_at || null,
    auto_generated: true,
  });
}

export function mapManagerAction(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.manager_action,
    source_table: safeRaw.source_table || "manager_actions",
    title: cleanText(safeRaw.action_type || safeRaw.title) || "Manager action",
    summary: cleanText(safeRaw.note || safeRaw.summary) || "Manager action",
    action_type: cleanText(safeRaw.action_type),
    related_table: cleanText(safeRaw.related_table),
    related_id: safeRaw.related_id ?? null,
    note: cleanText(safeRaw.note),
    action_by: safeRaw.action_by ?? null,
    action_at: safeRaw.action_at || safeRaw.created_at || null,
    owner: cleanText(safeRaw.owner),
    priority: cleanText(safeRaw.priority),
    due_date: safeRaw.due_date || null,
  });
}

export function mapTask(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.task,
    source_table: safeRaw.source_table || "tasks",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.task) || "Task",
    summary: cleanText(safeRaw.task || safeRaw.summary) || "Task",
    task_date: safeRaw.task_date || null,
    due_date: safeRaw.due_date || null,
    completed: toBool(safeRaw.completed),
    completed_at: safeRaw.completed_at || null,
    assigned_role: cleanText(safeRaw.assigned_role),
    assigned_to_user_id: safeRaw.assigned_to_user_id ?? null,
    task_type: cleanText(safeRaw.task_type),
    compliance_generated: toBool(safeRaw.compliance_generated),
    status: safeRaw.completed ? WORKFLOW_STATUS.completed : WORKFLOW_STATUS.active,
    follow_up_required: !toBool(safeRaw.completed),
  });
}

export function mapMedicationProfile(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.medication_profile,
    source_table: safeRaw.source_table || "medication_profiles",
    title: cleanText(safeRaw.medication_name) || "Medication profile",
    summary:
      [
        cleanText(safeRaw.dosage || safeRaw.dose),
        cleanText(safeRaw.frequency),
        cleanText(safeRaw.reason),
      ]
        .filter(Boolean)
        .join(" • ") || "Medication profile",
    medication_name: cleanText(safeRaw.medication_name),
    dosage: cleanText(safeRaw.dosage || safeRaw.dose),
    route: cleanText(safeRaw.route),
    frequency: cleanText(safeRaw.frequency),
    prn_guidance: cleanText(safeRaw.prn_guidance),
    prescribed_by: cleanText(safeRaw.prescribed_by),
    start_date: safeRaw.start_date || null,
    end_date: safeRaw.end_date || null,
    is_active: toBool(safeRaw.is_active),
    notes: cleanText(safeRaw.notes),
    reason: cleanText(safeRaw.reason),
    status: safeRaw.is_active ? WORKFLOW_STATUS.active : WORKFLOW_STATUS.archived,
  });
}

export function mapMedicationRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: RECORD_TYPES.medication_record,
    source_table: safeRaw.source_table || "medication_records",
    title: cleanText(safeRaw.medication_name) || "Medication administration",
    summary:
      [
        cleanText(safeRaw.dose),
        cleanText(safeRaw.route),
        cleanText(safeRaw.status),
      ]
        .filter(Boolean)
        .join(" • ") || "Medication record",
    scheduled_time: safeRaw.scheduled_time || null,
    administered_time: safeRaw.administered_time || null,
    medication_name: cleanText(safeRaw.medication_name),
    dose: cleanText(safeRaw.dose),
    route: cleanText(safeRaw.route),
    status: cleanText(safeRaw.status),
    refusal_reason: cleanText(safeRaw.refusal_reason),
    omission_reason: cleanText(safeRaw.omission_reason),
    error_flag: toBool(safeRaw.error_flag),
    error_details: cleanText(safeRaw.error_details),
    manager_review_status: cleanText(safeRaw.manager_review_status),
    administered_by: safeRaw.administered_by ?? null,
    follow_up_required: toBool(safeRaw.error_flag),
  });
}

export function mapReviewMeeting(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "review_meeting",
    source_table: safeRaw.source_table || "review_meetings",
    title: cleanText(safeRaw.meeting_type) || "Review meeting",
    summary: pickFirst(
      cleanText(safeRaw.decisions),
      cleanText(safeRaw.actions),
      cleanText(safeRaw.child_voice),
      "Review meeting"
    ),
    meeting_date: safeRaw.meeting_date || null,
    meeting_type: cleanText(safeRaw.meeting_type),
    chair_person: cleanText(safeRaw.chair_person),
    attendees_json: toJsonArray(safeRaw.attendees_json),
    agenda: cleanText(safeRaw.agenda),
    child_voice: cleanText(safeRaw.child_voice),
    decisions: cleanText(safeRaw.decisions),
    actions: cleanText(safeRaw.actions),
    next_review_date: safeRaw.next_review_date || null,
    follow_up_required: !!cleanText(safeRaw.actions),
  });
}

export function mapStatutoryDocument(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "statutory_document",
    source_table: safeRaw.source_table || "statutory_documents",
    title:
      cleanText(safeRaw.title) || cleanText(safeRaw.document_type) || "Statutory document",
    summary: cleanText(safeRaw.description) || "Statutory document",
    document_type: cleanText(safeRaw.document_type),
    file_url: cleanText(safeRaw.file_url),
    file_name: cleanText(safeRaw.file_name),
    file_type: cleanText(safeRaw.file_type),
    issue_date: safeRaw.issue_date || null,
    review_date: safeRaw.review_date || null,
    expiry_date: safeRaw.expiry_date || null,
    status: cleanText(safeRaw.status),
    compliance_category: cleanText(safeRaw.compliance_category),
    linked_standard_code: cleanText(safeRaw.linked_standard_code),
    reviewed_by: safeRaw.reviewed_by ?? null,
    reviewed_at: safeRaw.reviewed_at || null,
    archived: toBool(safeRaw.archived),
    review_required: !!safeRaw.review_date || !!safeRaw.expiry_date,
  });
}

export function mapDocument(raw = {}) {
  const safeRaw = safeObject(raw);

  if (
    safeRaw.document_type ||
    safeRaw.compliance_category ||
    safeRaw.review_date ||
    safeRaw.expiry_date ||
    safeRaw.source_table === "statutory_documents"
  ) {
    return mapStatutoryDocument(safeRaw);
  }

  return buildBaseRecord(safeRaw, {
    record_type: "document",
    source_table: safeRaw.source_table || "documents",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.file_name) || "Document",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.description),
      "Document available."
    ),
    document_type: cleanText(safeRaw.document_type),
    file_url: cleanText(safeRaw.file_url),
    file_name: cleanText(safeRaw.file_name),
    file_type: cleanText(safeRaw.file_type),
    review_date: safeRaw.review_date || null,
    expiry_date: safeRaw.expiry_date || null,
    status: cleanText(safeRaw.status),
    archived: toBool(safeRaw.archived),
    review_required: !!safeRaw.review_date || !!safeRaw.expiry_date,
  });
}

export function mapTherapyRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "therapy",
    source_table: safeRaw.source_table || "therapy",
    title: cleanText(safeRaw.title) || "Therapy record",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.notes),
      cleanText(safeRaw.recommendations),
      "Therapy record available."
    ),
    event_datetime: safeRaw.event_datetime || safeRaw.created_at || null,
    therapist_name: cleanText(safeRaw.therapist_name || safeRaw.professional_name),
    recommendations: cleanText(safeRaw.recommendations),
    outcome: cleanText(safeRaw.outcome),
    follow_up_required: !!cleanText(safeRaw.recommendations),
  });
}

export function mapTeamRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "team",
    source_table: safeRaw.source_table || "team",
    title:
      cleanText(safeRaw.staff_member) ||
      cleanText(safeRaw.full_name) ||
      "Team member",
    summary: pickFirst(
      cleanText(safeRaw.role),
      cleanText(safeRaw.status),
      "Team record available."
    ),
    staff_member: cleanText(safeRaw.staff_member || safeRaw.full_name),
    full_name: cleanText(safeRaw.full_name || safeRaw.staff_member),
    role: cleanText(safeRaw.role),
    status: cleanText(safeRaw.status),
    home_id: safeRaw.home_id ?? null,
    line_manager: cleanText(safeRaw.line_manager),
    contracted_hours: safeRaw.contracted_hours ?? null,
    employment_status: cleanText(safeRaw.employment_status),
  });
}

export function mapSupervisionRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "supervision",
    source_table: safeRaw.source_table || "supervisions",
    title: cleanText(safeRaw.staff_member) || "Supervision",
    summary: pickFirst(
      cleanText(safeRaw.status),
      cleanText(safeRaw.role),
      "Supervision record available."
    ),
    staff_member: cleanText(safeRaw.staff_member),
    role: cleanText(safeRaw.role),
    due_date: safeRaw.due_date || safeRaw.next_due_date || null,
    status: cleanText(safeRaw.status),
    home_id: safeRaw.home_id ?? null,
    follow_up_required: cleanText(safeRaw.status).toLowerCase() !== "active",
  });
}

export function mapOnboardingRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "onboarding",
    source_table: safeRaw.source_table || "onboarding",
    title: cleanText(safeRaw.full_name) || "Onboarding",
    summary: pickFirst(
      cleanText(safeRaw.stage),
      cleanText(safeRaw.status),
      cleanText(safeRaw.mandatory_training),
      "Onboarding record available."
    ),
    home_id: safeRaw.home_id ?? null,
    full_name: cleanText(safeRaw.full_name),
    role: cleanText(safeRaw.role),
    stage: cleanText(safeRaw.stage),
    status: cleanText(safeRaw.status),
    start_target_date: safeRaw.start_target_date || null,
    checklist_completion: safeRaw.checklist_completion ?? null,
    dbs: cleanText(safeRaw.dbs),
    references: cleanText(safeRaw.references),
    right_to_work: cleanText(safeRaw.right_to_work),
    induction: cleanText(safeRaw.induction),
    shadow_shifts: safeRaw.shadow_shifts ?? null,
    mandatory_training: cleanText(safeRaw.mandatory_training),
    due_date: safeRaw.start_target_date || null,
    follow_up_required: cleanText(safeRaw.status).toLowerCase() !== "on_track",
  });
}

export function mapTrainingRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "training_record",
    source_table: safeRaw.source_table || "training",
    title: cleanText(safeRaw.staff_member) || "Training record",
    summary: pickFirst(
      cleanText(safeRaw.status),
      cleanText(safeRaw.training_compliance_percent),
      "Training record available."
    ),
    home_id: safeRaw.home_id ?? null,
    staff_member: cleanText(safeRaw.staff_member),
    role: cleanText(safeRaw.role),
    safeguarding_children: cleanText(safeRaw.safeguarding_children),
    medication: cleanText(safeRaw.medication),
    behaviour_support: cleanText(safeRaw.behaviour_support),
    first_aid: cleanText(safeRaw.first_aid),
    fire_safety: cleanText(safeRaw.fire_safety),
    training_compliance_percent: safeRaw.training_compliance_percent ?? null,
    status: cleanText(safeRaw.status),
    next_due_date: safeRaw.next_due_date || null,
    due_date: safeRaw.next_due_date || null,
    follow_up_required: cleanText(safeRaw.status).toLowerCase() !== "current",
  });
}

export function mapProbationRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "probation",
    source_table: safeRaw.source_table || "probations",
    title: cleanText(safeRaw.staff_member) || "Probation",
    summary: pickFirst(
      cleanText(safeRaw.probation_stage),
      cleanText(safeRaw.status),
      "Probation record available."
    ),
    home_id: safeRaw.home_id ?? null,
    staff_member: cleanText(safeRaw.staff_member),
    role: cleanText(safeRaw.role),
    start_date: safeRaw.start_date || null,
    probation_end_date: safeRaw.probation_end_date || null,
    probation_stage: cleanText(safeRaw.probation_stage),
    line_manager: cleanText(safeRaw.line_manager),
    status: cleanText(safeRaw.status),
    due_date: safeRaw.probation_end_date || null,
    follow_up_required: cleanText(safeRaw.status).toLowerCase() !== "active",
  });
}

export function mapVacancyRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "vacancy",
    source_table: safeRaw.source_table || "vacancies",
    title: cleanText(safeRaw.title) || "Vacancy",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.priority),
      "Vacancy record available."
    ),
    home_id: safeRaw.home_id ?? null,
    posts: safeRaw.posts ?? null,
    status: cleanText(safeRaw.status),
    priority: cleanText(safeRaw.priority),
    follow_up_required: cleanText(safeRaw.status).toLowerCase() === "open",
  });
}

export function mapPipelineCandidate(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "pipeline_candidate",
    source_table: safeRaw.source_table || "pipeline_candidates",
    title: cleanText(safeRaw.full_name) || "Pipeline candidate",
    summary: pickFirst(
      cleanText(safeRaw.stage),
      cleanText(safeRaw.status),
      "Pipeline candidate available."
    ),
    home_id: safeRaw.home_id ?? null,
    full_name: cleanText(safeRaw.full_name),
    role_applied_for: cleanText(safeRaw.role_applied_for),
    stage: cleanText(safeRaw.stage),
    status: cleanText(safeRaw.status),
    start_target_date: safeRaw.start_target_date || null,
    dbs_status: cleanText(safeRaw.dbs_status),
    right_to_work: cleanText(safeRaw.right_to_work),
    references: cleanText(safeRaw.references),
    mandatory_training_status: cleanText(safeRaw.mandatory_training_status),
    due_date: safeRaw.start_target_date || null,
    follow_up_required: cleanText(safeRaw.status).toLowerCase() !== "completed",
  });
}

export function mapShiftRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "shift",
    source_table: safeRaw.source_table || "shifts",
    title: cleanText(safeRaw.shift) || "Shift",
    summary: pickFirst(
      cleanText(safeRaw.note),
      cleanText(safeRaw.shift),
      "Shift record available."
    ),
    home_id: safeRaw.home_id ?? null,
    date: safeRaw.date || null,
    shift: cleanText(safeRaw.shift),
    lead: cleanText(safeRaw.lead),
    staff: arrayify(safeRaw.staff),
    young_people_present: arrayify(safeRaw.young_people_present),
    note: cleanText(safeRaw.note),
    status: cleanText(safeRaw.status),
  });
}

export function mapAbsenceRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "absence",
    source_table: safeRaw.source_table || "absences",
    title: cleanText(safeRaw.staff_member) || "Absence",
    summary: pickFirst(
      cleanText(safeRaw.cover_plan),
      cleanText(safeRaw.absence_type),
      "Absence record available."
    ),
    home_id: safeRaw.home_id ?? null,
    staff_member: cleanText(safeRaw.staff_member),
    absence_type: cleanText(safeRaw.absence_type),
    start_date: safeRaw.start_date || null,
    end_date: safeRaw.end_date || null,
    status: cleanText(safeRaw.status),
    impact: cleanText(safeRaw.impact),
    cover_plan: cleanText(safeRaw.cover_plan),
    follow_up_required: cleanText(safeRaw.impact).toLowerCase() === "medium",
  });
}

export function mapMaintenanceRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "maintenance_item",
    source_table: safeRaw.source_table || "maintenance",
    title: cleanText(safeRaw.title) || "Maintenance item",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.status),
      "Maintenance record available."
    ),
    home_id: safeRaw.home_id ?? null,
    status: cleanText(safeRaw.status),
    priority: cleanText(safeRaw.priority),
    reported_date: safeRaw.reported_date || null,
    due_date: safeRaw.reported_date || null,
    follow_up_required: ["open", "due_soon"].includes(
      cleanText(safeRaw.status).toLowerCase()
    ),
  });
}

export function mapFinanceRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "finance_item",
    source_table: safeRaw.source_table || "finance",
    title: cleanText(safeRaw.title) || "Finance item",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      [
        cleanText(safeRaw.category),
        cleanText(safeRaw.amount),
        cleanText(safeRaw.period),
      ]
        .filter(Boolean)
        .join(" • "),
      "Finance record available."
    ),
    home_id: safeRaw.home_id ?? null,
    category: cleanText(safeRaw.category),
    amount: cleanText(safeRaw.amount),
    period: cleanText(safeRaw.period),
    status: cleanText(safeRaw.status),
  });
}

export function mapMedicationItem(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "medication_item",
    source_table: safeRaw.source_table || "medication",
    title: cleanText(safeRaw.title) || "Medication item",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.status),
      "Medication item available."
    ),
    home_id: safeRaw.home_id ?? null,
    audit_date: safeRaw.audit_date || null,
    status: cleanText(safeRaw.status),
    stock_level: cleanText(safeRaw.stock_level),
    due_date: safeRaw.audit_date || null,
    follow_up_required: cleanText(safeRaw.status).toLowerCase() === "due_soon",
  });
}

export function mapAdmissionRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "admission",
    source_table: safeRaw.source_table || "admissions",
    title: cleanText(safeRaw.young_person_name) || "Admission",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.status),
      "Admission record available."
    ),
    home_id: safeRaw.home_id ?? null,
    young_person_name: cleanText(safeRaw.young_person_name),
    referral_source: cleanText(safeRaw.referral_source),
    referral_date: safeRaw.referral_date || null,
    status: cleanText(safeRaw.status),
    follow_up_required: cleanText(safeRaw.status).toLowerCase() === "under_consideration",
  });
}

export function mapDischargeRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "discharge",
    source_table: safeRaw.source_table || "discharges",
    title: cleanText(safeRaw.young_person_name) || "Discharge",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.destination),
      "Discharge record available."
    ),
    home_id: safeRaw.home_id ?? null,
    young_person_name: cleanText(safeRaw.young_person_name),
    discharge_date: safeRaw.discharge_date || null,
    destination: cleanText(safeRaw.destination),
    status: cleanText(safeRaw.status),
  });
}

export function mapVisitorRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "visitor_log",
    source_table: safeRaw.source_table || "visitors",
    title: cleanText(safeRaw.visitor_name) || "Visitor",
    summary: pickFirst(
      cleanText(safeRaw.purpose),
      cleanText(safeRaw.status),
      "Visitor log available."
    ),
    home_id: safeRaw.home_id ?? null,
    visitor_name: cleanText(safeRaw.visitor_name),
    organisation: cleanText(safeRaw.organisation),
    visit_date: safeRaw.visit_date || null,
    purpose: cleanText(safeRaw.purpose),
    status: cleanText(safeRaw.status),
    follow_up_required: cleanText(safeRaw.status).toLowerCase() === "booked",
  });
}

export function mapStaffFileRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "staff_file",
    source_table: safeRaw.source_table || "staff_files",
    title: cleanText(safeRaw.staff_member) || "Staff file",
    summary: pickFirst(
      cleanText(safeRaw.file_audit_status),
      cleanText(safeRaw.qualification_evidence),
      "Staff file record available."
    ),
    home_id: safeRaw.home_id ?? null,
    staff_member: cleanText(safeRaw.staff_member),
    application_form: cleanText(safeRaw.application_form),
    references: cleanText(safeRaw.references),
    dbs: cleanText(safeRaw.dbs),
    right_to_work: cleanText(safeRaw.right_to_work),
    id_check: cleanText(safeRaw.id_check),
    qualification_evidence: cleanText(safeRaw.qualification_evidence),
    file_audit_status: cleanText(safeRaw.file_audit_status),
    follow_up_required: cleanText(safeRaw.file_audit_status).toLowerCase() === "action_required",
  });
}

export function mapAuditRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "audit",
    source_table: safeRaw.source_table || "audits",
    title: cleanText(safeRaw.title) || "Audit",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.outcome),
      "Audit record available."
    ),
    home_id: safeRaw.home_id ?? null,
    audit_date: safeRaw.audit_date || null,
    outcome: cleanText(safeRaw.outcome),
    status: cleanText(safeRaw.status),
    follow_up_required: cleanText(safeRaw.status).toLowerCase() === "open_actions",
  });
}

export function mapReg40Record(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "reg40_item",
    source_table: safeRaw.source_table || "reg40",
    title: cleanText(safeRaw.notification_type) || "Reg 40",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.notification_type),
      "Reg 40 item available."
    ),
    home_id: safeRaw.home_id ?? null,
    event_date: safeRaw.event_date || null,
    notification_type: cleanText(safeRaw.notification_type),
    status: cleanText(safeRaw.status),
  });
}

export function mapReg44Record(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "reg44_item",
    source_table: safeRaw.source_table || "reg44",
    title: "Reg 44 visit",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.recommendations),
      "Reg 44 item available."
    ),
    home_id: safeRaw.home_id ?? null,
    visit_date: safeRaw.visit_date || null,
    visitor_name: cleanText(safeRaw.visitor_name),
    status: cleanText(safeRaw.status),
    recommendations: cleanText(safeRaw.recommendations),
    follow_up_required:
      cleanText(safeRaw.status).toLowerCase() !== "completed" ||
      !!cleanText(safeRaw.recommendations),
  });
}

export function mapReg45Record(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "reg45_item",
    source_table: safeRaw.source_table || "reg45",
    title: "Reg 45 review",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.status),
      "Reg 45 item available."
    ),
    home_id: safeRaw.home_id ?? null,
    period_start: safeRaw.period_start || null,
    period_end: safeRaw.period_end || null,
    status: cleanText(safeRaw.status),
    follow_up_required: cleanText(safeRaw.status).toLowerCase() !== "completed",
  });
}

export function mapTransportRecord(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "transport_log",
    source_table: safeRaw.source_table || "transport",
    title: cleanText(safeRaw.journey) || "Transport",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.status),
      "Transport record available."
    ),
    home_id: safeRaw.home_id ?? null,
    date: safeRaw.date || null,
    vehicle: cleanText(safeRaw.vehicle),
    journey: cleanText(safeRaw.journey),
    driver: cleanText(safeRaw.driver),
    status: cleanText(safeRaw.status),
    follow_up_required: cleanText(safeRaw.status).toLowerCase() === "booked",
  });
}

export function mapRotaShift(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "rota_shift",
    source_table: safeRaw.source_table || "rota",
    title:
      cleanText(safeRaw.staff_member) ||
      cleanText(safeRaw.shift_name) ||
      "Rota shift",
    summary: pickFirst(
      [
        cleanText(safeRaw.shift_name),
        cleanText(safeRaw.start_time),
        cleanText(safeRaw.end_time),
      ]
        .filter(Boolean)
        .join(" • "),
      cleanText(safeRaw.note),
      "Rota shift available."
    ),
    home_id: safeRaw.home_id ?? null,
    rota_date: safeRaw.rota_date || null,
    staff_member: cleanText(safeRaw.staff_member),
    role: cleanText(safeRaw.role),
    shift_name: cleanText(safeRaw.shift_name),
    start_time: cleanText(safeRaw.start_time),
    end_time: cleanText(safeRaw.end_time),
    status: cleanText(safeRaw.status),
    note: cleanText(safeRaw.note),
    follow_up_required: cleanText(safeRaw.status).toLowerCase() === "gap",
  });
}

export function mapStaffingSnapshot(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "staffing_snapshot",
    source_table: safeRaw.source_table || "staffing",
    title: cleanText(safeRaw.title) || "Staffing snapshot",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.staffing_pressure),
      "Staffing snapshot available."
    ),
    home_id: safeRaw.home_id ?? null,
    beds_registered: safeRaw.beds_registered ?? null,
    occupancy: safeRaw.occupancy ?? null,
    staff_employed: safeRaw.staff_employed ?? null,
    staff_pipeline: safeRaw.staff_pipeline ?? null,
    on_shift_now: safeRaw.on_shift_now ?? null,
    off_shift_now: safeRaw.off_shift_now ?? null,
    annual_leave_now: safeRaw.annual_leave_now ?? null,
    bank_available: safeRaw.bank_available ?? null,
    staffing_pressure: cleanText(safeRaw.staffing_pressure),
    vacancies_open: safeRaw.vacancies_open ?? null,
    waking_night_cover: cleanText(safeRaw.waking_night_cover),
    daytime_cover: cleanText(safeRaw.daytime_cover),
    manager_on_call: cleanText(safeRaw.manager_on_call),
    follow_up_required: cleanText(safeRaw.staffing_pressure).toLowerCase() === "high",
  });
}

export function mapHomeIncident(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    record_type: "home_incident",
    source_table: safeRaw.source_table || "home_incidents",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.incident_type) || "Home incident",
    summary: pickFirst(
      cleanText(safeRaw.summary),
      cleanText(safeRaw.incident_type),
      "Home incident available."
    ),
    home_id: safeRaw.home_id ?? null,
    date: safeRaw.date || null,
    incident_type: cleanText(safeRaw.incident_type),
    severity: normaliseSeverity(safeRaw.severity),
    status: cleanText(safeRaw.status),
  });
}

/* Inspection UI mappings */

export function mapInspectionHomeCard(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id: safeRaw.home_id ?? safeRaw.id ?? null,
    source_id: safeRaw.home_id ?? safeRaw.id ?? null,
    record_type: "inspection_home_card",
    source_table: safeRaw.source_table || "vw_inspection_home_cards",
    title: cleanText(safeRaw.home_name) || "Inspection home card",
    summary: [
      cleanText(safeRaw.overall_band),
      safeRaw.overall_score !== undefined ? `Score ${safeRaw.overall_score}` : "",
      safeRaw.confidence_score !== undefined ? `Confidence ${safeRaw.confidence_score}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    home_id: safeRaw.home_id ?? null,
    home_name: cleanText(safeRaw.home_name),
    overall_band: cleanText(safeRaw.overall_band),
    overall_score: safeRaw.overall_score ?? null,
    confidence_score: safeRaw.confidence_score ?? null,
    open_actions: safeRaw.open_actions ?? safeRaw.open_action_count ?? 0,
    overdue_actions: safeRaw.overdue_actions ?? safeRaw.overdue_action_count ?? 0,
    critical_actions: safeRaw.critical_actions ?? safeRaw.critical_action_count ?? 0,
    open_lines_of_enquiry: safeRaw.open_lines_of_enquiry ?? 0,
  });
}

export function mapInspectionHeader(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id: safeRaw.inspection_score_id ?? safeRaw.id ?? safeRaw.home_id ?? null,
    source_id: safeRaw.inspection_score_id ?? safeRaw.id ?? safeRaw.home_id ?? null,
    record_type: "inspection_home_header",
    source_table: safeRaw.source_table || "vw_inspection_home_scorecard_with_impact",
    title: cleanText(safeRaw.home_name) || "Inspection header",
    summary: pickFirst(
      cleanText(safeRaw.top_concerns),
      cleanText(safeRaw.narrative_summary),
      "Inspection summary available."
    ),
    home_id: safeRaw.home_id ?? null,
    provider_id: safeRaw.provider_id ?? null,
    inspection_score_id: safeRaw.inspection_score_id ?? safeRaw.id ?? null,
    home_name: cleanText(safeRaw.home_name),
    overall_band: cleanText(safeRaw.overall_band),
    overall_score: safeRaw.overall_score ?? null,
    confidence_score: safeRaw.confidence_score ?? null,
    experiences_score: safeRaw.experiences_score ?? null,
    experiences_band: cleanText(safeRaw.experiences_band),
    helped_score: safeRaw.helped_score ?? null,
    helped_band: cleanText(safeRaw.helped_band),
    leadership_score: safeRaw.leadership_score ?? null,
    leadership_band: cleanText(safeRaw.leadership_band),
    narrative_summary: cleanText(safeRaw.narrative_summary),
    strengths_summary: cleanText(safeRaw.strengths_summary),
    concerns_summary: cleanText(safeRaw.concerns_summary),
    top_concerns: cleanText(safeRaw.top_concerns),
    open_actions: safeRaw.open_actions ?? safeRaw.open_action_count ?? 0,
    overdue_actions: safeRaw.overdue_actions ?? safeRaw.overdue_action_count ?? 0,
    critical_actions: safeRaw.critical_actions ?? safeRaw.critical_action_count ?? 0,
    open_lines_of_enquiry: safeRaw.open_lines_of_enquiry ?? 0,
    next_action_due_date: safeRaw.next_action_due_date || null,
  });
}

export function mapInspectionSectionPanel(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id:
      safeRaw.id ??
      `${safeRaw.home_id || "home"}-${safeRaw.section_code || safeRaw.section_name || "section"}`,
    source_id:
      safeRaw.id ??
      `${safeRaw.home_id || "home"}-${safeRaw.section_code || safeRaw.section_name || "section"}`,
    record_type: "inspection_section_panel",
    source_table: safeRaw.source_table || "vw_inspection_section_panels",
    title: cleanText(safeRaw.section_name) || cleanText(safeRaw.section_code) || "Inspection section",
    summary: pickFirst(
      cleanText(safeRaw.summary_text),
      cleanText(safeRaw.concerns_text),
      cleanText(safeRaw.strengths_text),
      "Inspection section available."
    ),
    home_id: safeRaw.home_id ?? null,
    provider_id: safeRaw.provider_id ?? null,
    section_code: cleanText(safeRaw.section_code),
    section_name: cleanText(safeRaw.section_name),
    score_band: cleanText(safeRaw.score_band),
    score_value: safeRaw.score_value ?? safeRaw.section_score ?? null,
    summary_text: cleanText(safeRaw.summary_text),
    strengths_text: cleanText(safeRaw.strengths_text),
    concerns_text: cleanText(safeRaw.concerns_text),
    descriptor_summary: cleanText(safeRaw.descriptor_summary),
  });
}

export function mapInspectionReason(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id: safeRaw.id ?? null,
    source_id: safeRaw.id ?? null,
    record_type: "inspection_reason",
    source_table: safeRaw.source_table || "inspection_score_reasons",
    title: cleanText(safeRaw.title) || cleanText(safeRaw.line_of_enquiry_name) || "Inspection reason",
    summary: pickFirst(
      cleanText(safeRaw.description),
      cleanText(safeRaw.evidence_excerpt),
      "Inspection reason available."
    ),
    home_id: safeRaw.home_id ?? null,
    provider_id: safeRaw.provider_id ?? null,
    inspection_score_id: safeRaw.inspection_score_id ?? null,
    section_code: cleanText(safeRaw.section_code),
    section_name: cleanText(safeRaw.section_name),
    reason_type: cleanText(safeRaw.reason_type),
    priority: safeRaw.priority ?? null,
    description: cleanText(safeRaw.description),
    evidence_excerpt: cleanText(safeRaw.evidence_excerpt),
    score_impact: safeRaw.score_impact ?? safeRaw.points_impact ?? null,
    line_of_enquiry_id: safeRaw.line_of_enquiry_id ?? null,
    line_of_enquiry_name: cleanText(safeRaw.line_of_enquiry_name),
    created_at: safeRaw.created_at || null,
  });
}

export function mapInspectionAction(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id: safeRaw.id ?? null,
    source_id: safeRaw.id ?? null,
    record_type: "inspection_action",
    source_table: safeRaw.source_table || "vw_inspection_action_impact",
    title: cleanText(safeRaw.action_title) || "Inspection action",
    summary: pickFirst(
      cleanText(safeRaw.action_description),
      cleanText(safeRaw.evidence_required),
      "Inspection action available."
    ),
    home_id: safeRaw.home_id ?? null,
    provider_id: safeRaw.provider_id ?? null,
    inspection_score_id: safeRaw.inspection_score_id ?? null,
    line_of_enquiry_id: safeRaw.line_of_enquiry_id ?? null,
    section_code: cleanText(safeRaw.section_code),
    section_name: cleanText(safeRaw.section_name),
    action_title: cleanText(safeRaw.action_title),
    action_description: cleanText(safeRaw.action_description),
    action_type: cleanText(safeRaw.action_type),
    priority: cleanText(safeRaw.priority),
    due_date: safeRaw.due_date || null,
    status: cleanText(safeRaw.status || "open"),
    evidence_required: cleanText(safeRaw.evidence_required),
    owner_user_id: safeRaw.owner_user_id ?? null,
    owner_user_name: cleanText(safeRaw.owner_user_name),
    owner_staff_id: safeRaw.owner_staff_id ?? null,
    owner_staff_name: cleanText(safeRaw.owner_staff_name),
    linked_task_id: safeRaw.linked_task_id ?? null,
    recoverable_points_estimate: safeRaw.recoverable_points_estimate ?? null,
    projected_section_band: cleanText(safeRaw.projected_section_band),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
    follow_up_required: !["completed", "closed"].includes(normaliseToken(safeRaw.status)),
  });
}

export function mapInspectionTask(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id: safeRaw.task_id ?? safeRaw.id ?? null,
    source_id: safeRaw.task_id ?? safeRaw.id ?? null,
    record_type: "inspection_task",
    source_table: safeRaw.source_table || "vw_inspection_action_tasks",
    title: cleanText(safeRaw.task_title) || cleanText(safeRaw.action_title) || "Inspection task",
    summary: pickFirst(
      cleanText(safeRaw.action_title),
      cleanText(safeRaw.task_title),
      "Inspection task available."
    ),
    home_id: safeRaw.home_id ?? null,
    provider_id: safeRaw.provider_id ?? null,
    action_id: safeRaw.action_id ?? safeRaw.inspection_action_id ?? null,
    linked_task_id: safeRaw.linked_task_id ?? safeRaw.task_id ?? null,
    task_title: cleanText(safeRaw.task_title),
    action_title: cleanText(safeRaw.action_title),
    task_due_date: safeRaw.task_due_date || safeRaw.due_date || null,
    action_due_date: safeRaw.action_due_date || null,
    assigned_user_name: cleanText(safeRaw.assigned_user_name),
    assigned_role: cleanText(safeRaw.assigned_role),
    completed: toBool(safeRaw.completed),
    status: cleanText(safeRaw.status || (safeRaw.completed ? "completed" : "open")),
    task_created_at: safeRaw.task_created_at || safeRaw.created_at || null,
  });
}

export function mapInspectionBriefing(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id: safeRaw.home_id ?? safeRaw.id ?? null,
    source_id: safeRaw.home_id ?? safeRaw.id ?? null,
    record_type: "inspection_briefing",
    source_table: safeRaw.source_table || "vw_inspection_manager_briefing",
    title: "Inspection briefing",
    summary: pickFirst(
      cleanText(safeRaw.headline_summary),
      cleanText(safeRaw.overall_position_statement),
      cleanText(safeRaw.immediate_priority_actions),
      "Inspection briefing available."
    ),
    home_id: safeRaw.home_id ?? null,
    provider_id: safeRaw.provider_id ?? null,
    headline_summary: cleanText(safeRaw.headline_summary),
    overall_position_statement: cleanText(safeRaw.overall_position_statement),
    likely_inspector_focus: cleanText(safeRaw.likely_inspector_focus),
    immediate_priority_actions: cleanText(safeRaw.immediate_priority_actions),
    strengths_to_evidence: cleanText(safeRaw.strengths_to_evidence),
    risk_watchpoints: cleanText(safeRaw.risk_watchpoints),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
  });
}

export function mapInspectionPrep72Hour(raw = {}) {
  const safeRaw = safeObject(raw);
  return buildBaseRecord(safeRaw, {
    id: safeRaw.home_id ?? safeRaw.id ?? null,
    source_id: safeRaw.home_id ?? safeRaw.id ?? null,
    record_type: "inspection_prep_72_hour",
    source_table: safeRaw.source_table || "vw_inspection_prep_72_hour",
    title: "72-hour inspection preparation",
    summary: pickFirst(
      cleanText(safeRaw.urgent_actions),
      cleanText(safeRaw.primary_focus_area),
      cleanText(safeRaw.inspection_pressure_level),
      "72-hour inspection preparation available."
    ),
    home_id: safeRaw.home_id ?? null,
    provider_id: safeRaw.provider_id ?? null,
    inspection_pressure_level: cleanText(safeRaw.inspection_pressure_level),
    primary_focus_area: cleanText(safeRaw.primary_focus_area),
    urgent_actions: cleanText(safeRaw.urgent_actions),
    key_evidence_to_pull: cleanText(safeRaw.key_evidence_to_pull),
    likely_questions: cleanText(safeRaw.likely_questions),
    created_at: safeRaw.created_at || null,
    updated_at: safeRaw.updated_at || null,
  });
}

export function mapBundle(raw = {}) {
  const safeRaw = safeObject(raw);

  return {
    young_person: mapYoungPerson(safeRaw.young_person || safeRaw.youngPerson || safeRaw, safeRaw),
    identity_profile: mapIdentityProfile(
      safeRaw.identity_profile || safeRaw.young_person_identity_profile || {}
    ),
    communication_profile: mapCommunicationProfile(
      safeRaw.communication_profile || safeRaw.young_person_communication_profile || {}
    ),
    education_profile: mapEducationProfile(
      safeRaw.education_profile || safeRaw.young_person_education_profile || {}
    ),
    health_profile: mapHealthProfile(
      safeRaw.health_profile || safeRaw.young_person_health_profile || {}
    ),
    legal_status: mapLegalStatus(
      safeRaw.legal_status || safeRaw.young_person_legal_status || {}
    ),
    formulation: mapFormulation(
      safeRaw.formulation ||
        safeRaw.young_person_formulation ||
        safeRaw.young_person_formulations ||
        {}
    ),
  };
}

export function mapList(items = [], mapper = (x) => x) {
  return arrayify(items).map((item) => mapper(safeObject(item)));
}

export function mapReadinessPayload(raw = {}) {
  const safeRaw = safeObject(raw);

  return {
    compliance_items: mapList(
      safeRaw.compliance_items || safeRaw.items || [],
      mapComplianceItem
    ),
    statutory_documents: mapList(
      safeRaw.statutory_documents || [],
      mapStatutoryDocument
    ),
    tasks: mapList(safeRaw.tasks || [], mapTask),
    approvals_pending: safeRaw.approvals_pending ?? 0,
    overdue_count: safeRaw.overdue_count ?? 0,
    due_soon_count: safeRaw.due_soon_count ?? 0,
    escalation_count: safeRaw.escalation_count ?? 0,
  };
}

export function mapManagerReviewPayload(raw = {}) {
  const safeRaw = safeObject(raw);

  return {
    submitted_records: mapList(safeRaw.submitted_records || [], (item) => item),
    manager_actions: mapList(safeRaw.manager_actions || [], mapManagerAction),
    compliance_items: mapList(safeRaw.compliance_items || [], mapComplianceItem),
    incidents: mapList(safeRaw.incidents || [], mapIncident),
    risks: mapList(safeRaw.risk_assessments || safeRaw.risks || [], mapRiskAssessment),
    tasks: mapList(safeRaw.tasks || [], mapTask),
    pattern_alerts: arrayify(safeRaw.pattern_alerts || []),
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
    case "document":
      return mapDocument(raw);
    case "communication":
      return mapCommunicationRecord(raw);
    case "therapy":
      return mapTherapyRecord(raw);
    case "team":
      return mapTeamRecord(raw);
    case "supervision":
      return mapSupervisionRecord(raw);
    case "onboarding":
      return mapOnboardingRecord(raw);
    case "training_record":
      return mapTrainingRecord(raw);
    case "probation":
      return mapProbationRecord(raw);
    case "vacancy":
      return mapVacancyRecord(raw);
    case "pipeline_candidate":
      return mapPipelineCandidate(raw);
    case "shift":
      return mapShiftRecord(raw);
    case "absence":
      return mapAbsenceRecord(raw);
    case "maintenance_item":
      return mapMaintenanceRecord(raw);
    case "finance_item":
      return mapFinanceRecord(raw);
    case "medication_item":
      return mapMedicationItem(raw);
    case "admission":
      return mapAdmissionRecord(raw);
    case "discharge":
      return mapDischargeRecord(raw);
    case "visitor_log":
      return mapVisitorRecord(raw);
    case "staff_file":
      return mapStaffFileRecord(raw);
    case "audit":
      return mapAuditRecord(raw);
    case "reg40_item":
      return mapReg40Record(raw);
    case "reg44_item":
      return mapReg44Record(raw);
    case "reg45_item":
      return mapReg45Record(raw);
    case "transport_log":
      return mapTransportRecord(raw);
    case "rota_shift":
      return mapRotaShift(raw);
    case "staffing_snapshot":
      return mapStaffingSnapshot(raw);
    case "home_incident":
      return mapHomeIncident(raw);

    case "inspection_home_card":
      return mapInspectionHomeCard(raw);
    case "inspection_home_header":
      return mapInspectionHeader(raw);
    case "inspection_section_panel":
      return mapInspectionSectionPanel(raw);
    case "inspection_reason":
      return mapInspectionReason(raw);
    case "inspection_action":
      return mapInspectionAction(raw);
    case "inspection_task":
      return mapInspectionTask(raw);
      case "inspection_briefing":
      return mapInspectionBriefing(raw);
    case "inspection_prep_72_hour":
      return mapInspectionPrep72Hour(raw);

    default:
      return buildBaseRecord(raw, {
        record_type: recordType || safeObject(raw).record_type || "record",
        title: cleanText(safeObject(raw).title) || "Record",
        summary: cleanText(safeObject(raw).summary) || "",
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
  const safePayload = safeObject(payload);
  const evidence = [];

  const addMapped = (items, mapper) => {
    evidence.push(...mapList(items || [], mapper).map(toAssistantEvidence));
  };

  addMapped(safePayload.daily_notes, mapDailyNote);
  addMapped(safePayload.incidents, mapIncident);
  addMapped(safePayload.home_incidents, mapHomeIncident);
  addMapped(safePayload.support_plans, mapSupportPlan);
  addMapped(safePayload.risk_assessments || safePayload.risks, mapRiskAssessment);
  addMapped(safePayload.health_records, mapHealthRecord);
  addMapped(safePayload.education_records, mapEducationRecord);
  addMapped(safePayload.family_contact_records, mapFamilyContactRecord);
  addMapped(safePayload.keywork_sessions || safePayload.keywork, mapKeyworkSession);
  addMapped(safePayload.appointments, mapAppointment);
  addMapped(safePayload.achievement_records, mapAchievementRecord);
  addMapped(safePayload.safeguarding_records, mapSafeguardingRecord);
  addMapped(safePayload.missing_episodes, mapMissingEpisode);
  addMapped(safePayload.chronology_events || safePayload.timeline, mapChronologyEvent);
  addMapped(safePayload.compliance_items, mapComplianceItem);
  addMapped(safePayload.ai_generated_reports, mapAiReport);
  addMapped(safePayload.monthly_reviews, mapMonthlyReview);
  addMapped(safePayload.handover_records, mapHandoverRecord);
  addMapped(safePayload.manager_actions, mapManagerAction);
  addMapped(safePayload.tasks, mapTask);
  addMapped(safePayload.medication_profiles, mapMedicationProfile);
  addMapped(safePayload.medication_records, mapMedicationRecord);
  addMapped(safePayload.review_meetings, mapReviewMeeting);
  addMapped(safePayload.statutory_documents, mapStatutoryDocument);
  addMapped(safePayload.documents, mapDocument);
  addMapped(safePayload.communications, mapCommunicationRecord);
  addMapped(safePayload.therapy || safePayload.therapy_records, mapTherapyRecord);
  addMapped(safePayload.team, mapTeamRecord);
  addMapped(safePayload.supervisions, mapSupervisionRecord);
  addMapped(safePayload.inspection_pack_jobs, mapInspectionPackJob);

  addMapped(safePayload.onboarding, mapOnboardingRecord);
  addMapped(safePayload.training, mapTrainingRecord);
  addMapped(safePayload.probations, mapProbationRecord);
  addMapped(safePayload.vacancies, mapVacancyRecord);
  addMapped(safePayload.pipeline || safePayload.pipeline_candidates, mapPipelineCandidate);
  addMapped(safePayload.shifts, mapShiftRecord);
  addMapped(safePayload.absences, mapAbsenceRecord);
  addMapped(safePayload.maintenance, mapMaintenanceRecord);
  addMapped(safePayload.finance, mapFinanceRecord);
  addMapped(safePayload.medication, mapMedicationItem);
  addMapped(safePayload.admissions, mapAdmissionRecord);
  addMapped(safePayload.discharges, mapDischargeRecord);
  addMapped(safePayload.visitors, mapVisitorRecord);
  addMapped(safePayload.staff_files, mapStaffFileRecord);
  addMapped(safePayload.audits, mapAuditRecord);
  addMapped(safePayload.reg40, mapReg40Record);
  addMapped(safePayload.reg44, mapReg44Record);
  addMapped(safePayload.reg45, mapReg45Record);
  addMapped(safePayload.transport, mapTransportRecord);
  addMapped(safePayload.rota, mapRotaShift);
  addMapped(safePayload.staffing, mapStaffingSnapshot);

  addMapped(safePayload.inspection_home_cards, mapInspectionHomeCard);
  addMapped(safePayload.inspection_headers, mapInspectionHeader);
  addMapped(safePayload.inspection_sections, mapInspectionSectionPanel);
  addMapped(safePayload.inspection_reasons, mapInspectionReason);
  addMapped(safePayload.inspection_actions, mapInspectionAction);
  addMapped(safePayload.inspection_tasks, mapInspectionTask);
  addMapped(safePayload.inspection_briefings, mapInspectionBriefing);
  addMapped(safePayload.inspection_prep_72_hour, mapInspectionPrep72Hour);

  if (safePayload.identity_profile || safePayload.young_person_identity_profile) {
    evidence.push(
      toAssistantEvidence(
        mapIdentityProfile(
          safePayload.identity_profile || safePayload.young_person_identity_profile
        )
      )
    );
  }

  if (
    safePayload.communication_profile ||
    safePayload.young_person_communication_profile
  ) {
    evidence.push(
      toAssistantEvidence(
        mapCommunicationProfile(
          safePayload.communication_profile ||
            safePayload.young_person_communication_profile
        )
      )
    );
  }

  if (safePayload.education_profile || safePayload.young_person_education_profile) {
    evidence.push(
      toAssistantEvidence(
        mapEducationProfile(
          safePayload.education_profile || safePayload.young_person_education_profile
        )
      )
    );
  }

  if (safePayload.health_profile || safePayload.young_person_health_profile) {
    evidence.push(
      toAssistantEvidence(
        mapHealthProfile(
          safePayload.health_profile || safePayload.young_person_health_profile
        )
      )
    );
  }

  if (safePayload.legal_status || safePayload.young_person_legal_status) {
    evidence.push(
      toAssistantEvidence(
        mapLegalStatus(
          safePayload.legal_status || safePayload.young_person_legal_status
        )
      )
    );
  }

  if (
    safePayload.formulation ||
    safePayload.young_person_formulation ||
    safePayload.young_person_formulations
  ) {
    evidence.push(
      toAssistantEvidence(
        mapFormulation(
          safePayload.formulation ||
            safePayload.young_person_formulation ||
            safePayload.young_person_formulations
        )
      )
    );
  }

  return evidence;
}
