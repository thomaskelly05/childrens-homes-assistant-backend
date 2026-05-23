import type { RecordAboutContext, RecordCardId } from '@/lib/record/recording-hub'

export type RecordingWorkspaceType =
  | 'daily-note'
  | 'incident'
  | 'child-voice'
  | 'keywork'
  | 'missing'
  | 'family-time'
  | 'health-medication'
  | 'handover'
  | 'evidence-document'
  | 'staff-reflection'

export type RecordingWorkspaceTypeOption = {
  id: RecordingWorkspaceType
  label: string
  description: string
  cardId?: RecordCardId
}

export const RECORDING_WORKSPACE_TYPES: RecordingWorkspaceTypeOption[] = [
  {
    id: 'daily-note',
    label: 'Daily note',
    description: 'What happened today, support offered and what changed.',
    cardId: 'daily-note'
  },
  {
    id: 'incident',
    label: 'Incident',
    description: 'Facts, adult response, repair and follow-up.',
    cardId: 'incidents'
  },
  {
    id: 'child-voice',
    label: 'Child voice',
    description: 'Wishes, feelings and communication in the child’s words.',
    cardId: 'child-voice'
  },
  {
    id: 'keywork',
    label: 'Keywork',
    description: 'Planned direct work, goals and progress.',
    cardId: 'keywork'
  },
  {
    id: 'missing',
    label: 'Missing episode',
    description: 'Missing from care, actions taken and return.',
    cardId: 'missing'
  },
  {
    id: 'family-time',
    label: 'Family time',
    description: 'Contact, visits and relationship moments.',
    cardId: 'family-contact'
  },
  {
    id: 'health-medication',
    label: 'Health / medication',
    description: 'Medication, health observations and medical follow-up.',
    cardId: 'medication-health'
  },
  {
    id: 'handover',
    label: 'Handover',
    description: 'What the next adults need to know.',
    cardId: 'shift-handover'
  },
  {
    id: 'evidence-document',
    label: 'Evidence / document note',
    description: 'Evidence, files and document-linked notes.',
    cardId: 'documents'
  },
  {
    id: 'staff-reflection',
    label: 'Staff reflection',
    description: 'Reflective practice when appropriate for workforce records.',
    cardId: 'ask-orb'
  }
]

export const RECORDING_BODY_PLACEHOLDERS: Record<RecordingWorkspaceType, string> = {
  'daily-note':
    'What happened today? What did the young person experience? What support did adults offer? What changed?',
  incident:
    'What happened? What was seen/heard? How did adults respond? How was repair supported? What follow-up is needed?',
  'child-voice':
    'What did the young person say, show or communicate? How were their wishes and feelings understood?',
  keywork: 'What direct work took place? What were the goals? What progress or outcomes were observed?',
  missing:
    'When was the concern noticed? What actions were taken? Who was informed? What happened on return?',
  'family-time': 'What contact took place? How did the young person respond? What matters for continuity?',
  'health-medication':
    'What health or medication activity took place? Observations, actions and any follow-up required.',
  handover: 'What should the next adults know — mood, risks, routines, unfinished follow-up?',
  'evidence-document': 'What evidence or document are you noting? Why does it matter for the child’s record?',
  'staff-reflection': 'What are you reflecting on? What learning or follow-up is needed for practice?'
}

export function resolveRecordingTypeFromQuery(type?: string | null): RecordingWorkspaceType | undefined {
  if (!type?.trim()) return undefined
  const raw = type.trim()
  const aliases: Record<string, RecordingWorkspaceType> = {
    'daily-note': 'daily-note',
    incidents: 'incident',
    incident: 'incident',
    'child-voice': 'child-voice',
    keywork: 'keywork',
    missing: 'missing',
    'family-contact': 'family-time',
    'family-time': 'family-time',
    'medication-health': 'health-medication',
    'medication-record': 'health-medication',
    'shift-handover': 'handover',
    handover: 'handover',
    documents: 'evidence-document',
    'evidence-document': 'evidence-document',
    safeguarding: 'incident',
    'staff-reflection': 'staff-reflection'
  }
  return aliases[raw]
}

export function recordingTypeVisibleForAbout(type: RecordingWorkspaceType, about: RecordAboutContext): boolean {
  if (about === 'staff') return type === 'staff-reflection'
  if (about === 'home-shift') {
    return type === 'handover' || type === 'evidence-document' || type === 'daily-note'
  }
  if (about === 'not-sure') return true
  return type !== 'staff-reflection'
}
