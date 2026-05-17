export type DocumentScope = 'child' | 'home' | 'staff'

export type DocumentTemplateSummary = {
  templateId: string
  title: string
  scope: DocumentScope
  category: string
  reviewFrequency: string
  ownerRole: string
  description: string
  sections: string[]
  prompts: string[]
}

export function documentSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function template(
  templateId: string,
  title: string,
  scope: DocumentScope,
  category: string,
  sections: string[],
  reviewFrequency: string,
  description: string,
  prompts: string[] = ['What evidence supports this?', 'What should be linked?', 'Who owns follow-up?']
): DocumentTemplateSummary {
  return {
    templateId,
    title,
    scope,
    category,
    reviewFrequency,
    ownerRole: scope === 'staff' ? 'registered manager / supervisor' : scope === 'home' ? 'registered manager / responsible individual' : 'key worker / registered manager',
    description,
    sections,
    prompts
  }
}

export const documentTemplates: DocumentTemplateSummary[] = [
  template('daily_note', 'Daily Note', 'child', 'daily_recording', ['Presentation and regulation', 'Routine, health and care', 'Relationships and positives', 'Education, activity and home life', 'Child voice and staff reflection', 'Actions for next shift'], 'daily, sampled weekly', 'Daily care recording focused on presentation, routine, positives, child voice and next-shift support.'),
  template('incident_report', 'Incident Report', 'child', 'incident_and_safety', ['Early signs and antecedents', 'Incident timeline', 'De-escalation and support offered', 'Impact, injury or damage', 'Notifications and safeguarding relevance', 'Repair, learning and manager review'], 'same shift / 24 hour manager review', 'Incident recording for antecedents, de-escalation, impact, notifications, repair and oversight.'),
  template('safeguarding_concern', 'Safeguarding Concern', 'child', 'safeguarding', ['Concern source', 'Child voice and immediate safety', 'Known context and vulnerability', 'People informed', 'Statutory and Reg 40 consideration', 'Management oversight and follow-up'], 'immediate same-day review', 'Safeguarding concern record for disclosure, safety, professional action and oversight.'),
  template('missing_from_care_episode', 'Missing From Care Episode', 'child', 'missing_from_care', ['Last seen and presentation', 'Known risks and protective factors', 'Search and welfare actions', 'Notifications and professional coordination', 'Return circumstances and wellbeing', 'Debrief, RHI and safety planning'], 'during episode and on return', 'Missing episode record for risk, action, notification, return support and safety planning.'),
  template('return_home_interview', 'Return Home Interview', 'child', 'missing_from_care', ['Interview context and consent', "Child's account", 'Push and pull factors', 'Safety, health and exploitation checks', 'What would help next time', 'Plan update and professional action'], 'after missing episode', 'Child-centred return interview record turning missing-episode learning into safer support.'),
  template('key_work_session', 'Key Work Session', 'child', 'therapeutic_work', ['Planned purpose or emerging theme', "Child's views and emotional content", 'Therapeutic response', 'Meaning and formulation', 'Agreed actions and follow-up'], 'after each session', 'Therapeutic direct-work record focused on voice, meaning, response and follow-up.'),
  template('behaviour_support_reflection', 'Behaviour Support Reflection', 'child', 'therapeutic_work', ['Trigger map', 'Unmet need hypothesis', 'Staff response', 'What helped recovery', 'Restorative work and plan learning'], 'after distress behaviour or plan review', 'Behaviour-support reflection that treats behaviour as communication and updates plans.'),
  template('physical_intervention_restraint_review', 'Physical Intervention / Restraint Review', 'child', 'incident_and_safety', ['Immediate risk threshold', 'Intervention detail', 'Child and staff wellbeing checks', 'Child debrief and advocacy', 'Manager review and restraint reduction'], 'same day', 'Restraint review centred on prevention, dignity, debrief and restraint reduction.'),
  template('sanction_consequence_review', 'Sanction / Consequence Review', 'child', 'positive_relationships', ['Reason and relational context', 'Child understanding and fairness', 'Restorative alternative considered', 'Impact on relationships and wellbeing', 'Manager oversight and review'], 'when used', 'Restorative review of consequences, fairness, learning and relationship repair.'),
  template('bullying_concern', 'Bullying Concern', 'child', 'safeguarding', ['Concern pattern', 'Child voice and impact', 'Immediate safety and supervision', 'Support for all children', 'Professional escalation and review'], 'weekly while open', 'Peer-safety record for bullying concerns, impact, support and review.'),
  template('child_voice_record', 'Child Voice Record', 'child', 'child_voice', ['How the child communicated', 'What matters to the child', 'Adult response', 'Decision impact', 'Feedback loop'], 'whenever views affect decisions', 'Focused voice record showing how a child view changed practice or decisions.'),
  template('family_contact_record', 'Family Contact Record', 'child', 'family_and_network', ['Contact arrangement', 'Before-contact presentation', 'During-contact observations', 'After-contact recovery', 'Plan implications'], 'after each family-time episode', 'Family-time record balancing relationships, emotional impact, safety and plan learning.'),
  template('professional_contact_record', 'Professional Contact Record', 'child', 'multi_agency', ['Professional and purpose', 'Information shared', 'Child impact', 'Agreed actions', 'Escalation or oversight'], 'at significant contact', 'Multi-agency contact record focused on child impact, action and oversight.'),
  template('health_appointment_record', 'Health Appointment Record', 'child', 'health', ['Appointment details', 'Child experience', 'Clinical outcome', 'Medication or treatment implications', 'Care plan and professional updates'], 'after each appointment', 'Health appointment record connecting experience, clinical outcome and care-plan action.'),
  template('medication_concern_health_follow_up', 'Medication Concern / Health Follow-up', 'child', 'health', ['Concern or variation', 'Immediate welfare check', 'Child view and support', 'Professional advice and notifications', 'MAR/profile update and review'], 'immediate and at audit', 'Non-blaming medication and health follow-up record for welfare, advice and audit.'),
  template('education_update', 'Education Update', 'child', 'education', ['Attendance and engagement', 'Learning, achievement and strengths', 'Barriers and support', 'Child view', 'PEP, school and home actions'], 'weekly or after significant event', 'Education update linking attendance, learning, barriers, child voice and PEP action.'),
  template('care_plan_review', 'Care Plan Review', 'child', 'care_planning', ['What has changed', 'Child voice and participation', 'Outcomes and evidence', 'Risk and support plan alignment', 'Decisions, actions and sign-off'], 'monthly or before statutory review', 'Care-plan review turning evidence, child voice and professional decisions into actions.'),
  template('risk_assessment_review', 'Risk Assessment Review', 'child', 'risk_assessment', ['Current risk picture', 'Triggers and early signs', 'Protective relationships and routines', 'Control measures and least restrictive support', 'Review decision and chronology'], 'monthly or after significant event', 'Live risk review linking current evidence, protective support and least restrictive action.'),
  template('placement_plan_update', 'Placement Plan Update', 'child', 'care_planning', ['Reason for update', "Child's day-to-day support", 'Health, education and contact alignment', 'Risk, safeguarding and missing alignment', 'Agreement, sharing and review'], 'when care arrangements change', 'Placement-plan update focused on day-to-day support, alignment and sharing.'),
  template('individual_behaviour_support_plan', 'Individual Behaviour Support Plan', 'child', 'therapeutic_work', ['Strengths and communication', 'Triggers and sensory needs', 'Proactive support', 'When distress increases', 'Repair, review and learning'], 'monthly and after significant distress', 'Proactive behaviour-support plan built around strengths, regulation and repair.'),
  template('missing_risk_assessment', 'Missing Risk Assessment', 'child', 'missing_from_care', ['Missing history and patterns', 'Push, pull and exploitation indicators', 'Wellbeing and health vulnerabilities', 'Prevention and response plan', 'Return support and RHI plan'], 'monthly and after each missing episode', 'Missing risk assessment for prevention, response, return support and review.'),
  template('internet_social_media_safety_plan', 'Internet/Social Media Safety Plan', 'child', 'safeguarding', ['Digital life and strengths', 'Known online risks', 'Child voice and digital boundaries', 'Support and safety settings', 'Review and professional action'], 'monthly or after online concern', 'Digital safety plan balancing online belonging, privacy, education and safeguarding.'),
  template('reg_44_evidence_note', 'Reg 44 Evidence Note', 'home', 'inspection_readiness', ['Visit evidence sampled', "Children's views", 'Staff views and practice', 'Safeguarding and environment', 'Leadership oversight and actions'], 'monthly', 'Reg 44 evidence note for sampling, views, safeguarding, environment and leadership action.'),
  template('reg_45_review_evidence_note', 'Reg 45 Review Evidence Note', 'home', 'inspection_readiness', ['Quality of care evidence', 'Patterns and trends', 'Children and family feedback', 'Workforce and leadership', 'Improvement actions'], 'six-monthly', 'Reg 45 review note focused on evidence, trends, outcomes, workforce and improvement action.'),
  template('annex_a_evidence_summary', 'Annex A Evidence Summary', 'home', 'inspection_readiness', ['Children living at the home', 'Safeguarding and notifications', 'Outcomes and progress', 'Workforce and leadership', 'Documents and evidence gaps'], 'monthly and before inspection', 'Annex A operating summary showing evidence, gaps and ownership.'),
  template('manager_oversight_note', 'Manager Oversight Note', 'home', 'leadership_and_management', ['Record sampled', 'Quality and safety judgement', 'Therapeutic recording feedback', 'Actions and accountability', 'Learning for team or system'], 'weekly sampling', 'Manager QA note for sampled records, therapeutic quality, actions and system learning.'),
  template('staff_supervision_record', 'Staff Supervision Record', 'staff', 'staff_leadership', ['Staff wellbeing and support', 'Practice reflection', "Children's experiences", 'Development and competency', 'Actions, accountability and sign-off'], 'monthly', 'Reflective supervision record balancing wellbeing, child impact, development and accountability.'),
  template('staff_reflective_practice_note', 'Staff Reflective Practice Note', 'staff', 'staff_leadership', ['Situation reflected on', 'Feelings and assumptions', 'Trauma-informed lens', 'Learning and repair', 'Supervisor support'], 'after significant learning', 'Psychologically safe reflective practice note converting learning into better care.'),
  template('safer_recruitment_checklist', 'Safer Recruitment Checklist', 'staff', 'staff_leadership', ['Role and safer recruitment plan', 'Identity, right to work and references', 'DBS and barred list checks', 'Values and safeguarding interview evidence', 'Manager decision and audit trail'], 'per recruitment episode', 'Safer recruitment checklist keeping safeguarding evidence, values and sign-off together.'),
  template('training_competency_review', 'Training/Competency Review', 'staff', 'staff_leadership', ['Role requirements', 'Training completed', 'Practice observation', 'Competency decision', 'Development plan'], 'quarterly or after role changes', 'Training and competency review linking workforce evidence to safe therapeutic care.'),
  template('home_statement_of_purpose', 'Statement of Purpose', 'home', 'home_policy', ['Aims and care model', 'Services and day-to-day experience', 'Safeguarding and leadership', 'Review and evidence'], 'annual or when service changes', 'Live statement of purpose template connected to model, safeguarding and review evidence.')
]

export function templatesFor(scope: DocumentScope, categoryFilter?: string) {
  return documentTemplates.filter((template) => template.scope === scope && (!categoryFilter || template.category === categoryFilter))
}

export function getDocumentTemplate(templateId?: string) {
  return documentTemplates.find((template) => template.templateId === templateId) || documentTemplates[0]
}
