import {
  getDisplayName,
  normaliseImagePath,
} from "./utils.js";

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

export function mapYoungPerson(raw = {}, related = {}) {
  return {
    id: raw.id,
    home_id: raw.home_id ?? null,
    first_name: raw.first_name || "",
    last_name: raw.last_name || "",
    preferred_name: raw.preferred_name || "",
    date_of_birth: raw.date_of_birth || null,
    gender: raw.gender || "",
    ethnicity: raw.ethnicity || "",
    placement_status: raw.placement_status || "",
    summary_risk_level: raw.summary_risk_level || "",
    photo_url: normaliseImagePath(raw.photo_url || ""),
    archived: !!raw.archived,
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
    religion_or_faith: raw.religion_or_faith || "",
    cultural_identity: raw.cultural_identity || "",
    first_language: raw.first_language || "",
    dietary_needs: raw.dietary_needs || "",
    interests: raw.interests || "",
    strengths_summary: raw.strengths_summary || "",
    what_matters_to_me: raw.what_matters_to_me || "",
    important_dates: raw.important_dates || "",
  };
}

export function mapCommunicationProfile(raw = {}) {
  return {
    neurodiversity_summary: raw.neurodiversity_summary || "",
    communication_style: raw.communication_style || "",
    sensory_profile: raw.sensory_profile || "",
    processing_needs: raw.processing_needs || "",
    signs_of_distress: raw.signs_of_distress || "",
    what_helps: raw.what_helps || "",
    what_to_avoid: raw.what_to_avoid || "",
    routines_and_predictability: raw.routines_and_predictability || "",
    visual_support_needs: raw.visual_support_needs || "",
  };
}

export function mapEducationProfile(raw = {}) {
  return {
    school_name: raw.school_name || "",
    year_group: raw.year_group || "",
    education_status: raw.education_status || "",
    sen_status: raw.sen_status || "",
    ehcp_details: raw.ehcp_details || "",
    designated_teacher: raw.designated_teacher || "",
    attendance_baseline: raw.attendance_baseline ?? null,
    pep_status: raw.pep_status || "",
    support_summary: raw.support_summary || "",
  };
}

export function mapHealthProfile(raw = {}) {
  return {
    gp_name: raw.gp_name || "",
    gp_contact: raw.gp_contact || "",
    dentist_name: raw.dentist_name || "",
    dentist_contact: raw.dentist_contact || "",
    optician_name: raw.optician_name || "",
    optician_contact: raw.optician_contact || "",
    allergies: raw.allergies || "",
    diagnoses: raw.diagnoses || "",
    mental_health_summary: raw.mental_health_summary || "",
    medication_summary: raw.medication_summary || "",
    consent_notes: raw.consent_notes || "",
  };
}

export function mapLegalStatus(raw = {}) {
  return {
    legal_status: raw.legal_status || "",
    order_type: raw.order_type || "",
    order_details: raw.order_details || "",
    delegated_authority_details: raw.delegated_authority_details || "",
    restrictions_text: raw.restrictions_text || "",
    consent_arrangements: raw.consent_arrangements || "",
    effective_from: raw.effective_from || null,
    effective_to: raw.effective_to || null,
    is_current: !!raw.is_current,
  };
}

export function mapFormulation(raw = {}) {
  return {
    presenting_needs: raw.presenting_needs || "",
    developmental_context: raw.developmental_context || "",
    trauma_context: raw.trauma_context || "",
    neurodevelopmental_context: raw.neurodevelopmental_context || "",
    relational_context: raw.relational_context || "",
    meaning_of_behaviour: raw.meaning_of_behaviour || "",
    known_triggers: raw.known_triggers || "",
    early_signs_of_distress: raw.early_signs_of_distress || "",
    protective_factors: raw.protective_factors || "",
    what_helps: raw.what_helps || "",
    what_adults_should_avoid: raw.what_adults_should_avoid || "",
    regulation_strategies: raw.regulation_strategies || "",
    child_voice_summary: raw.child_voice_summary || "",
    review_date: raw.review_date || null,
    is_current: !!raw.is_current,
  };
}

