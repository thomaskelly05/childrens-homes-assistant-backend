import type { OrbDictateBrainMetadata } from '@/lib/orb/dictate/orb-dictate-brain-metadata'
import type { OrbDictateActionPoint } from '@/lib/orb/dictate/orb-dictate-action-points'

export type OrbDictateNoteType =
  | 'daily_record'
  | 'incident_record'
  | 'chronology_entry'
  | 'handover_note'
  | 'keywork_summary'
  | 'manager_oversight_note'
  | 'safeguarding_concern_record'
  | 'missing_episode_note'
  | 'staff_debrief'
  | 'supervision_reflection'
  | 'learning_note'
  | 'action_plan'
  | 'reg44_prep_note'
  | 'ofsted_evidence_summary'
  | 'team_meeting'
  | 'investigation_meeting'
  | 'strategy_multi_agency_prep'
  | 'meeting_notes'
  | 'professional_consultation'
  | 'home_visit_note'
  | 'assessment_notes'
  | 'supervision_discussion'
  | 'multi_agency_discussion'
  | 'strategy_safeguarding_discussion'

export type OrbDictateStartMode =
  | 'record_note'
  | 'record_debrief'
  | 'paste'
  | 'import_voice'
  | 'template'

export type OrbDictateQualityStatus = 'present' | 'missing' | 'weak' | 'review' | 'good' | 'needs_review'

export type OrbDictateQualityChecks = {
  child_voice: OrbDictateQualityStatus
  safeguarding: OrbDictateQualityStatus
  manager_oversight: OrbDictateQualityStatus
  impact: OrbDictateQualityStatus
  recording_quality: 'good' | 'needs_review'
  factual_clarity?: OrbDictateQualityStatus
  staff_response?: OrbDictateQualityStatus
  professional_curiosity?: OrbDictateQualityStatus
  chronology_relevance?: OrbDictateQualityStatus
  plan_risk_review?: OrbDictateQualityStatus
  recording_tone?: OrbDictateQualityStatus
  non_judgemental_language?: OrbDictateQualityStatus
  evidence_of_action?: OrbDictateQualityStatus
  follow_up_review_date?: OrbDictateQualityStatus
}

export type OrbDictateGenerateResult = {
  note_id?: string | null
  title: string
  note_type: OrbDictateNoteType
  professional_note: string
  summary: string
  actions: string[]
  transcript: string
  ofsted_lens?: string | null
  quality_checks: OrbDictateQualityChecks
  export_options: Array<'copy' | 'pdf' | 'docx' | 'save'>
  standalone_boundary: string
  governance_notice: string
  brain_metadata?: OrbDictateBrainMetadata
  participants?: Array<{
    id: string
    name: string
    role?: string
    organisation?: string
    initials?: string
    introducedBy?: string
  }>
  segments?: Array<{
    id: string
    speaker_id?: string
    speaker_label: string
    text: string
    source?: string
  }>
  speaker_summary?: { known_speakers: number; unknown_speakers: number; needs_review: boolean }
  speaker_boundary_notice?: string
  structured_actions?: OrbDictateActionPoint[]
  speakers?: Array<{
    speaker_id: string
    display_label: string
    confirmed_name?: string
    confirmed_role?: string
    confidence?: number
    source: string
    is_confirmed: boolean
  }>
}

export type OrbDictateTemplate = {
  note_type: OrbDictateNoteType
  title: string
  purpose: string
  when_to_use: string
  export_label: string
}

export const ORB_DICTATE_NOTE_TYPE_LABELS: Record<OrbDictateNoteType, string> = {
  daily_record: 'Daily log',
  incident_record: 'Incident record',
  chronology_entry: 'Chronology entry',
  handover_note: 'Handover',
  keywork_summary: 'Key work session',
  manager_oversight_note: 'Manager oversight note',
  safeguarding_concern_record: 'Safeguarding concern',
  missing_episode_note: 'Missing from home return',
  staff_debrief: 'Debrief',
  supervision_reflection: 'Supervision note',
  learning_note: 'Learning note',
  action_plan: 'Action plan',
  reg44_prep_note: 'Reg 44 / Reg 45 prep',
  ofsted_evidence_summary: 'Ofsted evidence summary',
  team_meeting: 'Team meeting',
  investigation_meeting: 'Investigation meeting',
  strategy_multi_agency_prep: 'Strategy / multi-agency prep',
  meeting_notes: 'Meeting notes',
  professional_consultation: 'Professional consultation',
  home_visit_note: 'Home visit note',
  assessment_notes: 'Assessment notes',
  supervision_discussion: 'Supervision discussion',
  multi_agency_discussion: 'Multi-agency discussion',
  strategy_safeguarding_discussion: 'Strategy / safeguarding discussion'
}

export const REFLECTIVE_DEBRIEF_QUESTIONS = [
  'What happened?',
  'What was the young person communicating?',
  'What did adults notice?',
  'What did adults do that helped?',
  'What escalated or reduced risk?',
  'What might be missing?',
  'What does this change for the plan?',
  'What needs recording?',
  'What needs manager oversight?'
] as const

import { orbResidentialStation } from '../orb-residential-stations.ts'

const dictateStation = orbResidentialStation('orb_dictate')

export const ORB_DICTATE_PRODUCT_TITLE = dictateStation.label
export const ORB_DICTATE_PRODUCT_SUBTITLE = dictateStation.tagline

export const ORB_DICTATE_GOVERNANCE_COPY = {
  draft:
    'ORB Dictate helps create draft wording. Adults must review, edit and approve before using it as a formal record.',
  recording:
    'Do not record people without following your organisation’s consent, confidentiality and recording policies.',
  boundary:
    'ORB Dictate does not submit to IndiCare OS or any care record unless you choose an approved connected workflow.',
  basedOnInput: 'Based only on what you provide.',
  reviewBeforeShare: 'Review before saving or sharing.',
  noLiveRecords: 'ORB does not access live care records in standalone mode.',
  retention: 'Transcripts are kept only when you choose to save. You can delete drafts at any time.',
  speaker:
    'ORB can separate speakers where possible. Confirm names or roles before using them in a record. ORB does not verify identity by voice.',
  saveWording: 'Save to ORB · Copy for your records · Export · Send to chat — draft for review.'
} as const
