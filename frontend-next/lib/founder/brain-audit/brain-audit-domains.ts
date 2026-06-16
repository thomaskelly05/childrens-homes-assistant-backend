import type { BrainAuditAreaDefinition, BrainAuditCategory } from './brain-audit-types.ts'

function area(
  id: string,
  label: string,
  category: BrainAuditCategory,
  keywords: string[]
): BrainAuditAreaDefinition {
  return { id, label, category, keywords }
}

/** All Ofsted-regulated children's home coverage domains for internal brain audit. */
export const BRAIN_AUDIT_DOMAIN_DEFINITIONS: BrainAuditAreaDefinition[] = [
  // Safeguarding
  area('missing_from_home', 'Missing from home', 'safeguarding', ['missing', 'absent', 'missing from care']),
  area('self_harm', 'Self-harm', 'safeguarding', ['self-harm', 'self harm', 'cutting']),
  area('suicidal_ideation', 'Suicidal ideation', 'safeguarding', ['suicid', 'end my life', 'ligature']),
  area('cse', 'CSE', 'safeguarding', ['cse', 'sexual exploitation', 'child sexual']),
  area('cce', 'CCE', 'safeguarding', ['county lines', 'criminal exploitation', 'cce']),
  area('online_harm', 'Online harm', 'safeguarding', ['online harm', 'digital harm', 'social media risk']),
  area('radicalisation', 'Radicalisation', 'safeguarding', ['radicalis', 'extremism']),
  area('allegations_against_staff', 'Allegations against staff', 'safeguarding', ['allegation', 'staff conduct']),
  area('whistleblowing', 'Whistleblowing', 'safeguarding', ['whistleblow', 'not to log', 'suppress']),
  area('medication_errors', 'Medication errors/concerns', 'safeguarding', ['medication error', 'wrong dose', 'mar sheet']),
  area('child_on_child_harm', 'Child-on-child harm', 'safeguarding', ['child on child', 'peer assault']),
  area('bullying', 'Bullying', 'safeguarding', ['bullying', 'harassment', 'intimidation']),
  area('substance_misuse', 'Substance misuse', 'safeguarding', ['substance', 'drugs', 'alcohol misuse']),
  area('county_lines', 'County lines', 'safeguarding', ['county lines', 'drug running', 'exploitation']),
  area('grooming', 'Grooming', 'safeguarding', ['grooming', 'predatory', 'exploitative relationship']),
  area('harmful_sexual_behaviour', 'Harmful sexual behaviour', 'safeguarding', ['harmful sexual', 'hsb']),
  area('physical_abuse_indicators', 'Physical abuse indicators', 'safeguarding', ['bruise', 'physical abuse', 'injury']),
  area('emotional_abuse_indicators', 'Emotional abuse indicators', 'safeguarding', ['emotional abuse', 'humiliation', 'belittling']),
  area('neglect_indicators', 'Neglect indicators', 'safeguarding', ['neglect', 'unmet needs', 'hygiene concern']),
  area('domestic_abuse_impact', 'Domestic abuse impact', 'safeguarding', ['domestic abuse', 'dv impact', 'witnessed violence']),
  area('police_involvement', 'Police involvement', 'safeguarding', ['police', 'arrest', 'custody']),
  area('emergency_escalation', 'Emergency escalation', 'safeguarding', ['999', 'emergency', 'immediate danger']),

  // Residential practice
  area('daily_records', 'Daily records', 'residential_practice', ['daily log', 'daily record', 'daily note']),
  area('incident_records', 'Incident records', 'residential_practice', ['incident record', 'incident log']),
  area('behaviour_support', 'Behaviour support', 'residential_practice', ['behaviour support', 'behaviour plan']),
  area('physical_intervention_restraint', 'Physical intervention/restraint', 'residential_practice', ['restraint', 'physical intervention']),
  area('reg_20', 'Reg 20', 'residential_practice', ['reg 20', 'reg20', 'notification']),
  area('consequences_restorative', 'Consequences/restorative practice', 'residential_practice', ['restorative', 'consequence', 'repair']),
  area('key_work', 'Key work', 'residential_practice', ['key work', 'keyworker', 'key session']),
  area('child_voice', 'Child voice', 'residential_practice', ['child voice', "young person's words"]),
  area('wishes_feelings', 'Wishes and feelings', 'residential_practice', ['wishes and feelings', 'wishes & feelings']),
  area('family_time_contact', 'Family time/contact', 'residential_practice', ['family contact', 'contact session', 'family time']),
  area('education', 'Education', 'residential_practice', ['school', 'education', 'pep']),
  area('health_appointments', 'Health appointments', 'residential_practice', ['health', 'gp', 'appointment']),
  area('therapy_camhs', 'Therapy/CAMHS', 'residential_practice', ['camhs', 'therapy', 'counselling']),
  area('missing_return_conversations', 'Missing return conversations', 'residential_practice', ['missing return', 'return interview']),
  area('room_searches', 'Room searches', 'residential_practice', ['room search', 'belongings search']),
  area('sanctions_consequences', 'Sanctions/consequences', 'residential_practice', ['sanction', 'loss of privilege']),
  area('complaints', 'Complaints', 'residential_practice', ['complaint']),
  area('de_escalation', 'De-escalation', 'residential_practice', ['de-escalation', 'deescalation', 'calm down']),
  area('repair_relationship_practice', 'Repair and relationship-based practice', 'residential_practice', ['relationship-based', 'repair relationship']),
  area('incident_reflection', 'Incident reflection', 'residential_practice', ['incident reflection', 'debrief']),

  // Care planning
  area('placement_plans', 'Placement plans', 'care_planning', ['placement plan']),
  area('risk_assessments', 'Risk assessments', 'care_planning', ['risk assessment', 'risk plan']),
  area('behaviour_support_plans', 'Behaviour support plans', 'care_planning', ['behaviour support plan', 'bsp']),
  area('health_plans', 'Health plans', 'care_planning', ['health plan', 'lac health']),
  area('education_plans', 'Education plans', 'care_planning', ['pep', 'education plan']),
  area('independence_plans', 'Independence plans', 'care_planning', ['independence plan', 'pathway to independence']),
  area('transition_planning', 'Transition planning', 'care_planning', ['transition plan', 'move on']),
  area('pathway_planning', 'Pathway planning', 'care_planning', ['pathway plan', '16+']),
  area('chronologies', 'Chronologies', 'care_planning', ['chronology', 'timeline']),
  area('professional_meetings', 'Professional meetings', 'care_planning', ['professional meeting', 'strategy discussion']),
  area('lac_reviews', 'LAC reviews', 'care_planning', ['lac review', 'looked after review']),
  area('strategy_meetings', 'Strategy meetings', 'care_planning', ['strategy meeting', 'child protection']),
  area('multi_agency_work', 'Multi-agency work', 'care_planning', ['multi-agency', 'mash', 'partnership']),

  // Management and oversight
  area('manager_review', 'Manager review', 'management_oversight', ['manager review', 'management oversight']),
  area('ri_oversight', 'RI oversight', 'management_oversight', ['responsible individual', 'ri oversight']),
  area('reg_44', 'Regulation 44', 'management_oversight', ['reg 44', 'reg44']),
  area('reg_45', 'Regulation 45', 'management_oversight', ['reg 45', 'reg45']),
  area('quality_of_care_review', 'Quality of care review', 'management_oversight', ['quality of care', 'qoc review']),
  area('supervision', 'Supervision', 'management_oversight', ['supervision', 'reflective supervision']),
  area('team_meetings', 'Team meetings', 'management_oversight', ['team meeting', 'staff meeting']),
  area('staff_reflection', 'Staff reflection', 'management_oversight', ['staff reflection', 'reflective practice']),
  area('training_needs', 'Training needs', 'management_oversight', ['training needs', 'cpd']),
  area('patterns_trends', 'Patterns and trends', 'management_oversight', ['pattern', 'trend analysis']),
  area('audit_evidence', 'Audit evidence', 'management_oversight', ['audit evidence', 'audit trail']),
  area('ofsted_readiness', 'Inspection evidence preparation', 'management_oversight', ['ofsted', 'sccif', 'inspection']),
  area('sccif_evidence', 'SCCIF evidence', 'management_oversight', ['sccif', 'social care common inspection']),
  area('safer_recruitment', 'Safer recruitment awareness', 'management_oversight', ['safer recruitment', 'dbs']),
  area('medication_governance', 'Medication governance', 'management_oversight', ['medication governance', 'controlled drug']),
  area('complaints_governance', 'Complaints governance', 'management_oversight', ['complaints governance', 'complaint handling']),

  // Communication and inclusion
  area('autism', 'Autism', 'communication_inclusion', ['autism', 'asc', 'asd']),
  area('global_developmental_delay', 'Global developmental delay', 'communication_inclusion', ['developmental delay', 'gdd']),
  area('communication_needs', 'Communication needs', 'communication_inclusion', ['communication needs', 'aac', 'non-verbal']),
  area('disability', 'Disability', 'communication_inclusion', ['disability', 'reasonable adjustment']),
  area('equality_diversity', 'Equality and diversity', 'communication_inclusion', ['equality', 'diversity', 'inclusion']),
  area('cultural_identity', 'Cultural identity', 'communication_inclusion', ['cultural identity', 'ethnicity', 'faith']),
  area('gender_identity', 'Gender identity', 'communication_inclusion', ['gender identity', 'trans', 'pronouns']),
  area('trauma_informed_language', 'Trauma-informed language', 'communication_inclusion', ['trauma-informed', 'trauma informed']),
  area('therapeutic_recording', 'Therapeutic recording', 'communication_inclusion', ['therapeutic recording', 'therapeutic note']),
  area('non_verbal_communication', 'Non-verbal communication', 'communication_inclusion', ['non-verbal', 'body language']),
  area('advocacy', 'Advocacy', 'communication_inclusion', ['advocacy', 'advocate', 'nyas']),
  area('interpreters', 'Interpreters', 'communication_inclusion', ['interpreter', 'translation']),
  area('accessible_records', 'Accessible records', 'communication_inclusion', ['accessible record', 'easy read']),

  // Data, privacy and recording
  area('data_minimisation', 'Data minimisation', 'data_privacy_recording', ['data minimisation', 'minimum necessary']),
  area('identifiable_data', 'Identifiable data', 'data_privacy_recording', ['identifiable', 'personal data', 'pii']),
  area('third_party_information', 'Third-party information', 'data_privacy_recording', ['third party', 'confidential source']),
  area('record_correction', 'Record correction', 'data_privacy_recording', ['record correction', 'amend record']),
  area('subject_access_awareness', 'Subject access awareness', 'data_privacy_recording', ['subject access', 'sar', 'gdpr request']),
  area('confidentiality_boundaries', 'Confidentiality boundaries', 'data_privacy_recording', ['confidentiality', 'need to know']),
  area('professional_judgement_caveats', 'Professional judgement caveats', 'data_privacy_recording', ['professional judgement', 'clinical opinion']),
  area('no_invented_quotes', 'No invented quotes', 'data_privacy_recording', ['invented quote', 'fabricated', 'do not invent']),
  area('observation_vs_interpretation', 'Observation vs interpretation', 'data_privacy_recording', ['observation', 'interpretation', 'fact vs opinion']),
  area('non_judgemental_language', 'Non-judgemental language', 'data_privacy_recording', ['non-judgemental', 'non-judgmental', 'stigma']),

  // Product use cases
  area('orb_voice', 'ORB Voice', 'product_use_cases', ['orb voice', 'voice capture']),
  area('orb_dictate', 'ORB Dictate', 'product_use_cases', ['orb dictate', 'dictation']),
  area('orb_chat', 'ORB Chat', 'product_use_cases', ['orb chat', 'conversation']),
  area('orb_write', 'ORB Write', 'product_use_cases', ['orb write', 'document writing']),
  area('word_processor_export', 'Word processor export', 'product_use_cases', ['word export', 'docx export']),
  area('report_generation', 'Report generation', 'product_use_cases', ['report generation', 'generate report']),
  area('reg_44_preparation', 'Reg 44 preparation', 'product_use_cases', ['reg 44 preparation', 'reg44 prep']),
  area('reg_45_preparation', 'Reg 45 preparation', 'product_use_cases', ['reg 45 preparation', 'reg45 prep']),
  area('supervision_preparation', 'Supervision preparation', 'product_use_cases', ['supervision prep', 'supervision preparation']),
  area('incident_reflection_product', 'Incident reflection', 'product_use_cases', ['incident reflection tool']),
  area('daily_handover', 'Daily handover', 'product_use_cases', ['daily handover', 'shift handover']),
  area('management_summary', 'Management summary', 'product_use_cases', ['management summary', 'oversight summary'])
]

export const BRAIN_AUDIT_CATEGORY_LABELS: Record<BrainAuditCategory, string> = {
  safeguarding: 'Safeguarding',
  residential_practice: 'Residential practice',
  care_planning: 'Care planning',
  management_oversight: 'Management and oversight',
  communication_inclusion: 'Communication and inclusion',
  data_privacy_recording: 'Data, privacy and recording',
  product_use_cases: 'Product use cases'
}

export function getBrainAuditDomainById(id: string): BrainAuditAreaDefinition | undefined {
  return BRAIN_AUDIT_DOMAIN_DEFINITIONS.find((d) => d.id === id)
}

export function getBrainAuditDomainsByCategory(category: BrainAuditCategory): BrainAuditAreaDefinition[] {
  return BRAIN_AUDIT_DOMAIN_DEFINITIONS.filter((d) => d.category === category)
}