export function mapDailyNote(raw = {}) {
  return {
    id: raw.id,
    record_type: "daily_note",
    title: `${raw.shift_type || "Daily"} note`,
    summary: pickFirst(raw.presentation, raw.activities, raw.positives, raw.actions_required, "Daily note"),
    recorded_at: raw.created_at || raw.updated_at || raw.note_date || null,
    record_date: raw.note_date || null,
    workflow_status: raw.workflow_status || "",
    significance: raw.significance || "",
    recorded_by_name: raw.recorded_by_name || raw.author_name || "",
    mood: raw.mood || "",
    presentation: raw.presentation || "",
    activities: raw.activities || "",
    education_update: raw.education_update || "",
    health_update: raw.health_update || "",
    family_update: raw.family_update || "",
    behaviour_update: raw.behaviour_update || "",
    young_person_voice: raw.young_person_voice || "",
    positives: raw.positives || "",
    actions_required: raw.actions_required || "",
  };
}

export function mapIncident(raw = {}) {
  return {
    id: raw.id,
    record_type: "incident",
    title: raw.incident_type || raw.title || "Important event",
    summary: pickFirst(raw.description, raw.outcome, raw.trauma_informed_formulation, "Important event"),
    occurred_at: raw.incident_datetime || raw.created_at || null,
    workflow_status: raw.workflow_status || raw.manager_review_status || "",
    severity: raw.severity || "",
    location: raw.location || "",
    incident_type: raw.incident_type || "",
    description: raw.description || "",
    antecedent: raw.antecedent || "",
    staff_response: raw.staff_response || "",
    child_response: raw.child_response || "",
    outcome: raw.outcome || "",
    child_voice: raw.child_voice || "",
    trauma_informed_formulation: raw.trauma_informed_formulation || "",
    restorative_follow_up: raw.restorative_follow_up || "",
    actions_taken: raw.actions_taken || "",
    safeguarding_flag: !!raw.safeguarding_flag,
  };
}

export function mapSupportPlan(raw = {}) {
  return {
    id: raw.id,
    record_type: "support_plan",
    title: raw.title || raw.plan_type || "Support plan",
    summary: pickFirst(raw.summary, raw.presenting_need, raw.proactive_strategies, "Support plan"),
    start_date: raw.start_date || null,
    review_date: raw.review_date || null,
    status: raw.status || "",
    approval_status: raw.approval_status || "",
    workflow_status: raw.approval_status || raw.status || "",
    presenting_need: raw.presenting_need || "",
    child_voice: raw.child_voice || "",
    proactive_strategies: raw.proactive_strategies || "",
    pace_guidance: raw.pace_guidance || "",
    triggers: raw.triggers || "",
    protective_factors: raw.protective_factors || "",
    review_comment: raw.review_comment || "",
  };
}

export function mapRiskAssessment(raw = {}) {
  return {
    id: raw.id,
    record_type: "risk",
    title: raw.title || raw.category || "Support and safety guidance",
    summary: pickFirst(raw.concern_summary, raw.current_controls, raw.response_actions, "Risk assessment"),
    review_date: raw.review_date || null,
    status: raw.status || "",
    approval_status: raw.approval_status || "",
    severity: raw.severity || "",
    likelihood: raw.likelihood || "",
    concern_summary: raw.concern_summary || "",
    known_triggers: raw.known_triggers || "",
    early_warning_signs: raw.early_warning_signs || "",
    contextual_factors: raw.contextual_factors || "",
    current_controls: raw.current_controls || "",
    deescalation_strategies: raw.deescalation_strategies || "",
    response_actions: raw.response_actions || "",
    child_views: raw.child_views || "",
  };
}

export function mapHealthRecord(raw = {}) {
  return {
    id: raw.id,
    record_type: "health_record",
    title: raw.title || raw.record_type || "Health record",
    summary: pickFirst(raw.summary, raw.outcome, "Health update"),
    event_datetime: raw.event_datetime || raw.created_at || null,
    workflow_status: raw.workflow_status || "",
    significance: raw.significance || "",
    professional_name: raw.professional_name || "",
    outcome: raw.outcome || "",
    follow_up_required: !!raw.follow_up_required,
    next_action_date: raw.next_action_date || null,
    child_voice: raw.child_voice || "",
  };
}

export function mapEducationRecord(raw = {}) {
  return {
    id: raw.id,
    record_type: "education_record",
    title: raw.provision_name || "Education record",
    summary: pickFirst(raw.learning_engagement, raw.behaviour_summary, raw.issue_raised, "Education update"),
    record_date: raw.record_date || raw.created_at || null,
    workflow_status: raw.workflow_status || "",
    significance: raw.significance || "",
    attendance_status: raw.attendance_status || "",
    provision_name: raw.provision_name || "",
    behaviour_summary: raw.behaviour_summary || "",
    learning_engagement: raw.learning_engagement || "",
    issue_raised: raw.issue_raised || "",
    action_taken: raw.action_taken || "",
    professional_involved: raw.professional_involved || "",
    achievement_note: raw.achievement_note || "",
    child_voice: raw.child_voice || "",
    follow_up_required: !!raw.follow_up_required,
  };
}

