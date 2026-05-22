'use client'

import type {
  IntelligenceActionCreatePayload,
  IntelligenceActionDecisionPayload,
  IntelligenceActionRecord,
  IntelligenceActionsListData,
  IntelligenceActionSummary,
  IntelligenceAttentionFeed,
  IntelligenceOversightReviewCreatePayload
} from './intelligence-actions-types'

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

function queryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export async function clientFetchIntelligenceActions(params: {
  home_id?: string
  child_id?: string
  staff_id?: string
  status?: string
  limit?: number
}) {
  const qs = queryString(params)
  const response = await fetch(`/intelligence/actions${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<IntelligenceActionsListData>(response, { actions: [], total: 0, persistence_available: false })
}

export async function clientFetchIntelligenceActionSummary(params: {
  home_id?: string
  child_id?: string
  staff_id?: string
}) {
  const qs = queryString(params)
  const response = await fetch(`/intelligence/actions/summary${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<{ summary: IntelligenceActionSummary; action_notice?: string }>(response, {
    summary: { total: 0, by_status: {}, by_priority: {}, by_type: {}, urgent_count: 0, proposed_count: 0 }
  })
}

export async function clientDecideIntelligenceAction(actionId: string, payload: IntelligenceActionDecisionPayload) {
  const response = await fetch(`/intelligence/actions/${encodeURIComponent(actionId)}/decision`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseEnvelope<IntelligenceActionRecord>(response, {
    id: actionId,
    action_type: 'manager_signoff',
    title: '',
    priority: 'medium',
    status: 'proposed'
  })
}

export async function clientCompleteIntelligenceAction(actionId: string, completionNotes?: string) {
  const response = await fetch(`/intelligence/actions/${encodeURIComponent(actionId)}/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completion_notes: completionNotes ?? null })
  })
  return parseEnvelope<IntelligenceActionRecord>(response, {
    id: actionId,
    action_type: 'manager_signoff',
    title: '',
    priority: 'medium',
    status: 'completed'
  })
}

export async function clientBulkCreateIntelligenceActions(payload: {
  actions: IntelligenceActionCreatePayload[]
  home_id?: string
  child_id?: string
  staff_id?: string
}) {
  const response = await fetch('/intelligence/actions/bulk-create', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseEnvelope<{
    created: IntelligenceActionRecord[]
    failed: Array<Record<string, unknown>>
    summary: IntelligenceActionSummary
  }>(response, { created: [], failed: [], summary: { total: 0, by_status: {}, by_priority: {}, by_type: {}, urgent_count: 0, proposed_count: 0 } })
}

export async function clientProposeAndPersistActions(payload: {
  spine: Record<string, unknown>
  home_id?: string
  child_id?: string
  staff_id?: string
}) {
  const response = await fetch('/intelligence/actions/propose', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, create_actions: true })
  })
  return parseEnvelope<{
    proposed_actions: IntelligenceActionRecord[]
    action_summary: IntelligenceActionSummary
    persisted?: boolean
  }>(response, {
    proposed_actions: [],
    action_summary: { total: 0, by_status: {}, by_priority: {}, by_type: {}, urgent_count: 0, proposed_count: 0 }
  })
}

export async function clientCreateOversightReview(payload: IntelligenceOversightReviewCreatePayload) {
  const response = await fetch('/intelligence/oversight-reviews', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return parseEnvelope<{ id: string; review_type: string; decision: string; decision_support_notice?: string }>(
    response,
    { id: '', review_type: '', decision: '' }
  )
}

export async function clientFetchAttentionFeed(params: { home_id?: string; child_id?: string; staff_id?: string }) {
  const qs = queryString(params)
  const response = await fetch(`/intelligence/actions/attention-feed${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<IntelligenceAttentionFeed>(response, {
    urgent: [],
    high_priority: [],
    awaiting_decision: [],
    follow_ups_due: [],
    summary: {}
  })
}
