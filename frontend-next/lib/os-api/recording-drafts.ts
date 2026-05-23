'use client'

export type RecordingDraftStatus = 'draft' | 'ready_for_review' | 'submitted' | 'archived' | 'deleted'

export type RecordingDraftReviewStatus =
  | 'not_required'
  | 'manager_review_required'
  | 'safeguarding_review_required'
  | 'awaiting_review'
  | 'reviewed'

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
}

export type RecordingDraftUpdatePayload = Partial<RecordingDraftCreatePayload> & {
  status?: RecordingDraftStatus
  review_status?: RecordingDraftReviewStatus
}

export type RecordingDraftSubmitPayload = {
  submitted_to?: string
  target_workflow?: string
  metadata?: Record<string, unknown>
}

export type RecordingDraftSubmitData = {
  draft: RecordingDraftRecord
  warning: string
  formal_record_created: boolean
  linked_record_id?: string | null
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

export async function submitRecordingDraft(draftId: string, payload?: RecordingDraftSubmitPayload) {
  const response = await fetch(`/recording-drafts/${encodeURIComponent(draftId)}/submit`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  })
  return parseEnvelope<RecordingDraftSubmitData>(response, {
    draft: {
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
    },
    warning: 'Formal record submission integration is not fully wired yet.',
    formal_record_created: false
  })
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
