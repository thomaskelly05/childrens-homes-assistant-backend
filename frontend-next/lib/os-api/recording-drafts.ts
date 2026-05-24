'use client'

export type RecordingDraftStatus = 'draft' | 'ready_for_review' | 'submitted' | 'archived' | 'deleted'

export type RecordingDraftReviewStatus =
  | 'not_required'
  | 'manager_review_required'
  | 'safeguarding_review_required'
  | 'awaiting_review'
  | 'changes_requested'
  | 'approved'
  | 'safeguarding_escalation_required'
  | 'reviewed'
  | 'submitted'
  | 'archived'

export type RecordingDraftRecord = {
  id: string
  title: string
  body: string
  recording_type: string
  form_id?: string | null
  category?: string | null
  status: RecordingDraftStatus
  review_status: RecordingDraftReviewStatus
  child_id?: number | null
  child_name?: string | null
  home_id?: number | null
  staff_id?: number | null
  context_type?: string | null
  created_by_user_id?: string | null
  created_by_name?: string | null
  created_by_role?: string | null
  manager_review_required: boolean
  safeguarding_review_required: boolean
  privacy_sensitive: boolean
  safeguarding_sensitive: boolean
  quality_flags: string[]
  language_flags: string[]
  privacy_flags: string[]
  checklist_status: Record<string, unknown>
  privacy_guard: Record<string, unknown>
  redaction_summary: Record<string, unknown>
  minimisation_summary: Record<string, unknown>
  linked_record_id?: string | null
  linked_chronology_id?: string | null
  submitted_to?: string | null
  submitted_at?: string | null
  reviewed_at?: string | null
  archived_at?: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
  structured_template_id?: string | null
  structured_template_version?: string | null
  structured_data?: Record<string, unknown>
  structured_summary?: Record<string, unknown> & { lines?: string[]; text?: string }
  structured_completion?: Record<string, unknown>
  structured_review_triggers?: string[]
}

export type RecordingDraftListData = {
  items: RecordingDraftRecord[]
  total: number
  storage_mode: string
  persistence_available: boolean
}

export type RecordingDraftHealth = {
  status: string
  service: string
  storage_mode: string
  draft_count: number
  persistence_available: boolean
  operational_only: boolean
  standalone_access: boolean
}

export type RecordingDraftCreatePayload = {
  title?: string
  body?: string
  recording_type: string
  form_id?: string
  category?: string
  child_id?: number
  child_name?: string
  home_id?: number
  staff_id?: number
  context_type?: string
  manager_review_required?: boolean
  safeguarding_review_required?: boolean
  privacy_sensitive?: boolean
  safeguarding_sensitive?: boolean
  quality_flags?: string[]
  language_flags?: string[]
  privacy_flags?: string[]
  checklist_status?: Record<string, unknown>
  metadata?: Record<string, unknown>
  structured_data?: Record<string, unknown>
}

export type RecordingDraftUpdatePayload = Partial<RecordingDraftCreatePayload> & {
  status?: RecordingDraftStatus
  review_status?: RecordingDraftReviewStatus
  structured_data?: Record<string, unknown>
}

export type RecordingDraftSubmitPayload = {
  submitted_to?: string
  target_workflow?: string
  metadata?: Record<string, unknown>
  confirm_reviewed?: boolean
  force_submit?: boolean
  create_chronology_link?: boolean
}

export type RecordingSubmissionTargetStatus =
  | 'supported_now'
  | 'submit_as_draft_only'
  | 'route_to_existing_workflow'
  | 'review_required_before_submit'
  | 'unsupported'

/** User-facing hint for submission target registry status (matches backend route_hint tone). */
export function submissionTargetStatusCopy(
  status: RecordingSubmissionTargetStatus,
  recordTypeLabel?: string | null
): string {
  const label = (recordTypeLabel || 'formal').replace(/_/g, ' ')
  switch (status) {
    case 'supported_now':
      return `This draft can be submitted into the formal ${label} workflow.`
    case 'route_to_existing_workflow':
      return 'This draft can be used with an existing workflow, but automatic creation is not wired yet.'
    case 'submit_as_draft_only':
      return 'This will save the draft as submitted, but no formal record will be created yet.'
    case 'review_required_before_submit':
      return 'Manager or safeguarding review is required before this can be treated as a completed formal record.'
    default:
      return 'Formal route is not fully wired yet for this recording type.'
  }
}

export type RecordingSubmissionTarget = {
  recording_type: string
  form_id?: string | null
  target_status: RecordingSubmissionTargetStatus
  target_record_type?: string | null
  backend_route?: string | null
  frontend_route?: string | null
  service_name?: string | null
  requires_child?: boolean
  requires_manager_review?: boolean
  safeguarding_sensitive?: boolean
  privacy_sensitive?: boolean
  chronology_link_supported?: boolean
  notes?: string | null
}

