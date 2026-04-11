import {
AI_SUGGESTION_TYPES,
RECORD_TYPES,
SEVERITY,
SIGNIFICANCE,
} from "./contracts.js";

function cleanText(value) {
return String(value || "").trim();
}

function lowerText(value) {
return cleanText(value).toLowerCase();
}

function joinTexts(values = []) {
return values.filter(Boolean).join(" ").trim();
}

function containsAny(text, needles = []) {
const haystack = lowerText(text);
return needles.some((needle) => haystack.includes(lowerText(needle)));
}

function makeSuggestion({
type,
title,
reason,
confidence = "medium",
source_record_type,
source_record_id,
target_record_type,
prefill = {},
auto_link = false,
priority = "normal",
}) {
return {
id: `${type}:${source_record_type || "record"}:${source_record_id || "new"}:${title}`,
type,
title,
reason,
confidence,
source_record_type: source_record_type || "",
source_record_id: source_record_id || null,
target_record_type: target_record_type || "",
prefill,
auto_link,
priority,
};
}

function makeTaskSuggestion(source, title, reason, prefill = {}) {
return makeSuggestion({
type: AI_SUGGESTION_TYPES.create_task,
title,
reason,
confidence: "high",
source_record_type: source.record_type,
source_record_id: source.id,
target_record_type: RECORD_TYPES.task,
prefill,
priority: "high",
});
}

function buildRiskPrefillFromIncident(record) {
return {
category: record.incident_type || "behaviour",
title: `${record.incident_type || "Incident"} risk review`,
concern_summary: record.description || record.summary || "",
known_triggers: record.antecedent || "",
early_warning_signs: "",
contextual_factors: record.presentation || "",
current_controls: "",
deescalation_strategies: "",
response_actions: record.actions_taken || record.staff_response || "",
child_views: record.child_voice || "",
severity: record.severity || SEVERITY.medium,
likelihood: "medium",
review_date: "",
status: "draft",
};
}

function buildRiskPrefillFromMissing(record) {
return {
category: "missing_episode",
title: "Missing episode risk review",
concern_summary: record.summary || "Recent missing episode recorded.",
known_triggers: record.trigger_factors || "",
early_warning_signs: "",
contextual_factors: record.push_pull_factors || "",
current_controls: "",
deescalation_strategies: "",
response_actions: record.actions_taken || "",
child_views: record.child_voice || "",
severity: record.severity || SEVERITY.high,
likelihood: "medium",
review_date: "",
status: "draft",
};
}

function buildHealthPrefillFromRecord(record) {
return {
record_type: "follow_up",
title: record.title || "Health follow-up",
event_datetime: "",
summary: record.health_update || record.summary || "",
professional_name: "",
outcome: "",
follow_up_required: true,
next_action_date: "",
child_voice: record.child_voice || record.young_person_voice || "",
significance: record.significance || SIGNIFICANCE.medium,
linked_appointment_id: record.linked_appointment_id || null,
};
}

function buildEducationPrefillFromRecord(record) {
return {
record_date: "",
attendance_status: "",
provision_name: "",
behaviour_summary: record.behaviour_update || record.summary || "",
learning_engagement: record.education_update || record.summary || "",
issue_raised: "",
action_taken: "",
professional_involved: "",
achievement_note: "",
child_voice: record.child_voice || record.young_person_voice || "",
follow_up_required: true,
significance: record.significance || SIGNIFICANCE.medium,
};
}

function buildFamilyPrefillFromRecord(record) {
return {
contact_datetime: "",
contact_type: "update",
contact_person: "",
supervision_level: "",
location: "",
pre_contact_presentation: "",
post_contact_presentation: record.family_update || record.summary || "",
child_voice: record.child_voice || record.young_person_voice || "",
concerns: "",
follow_up_required: true,
significance: record.significance || SIGNIFICANCE.medium,
};
}

function buildSafeguardingPrefill(record) {
return {
safeguarding_category: "concern",
concern_datetime: record.occurred_at || record.start_datetime || "",
disclosure_details: "",
concern_details: record.description || record.summary || "",
immediate_action_taken: record.actions_taken || record.staff_response || "",
referral_made: false,
referral_details: "",
outcome: record.outcome || "",
};
}

function suggestFromDailyNote(record) {
const suggestions = [];
const combined = joinTexts([
record.health_update,
record.education_update,
record.family_update,
record.behaviour_update,
record.actions_required,
record.presentation,
record.summary,
]);

if (cleanText(record.health_update)) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.create_health_record,
title: "Create linked health record",
reason: "This daily note includes a health update that may need its own structured health record.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.health_record,
prefill: buildHealthPrefillFromRecord(record),
priority: "normal",
})
);
}

