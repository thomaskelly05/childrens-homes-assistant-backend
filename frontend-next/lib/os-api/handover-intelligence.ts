'use client'

export type HandoverPriority = 'low' | 'medium' | 'high' | 'urgent'

export type HandoverIntelligenceItem = {
  id: string
  title: string
  safe_summary: string
  section_type: string
  priority: HandoverPriority
  source: string
  route: string
  action_label?: string | null
  child_id?: number | null
  child_name?: string | null
  safeguarding_sensitive?: boolean
  manager_review_required?: boolean
  metadata?: Record<string, unknown>
}

export type HandoverIntelligenceSection = {
  id: string
  title: string
  section_type: string
  summary: string
  items: HandoverIntelligenceItem[]
  warnings?: string[]
  route: string
  action_label?: string | null
  metadata?: Record<string, unknown>
}

export type HandoverIntelligenceDashboard = {
  generated_at: string
  scope: { type: string; home_id?: number | null; child_id?: number | null; user_id?: string | null }
  shift_label: string
  home_id?: number | null
  child_id?: number | null
  summary: string
  sections: HandoverIntelligenceSection[]
  urgent_count: number
  safeguarding_count: number
  review_count: number
  action_count: number
  recording_alert_count: number
  isn_count: number
  recommendations: string[]
  privacy_notice: string
  limitations: string[]
  orb_prompts: Array<{ label: string; mode: string; query: string }>
  routes: Record<string, string>
  metadata?: Record<string, unknown>
}

export type HandoverDraftSection = {
  id: string
  title: string
  body: string
  prompts?: string[]
  intelligence_item_ids?: string[]
}

export type HandoverDraftRecord = {
  id: string
  title: string
  scope: string
  shift_label?: string | null
  child_id?: number | null
  child_name?: string | null
  home_id?: number | null
  body: string
  sections: HandoverDraftSection[]
  status: 'draft' | 'ready_for_review' | 'completed' | 'archived'
  warnings?: string[]
  created_at: string
  updated_at: string
}

type ApiEnvelope<T> = { success?: boolean; data?: T }

async function parseEnvelope<T>(response: Response, fallback: T): Promise<{ data: T; ok: boolean }> {
  if (!response.ok) return { data: fallback, ok: false }
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | T
  const envelope = payload as ApiEnvelope<T>
  return {
    data: envelope && typeof envelope === 'object' && 'data' in envelope ? (envelope.data as T) : (payload as T),
    ok: true
  }
}

const EMPTY_DASHBOARD: HandoverIntelligenceDashboard = {
  generated_at: '',
  scope: { type: 'home' },
  shift_label: 'Current shift',
  summary: '',
  sections: [],
  urgent_count: 0,
  safeguarding_count: 0,
  review_count: 0,
  action_count: 0,
  recording_alert_count: 0,
  isn_count: 0,
  recommendations: [],
  privacy_notice: '',
  limitations: [],
  orb_prompts: [],
  routes: {
    handover: '/handover',
    alerts: '/record/alerts',
    reviews: '/record/reviews',
    governance: '/record/governance',
    safeguarding: '/safeguarding',
    briefing: '/command-centre/briefing',
    care_hub: '/command-centre',
    actions: '/actions',
    orb: '/assistant/orb?mode=manager_daily_brief'
  }
}

export async function getHandoverHealth() {
  const response = await fetch('/api/handover/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, { status: 'unavailable', service: 'handover_intelligence_service' })
}

export async function getHandoverIntelligence(params?: {
  child_id?: number
  home_id?: number
  shift_label?: string
}) {
  const search = new URLSearchParams()
  if (params?.child_id != null) search.set('child_id', String(params.child_id))
  if (params?.home_id != null) search.set('home_id', String(params.home_id))
  if (params?.shift_label) search.set('shift_label', params.shift_label)
  const qs = search.toString()
  const response = await fetch(`/api/handover/intelligence${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, EMPTY_DASHBOARD)
}

export async function listHandoverDrafts(params?: { status?: string; child_id?: number; limit?: number }) {
  const search = new URLSearchParams()
  if (params?.status) search.set('status', params.status)
  if (params?.child_id != null) search.set('child_id', String(params.child_id))
  if (params?.limit != null) search.set('limit', String(params.limit))
  const qs = search.toString()
  const response = await fetch(`/api/handover/drafts${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { items: [], total: 0, storage_mode: 'memory' })
}

export async function createHandoverDraft(body: {
  title?: string
  scope?: string
  shift_label?: string
  child_id?: number
  home_id?: number
  body?: string
  sections?: HandoverDraftSection[]
}) {
  const response = await fetch('/api/handover/drafts', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return parseEnvelope(response, { success: false, draft_id: '', status: 'draft', title: '', body: '', sections: [], warnings: [], next_steps: [], route: '/handover' })
}

export async function getHandoverDraft(draftId: string) {
  const response = await fetch(`/api/handover/drafts/${encodeURIComponent(draftId)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, null as unknown as HandoverDraftRecord)
}

export async function updateHandoverDraft(
  draftId: string,
  body: Partial<{ title: string; body: string; sections: HandoverDraftSection[]; shift_label: string }>
) {
  const response = await fetch(`/api/handover/drafts/${encodeURIComponent(draftId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return parseEnvelope(response, { success: false, draft_id: draftId, status: 'draft', title: '', body: '', sections: [], warnings: [], next_steps: [], route: '/handover' })
}

export async function markHandoverReadyForReview(draftId: string) {
  const response = await fetch(`/api/handover/drafts/${encodeURIComponent(draftId)}/ready-for-review`, {
    method: 'POST',
    credentials: 'include'
  })
  return parseEnvelope(response, { success: false, draft_id: draftId, status: 'ready_for_review', title: '', body: '', sections: [], warnings: [], next_steps: [], route: '/handover' })
}

export async function completeHandoverDraft(draftId: string) {
  const response = await fetch(`/api/handover/drafts/${encodeURIComponent(draftId)}/complete`, {
    method: 'POST',
    credentials: 'include'
  })
  return parseEnvelope(response, { success: false, draft_id: draftId, status: 'completed', title: '', body: '', sections: [], warnings: [], next_steps: [], route: '/handover' })
}

export async function archiveHandoverDraft(draftId: string) {
  const response = await fetch(`/api/handover/drafts/${encodeURIComponent(draftId)}/archive`, {
    method: 'POST',
    credentials: 'include'
  })
  return parseEnvelope(response, { success: false, draft_id: draftId, status: 'archived', title: '', body: '', sections: [], warnings: [], next_steps: [], route: '/handover' })
}

/** Operational ORB only — never pass handover payload in URL. */
export function handoverOrbHref(mode: string, query?: string) {
  const params = new URLSearchParams({ mode })
  if (query) params.set('q', query)
  return `/assistant/orb?${params.toString()}`
}
