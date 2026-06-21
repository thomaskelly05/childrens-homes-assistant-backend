/** Phase 3L–3Q — ORB Dictate capture workflow copy. */

export const ORB_DICTATE_CAPTURE_HEADLINE = 'Dictate' as const

export const ORB_DICTATE_CAPTURE_SUBTITLE =
  'Choose what you need to record, then capture the rough information. ORB will structure it for adult review.' as const

export const ORB_DICTATE_WHAT_ARE_YOU_RECORDING = 'What are you recording?' as const

export const ORB_DICTATE_RECORDING_AS_PREFIX = 'Recording as:' as const

export type OrbDictateProcessingStageId =
  | 'saving_audio'
  | 'transcribing'
  | 'identifying_people'
  | 'structuring_document'
  | 'ready'

export const ORB_DICTATE_PROCESSING_STAGES = [
  { id: 'saving_audio' as const, label: 'Saving audio' },
  { id: 'transcribing' as const, label: 'Transcribing' },
  { id: 'identifying_people' as const, label: 'Identifying speakers / people present' },
  { id: 'structuring_document' as const, label: 'Structuring document' },
  { id: 'ready' as const, label: 'Ready for adult review' }
] as const

export const ORB_DICTATE_DOCUMENT_WORKSPACE_TITLE = 'Document workspace' as const

export const ORB_DICTATE_SOURCE_TRANSCRIPT_TOGGLE = 'View original transcript' as const

export const ORB_DICTATE_SOURCE_TRANSCRIPT_LABEL = 'Source transcript' as const

export const ORB_DICTATE_PEOPLE_CONFIRM_TITLE = 'People and speakers to confirm' as const

export const ORB_DICTATE_ASSISTANT_TITLE = 'What changes should ORB make?' as const

export const ORB_DICTATE_ASSISTANT_SUPPORTING =
  'Ask ORB to restructure, clarify, make language safer, or check what may be missing.' as const

export const ORB_DICTATE_ASSISTANT_PLACEHOLDER =
  'For example: make this a missing from home report, remove judgemental language, or check what is missing.' as const

export const ORB_DICTATE_APPLY_CHANGE = 'Apply change' as const

export const ORB_DICTATE_DOCUMENT_STRUCTURE_UPDATED =
  'Document structure updated for adult review.' as const

export const ORB_DICTATE_WRITE_HANDOFF_SOURCE_NOTE = 'Created from ORB Dictate' as const

export const ORB_DICTATE_RECORDING_SAVED_WITH_DRAFT = 'Recording saved with this draft.' as const

export const ORB_DICTATE_RECORDING_LOCAL_PERSISTENCE_NOTE =
  'Recording attached locally. Permanent recording storage is not yet enabled.' as const

export const ORB_DICTATE_CAPTURE_SUPPORTING =
  'Start capturing what happened. ORB will help structure it safely afterwards.' as const

export const ORB_DICTATE_CAPTURE_BOUNDARY =
  'Generated drafts must be reviewed by an adult before use. Follow your home\u2019s safeguarding and recording policy.' as const

export const ORB_DICTATE_CAPTURE_JOURNEY =
  'Capture Station \u2192 Recording \u2192 Transcript Workspace \u2192 ORB Review \u2192 Safer Draft' as const

export const ORB_DICTATE_READY_TO_CAPTURE = 'Ready to capture' as const

export const ORB_DICTATE_CREATE_ROUGH_CAPTURE = 'Create rough capture' as const

export const ORB_DICTATE_RECORDING_LABEL = 'Recording rough capture' as const

export const ORB_DICTATE_RECORDING_NOT_RECORD =
  'This is not a record yet. ORB will help structure it after capture.' as const

export const ORB_DICTATE_ROUGH_CAPTURE_TITLE = 'Rough capture' as const

export const ORB_DICTATE_TRANSCRIPT_WORKSPACE_TITLE = 'Transcript workspace' as const

export const ORB_DICTATE_TRANSCRIPT_WORKSPACE_SUPPORTING =
  'This is the original rough capture. Edit it, then ask ORB to structure or improve it before creating a draft.' as const

