import type { RecordAboutContext, RecordCardId } from '@/lib/record/recording-hub'
import {
  recordingFormByWorkspaceType,
  workspaceRecordingForms,
  type RecordingFormDefinition,
  type RecordingWorkspaceType
} from '@/lib/record/recording-form-registry'

export type { RecordingWorkspaceType } from '@/lib/record/recording-form-registry'

export type RecordingWorkspaceTypeOption = {
  id: RecordingWorkspaceType
  label: string
  description: string
  cardId?: RecordCardId
  form?: RecordingFormDefinition
}

function optionFromForm(form: RecordingFormDefinition): RecordingWorkspaceTypeOption | undefined {
  if (!form.workspaceType) return undefined
  return {
    id: form.workspaceType,
    label: form.title,
    description: form.description,
    cardId: form.cardId,
    form
  }
}

/** Workspace types exposed in /record selector (P0 + P1 with workspace support). */
export const RECORDING_WORKSPACE_TYPES: RecordingWorkspaceTypeOption[] = workspaceRecordingForms()
  .map((form) => optionFromForm(form))
  .filter((option): option is RecordingWorkspaceTypeOption => Boolean(option))

const PLACEHOLDER_FALLBACKS: Partial<Record<RecordingWorkspaceType, string>> = {
  'health-medication':
    'What health or medication activity took place? Observations, actions and any follow-up required.',
  'staff-reflection': 'What are you reflecting on? What learning or follow-up is needed for practice?'
}

export const RECORDING_BODY_PLACEHOLDERS: Record<RecordingWorkspaceType, string> = Object.fromEntries(
  RECORDING_WORKSPACE_TYPES.map((option) => {
    const prompt = option.form?.therapeuticPrompt || PLACEHOLDER_FALLBACKS[option.id] || option.description
    return [option.id, prompt]
  })
) as Record<RecordingWorkspaceType, string>

export function resolveRecordingTypeFromQuery(type?: string | null): RecordingWorkspaceType | undefined {
  if (!type?.trim()) return undefined
  const raw = type.trim().toLowerCase()

  const aliases: Record<string, RecordingWorkspaceType> = {
    'daily-note': 'daily-note',
    incidents: 'incident',
    incident: 'incident',
    'child-voice': 'child-voice',
    keywork: 'keywork',
    missing: 'missing',
    'missing-episode': 'missing',
    'family-contact': 'family-time',
    'family-time': 'family-time',
    'medication-health': 'medication-note-error',
    'medication-record': 'medication-note-error',
    'medication-note-error': 'medication-note-error',
    'health-medication': 'health-medication',
    'shift-handover': 'handover',
    handover: 'handover',
    documents: 'evidence-document',
    'evidence-document': 'evidence-document',
    safeguarding: 'safeguarding-concern',
    'safeguarding-concern': 'safeguarding-concern',
    'staff-reflection': 'staff-reflection',
    'return-conversation': 'return-conversation',
    rhi: 'return-conversation',
    'return-home-interview': 'return-conversation',
    'physical-intervention': 'physical-intervention',
    restraint: 'physical-intervention',
    'injury-body-map': 'injury-body-map',
    'body-map': 'injury-body-map',
    'manager-review': 'manager-review',
    'education-update': 'education-note',
    'education-note': 'education-note',
    'health-appointment': 'health-appointment',
    appointment: 'health-appointment',
    'behaviour-support': 'behaviour-support',
    'de-escalation': 'behaviour-support',
    'complaint-concern': 'complaint-concern',
    complaint: 'complaint-concern',
    'room-search': 'room-search',
    'damage-repair': 'damage-repair',
    'professional-visit': 'professional-visit',
    'staff-debrief': 'staff-debrief',
    'reg44-evidence': 'reg44-evidence',
    'reg44-action': 'reg44-evidence',
    'reg45-evidence': 'reg45-evidence'
  }

  if (aliases[raw]) return aliases[raw]

  const byForm = recordingFormByWorkspaceType(raw as RecordingWorkspaceType)
  return byForm?.workspaceType
}

const STAFF_ONLY_TYPES: RecordingWorkspaceType[] = ['staff-reflection', 'staff-debrief', 'reg44-evidence', 'reg45-evidence']

const HOME_SHIFT_TYPES: RecordingWorkspaceType[] = [
  'handover',
  'evidence-document',
  'daily-note',
  'reg44-evidence',
  'reg45-evidence',
  'manager-review',
  'complaint-concern'
]

export function recordingTypeVisibleForAbout(type: RecordingWorkspaceType, about: RecordAboutContext): boolean {
  if (about === 'staff') {
    return (
      STAFF_ONLY_TYPES.includes(type) ||
      type === 'manager-review' ||
      type === 'complaint-concern' ||
      type === 'evidence-document'
    )
  }
  if (about === 'home-shift') {
    return HOME_SHIFT_TYPES.includes(type)
  }
  if (about === 'not-sure') return true
  return !STAFF_ONLY_TYPES.includes(type) || type === 'staff-debrief'
}

export function recordingTypeRequiresManagerReview(type: RecordingWorkspaceType): boolean {
  return recordingFormByWorkspaceType(type)?.requiresManagerReview ?? false
}

export function recordingTypeSafeguardingSensitive(type: RecordingWorkspaceType): boolean {
  return recordingFormByWorkspaceType(type)?.safeguardingSensitive ?? false
}
