import type { RecordingFormDefinition } from '@/lib/record/recording-form-registry'
import { lifecycleForForm } from '@/lib/record/recording-form-lifecycle'
import { sccifAlignmentForForm } from '@/lib/record/recording-form-sccif-alignment'
import {
  ACTIONS_FOLLOW_UP_PROMPT,
  ADULT_RESPONSE_SECTION_PROMPT,
  CHILD_VOICE_SECTION_PROMPT,
  PLAN_IMPACT_CHECK_PROMPT,
  THERAPEUTIC_LANGUAGE_GUIDANCE
} from '@/lib/record/recording-form-therapeutic-defaults'

export type FormalRouteClassification =
  | 'SUPPORTED_NOW'
  | 'REVIEW_THEN_SUPPORTED'
  | 'DRAFT_ONLY'
  | 'ROUTE_HINT_ONLY'
  | 'NEEDS_FORMAL_BACKEND'

export type RecordingFormRecordMetadata = {
  record_date: string
  event_date: string
  event_time?: string
  written_by_user_id?: string
  written_by_name?: string
  written_by_role?: string
  last_edited_by_user_id?: string
  last_edited_by_name?: string
  reviewed_by_user_id?: string
  reviewed_by_name?: string
  reviewed_at?: string
  signed_off_by_user_id?: string
  signed_off_by_name?: string
  signed_off_at?: string
  child_id?: number
  home_id?: number
  form_id: string
  form_type: string
  category?: string
  source: 'recording_workspace' | 'manager_review' | 'formal_submit'
  status: 'draft' | 'ready_for_review' | 'submitted' | 'signed_off' | 'archived' | 'read_only'
  review_status?: string
  manager_review_required: boolean
  safeguarding_review_required: boolean
  privacy_sensitive: boolean
  child_voice_present?: boolean
  adult_response_present?: boolean
  actions_required?: boolean
  chronology_event_id?: string
  archive_record_id?: string
  plan_impact_ids?: string[]
  lifeecho_suggestion_ids?: string[]
  formal_route_classification: FormalRouteClassification
  formal_route_hint?: string
  formal_route_warning?: string
  is_signed_off: boolean
  is_editable: boolean
  editability_note?: string
  therapeutic_flags: {
    child_voice_prompt: string
    adult_response_prompt: string
    actions_follow_up_prompt: string
    plan_impact_check_prompt: string
    language_guidance: string[]
  }
  lifecycle: ReturnType<typeof lifecycleForForm>
  sccif_alignment: ReturnType<typeof sccifAlignmentForForm>
}

const SUPPORTED_NOW_IDS = new Set([
  'daily-note',
  'incident',
  'keywork',
  'keywork-direct-work',
  'family-time',
  'education-note',
  'health-appointment',
  'missing-episode',
  'missing'
])

const REVIEW_THEN_IDS = new Set([
  'safeguarding-concern',
  'physical-intervention',
  'injury-body-map',
  'body-map',
  'medication-error',
  'medication-note-error',
  'return-conversation',
  'disclosure',
  'allegation',
  'police-involvement',
  'hospital-emergency',
  'child-on-child-concern',
  'exploitation-concern',
  'room-search',
  'complaint-concern'
])

const ROUTE_HINT_IDS = new Set([
  'handover',
  'child-voice',
  'health-medication',
  'care-plan-update',
  'staff-supervision',
  'action-plan-note',
  'evidence-document',
  'reg44-evidence',
  'reg45-evidence',
  'wishes-and-feelings',
  'medication-administration'
])

const NEEDS_BACKEND_IDS = new Set([
  'safeguarding-concern',
  'medication-error',
  'physical-intervention',
  'body-map',
  'injury-body-map',
  'missing-episode',
  'complaint-concern',
  'room-search',
  'behaviour-support'
])

export function formalRouteClassificationForForm(form: RecordingFormDefinition): FormalRouteClassification {
  if (SUPPORTED_NOW_IDS.has(form.id) || form.workflowStatus === 'formal_submit_supported') {
    return 'SUPPORTED_NOW'
  }
  if (REVIEW_THEN_IDS.has(form.id) || form.workflowStatus === 'safeguarding_sensitive') {
    return 'REVIEW_THEN_SUPPORTED'
  }
  if (ROUTE_HINT_IDS.has(form.id) || form.workflowStatus === 'opens_existing_workflow') {
    return 'ROUTE_HINT_ONLY'
  }
  if (NEEDS_BACKEND_IDS.has(form.id)) {
    return 'NEEDS_FORMAL_BACKEND'
  }
  return 'DRAFT_ONLY'
}