export const ORB_DICTATE_ORIGINAL_TRANSCRIPT_LABEL = 'Original transcript \u2014 not yet a record' as const

export const ORB_DICTATE_ORIGINAL_NOTES_LABEL = 'Original notes \u2014 not yet a record' as const

export const ORB_DICTATE_ASK_ORB_IMPROVE = 'Ask ORB to improve this' as const

export const ORB_DICTATE_EDIT_ASSISTANT_TITLE = ORB_DICTATE_ASSISTANT_TITLE

export const ORB_DICTATE_EDIT_ASSISTANT_SUPPORTING = ORB_DICTATE_ASSISTANT_SUPPORTING

export const ORB_DICTATE_EDIT_INSTRUCTION_PLACEHOLDER = ORB_DICTATE_ASSISTANT_PLACEHOLDER

export const ORB_DICTATE_APPLY_ORB_CHANGE = ORB_DICTATE_APPLY_CHANGE

export const ORB_DICTATE_WRITE_TEMPLATE_TITLE = 'Document type' as const

export const ORB_DICTATE_WRITE_TEMPLATE_SUPPORTING =
  'Choose the structure ORB should apply to this document.' as const

export const ORB_DICTATE_WORKING_DOC_TITLE = 'ORB working document' as const

export const ORB_DICTATE_WORKING_DOC_LABEL = 'Generated for adult review' as const

export const ORB_DICTATE_WORKING_DOC_SUPPORTING =
  'Ask ORB to shape this into the record you need. You can edit before saving or opening in ORB Write.' as const

export const ORB_DICTATE_WORKING_DOC_UPDATED =
  'ORB updated the working document for adult review.' as const

export const ORB_DICTATE_WORKING_DOC_PARTIAL =
  'ORB could not create a full record from this yet. It has noted what appears present and what may be missing.' as const

export const ORB_DICTATE_EDIT_OFFLINE_NOTE =
  'Full ORB transform may need a connection \u2014 a local preparation was applied. Review before continuing.' as const

/** Quick ORB edit prompt chips — populate instruction input only; adult submits. */
export const ORB_DICTATE_QUICK_EDIT_PROMPTS = [
  { id: 'child_centred', label: 'Make more child-centred', instruction: 'Make this more child-centred' },
  { id: 'less_judgemental', label: 'Remove judgemental language', instruction: 'Remove judgemental language' },
  { id: 'missing', label: 'What is missing?', instruction: 'What information is missing?' },
  { id: 'manager_oversight', label: 'Add manager oversight', instruction: 'Add a manager oversight section' },
  { id: 'change_template', label: 'Change template', instruction: 'Use the daily record template' },
  { id: 'handover', label: 'Summarise for handover', instruction: 'Summarise this for handover' }
] as const

export const ORB_DICTATE_NOT_YET_RECORD = 'Not yet a record' as const

export const ORB_DICTATE_CAPTURE_AGAIN = 'Capture again' as const

export const ORB_DICTATE_EDIT_ROUGH_CAPTURE = 'Edit rough capture' as const

export const ORB_DICTATE_CREATE_SAFER_DRAFT = 'Create safer draft' as const

export const ORB_DICTATE_RECENT_CAPTURES_TITLE = 'Recent captures' as const

export const ORB_DICTATE_RECENT_CAPTURES_EMPTY = 'No recent captures yet.' as const

export const ORB_DICTATE_STORY_LINE =
  'Records are not just admin. They are part of a child\u2019s story.' as const

export const ORB_DICTATE_SPEAK_LABEL = 'Speak' as const
export const ORB_DICTATE_PASTE_LABEL = 'Paste notes' as const
export const ORB_DICTATE_UPLOAD_LABEL = 'Upload audio' as const

export const ORB_DICTATE_SPEAK_GUIDANCE =
  'Speak naturally. ORB will help structure this after capture.' as const

export const ORB_DICTATE_SPEAK_ROUGH_LABEL = 'Rough capture \u2014 not yet a record' as const

