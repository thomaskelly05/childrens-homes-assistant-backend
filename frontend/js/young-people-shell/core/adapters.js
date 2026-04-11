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
return Array.isArray(value) ? value : [];
}

function toBool(value) {
return Boolean(value);
}

function cleanText(value) {
if (value === null || value === undefined) return "";
return String(value).trim();
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
photo_url: normaliseImagePath(raw.photo_url || ""),
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
};
}

export function mapCommunicationProfile(raw = {}) {
return {
id: raw.id ?? null,
young_person_id: raw.young_person_id ?? null,
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
};
}

export function mapEducationProfile(raw = {}) {
return {
id: raw.id ?? null,
young_person_id: raw.young_person_id ?? null,
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
};
}

export function mapHealthProfile(raw = {}) {
return {
id: raw.id ?? null,
young_person_id: raw.young_person_id ?? null,
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
};
}

export function mapLegalStatus(raw = {}) {
return {
id: raw.id ?? null,
young_person_id: raw.young_person_id ?? null,
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
};
}

export function mapFormulation(raw = {}) {
return {
id: raw.id ?? null,
young_person_id: raw.young_person_id ?? null,
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
};
}

export function mapDailyNote(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.daily_note,
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
});
}

export function mapIncident(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.incident,
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
});
}

export function mapHealthRecord(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.health_record,
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
follow_up_required: toBool(raw.follow_up_required),
});
}

export function mapFamilyContactRecord(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.family_contact_record,
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
follow_up_required: toBool(raw.follow_up_required),
linked_contact_id: raw.linked_contact_id ?? null,
});
}

export function mapKeyworkSession(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.keywork_session,
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
reflective_analysis: cleanText(raw.reflective_analysis),
actions_agreed: cleanText(raw.actions_agreed),
next_session_date: raw.next_session_date || null,
archived: toBool(raw.archived),
manager_review_comment: cleanText(raw.manager_review_comment),
});
}

export function mapAppointment(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.appointment,
title: cleanText(raw.title) || cleanText(raw.appointment_type) || "Appointment",
summary: pickFirst(
cleanText(raw.summary),
cleanText(raw.description),
cleanText(raw.purpose),
cleanText(raw.notes),
"Appointment"
),
appointment_type: cleanText(raw.appointment_type),
start_datetime: raw.start_datetime || raw.appointment_date || null,
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
});
}

export function mapAchievementRecord(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.achievement_record,
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
});
}

export function mapMissingEpisode(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.missing_episode,
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
return_interview_date: raw.return_interview_date || null,
linked_risk_assessment_id: raw.linked_risk_assessment_id ?? null,
});
}

export function mapChronologyEvent(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.chronology_event,
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
tags_json: arrayify(raw.tags_json),
metadata_json: raw.metadata_json || {},
linked_standard: cleanText(raw.linked_standard),
linked_judgement_area: cleanText(raw.linked_judgement_area),
linked_document_id: raw.linked_document_id ?? null,
linked_review_id: raw.linked_review_id ?? null,
linked_action_id: raw.linked_action_id ?? null,
recorded_by_name: cleanText(raw.recorded_by_name),
});
}

export function mapComplianceItem(raw = {}) {
const status = cleanText(raw.status).toLowerCase();
const normalisedStatus = Object.values(COMPLIANCE_STATUS).includes(status)
? status
: COMPLIANCE_STATUS.pending;

return buildBaseRecord(raw, {
record_type: RECORD_TYPES.compliance_item,
title: cleanText(raw.title) || "Compliance item",
summary: `Due ${raw.due_date || "date not set"}`,
due_date: raw.due_date || null,
completed_date: raw.completed_date || null,
status: normalisedStatus,
severity: normaliseSeverity(raw.severity),
owner_id: raw.owner_id ?? null,
escalation_level: raw.escalation_level ?? null,
source_table: cleanText(raw.source_table),
source_id: raw.source_id ?? raw.id ?? null,
rule_id: raw.rule_id ?? null,
record_type_source: cleanText(raw.record_type),
metadata_json: raw.metadata_json || {},
manager_notified_at: raw.manager_notified_at || null,
last_notification_at: raw.last_notification_at || null,
});
}

export function mapAiReport(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.ai_generated_report,
title: cleanText(raw.title) || cleanText(raw.report_type) || "AI generated report",
summary: cleanText(raw.report_text),
report_type: cleanText(raw.report_type),
review_month: raw.review_month || null,
status: cleanText(raw.status),
generated_by: raw.generated_by ?? null,
});
}

export function mapMonthlyReview(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.monthly_review,
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
summary_json: raw.summary_json || {},
completed_at: raw.completed_at || null,
});
}

export function mapManagerAction(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.manager_action,
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
title: cleanText(raw.title) || cleanText(raw.task) || "Task",
summary: cleanText(raw.task) || "Task",
task_date: raw.task_date || null,
due_date: raw.due_date || null,
completed: toBool(raw.completed),
completed_at: raw.completed_at || null,
assigned_role: cleanText(raw.assigned_role),
assigned_to_user_id: raw.assigned_to_user_id ?? null,
source_table: cleanText(raw.source_table),
source_id: raw.source_id ?? null,
task_type: cleanText(raw.task_type),
compliance_generated: toBool(raw.compliance_generated),
status: raw.completed ? WORKFLOW_STATUS.completed : WORKFLOW_STATUS.active,
});
}

export function mapMedicationProfile(raw = {}) {
return buildBaseRecord(raw, {
record_type: RECORD_TYPES.medication_profile,
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
});
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

export function mapReviewMeeting(raw = {}) {
return buildBaseRecord(raw, {
record_type: "review_meeting",
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
attendees_json: raw.attendees_json || [],
agenda: cleanText(raw.agenda),
child_voice: cleanText(raw.child_voice),
decisions: cleanText(raw.decisions),
actions: cleanText(raw.actions),
next_review_date: raw.next_review_date || null,
});
}

export function mapStatutoryDocument(raw = {}) {
return buildBaseRecord(raw, {
record_type: "statutory_document",
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
