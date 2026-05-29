import { applyCsrfHeaders, authFetchResponse, AuthApiError } from '@/lib/auth/api'

export const ORB_ADMIN_API_PATHS = {
  feedbackSummary: '/orb/admin/feedback/summary',
  feedbackItems: '/orb/admin/feedback/items',
  feedbackCandidates: '/orb/admin/feedback/candidates',
  billingUsage: '/orb/admin/billing/usage',
  billingMeter: '/orb/standalone/billing/meter'
} as const

export type OrbAdminFeedbackSummary = {
  total_feedback: number
  thumbs_up: number
  thumbs_down: number
  helpful_ratio: number
  downvotes_this_week: number
  source_citation_complaints: number
  unsafe_answer_complaints: number
  role_fit_complaints: number
  cost_this_month: number
  estimated_usage_this_month: number
  top_downvote_reasons: Array<{ reason: string; count: number }>
  top_modes_with_downvotes: Array<{ mode: string; count: number }>
  recurring_gaps: Array<{
    gap: string
    count: number
    affected_families: string[]
    suggested_action: string
  }>
  improvement_candidates: OrbImprovementCandidate[]
  usage_summary: OrbAdminUsageSummary
}

export type OrbImprovementCandidate = {
  candidate_id: string
  candidate_type: string
  status: 'pending' | 'approved' | 'rejected'
  source_feedback_ids: Array<number | string>
  proposed_change: Record<string, unknown>
  affected_family?: string | null
  affected_action?: string | null
  affected_source?: string | null
  reason_count: number
  confidence: number
  created_at?: string | null
  reviewed_by?: number | null
  reviewed_at?: string | null
  reviewer_note?: string | null
}

export type OrbFeedbackItem = {
  id: number | string
  rating: 'up' | 'down'
  reason?: string | null
  comment?: string | null
  mode?: string | null
  profile_role?: string | null
  prompt_tier?: string | null
  detected_family?: string | null
  action_id?: string | null
  document_lens?: string | null
  created_at?: string | null
  reviewed?: boolean
}

export type OrbAdminUsageSummary = {
  total_active_users: number
  total_requests: number
  estimated_total_cost: number
  top_cost_users: Array<{ user_id: number; estimated_cost: number; count: number }>
  top_cost_actions: Array<{ action_id: string; estimated_cost: number; count: number }>
  prompt_tier_split: Record<string, number>
  daily_usage_trend: Array<{ date: string; requests: number; estimated_cost: number }>
  budget_warnings: string[]
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Request failed'
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') message = body.detail
    } catch {
      /* ignore */
    }
    throw new AuthApiError(response.status, message)
  }
  const body = (await response.json()) as { success?: boolean; data?: T }
  return (body.data ?? body) as T
}

export async function fetchOrbAdminFeedbackSummary(days = 30) {
  const response = await authFetchResponse(`${ORB_ADMIN_API_PATHS.feedbackSummary}?days=${days}`, {
    credentials: 'include'
  })
  return parseResponse<OrbAdminFeedbackSummary>(response)
}

export async function fetchOrbAdminFeedbackItems(params: Record<string, string | number | boolean | undefined> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const response = await authFetchResponse(`${ORB_ADMIN_API_PATHS.feedbackItems}?${query.toString()}`, {
    credentials: 'include'
  })
  return parseResponse<{ items: OrbFeedbackItem[] }>(response)
}

export async function fetchOrbAdminCandidates(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const response = await authFetchResponse(`${ORB_ADMIN_API_PATHS.feedbackCandidates}${query}`, {
    credentials: 'include'
  })
  return parseResponse<{ candidates: OrbImprovementCandidate[] }>(response)
}

export async function fetchOrbAdminBillingUsage(days = 30) {
  const response = await authFetchResponse(`${ORB_ADMIN_API_PATHS.billingUsage}?days=${days}`, {
    credentials: 'include'
  })
  return parseResponse<OrbAdminUsageSummary>(response)
}

export async function approveOrbCandidate(candidateId: string, reviewerNote?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  applyCsrfHeaders(headers, 'POST')
  const response = await authFetchResponse(
    `/orb/admin/feedback/candidates/${encodeURIComponent(candidateId)}/approve`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ reviewer_note: reviewerNote || null })
    }
  )
  return parseResponse<OrbImprovementCandidate>(response)
}

export async function rejectOrbCandidate(candidateId: string, reviewerNote?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  applyCsrfHeaders(headers, 'POST')
  const response = await authFetchResponse(
    `/orb/admin/feedback/candidates/${encodeURIComponent(candidateId)}/reject`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ reviewer_note: reviewerNote || null })
    }
  )
  return parseResponse<OrbImprovementCandidate>(response)
}

export async function fetchOrbBillingMeter() {
  const response = await authFetchResponse(ORB_ADMIN_API_PATHS.billingMeter, { credentials: 'include' })
  return parseResponse<Record<string, unknown>>(response)
}
