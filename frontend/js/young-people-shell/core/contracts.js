export const RECORD_TYPES = {
daily_note: "daily_note",
incident: "incident",
support_plan: "support_plan",
risk_assessment: "risk_assessment",
health_record: "health_record",
education_record: "education_record",
family_contact_record: "family_contact_record",
keywork_session: "keywork_session",
appointment: "appointment",
achievement_record: "achievement_record",
safeguarding_record: "safeguarding_record",
missing_episode: "missing_episode",
monthly_review: "monthly_review",
handover_record: "handover_record",
ai_generated_report: "ai_generated_report",
chronology_event: "chronology_event",
compliance_item: "compliance_item",
manager_action: "manager_action",
task: "task",
medication_profile: "medication_profile",
medication_record: "medication_record",
profile_identity: "profile_identity",
profile_communication: "profile_communication",
profile_education: "profile_education",
profile_health: "profile_health",
profile_legal: "profile_legal",
profile_formulation: "profile_formulation",
};

export const WORKFLOW_STATUS = {
draft: "draft",
submitted: "submitted",
approved: "approved",
returned: "returned",
active: "active",
completed: "completed",
cancelled: "cancelled",
archived: "archived",
};

export const SIGNIFICANCE = {
low: "low",
medium: "medium",
high: "high",
critical: "critical",
};

export const SEVERITY = {
low: "low",
medium: "medium",
high: "high",
critical: "critical",
};

export const APPROVAL_STATUS = {
not_required: "not_required",
pending: "pending",
approved: "approved",
returned: "returned",
};

export const COMPLIANCE_STATUS = {
pending: "pending",
due_soon: "due_soon",
overdue: "overdue",
completed: "completed",
escalated: "escalated",
};

export const LINK_TYPES = {
related: "related",
evidence_for: "evidence_for",
follow_up_to: "follow_up_to",
generated_from: "generated_from",
supports: "supports",
review_of: "review_of",
appointment_for: "appointment_for",
outcome_of: "outcome_of",
triggered_by: "triggered_by",
};

export const AI_SUGGESTION_TYPES = {
create_health_record: "create_health_record",
create_education_record: "create_education_record",
create_family_contact_record: "create_family_contact_record",
create_risk_assessment: "create_risk_assessment",
create_safeguarding_record: "create_safeguarding_record",
create_task: "create_task",
create_compliance_item: "create_compliance_item",
update_support_plan: "update_support_plan",
update_risk_assessment: "update_risk_assessment",
link_to_appointment: "link_to_appointment",
link_to_plan: "link_to_plan",
add_to_chronology: "add_to_chronology",
manager_review: "manager_review",
};

export const DOMAIN_AREAS = {
daily_living: "daily_living",
safeguarding: "safeguarding",
risk: "risk",
health: "health",
education: "education",
family: "family",
keywork: "keywork",
planning: "planning",
chronology: "chronology",
readiness: "readiness",
management: "management",
reporting: "reporting",
};