export const ORB_DICTATE_CONSENT_REMINDER =
  'Only record where it is appropriate, transparent and in line with your home\u2019s policy.' as const

export const ORB_DICTATE_RECORDING_START_FAILED =
  'Recording could not start. Check microphone permission and try again.' as const

export const ORB_DICTATE_RECORDING_UNSUPPORTED =
  'This browser does not support in-browser recording. Paste notes or upload audio instead.' as const

export const ORB_DICTATE_RECORDING_PERMISSION_NEEDED = 'Microphone permission needed' as const

export const ORB_DICTATE_RECORDING_PROCESSING = 'Processing audio\u2026' as const

export const ORB_DICTATE_RECORDING_TRANSCRIBING = 'Transcribing\u2026' as const

export const ORB_DICTATE_RECORDING_TRANSCRIPT_READY = 'Transcript ready' as const

export const ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED =
  'The recording was saved for this session, but transcription failed. You can replay it and type notes manually.' as const

export const ORB_DICTATE_RECORDING_ATTACHED_TITLE = 'Recording attached' as const

export const ORB_DICTATE_RECORDING_ATTACHED_SUPPORTING =
  'Adults can revisit the original recording where policy allows.' as const

export const ORB_DICTATE_RECORDING_LOCAL_STORAGE_NOTE =
  'Recording attached locally to this draft. Permanent media storage is not yet enabled.' as const

export const ORB_DICTATE_SOURCE_FROM_RECORDING = 'Source: transcript from attached recording' as const

export const ORB_DICTATE_SOURCE_FROM_PASTE = 'Source: pasted notes' as const

export const ORB_DICTATE_SOURCE_FROM_UPLOAD = 'Source: uploaded audio' as const

export const ORB_DICTATE_WRITE_FROM_RECORDING_NOTE =
  'This draft was created from an ORB Dictate recording. Review against the original recording where available.' as const

export type OrbDictateContentSource = 'recording' | 'paste' | 'upload' | 'speak'

export function orbDictateContentSourceLabel(source: OrbDictateContentSource): string {
  if (source === 'recording' || source === 'speak') return ORB_DICTATE_SOURCE_FROM_RECORDING
  if (source === 'upload') return ORB_DICTATE_SOURCE_FROM_UPLOAD
  return ORB_DICTATE_SOURCE_FROM_PASTE
}

export const ORB_DICTATE_PASTE_PLACEHOLDER =
  'Paste rough notes here. Use anonymised or minimal identifiable details where possible.' as const

export const ORB_DICTATE_REVIEW_WITH_ORB = 'Review with ORB' as const

export const ORB_DICTATE_UPLOAD_BOUNDARY =
  'Uploaded audio should only be used where recording was appropriate and authorised.' as const

export const ORB_DICTATE_UPLOAD_PLACEHOLDER =
  'Audio upload support is being prepared. Paste notes or use Speak for now.' as const

export const ORB_DICTATE_REVIEW_TITLE = 'ORB Review' as const

export const ORB_DICTATE_REVIEW_SUPPORTING =
  'ORB checks whether the working document has enough detail to become a safe, factual and child-centred draft.' as const

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
  { templateId: 'missing', label: 'Missing from home' },
  { templateId: 'incident', label: 'Incident reflection' },
  { templateId: 'keywork', label: 'Key-work session' },
  { templateId: 'safeguarding', label: 'Safeguarding note' },
  { templateId: 'handover', label: 'Handover' },
  { templateId: 'supervision_prep', label: 'Supervision reflection' },
  { templateId: 'manager', label: 'Manager oversight note' },
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
  'What follow-up or management oversight is needed?',
  'Is the language factual, balanced and child-centred?'
] as const

export type OrbDictateRecentCaptureStatus = 'rough_capture' | 'reviewed' | 'draft_created'

export const ORB_DICTATE_RECENT_CAPTURE_STATUS_LABELS: Record<OrbDictateRecentCaptureStatus, string> = {
  rough_capture: 'Rough capture',
  reviewed: 'Reviewed',
  draft_created: 'Draft created'
}
