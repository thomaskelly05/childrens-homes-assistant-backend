import 'server-only'

import { osServerGet, osServerPost } from './server-client'
import type {
  IntelligenceActionCreatePayload,
  IntelligenceActionDecisionPayload,
  IntelligenceActionRecord,
  IntelligenceActionsListData,
  IntelligenceActionSummary,
  IntelligenceAttentionFeed,
  IntelligenceOversightReviewCreatePayload
} from './intelligence-actions-types'
import type { OsApiResult } from './types'

export type {
  IntelligenceActionCreatePayload,
  IntelligenceActionDecisionPayload,
  IntelligenceActionRecord,
  IntelligenceActionsListData,
  IntelligenceActionSummary,
  IntelligenceAttentionFeed,
  IntelligenceOversightReviewCreatePayload
} from './intelligence-actions-types'

const emptyList: IntelligenceActionsListData = {
  actions: [],
  total: 0,
  persistence_available: false
}

const emptySummary: IntelligenceActionSummary = {
  total: 0,
  by_status: {},
  by_priority: {},
  by_type: {},
  urgent_count: 0,
  proposed_count: 0
}

const emptyFeed: IntelligenceAttentionFeed = {
  urgent: [],
  high_priority: [],
  awaiting_decision: [],
  follow_ups_due: [],
  in_progress_due: [],
  summary: {}
}

function queryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function fetchIntelligenceActions(params: {
  home_id?: string | number | null
  child_id?: string | number | null
  staff_id?: string | number | null
  status?: string | null
  limit?: number
}): Promise<OsApiResult<IntelligenceActionsListData>> {
  const qs = queryString({
    home_id: params.home_id ?? undefined,
    child_id: params.child_id ?? undefined,
    staff_id: params.staff_id ?? undefined,
    status: params.status ?? undefined,
    limit: params.limit ?? 100
  })
  return osServerGet<IntelligenceActionsListData>(`/intelligence/actions${qs}`, emptyList)
}

export function fetchIntelligenceActionSummary(params: {
  home_id?: string | number | null
  child_id?: string | number | null
  staff_id?: string | number | null
}): Promise<OsApiResult<{ summary: IntelligenceActionSummary; action_notice?: string }>> {
  const qs = queryString({
    home_id: params.home_id ?? undefined,
    child_id: params.child_id ?? undefined,
    staff_id: params.staff_id ?? undefined
  })
  return osServerGet<{ summary: IntelligenceActionSummary; action_notice?: string }>(
    `/intelligence/actions/summary${qs}`,
    { summary: emptySummary }
  )
}

export function proposeIntelligenceActions(payload: {
  spine?: Record<string, unknown>
  home_id?: string | number | null
  child_id?: string | number | null
  staff_id?: string | number | null
  create_actions?: boolean
}) {
  return osServerPost<{
    proposed_actions: IntelligenceActionRecord[]
    action_summary: IntelligenceActionSummary
    action_notice?: string
    persisted?: boolean
  }>('/intelligence/actions/propose', payload, {
    proposed_actions: [],
    action_summary: emptySummary
  })
}

export function createIntelligenceAction(payload: IntelligenceActionCreatePayload) {
  return osServerPost<IntelligenceActionRecord>('/intelligence/actions', payload, {
    id: '',
    action_type: 'manager_signoff',
    title: '',
    priority: 'medium',
    status: 'proposed'
  })
}

export function bulkCreateIntelligenceActions(payload: {
  actions: IntelligenceActionCreatePayload[]
  home_id?: string | null
  child_id?: string | null
  staff_id?: string | null
}) {
  return osServerPost<{
    created: IntelligenceActionRecord[]
    failed: Array<Record<string, unknown>>
    summary: IntelligenceActionSummary
    action_notice?: string
  }>('/intelligence/actions/bulk-create', payload, {
    created: [],
    failed: [],
    summary: emptySummary
  })
}

export function decideIntelligenceAction(actionId: string, decisionPayload: IntelligenceActionDecisionPayload) {
  return osServerPost<IntelligenceActionRecord>(
    `/intelligence/actions/${encodeURIComponent(actionId)}/decision`,
    decisionPayload,
    { id: actionId, action_type: 'manager_signoff', title: '', priority: 'medium', status: 'proposed' }
  )
}

export function completeIntelligenceAction(actionId: string, completionNotes?: string | null) {
  return osServerPost<IntelligenceActionRecord>(
    `/intelligence/actions/${encodeURIComponent(actionId)}/complete`,
    { completion_notes: completionNotes ?? null },
    { id: actionId, action_type: 'manager_signoff', title: '', priority: 'medium', status: 'completed' }
  )
}

export function createOversightReview(payload: IntelligenceOversightReviewCreatePayload) {
  return osServerPost<{
    id: string
    review_type: string
    decision: string
    decision_support_notice?: string
  }>('/intelligence/oversight-reviews', payload, { id: '', review_type: '', decision: '' })
}

export function fetchIntelligenceAttentionFeed(params: {
  home_id?: string | number | null
  child_id?: string | number | null
  staff_id?: string | number | null
}): Promise<OsApiResult<IntelligenceAttentionFeed>> {
  const qs = queryString({
    home_id: params.home_id ?? undefined,
    child_id: params.child_id ?? undefined,
    staff_id: params.staff_id ?? undefined
  })
  return osServerGet<IntelligenceAttentionFeed>(`/intelligence/actions/attention-feed${qs}`, emptyFeed)
}
