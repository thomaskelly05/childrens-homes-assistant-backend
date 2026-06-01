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
}

export type OrbDictateTemplate = {
  note_type: OrbDictateNoteType
  title: string
  purpose: string
  when_to_use: string
  export_label: string
}

export const ORB_DICTATE_NOTE_TYPE_LABELS: Record<OrbDictateNoteType, string> = {
  daily_record: 'Daily record',
  incident_record: 'Incident record',
  chronology_entry: 'Chronology entry',
  handover_note: 'Handover',
  keywork_summary: 'Keywork session',
  manager_oversight_note: 'Manager oversight',
  safeguarding_concern_record: 'Safeguarding concern',
  missing_episode_note: 'Missing episode',
  staff_debrief: 'Staff debrief',
  supervision_reflection: 'Supervision reflection',
  learning_note: 'Learning note',
  action_plan: 'Action plan',
  reg44_prep_note: 'Reg 44 / Reg 45 prep',
  ofsted_evidence_summary: 'Ofsted evidence summary',
  team_meeting: 'Team meeting',
  investigation_meeting: 'Investigation meeting',
  strategy_multi_agency_prep: 'Strategy / multi-agency prep'
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

export const ORB_DICTATE_GOVERNANCE_COPY = {
  draft:
    'ORB Dictate helps create draft wording. Adults must review, edit and approve before using it as a formal record.',
  recording:
    'Do not record people without following your organisation’s consent, confidentiality and recording policies.',
  boundary:
    'ORB Dictate does not submit to IndiCare OS or any care record unless you choose an approved connected workflow.',
  retention: 'Transcripts are kept only when you choose to save. You can delete drafts at any time.',
  speaker:
    'ORB can label speakers from introductions and corrections. It does not verify identity by voice.',
  saveWording: 'Save to ORB · Copy for your records · Export · Send to chat — draft for review.'
} as const