if (cleanText(record.education_update)) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.create_education_record,
title: "Create linked education record",
reason: "This daily note includes an education update that may need a structured education record.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.education_record,
prefill: buildEducationPrefillFromRecord(record),
priority: "normal",
})
);
}

if (cleanText(record.family_update)) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.create_family_contact_record,
title: "Create linked family contact record",
reason: "This daily note includes family or contact information that may need a dedicated family contact record.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.family_contact_record,
prefill: buildFamilyPrefillFromRecord(record),
priority: "normal",
})
);
}

if (
containsAny(combined, [
"self-harm",
"suicidal",
"abscond",
"missing",
"police",
"assault",
"injury",
"weapon",
"safeguarding",
"sexual",
"exploitation",
])
) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.manager_review,
title: "Escalate for manager review",
reason: "This daily note contains language that may indicate elevated risk or safeguarding concern.",
confidence: "medium",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.manager_action,
prefill: {
action_type: "manager_review",
note: `Review daily note for potential risk/safeguarding follow-up: ${record.title || "Daily note"}`,
},
priority: "high",
})
);
}

if (
containsAny(combined, [
"gp",
"camhs",
"hospital",
"medication",
"doctor",
"dentist",
"optician",
])
) {
suggestions.push(
makeTaskSuggestion(
record,
"Review health-related follow-up",
"The daily note suggests a health-related issue or appointment may need follow-up.",
{
title: "Health follow-up",
task: "Review health-related details captured in daily note and confirm whether a health record or appointment outcome is needed.",
task_type: "follow_up",
due_date: "",
source_table: "daily_notes",
source_id: record.id,
}
)
);
}

return suggestions;
}

function suggestFromIncident(record) {
const suggestions = [];

if (
["high", "critical"].includes(lowerText(record.severity)) ||
record.safeguarding_flag ||
record.police_involved ||
record.requires_notification ||
record.requires_reg40
) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.create_risk_assessment,
title: "Create draft risk assessment",
reason: "This incident suggests a level of risk that may require a structured risk assessment or risk review.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.risk_assessment,
prefill: buildRiskPrefillFromIncident(record),
priority: "high",
})
);
}

if (record.safeguarding_flag) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.create_safeguarding_record,
title: "Create safeguarding record",
reason: "This incident is flagged as safeguarding-related and may require a linked safeguarding record.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.safeguarding_record,
prefill: buildSafeguardingPrefill(record),
priority: "high",
})
);
}

if (record.follow_up_required) {
suggestions.push(
makeTaskSuggestion(
record,
"Create incident follow-up task",
"This incident has follow-up required and may need an explicit task.",
{
title: `Follow-up: ${record.title || "Incident"}`,
task: record.actions_taken || record.restorative_follow_up || "Complete incident follow-up.",
task_type: "incident_follow_up",
due_date: "",
source_table: "incidents",
source_id: record.id,
}
)
);
}

return suggestions;
}

function suggestFromHealthRecord(record) {
const suggestions = [];

if (record.follow_up_required) {
suggestions.push(
makeTaskSuggestion(
record,
"Create health follow-up task",
"This health record shows follow-up is required.",
{
title: `Health follow-up: ${record.title || "Health record"}`,
task: record.outcome || record.summary || "Complete health follow-up.",
task_type: "health_follow_up",
due_date: record.next_action_date || "",
source_table: "health_records",
source_id: record.id,
}
)
);
}

if (record.linked_appointment_id) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.link_to_appointment,
title: "Link to appointment",
reason: "This health record already references an appointment and should be linked across the system.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.appointment,
prefill: {
linked_appointment_id: record.linked_appointment_id,
},
auto_link: true,
priority: "normal",
})
);
}

return suggestions;
}

function suggestFromEducationRecord(record) {
const suggestions = [];

if (
containsAny(joinTexts([record.attendance_status, record.issue_raised, record.summary]), [
"absent",
"refused",
"excluded",
"suspension",
])
) {
suggestions.push(
makeTaskSuggestion(
record,
"Review education concern",
"This education record suggests an attendance or engagement concern that may need follow-up.",
{
title: `Education follow-up: ${record.title || "Education record"}`,
task: record.issue_raised || record.summary || "Review education concern and agree next steps.",
task_type: "education_follow_up",
due_date: "",
source_table: "education_records",
source_id: record.id,
}
)
);
}

return suggestions;
}