export function formalRouteHintForClassification(
  classification: FormalRouteClassification,
  formTitle: string
): { hint: string; warning?: string } {
  switch (classification) {
    case 'SUPPORTED_NOW':
      return {
        hint: `Formal submit supported for ${formTitle} when a child is selected and review rules are met.`
      }
    case 'REVIEW_THEN_SUPPORTED':
      return {
        hint: `Manager or safeguarding review required before ${formTitle} can become a formal record.`,
        warning: 'Do not treat as completed until review is recorded.'
      }
    case 'ROUTE_HINT_ONLY':
      return {
        hint: `Prepare ${formTitle} here, then complete in the existing formal workflow route.`,
        warning: 'Automatic formal record creation is not wired from this workspace.'
      }
    case 'NEEDS_FORMAL_BACKEND':
      return {
        hint: `${formTitle} — dedicated formal backend route not fully wired from workspace.`,
        warning: 'Save as draft and use the correct module, or manager review queue when ready.'
      }
    case 'DRAFT_ONLY':
    default:
      return {
        hint: `${formTitle} can be drafted here. Formal workflow not wired yet — save draft and use correct route.`,
        warning: 'No automatic formal record will be created on submit.'
      }
  }
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function buildDefaultFormRecordMetadata(
  form: RecordingFormDefinition,
  options?: {
    childId?: number
    homeId?: number
    writtenByUserId?: string
    writtenByName?: string
    writtenByRole?: string
    eventDate?: string
    recordDate?: string
    isSignedOff?: boolean
  }
): RecordingFormRecordMetadata {
  const classification = formalRouteClassificationForForm(form)
  const routeCopy = formalRouteHintForClassification(classification, form.title)
  const isSignedOff = options?.isSignedOff ?? false
  return {
    record_date: options?.recordDate || todayIsoDate(),
    event_date: options?.eventDate || todayIsoDate(),
    written_by_user_id: options?.writtenByUserId,
    written_by_name: options?.writtenByName,
    written_by_role: options?.writtenByRole,
    child_id: options?.childId,
    home_id: options?.homeId,
    form_id: form.id,
    form_type: form.workspaceType || form.id,
    category: form.category,
    source: 'recording_workspace',
    status: isSignedOff ? 'read_only' : 'draft',
    manager_review_required: form.requiresManagerReview,
    safeguarding_review_required:
      form.safeguardingSensitive || form.workflowStatus === 'safeguarding_sensitive',
    privacy_sensitive: form.privacySensitive,
    formal_route_classification: classification,
    formal_route_hint: routeCopy.hint,
    formal_route_warning: routeCopy.warning,
    is_signed_off: isSignedOff,
    is_editable: !isSignedOff,
    editability_note: isSignedOff
      ? 'This record is signed off and cannot be edited directly. Create an addendum via the correction workflow when available.'
      : undefined,
    therapeutic_flags: {
      child_voice_prompt: CHILD_VOICE_SECTION_PROMPT,
      adult_response_prompt: ADULT_RESPONSE_SECTION_PROMPT,
      actions_follow_up_prompt: ACTIONS_FOLLOW_UP_PROMPT,
      plan_impact_check_prompt: PLAN_IMPACT_CHECK_PROMPT,
      language_guidance: [...THERAPEUTIC_LANGUAGE_GUIDANCE]
    },
    lifecycle: lifecycleForForm(form.id, form.category),
    sccif_alignment: sccifAlignmentForForm(
      form.id,
      form.category,
      form.relatedQualityStandards,
      form.relatedEvidenceAreas
    )
  }
}

export function parseFormRecordMetadata(
  metadata?: Record<string, unknown> | null
): RecordingFormRecordMetadata | null {
  if (!metadata) return null
  const raw = metadata.form_record as RecordingFormRecordMetadata | undefined
  if (!raw || typeof raw !== 'object') return null
  return raw
}

export function mergeFormRecordMetadataPatch(
  existing: Record<string, unknown> | undefined,
  patch: Partial<RecordingFormRecordMetadata>
): Record<string, unknown> {
  const current = parseFormRecordMetadata(existing) || ({} as RecordingFormRecordMetadata)
  return {
    ...existing,
    form_record: { ...current, ...patch }
  }
}
