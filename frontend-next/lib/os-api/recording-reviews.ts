'use client'

export type RecordingReviewDecision =
  | 'approve'
  | 'request_changes'
  | 'mark_safeguarding_escalation'
  | 'mark_reviewed'
  | 'submit_after_approval'
  | 'archive'

export type RecordingReviewStatus =
  | 'awaiting_review'
  | 'changes_requested'
  | 'approved'
  | 'safeguarding_escalation_required'
  | 'reviewed'
  | 'submitted'
  | 'archived'

export type RecordingReviewPriority = 'low' | 'medium' | 'high' | 'urgent'

export type RecordingReviewQueueItem = {
  draft_id: string
  title: string
  recording_type: string
  form_id?: string | null
  category?: string | null
  child_id?: number | null
  child_name?: string | null
  home_id?: number | null
  created_by_user_id?: string | null
  created_by_name?: string | null
  created_by_role?: string | null
  status: string
  review_status: string
  review_priority: RecordingReviewPriority
  manager_review_required: boolean
  safeguarding_review_required: boolean
  safeguarding_sensitive: boolean
  privacy_sensitive: boolean
  quality_flags: string[]
  language_flags: string[]
  privacy_flags: string[]
  checklist_status: Record<string, unknown>
  created_at: string
  updated_at: string
  route_hint?: string | null
  formal_submit_supported: boolean
  metadata: Record<string, unknown>
}

export type RecordingReviewHealth = {
  status: string
  service: string
  storage_mode: string
  queue_count: number
  persistence_available: boolean
  operational_only: boolean
  standalone_access: boolean
  notice: string
}

export type RecordingReviewSummary = {
  awaiting_review: number
  safeguarding_review: number
  changes_requested: number
  approved: number
  urgent: number
  total_in_queue: number
}

export type RecordingReviewDetail = {
  draft: import('@/lib/os-api/recording-drafts').RecordingDraftRecord
  review_history: Array<{
    id: string
    draft_id: string
    decision: string
    comments?: string | null
    reviewer_name?: string | null
    new_review_status?: string | null
    created_at: string
  }>
  submission_target: Record<string, unknown>
  quality_summary: Record<string, unknown>
  privacy_summary: Record<string, unknown>
  suggested_review_prompts: string[]
  warnings: string[]
  next_steps: string[]
}

export type RecordingReviewActionPayload = {
  decision: RecordingReviewDecision
  comments?: string
  reviewer_name?: string
  reviewer_role?: string
  confirm_reviewed?: boolean
  submit_after_approval?: boolean
  create_action_if_required?: boolean
  metadata?: Record<string, unknown>
}

export type RecordingReviewActionResult = {
  success: boolean
  draft_id: string
  decision: RecordingReviewDecision
  review_status: string
  comments?: string | null
  submitted?: boolean
  formal_record_created?: boolean
  formal_record_type?: string | null
  linked_record_id?: string | null
  linked_archive_record_id?: string | null
  linked_chronology_id?: string | null
  linked_plan_impact_ids?: string[]
  lifeecho_suggestion_ids?: string[]
  lifecycle_warnings?: string[]
  lifecycle_next_steps?: string[]
  sign_off_completed?: boolean
  sign_off_status?: string | null
  can_create_formal_record?: boolean
  formal_route_status?: string | null
  warnings: string[]
  next_steps: string[]
  audit_reference?: string | null
  metadata?: Record<string, unknown>
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

export const MANAGER_JUDGEMENT_NOTICE = 'AI supports review. Manager judgement remains required.'

export async function getRecordingReviewHealth() {
  const response = await fetch('/recording-reviews/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingReviewHealth>(response, {
    status: 'unavailable',
    service: 'recording_review_service',
    storage_mode: 'memory',
    queue_count: 0,
    persistence_available: false,
    operational_only: true,
    standalone_access: false,
    notice: MANAGER_JUDGEMENT_NOTICE
  })
}

export async function listRecordingReviewQueue(params?: {
  review_status?: string
  safeguarding_only?: boolean
  manager_review_only?: boolean
  changes_requested_only?: boolean
  approved_only?: boolean
  urgent_only?: boolean
  child_id?: number
  home_id?: number
  recording_type?: string
  mine_only?: boolean
  limit?: number
  offset?: number
}) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-reviews/queue${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<{ items: RecordingReviewQueueItem[]; total: number }>(response, {
    items: [],
    total: 0
  })
}

export async function getRecordingReviewSummary() {
  const response = await fetch('/recording-reviews/summary', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingReviewSummary>(response, {
    awaiting_review: 0,
    safeguarding_review: 0,
    changes_requested: 0,
    approved: 0,
    urgent: 0,
    total_in_queue: 0
  })
}

export async function getRecordingReviewDetail(draftId: string) {
  const response = await fetch(`/recording-reviews/${encodeURIComponent(draftId)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingReviewDetail | null>(response, null)
}

export async function applyRecordingReviewAction(draftId: string, payload: RecordingReviewActionPayload) {
  const response = await fetch(`/recording-reviews/${encodeURIComponent(draftId)}/action`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseEnvelope<RecordingReviewActionResult>(response, {
    success: false,
    draft_id: draftId,
    decision: payload.decision,
    review_status: 'awaiting_review',
    warnings: ['Review action failed.'],
    next_steps: []
  })
}

export type OperationalOrbReviewMode =
  | 'record_quality_review'
  | 'safeguarding_themes'
  | 'plan_impact_review'
  | 'archive_summary'
  | 'lifeecho_memory_support'

/** Operational ORB review modes — never pass draft body in URL. */
export function operationalOrbReviewHref(
  mode: OperationalOrbReviewMode,
  options?: { query?: string; childId?: string }
) {
  const params = new URLSearchParams({ mode, scope: 'child' })
  if (options?.childId) params.set('young_person_id', options.childId)
  if (options?.query) params.set('q', options.query)
  return `/assistant/orb?${params.toString()}`
}
