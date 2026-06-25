/**
 * Care-led mobile UX copy — calm, specialist residential childcare language.
 * Presentation only; does not change backend identifiers or template meaning.
 */

export const ORB_WRITE_MOBILE_HEADER = 'Shape the record'
export const ORB_WRITE_MOBILE_SUBHEADER =
  'Write safely, keep the child central, and review before use.'

export const ORB_WRITE_MOBILE_PART_LABEL = 'Part'
export const ORB_WRITE_MOBILE_PREVIOUS_PART = 'Previous part'
export const ORB_WRITE_MOBILE_NEXT_PART = 'Next part'
export const ORB_WRITE_MOBILE_ALL_PARTS = 'All parts'

export const ORB_WRITE_MOBILE_SAVE_DRAFT = 'Save draft'
export const ORB_WRITE_MOBILE_ASK_ORB_CHECK_WORDING = 'Ask ORB to check wording'
export const ORB_WRITE_MOBILE_REVIEW_BEFORE_USE = 'Review before use'

/** Display-only mapping for generic template headings on mobile — template body unchanged. */
const ORB_WRITE_MOBILE_TITLE_ALIASES: Record<string, string> = {
  Summary: 'What is this record about?',
  'Incident Summary': 'What is this record about?',
  Document: 'What is this record about?',
  "Child's Voice": 'What did the child say or communicate?',
  'Child voice': 'What did the child say or communicate?',
  "Child's voice": 'What did the child say or communicate?',
  'Child presentation': 'How did the child present?',
  "Child's presentation": 'How did the child present?',
  'Presentation and Support': 'How did the child present?',
  'Adult response': 'How did adults respond?',
  'Adult Response': 'How did adults respond?',
  Outcome: 'What changed or happened next?',
  'Outcome / Handover': 'What changed or happened next?',
  'Follow-up': 'Is any follow-up needed?',
  'Follow up': 'Is any follow-up needed?'
}

export function orbWriteMobileCareLedSectionTitle(title: string): string {
  const trimmed = title.trim()
  return ORB_WRITE_MOBILE_TITLE_ALIASES[trimmed] ?? trimmed
}

export const ORB_RECORDS_MOBILE_HEADING = 'Your drafts'
export const ORB_RECORDS_MOBILE_SUBHEADING = 'Your drafts, ready to review.'
export const ORB_RECORDS_MOBILE_EMPTY_TITLE = 'Your drafts'
export const ORB_RECORDS_MOBILE_EMPTY_SUBTITLE = 'Open and continue when you are ready to review.'
export const ORB_RECORDS_MOBILE_OPEN_ACTION = 'Open in ORB Write'
export const ORB_RECORDS_LEGACY_DRAFT_LABEL = 'Legacy draft'
export const ORB_RECORDS_CLEAR_LEGACY_DRAFTS = 'Clear local test drafts'

export const ORB_DICTATE_MOBILE_FRAMING =
  'Speak naturally. ORB will help structure your words into an adult-reviewed draft.'
export const ORB_DICTATE_MOBILE_QUICK_RECORD_EXPLANATION =
  'For rough notes, voice memos or quick observations that need safer wording.'

export const ORB_VOICE_MOBILE_FRAMING = 'Talk it through before you write.'
export const ORB_VOICE_MOBILE_SUPPORTING =
  'Use this to reflect, organise your thoughts and prepare a safer record.'

export const ORB_HELP_WHEN_TO_SPEAK_TO_MANAGER = 'When to speak to a manager'