export function mapFamilyContactRecord(raw = {}) {
  return {
    id: raw.id,
    record_type: "family_contact",
    title: raw.contact_person || raw.contact_type || "Family contact",
    summary: pickFirst(raw.post_contact_presentation, raw.concerns, raw.child_voice, "Family contact record"),
    contact_datetime: raw.contact_datetime || raw.created_at || null,
    workflow_status: raw.workflow_status || "",
    significance: raw.significance || "",
    contact_type: raw.contact_type || "",
    contact_person: raw.contact_person || "",
    supervision_level: raw.supervision_level || "",
    location: raw.location || "",
    pre_contact_presentation: raw.pre_contact_presentation || "",
    post_contact_presentation: raw.post_contact_presentation || "",
    child_voice: raw.child_voice || "",
    concerns: raw.concerns || "",
    follow_up_required: !!raw.follow_up_required,
  };
}

export function mapKeyworkSession(raw = {}) {
  return {
    id: raw.id,
    record_type: "keywork",
    title: raw.topic || "Keywork session",
    summary: pickFirst(raw.summary, raw.reflective_analysis, raw.actions_agreed, "Keywork session"),
    session_date: raw.session_date || raw.created_at || null,
    workflow_status: raw.workflow_status || raw.status || "",
    topic: raw.topic || "",
    purpose: raw.purpose || "",
    child_voice: raw.child_voice || "",
    reflective_analysis: raw.reflective_analysis || "",
    actions_agreed: raw.actions_agreed || "",
    next_session_date: raw.next_session_date || null,
  };
}

export function mapChronologyEvent(raw = {}) {
  return {
    id: raw.id,
    record_type: raw.primary_record_type || raw.source_table || "chronology_event",
    title: raw.title || raw.category || "Chronology event",
    summary: raw.summary || "",
    event_datetime: raw.event_datetime || raw.created_at || null,
    category: raw.category || "",
    subcategory: raw.subcategory || "",
    significance: raw.significance || "",
    workflow_status: raw.workflow_status || raw.event_status || "",
    severity: raw.severity || "",
    safeguarding_flag: !!raw.safeguarding_flag,
    child_voice_present: !!raw.child_voice_present,
    source_table: raw.source_table || "",
    source_id: raw.source_id ?? null,
    recorded_by_name: raw.recorded_by_name || "",
  };
}

export function mapComplianceItem(raw = {}) {
  return {
    id: raw.id,
    record_type: raw.record_type || raw.source_table || "compliance_item",
    title: raw.title || "Compliance item",
    summary: `Due ${raw.due_date || "date not set"}`,
    due_date: raw.due_date || null,
    completed_date: raw.completed_date || null,
    status: raw.status || "",
    severity: raw.severity || "",
    escalation_level: raw.escalation_level ?? null,
    source_table: raw.source_table || "",
    source_id: raw.source_id ?? null,
  };
}

export function mapAiReport(raw = {}) {
  return {
    id: raw.id,
    record_type: "report",
    title: raw.title || raw.report_type || "AI report",
    summary: raw.report_text || "",
    report_type: raw.report_type || "",
    review_month: raw.review_month || null,
    status: raw.status || "",
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
  };
}

export function mapAppointment(raw = {}) {
  return {
    id: raw.id,
    record_type: "appointment",
    title: raw.title || raw.appointment_type || "Appointment",
    summary: pickFirst(raw.summary, raw.description, raw.purpose, raw.notes, "Appointment"),
    appointment_type: raw.appointment_type || "",
    start_datetime: raw.start_datetime || raw.appointment_date || null,
    end_datetime: raw.end_datetime || null,
    location: raw.location || "",
    professional_name: raw.professional_name || "",
    professional_role: raw.professional_role || "",
    status: raw.status || "",
    child_voice: raw.child_voice || "",
    preparation_notes: raw.preparation_notes || "",
    outcome_notes: raw.outcome_notes || raw.outcome || "",
    follow_up_actions: raw.follow_up_actions || "",
  };
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
      raw.formulation || raw.young_person_formulation || raw.young_person_formulations || {}
    ),
  };
}

export function mapList(items = [], mapper = (x) => x) {
  return arrayify(items).map(mapper);
}
