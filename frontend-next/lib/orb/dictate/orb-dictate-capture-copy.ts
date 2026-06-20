/** Phase 3L — ORB Dictate flagship capture workflow copy. */

export const ORB_DICTATE_CAPTURE_HEADLINE = 'Dictate' as const

export const ORB_DICTATE_CAPTURE_SUBTITLE =
  'Turn rough speech, notes or uploads into safer adult-reviewed records.' as const

export const ORB_DICTATE_CAPTURE_SUPPORTING =
  'Start with what happened. ORB will help structure the record, check what may be missing and keep the child\u2019s experience central.' as const

export const ORB_DICTATE_CAPTURE_BOUNDARY =
  'Generated drafts must be reviewed by an adult before use. Follow your home\u2019s safeguarding and recording policy.' as const

export const ORB_DICTATE_CAPTURE_JOURNEY = 'Capture \u2192 ORB Review \u2192 Safer Draft' as const

export const ORB_DICTATE_STORY_LINE =
  'Records are not just admin. They are part of a child\u2019s story.' as const

export const ORB_DICTATE_SPEAK_LABEL = 'Speak' as const
export const ORB_DICTATE_PASTE_LABEL = 'Paste notes' as const
export const ORB_DICTATE_UPLOAD_LABEL = 'Upload audio' as const

export const ORB_DICTATE_SPEAK_GUIDANCE =
  'Speak naturally. ORB will help structure this after capture.' as const

export const ORB_DICTATE_SPEAK_ROUGH_LABEL = 'Rough capture \u2014 not yet a record' as const

export const ORB_DICTATE_CONSENT_REMINDER =
  'Only record where this is appropriate, transparent and in line with your home\u2019s policy.' as const

export const ORB_DICTATE_PASTE_PLACEHOLDER =
  'Paste rough notes here. Use anonymised or minimal identifiable details where possible.' as const

export const ORB_DICTATE_REVIEW_WITH_ORB = 'Review with ORB' as const

export const ORB_DICTATE_UPLOAD_BOUNDARY =
  'Uploaded audio should only be used where recording was appropriate and authorised.' as const

export const ORB_DICTATE_UPLOAD_PLACEHOLDER =
  'Audio upload support is being prepared. Paste notes or use Speak for now.' as const

export const ORB_DICTATE_REVIEW_TITLE = 'ORB Review' as const

export const ORB_DICTATE_REVIEW_SUPPORTING =
  'Before drafting, ORB checks whether the record has enough detail to be safe, factual and child-centred.' as const

export const ORB_DICTATE_REVIEW_STATUS_PRESENT = 'Present' as const
export const ORB_DICTATE_REVIEW_STATUS_MAY_MISSING = 'May be missing' as const
export const ORB_DICTATE_REVIEW_STATUS_NEEDS_DECISION = 'Needs adult decision' as const

export const ORB_DICTATE_SAFER_DRAFT_TITLE = 'Safer Draft' as const
export const ORB_DICTATE_DRAFT_REVIEW_LABEL = 'Generated for adult review' as const

export const ORB_DICTATE_ACTION_COPY = 'Copy' as const
export const ORB_DICTATE_ACTION_SAVE = 'Save draft' as const
export const ORB_DICTATE_ACTION_OPEN_WRITE = 'Open in ORB Write' as const

export const ORB_DICTATE_ADULT_RESPONSIBILITY =
  'ORB helps structure records. Adults remain responsible for review, judgement and safeguarding action.' as const

export const ORB_DICTATE_RECORD_TYPE_PROMPT = 'Looks like this may be\u2026' as const

/** Lightweight record-type suggestions — user can change after capture. */
export const ORB_DICTATE_RECORD_TYPE_SUGGESTIONS = [
  { templateId: 'daily_record', label: 'Daily record' },
  { templateId: 'incident', label: 'Incident reflection' },
  { templateId: 'missing', label: 'Missing from home' },
  { templateId: 'keywork', label: 'Key-work session' },
  { templateId: 'safeguarding', label: 'Safeguarding note' },
  { templateId: 'handover', label: 'Handover' },
  { templateId: 'supervision_prep', label: 'Supervision reflection' },
  { templateId: 'general', label: 'Other' }
] as const

export const ORB_DICTATE_DRAFT_SECTIONS_DEFAULT = [
  'What happened',
  'Child\u2019s voice / presentation',
  'Adult response',
  'Outcome',
  'Follow-up'
] as const

export const ORB_DICTATE_DRAFT_SECTIONS_MISSING = [
  'What was known',
  'Actions taken',
  'Child\u2019s return / presentation',
  'Child\u2019s voice',
  'Adult response',
  'Follow-up / management oversight'
] as const

export const ORB_DICTATE_DRAFT_SECTIONS_INCIDENT = [
  'What happened',
  'Triggers / context',
  'Child\u2019s presentation',
  'Adult response and de-escalation',
  'Outcome',
  'Repair / follow-up'
] as const

export const ORB_DICTATE_DRAFT_SECTIONS_DAILY = [
  'Summary of the day',
  'Child\u2019s presentation',
  'Key interactions',
  'Adult support',
  'Child\u2019s voice',
  'Follow-up'
] as const

export function dictateDraftSectionsForTemplate(templateId: string): readonly string[] {
  if (templateId === 'missing') return ORB_DICTATE_DRAFT_SECTIONS_MISSING
  if (templateId === 'incident' || templateId === 'physical_intervention') return ORB_DICTATE_DRAFT_SECTIONS_INCIDENT
  if (templateId === 'daily_record') return ORB_DICTATE_DRAFT_SECTIONS_DAILY
  return ORB_DICTATE_DRAFT_SECTIONS_DEFAULT
}

/** ORB Review checklist items — residential childcare focus. */
export const ORB_DICTATE_REVIEW_CHECKLIST_ITEMS = [
  'What happened, in order?',
  'Who was present?',
  'What did the child say, show or communicate?',
  'What did adults observe?',
  'What did adults do to support, reassure or de-escalate?',
  'What was the outcome?',
  'What follow-up is needed?',
  'Is manager oversight needed?',
  'Is the language factual, balanced and child-centred?'
] as const