export type RecordingSubmissionResult = {
  success: boolean
  draft_id: string
  submitted: boolean
  formal_record_created: boolean
  formal_record_type?: string | null
  linked_record_id?: string | null
  linked_chronology_id?: string | null
  target_status: RecordingSubmissionTargetStatus
  review_required: boolean
  safeguarding_review_required: boolean
  warnings: string[]
  next_steps: string[]
  route_hint?: string | null
  frontend_route?: string | null
  draft?: RecordingDraftRecord | null
}

export type RecordingDraftSubmitData = {
  draft: RecordingDraftRecord
  warning: string
  formal_record_created: boolean
  linked_record_id?: string | null
  linked_chronology_id?: string | null
  submission?: RecordingSubmissionResult
}

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string }

async function parseEnvelope<T>(response: Response, fallback: T): Promise<{ data: T; ok: boolean; error?: string }> {
  if (!response.ok) {
    return { data: fallback, ok: false, error: `${response.status} ${response.statusText}` }
  }
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | T
  const envelope = payload as ApiEnvelope<T>
  return {
    data: envelope && typeof envelope === 'object' && 'data' in envelope ? (envelope.data as T) : (payload as T),
    ok: true
  }
}

function queryString(params: Record<string, string | number | boolean | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export async function getRecordingDraftHealth() {
  const response = await fetch('/recording-drafts/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingDraftHealth>(response, {
    status: 'unavailable',
    service: 'recording_draft_service',
    storage_mode: 'memory',
    draft_count: 0,
    persistence_available: false,
    operational_only: true,
    standalone_access: false
  })
}

export async function listRecordingDrafts(params?: {
  status?: string
  review_status?: string
  recording_type?: string
  child_id?: number
  home_id?: number
  include_archived?: boolean
  limit?: number
  offset?: number
}) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-drafts${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingDraftListData>(response, {
    items: [],
    total: 0,
    storage_mode: 'memory',
    persistence_available: false
  })
}

export async function createRecordingDraft(payload: RecordingDraftCreatePayload) {
  const response = await fetch('/recording-drafts', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseEnvelope<RecordingDraftRecord>(response, {
    id: '',
    title: '',
    body: '',
    recording_type: payload.recording_type,
    status: 'draft',
    review_status: 'not_required',
    manager_review_required: false,
    safeguarding_review_required: false,
    privacy_sensitive: false,
    safeguarding_sensitive: false,
    quality_flags: [],
    language_flags: [],
    privacy_flags: [],
    checklist_status: {},
    privacy_guard: {},
    redaction_summary: {},
    minimisation_summary: {},
    created_at: '',
    updated_at: '',
    metadata: {}
  })
}

export async function getRecordingDraft(draftId: string) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingDraftRecord | null>(response, null)
}

export async function updateRecordingDraft(draftId: string, payload: RecordingDraftUpdatePayload) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseEnvelope<RecordingDraftRecord>(response, {
    id: draftId,
    title: '',
    body: '',
    recording_type: payload.recording_type || 'daily-note',
    status: 'draft',
    review_status: 'not_required',
    manager_review_required: false,
    safeguarding_review_required: false,
    privacy_sensitive: false,
    safeguarding_sensitive: false,
    quality_flags: [],
    language_flags: [],
    privacy_flags: [],
    checklist_status: {},
    privacy_guard: {},
    redaction_summary: {},
    minimisation_summary: {},
    created_at: '',
    updated_at: '',
    metadata: {}
  })
}

export async function autosaveRecordingDraft(draftId: string, payload: RecordingDraftUpdatePayload) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}/autosave`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseEnvelope<RecordingDraftRecord>(response, {
    id: draftId,
    title: '',
    body: '',
    recording_type: payload.recording_type || 'daily-note',
    status: 'draft',
    review_status: 'not_required',
    manager_review_required: false,
    safeguarding_review_required: false,
    privacy_sensitive: false,
    safeguarding_sensitive: false,
    quality_flags: [],
    language_flags: [],
    privacy_flags: [],
    checklist_status: {},
    privacy_guard: {},
    redaction_summary: {},
    minimisation_summary: {},
    created_at: '',
    updated_at: '',
    metadata: {}
  })
}

export async function markRecordingDraftReadyForReview(draftId: string) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}/ready-for-review`, {
    method: 'POST',
    credentials: 'include'
  })
  return parseEnvelope<RecordingDraftRecord>(response, {
    id: draftId,
    title: '',
    body: '',
    recording_type: 'daily-note',
    status: 'ready_for_review',
    review_status: 'awaiting_review',
    manager_review_required: false,
    safeguarding_review_required: false,
    privacy_sensitive: false,
    safeguarding_sensitive: false,
    quality_flags: [],
    language_flags: [],
    privacy_flags: [],
    checklist_status: {},
    privacy_guard: {},
    redaction_summary: {},
    minimisation_summary: {},
    created_at: '',
    updated_at: '',
    metadata: {}
  })
}

