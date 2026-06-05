import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

export type OrbRecordingRecordTypeId =
  | 'general_dictation'
  | 'daily_record'
  | 'incident_report'
  | 'missing_from_home_record'
  | 'safeguarding_concern'
  | 'physical_intervention'
  | 'key_work_session'
  | 'manager_summary'
  | 'chronology_entry'
  | 'handover'
  | 'education_school_refusal'
  | 'health_medication_note'
  | 'family_contact_record'
  | 'allegation_against_staff'
  | 'complaint_or_child_concern'
  | 'risk_assessment_update'
  | 'care_plan_update'
  | 'social_worker_update'
  | 'reg_40_notification_prep'
  | 'reg_44_evidence_summary'
  | 'reg_45_reflection'

export type OrbRecordingRecordType = {
  id: OrbRecordingRecordTypeId
  label: string
  category: string
  description: string
  purpose: string
  when_to_use: string
  when_not_to_use: string
  required_sections: string[]
  optional_sections: string[]
  missing_evidence_checks: string[]
  safeguarding_checks: string[]
  child_voice_checks: string[]
  manager_oversight_checks: string[]
  professional_language_guidance: string
  regulatory_evidence_points: string[]
  related_quality_standards: string[]
  suggested_outputs: OrbRecordingRecordTypeId[]
  final_document_headings: string[]
  pdf_heading_order: string[]
  related_templates: string[]
  related_document_lenses: string[]
  suggested_follow_up_actions: string[]
  safety_disclaimer: string
  dictate_note_type: OrbDictateNoteType
  studio_template_id: string | null
}

export type OrbRecordingSuggestedOutput = {
  id: OrbRecordingRecordTypeId
  label: string
  dictate_note_type: OrbDictateNoteType
}

export type OrbRecordingFrameworkPayload = {
  version: string
  record_types: OrbRecordingRecordType[]
}

export type OrbRecordingBrainFrameworkContext = {
  record_type_id: OrbRecordingRecordTypeId
  record_type_label: string
  required_sections: string[]
  orb_will_check: string[]
  missing_evidence_checks: string[]
  safeguarding_checks: string[]
  child_voice_checks: string[]
  manager_oversight_checks: string[]
  suggested_outputs: OrbRecordingSuggestedOutput[]
  suggested_follow_up_actions: string[]
  recording_quality_guidance: string
}
