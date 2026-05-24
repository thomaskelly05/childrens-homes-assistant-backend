import type { RecordAboutContext, RecordCardId } from '@/lib/record/recording-hub'
import {
  recordingFormById,
  recordingFormByWorkspaceType,
  resolveActiveRecordingForm,
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

const WORKSPACE_TYPE_IDS: RecordingWorkspaceType[] = [
  'daily-note',
  'incident',
  'child-voice',
  'keywork',
  'missing',
  'family-time',
  'health-medication',
  'handover',
  'evidence-document',
  'staff-reflection',
  'safeguarding-concern',
  'return-conversation',
  'physical-intervention',
  'injury-body-map',
  'medication-note-error',
  'manager-review',
  'education-note',
  'health-appointment',
  'behaviour-support',
  'complaint-concern',
  'room-search',
  'damage-repair',
  'professional-visit',
  'staff-debrief',
  'reg44-evidence',
  'reg45-evidence',
  'general-draft'
]

export const RECORDING_BODY_PLACEHOLDERS: Record<RecordingWorkspaceType, string> = Object.fromEntries(
  WORKSPACE_TYPE_IDS.map((id) => {
    const form = recordingFormByWorkspaceType(id)
    const prompt = form?.therapeuticPrompt || PLACEHOLDER_FALLBACKS[id] || form?.description || 'Record clearly and factually.'
    return [id, prompt]
  })
) as Record<RecordingWorkspaceType, string>

export function recordingBodyPlaceholder(
  recordingType: RecordingWorkspaceType,
  form?: RecordingFormDefinition | null
): string {
  if (form?.therapeuticPrompt) return form.therapeuticPrompt
  return RECORDING_BODY_PLACEHOLDERS[recordingType] || 'Record clearly and factually.'
}

export function resolveRecordingTypeFromQuery(
  type?: string | null,
  formId?: string | null
): RecordingWorkspaceType | undefined {
  if (formId?.trim()) {
    const form = recordingFormById(formId.trim())
    if (form?.workspaceType) return form.workspaceType
    return 'general-draft'
  }
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
    'reg45-evidence': 'reg45-evidence',
    'general-draft': 'general-draft'
  }

  if (aliases[raw]) return aliases[raw]

  const byFormId = recordingFormById(raw)
  if (byFormId?.workspaceType) return byFormId.workspaceType

  const byForm = recordingFormByWorkspaceType(raw as RecordingWorkspaceType)
  return byForm?.workspaceType
}

export function resolveRecordingFormFromQuery(
  type?: string | null,
  formId?: string | null
): RecordingFormDefinition | undefined {
  const workspaceType = resolveRecordingTypeFromQuery(type, formId)
  if (!workspaceType) return undefined
  return resolveActiveRecordingForm(workspaceType, formId)
}

const STAFF_ONLY_TYPES: RecordingWorkspaceType[] = ['staff-reflection', 'staff-debrief', 'reg44-evidence', 'reg45-evidence']

const HOME_SHIFT_TYPES: RecordingWorkspaceType[] = [
  'handover',
  'evidence-document',
  'daily-note',
  'reg44-evidence',
  'reg45-evidence',
  'manager-review',
  'complaint-concern',
  'general-draft'
]

export function recordingTypeVisibleForAbout(type: RecordingWorkspaceType, about: RecordAboutContext): boolean {
  if (type === 'general-draft') return true
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