function emptySubmissionResult(draftId: string): RecordingSubmissionResult {
  return {
    success: false,
    draft_id: draftId,
    submitted: false,
    formal_record_created: false,
    target_status: 'unsupported',
    review_required: false,
    safeguarding_review_required: false,
    warnings: ['Formal route is not fully wired yet.'],
    next_steps: []
  }
}

export async function listRecordingSubmissionTargets() {
  const response = await fetch('/recording-drafts/submission-targets', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingSubmissionTarget[]>(response, [])
}

export async function getRecordingSubmissionTarget(draftId: string) {
  const response = await fetch(
    `/recording-drafts/${encodeURIComponent(draftId)}/submission-target`,
    { credentials: 'include', cache: 'no-store' }
  )
  return parseEnvelope<{
    target: RecordingSubmissionTarget
    route_hint: string
    frontend_route?: string | null
  } | null>(response, null)
}

export async function submitRecordingDraft(draftId: string, payload?: RecordingDraftSubmitPayload) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}/submit`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  })
  const fallbackDraft: RecordingDraftRecord = {
    id: draftId,
    title: '',
    body: '',
    recording_type: 'daily-note',
    status: 'submitted',
    review_status: 'awaiting_review',
    manager_review_required: false,
    safeguarding_review_required: false,
    privacy_sensitive: false,
    safeguarding_sensitive: false,
    quality_flags: [],
    language_flags: [],
    privacy_flags: [],
    checklist_status: {},
    privacy_guard: {},
    redaction_summary: {},
    minimisation_summary: {},
    created_at: '',
    updated_at: '',
    metadata: {}
  }
  const parsed = await parseEnvelope<RecordingSubmissionResult & RecordingDraftSubmitData>(response, {
    ...emptySubmissionResult(draftId),
    draft: fallbackDraft,
    warning: 'Formal route is not fully wired yet.',
    formal_record_created: false
  } as RecordingSubmissionResult & RecordingDraftSubmitData)

  const raw = parsed.data
  const submission: RecordingSubmissionResult = {
    success: raw.success ?? true,
    draft_id: raw.draft_id || draftId,
    submitted: raw.submitted ?? true,
    formal_record_created: raw.formal_record_created ?? false,
    formal_record_type: raw.formal_record_type,
    linked_record_id: raw.linked_record_id,
    linked_chronology_id: raw.linked_chronology_id,
    target_status: raw.target_status || 'unsupported',
    review_required: raw.review_required ?? false,
    safeguarding_review_required: raw.safeguarding_review_required ?? false,
    warnings: raw.warnings?.length
      ? raw.warnings
      : raw.warning
        ? [raw.warning]
        : ['Formal route is not fully wired yet.'],
    next_steps: raw.next_steps || [],
    route_hint: raw.route_hint,
    frontend_route: (raw as { frontend_route?: string }).frontend_route,
    draft: raw.draft || fallbackDraft
  }

  const warning =
    submission.warnings[0] ||
    (submission.formal_record_created
      ? 'Formal record created successfully.'
      : 'Formal route is not fully wired yet.')

  return {
    ok: parsed.ok,
    error: parsed.error,
    data: {
      draft: submission.draft || fallbackDraft,
      warning,
      formal_record_created: submission.formal_record_created,
      linked_record_id: submission.linked_record_id,
      linked_chronology_id: submission.linked_chronology_id,
      submission
    } satisfies RecordingDraftSubmitData
  }
}

export async function archiveRecordingDraft(draftId: string) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}/archive`, {
    method: 'POST',
    credentials: 'include'
  })
  return parseEnvelope<RecordingDraftRecord>(response, {
    id: draftId,
    title: '',
    body: '',
    recording_type: 'daily-note',
    status: 'archived',
    review_status: 'not_required',
    manager_review_required: false,
    safeguarding_review_required: false,
    privacy_sensitive: false,
    safeguarding_sensitive: false,
    quality_flags: [],
    language_flags: [],
    privacy_flags: [],
    checklist_status: {},
    privacy_guard: {},
    redaction_summary: {},
    minimisation_summary: {},
    created_at: '',
    updated_at: '',
    metadata: {}
  })
}

export async function deleteRecordingDraft(draftId: string) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  return parseEnvelope<RecordingDraftRecord>(response, {
    id: draftId,
    title: '',
    body: '',
    recording_type: 'daily-note',
    status: 'deleted',
    review_status: 'not_required',
    manager_review_required: false,
    safeguarding_review_required: false,
    privacy_sensitive: false,
    safeguarding_sensitive: false,
    quality_flags: [],
    language_flags: [],
    privacy_flags: [],
    checklist_status: {},
    privacy_guard: {},
    redaction_summary: {},
    minimisation_summary: {},
    created_at: '',
    updated_at: '',
    metadata: {}
  })
}