export const RECORD_TYPE_META = {
[RECORD_TYPES.daily_note]: {
label: "Daily note",
domain: DOMAIN_AREAS.daily_living,
primaryTable: "daily_notes",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: true,
},

[RECORD_TYPES.incident]: {
label: "Incident",
domain: DOMAIN_AREAS.safeguarding,
primaryTable: "incidents",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: true,
},

[RECORD_TYPES.support_plan]: {
label: "Support plan",
domain: DOMAIN_AREAS.planning,
primaryTable: "support_plans",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: true,
approvalRequired: true,
},

[RECORD_TYPES.risk_assessment]: {
label: "Risk assessment",
domain: DOMAIN_AREAS.risk,
primaryTable: "risk_assessments",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: true,
},

[RECORD_TYPES.health_record]: {
label: "Health record",
domain: DOMAIN_AREAS.health,
primaryTable: "health_records",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: false,
},

[RECORD_TYPES.education_record]: {
label: "Education record",
domain: DOMAIN_AREAS.education,
primaryTable: "education_records",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: false,
},

[RECORD_TYPES.family_contact_record]: {
label: "Family contact record",
domain: DOMAIN_AREAS.family,
primaryTable: "family_contact_records",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: false,
},

[RECORD_TYPES.keywork_session]: {
label: "Keywork session",
domain: DOMAIN_AREAS.keywork,
primaryTable: "keywork_sessions",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: true,
},

[RECORD_TYPES.appointment]: {
label: "Appointment",
domain: DOMAIN_AREAS.health,
primaryTable: "appointments",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: true,
approvalRequired: false,
},

[RECORD_TYPES.achievement_record]: {
label: "Achievement record",
domain: DOMAIN_AREAS.daily_living,
primaryTable: "achievement_records",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: false,
},

[RECORD_TYPES.safeguarding_record]: {
label: "Safeguarding record",
domain: DOMAIN_AREAS.safeguarding,
primaryTable: "safeguarding_records",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: true,
},

[RECORD_TYPES.missing_episode]: {
label: "Missing episode",
domain: DOMAIN_AREAS.safeguarding,
primaryTable: "missing_episodes",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: true,
approvalRequired: true,
},

[RECORD_TYPES.monthly_review]: {
label: "Monthly review",
domain: DOMAIN_AREAS.reporting,
primaryTable: "monthly_reviews",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: false,
approvalRequired: true,
},

[RECORD_TYPES.handover_record]: {
label: "Handover record",
domain: DOMAIN_AREAS.reporting,
primaryTable: "handover_records",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: false,
approvalRequired: true,
},

[RECORD_TYPES.ai_generated_report]: {
label: "AI generated report",
domain: DOMAIN_AREAS.reporting,
primaryTable: "ai_generated_reports",
defaultWorkflow: WORKFLOW_STATUS.draft,
chronologyEligible: false,
approvalRequired: true,
},

[RECORD_TYPES.chronology_event]: {
label: "Chronology event",
domain: DOMAIN_AREAS.chronology,
primaryTable: "chronology_events",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.compliance_item]: {
label: "Compliance item",
domain: DOMAIN_AREAS.readiness,
primaryTable: "compliance_items",
defaultWorkflow: WORKFLOW_STATUS.pending,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.manager_action]: {
label: "Manager action",
domain: DOMAIN_AREAS.management,
primaryTable: "manager_actions",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: true,
approvalRequired: false,
},

[RECORD_TYPES.task]: {
label: "Task",
domain: DOMAIN_AREAS.management,
primaryTable: "tasks",
defaultWorkflow: WORKFLOW_STATUS.pending,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.medication_profile]: {
label: "Medication profile",
domain: DOMAIN_AREAS.health,
primaryTable: "medication_profiles",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.medication_record]: {
label: "Medication record",
domain: DOMAIN_AREAS.health,
primaryTable: "medication_records",
defaultWorkflow: WORKFLOW_STATUS.completed,
chronologyEligible: true,
approvalRequired: false,
},

[RECORD_TYPES.profile_identity]: {
label: "Identity profile",
domain: DOMAIN_AREAS.daily_living,
primaryTable: "young_person_identity_profile",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.profile_communication]: {
label: "Communication profile",
domain: DOMAIN_AREAS.daily_living,
primaryTable: "young_person_communication_profile",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.profile_education]: {
label: "Education profile",
domain: DOMAIN_AREAS.education,
primaryTable: "young_person_education_profile",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.profile_health]: {
label: "Health profile",
domain: DOMAIN_AREAS.health,
primaryTable: "young_person_health_profile",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.profile_legal]: {
label: "Legal profile",
domain: DOMAIN_AREAS.management,
primaryTable: "young_person_legal_status",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: false,
},

[RECORD_TYPES.profile_formulation]: {
label: "Formulation profile",
domain: DOMAIN_AREAS.risk,
primaryTable: "young_person_formulations",
defaultWorkflow: WORKFLOW_STATUS.active,
chronologyEligible: false,
approvalRequired: true,
},
};

export function getRecordMeta(recordType) {
return RECORD_TYPE_META[recordType] || null;
}

export function isChronologyEligible(recordType) {
return !!RECORD_TYPE_META[recordType]?.chronologyEligible;
}

export function requiresApproval(recordType) {
return !!RECORD_TYPE_META[recordType]?.approvalRequired;
}

export function getPrimaryTable(recordType) {
return RECORD_TYPE_META[recordType]?.primaryTable || null;
}

export function normaliseWorkflowStatus(value) {
const text = String(value || "").trim().toLowerCase();

if (Object.values(WORKFLOW_STATUS).includes(text)) {
return text;
}

if (text === "pending") return WORKFLOW_STATUS.submitted;
if (text === "reviewed") return WORKFLOW_STATUS.approved;
if (text === "complete") return WORKFLOW_STATUS.completed;
if (text === "canceled") return WORKFLOW_STATUS.cancelled;

return WORKFLOW_STATUS.draft;
}

export function normaliseSeverity(value) {
const text = String(value || "").trim().toLowerCase();
return Object.values(SEVERITY).includes(text) ? text : SEVERITY.low;
}

export function normaliseSignificance(value) {
const text = String(value || "").trim().toLowerCase();
return Object.values(SIGNIFICANCE).includes(text) ? text : SIGNIFICANCE.low;
}