function suggestFromFamilyContact(record) {
const suggestions = [];

if (record.follow_up_required || cleanText(record.concerns)) {
suggestions.push(
makeTaskSuggestion(
record,
"Review family contact follow-up",
"This family contact record includes concerns or follow-up needs.",
{
title: `Family follow-up: ${record.title || "Family contact"}`,
task: record.concerns || record.summary || "Review family contact follow-up.",
task_type: "family_follow_up",
due_date: "",
source_table: "family_contact_records",
source_id: record.id,
}
)
);
}

if (
containsAny(joinTexts([record.concerns, record.post_contact_presentation, record.summary]), [
"distressed",
"dysregulated",
"upset",
"angry",
"unsafe",
"fear",
"worried",
])
) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.update_support_plan,
title: "Review support plan after family contact",
reason: "This family contact record may indicate that support guidance should be reviewed.",
confidence: "medium",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.support_plan,
prefill: {
summary: "Review current support guidance in light of recent family contact impact.",
},
priority: "normal",
})
);
}

return suggestions;
}

function suggestFromMissingEpisode(record) {
const suggestions = [
makeSuggestion({
type: AI_SUGGESTION_TYPES.create_risk_assessment,
title: "Create missing episode risk review",
reason: "A missing episode should usually prompt a risk review or updated assessment.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.risk_assessment,
prefill: buildRiskPrefillFromMissing(record),
priority: "high",
}),
];

if (!record.return_interview_completed) {
suggestions.push(
makeTaskSuggestion(
record,
"Arrange return interview follow-up",
"This missing episode does not show a completed return interview.",
{
title: "Return interview follow-up",
task: "Confirm and record return interview arrangements and outcome.",
task_type: "missing_episode_follow_up",
due_date: record.return_interview_date || "",
source_table: "missing_episodes",
source_id: record.id,
}
)
);
}

return suggestions;
}

function suggestFromAppointment(record) {
const suggestions = [];

if (
lowerText(record.status) === "completed" &&
!cleanText(record.outcome_notes)
) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.create_health_record,
title: "Record appointment outcome",
reason: "This appointment is completed but no structured outcome is recorded.",
confidence: "high",
source_record_type: record.record_type,
source_record_id: record.id,
target_record_type: RECORD_TYPES.health_record,
prefill: {
record_type: "appointment_outcome",
title: record.title || "Appointment outcome",
event_datetime: record.start_datetime || "",
summary: record.summary || record.purpose || "",
professional_name: record.professional_name || "",
outcome: "",
follow_up_required: false,
linked_appointment_id: record.id,
},
priority: "normal",
})
);
}

return suggestions;
}

export function evaluateRecordSuggestions(record = {}) {
const type = record.record_type;
if (!type) return [];

if (type === RECORD_TYPES.daily_note) return suggestFromDailyNote(record);
if (type === RECORD_TYPES.incident) return suggestFromIncident(record);
if (type === RECORD_TYPES.health_record) return suggestFromHealthRecord(record);
if (type === RECORD_TYPES.education_record) return suggestFromEducationRecord(record);
if (type === RECORD_TYPES.family_contact_record) return suggestFromFamilyContact(record);
if (type === RECORD_TYPES.missing_episode) return suggestFromMissingEpisode(record);
if (type === RECORD_TYPES.appointment) return suggestFromAppointment(record);

return [];
}

export function mergeSuggestionLists(...lists) {
const seen = new Set();
const merged = [];

lists.flat().forEach((item) => {
if (!item?.id) return;
if (seen.has(item.id)) return;
seen.add(item.id);
merged.push(item);
});

return merged.sort((a, b) => {
const rank = { high: 3, medium: 2, low: 1, normal: 1 };
return (rank[b.priority] || 0) - (rank[a.priority] || 0);
});
}

export function evaluateCrossRecordPatterns(records = {}) {
const suggestions = [];
const incidents = records.incidents || [];
const missingEpisodes = records.missing_episodes || [];

if (incidents.length >= 3) {
const highCount = incidents.filter((x) =>
["high", "critical"].includes(lowerText(x.severity))
).length;

if (highCount >= 2) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.update_risk_assessment,
title: "Review risk assessment for repeated incidents",
reason: "Recent incident patterns suggest current risk planning may need review.",
confidence: "medium",
source_record_type: RECORD_TYPES.incident,
source_record_id: incidents[0]?.id || null,
target_record_type: RECORD_TYPES.risk_assessment,
prefill: {
title: "Risk review prompted by repeated incidents",
concern_summary: "Multiple recent high-severity incidents detected.",
},
priority: "high",
})
);
}
}

if (missingEpisodes.length >= 1) {
suggestions.push(
makeSuggestion({
type: AI_SUGGESTION_TYPES.manager_review,
title: "Manager review for missing episode pattern",
reason: "A missing episode is present and should be considered in wider oversight and planning.",
confidence: "high",
source_record_type: RECORD_TYPES.missing_episode,
source_record_id: missingEpisodes[0]?.id || null,
target_record_type: RECORD_TYPES.manager_action,
prefill: {
action_type: "manager_review",
note: "Review missing episode pattern and linked risk planning.",
},
priority: "high",
})
);
}

return suggestions;
}
