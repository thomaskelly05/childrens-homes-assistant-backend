/**
 * ORB Residential visual convergence — canonical station copy for headers, footers and empty states.
 * Import from here across Chat, Dictate, Voice, ORB Write and Records & Drafts.
 */

export const ORB_STATION_CHAT_HEADING = 'What do you need help thinking through?'

export const ORB_STATION_DICTATE_TITLE = 'Dictate'
export const ORB_STATION_DICTATE_SUBTITLE =
  'Speak naturally. ORB will help structure your words into an adult-reviewed draft.'

export const ORB_STATION_VOICE_SUBTITLE = 'Talk it through before you write.'

export const ORB_STATION_WRITE_SUBTITLE =
  'Write safely, keep the child central, and review before use.'

export const ORB_STATION_RECORDS_SUBTITLE = 'Your drafts, ready to review.'

export const ORB_STATION_SAFETY_FOOTER =
  'ORB supports professional judgement. Review before use and follow local safeguarding procedures.'

export const ORB_STATION_DICTATE_SAFETY_STRIP =
  'Only record where it is appropriate, transparent and in line with your home\u2019s policy.'

export const ORB_STATION_DICTATE_RECENT_CAPTURES_EMPTY =
  'No captures yet. Speak naturally when you are ready. ORB will help structure your words into a clearer draft for review.'

export const ORB_STATION_RECORDS_EMPTY_TITLE = 'Your drafts'
export const ORB_STATION_RECORDS_EMPTY_SUBTITLE =
  'Saved adult-reviewed outputs from Chat, Dictate, Voice and ORB Write appear here.'

/** Calm home quick actions — max four on Chat home. */
export const ORB_HOME_QUICK_ACTIONS = [
  {
    id: 'write-record',
    label: 'Write a record',
    prompt:
      'Help me write a record. I will share what happened — keep the child central and help me record observable facts clearly for adult review.'
  },
  {
    id: 'reflect-incident',
    label: 'Reflect on an incident',
    prompt:
      'Help me reflect on an incident and prepare safer wording. I will describe what happened — support me with sequence, de-escalation, harm, notifications and follow-up.'
  },
  {
    id: 'find-template',
    label: 'Find a template',
    action: 'open_templates' as const
  },
  {
    id: 'home-document',
    label: 'Use home document',
    action: 'open_documents' as const
  }
] as const

/** Dictate record-type chips — residential-first defaults. */
export const ORB_DICTATE_STATION_RECORD_TYPES = [
  { templateId: 'general', label: 'Quick Record' },
  { templateId: 'daily_record', label: 'Daily Record' },
  { templateId: 'incident', label: 'Incident Record' },
  { templateId: 'handover', label: 'Handover' },
  { templateId: 'keywork', label: 'Keywork Note' },
  { templateId: 'manager', label: 'Manager Oversight' },
  { templateId: 'general_note', label: 'General Note' }
] as const

export type OrbWriteReviewCheckAction = {
  id: string
  question: string
  actionLabel: string
  instruction: string
}

/** ORB Write review panel — actionable adult-led checks. */
export const ORB_WRITE_REVIEW_ACTION_CHECKS: OrbWriteReviewCheckAction[] = [
  {
    id: 'child_voice',
    question: 'Is the child\u2019s voice visible?',
    actionLabel: 'Add child voice prompt',
    instruction: 'Add a child voice section with what the child said, showed or communicated where known.'
  },
  {
    id: 'observation_interpretation',
    question: 'Have I separated observation from interpretation?',
    actionLabel: 'Check wording',
    instruction:
      'Review this draft and separate observable facts from interpretation. Use appeared, presented as, said, showed, staff observed where appropriate.'
  },
  {
    id: 'follow_up',
    question: 'Is follow-up needed?',
    actionLabel: 'Add follow-up section',
    instruction: 'Add a follow-up section with next steps, repair, monitoring or handover where needed.'
  },
  {
    id: 'manager_oversight',
    question: 'Manager oversight?',
    actionLabel: 'Add manager oversight note',
    instruction: 'Add a manager oversight note with what a manager or senior should consider reviewing.'
  },
  {
    id: 'factual_wording',
    question: 'Is wording factual and balanced?',
    actionLabel: 'Improve wording',
    instruction: 'Improve wording to be factual, balanced, child-centred and free from judgemental language.'
  }
]

export const ORB_WRITE_ADULT_RESPONSIBILITY_LINE =
  'Adult remains responsible for the final record.'

/** Voice post-call action labels. */
export const ORB_VOICE_POST_CALL_ACTIONS = {
  createDraftRecord: 'Create draft record',
  openInOrbWrite: 'Open in ORB Write',
  saveToMyDrafts: 'Save to My Drafts',
  summariseConversation: 'Summarise conversation',
  whatMayBeMissing: 'What may be missing?'
} as const
