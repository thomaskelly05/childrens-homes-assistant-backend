export type ManagerDailyBriefItem = {
  id: string
  title: string
  safe_summary: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  route: string
  action_label?: string | null
  source: string
  child_id?: number | null
  child_name?: string | null
  metadata?: Record<string, unknown>
}

export type ManagerDailyBriefSection = {
  id: string
  title: string
  summary: string
  items: ManagerDailyBriefItem[]
  route: string
  action_label?: string | null
  tone: 'neutral' | 'attention' | 'urgent' | 'positive'
  metadata?: Record<string, unknown>
}

export type ManagerDailyBrief = {
  generated_at: string
  date: string
  scope: { type: string; home_id?: number | null; user_id?: string | null; provider_id?: number | null }
  title: string
  opening_summary: string
  recording_summary: string
  review_summary: string
  safeguarding_summary: string
  isn_summary?: string
  action_summary: string
  child_journey_summary: string
  handover_summary: string
  workforce_summary?: string
  sccif_summary?: string
  sections: ManagerDailyBriefSection[]
  recommendations: string[]
  limitations: string[]
  privacy_notice: string
  orb_prompts: Array<{ label: string; mode: string; query: string }>
  routes: {
    alerts: string
    reviews: string
    governance: string
    actions: string
    handover: string
    handover_reviews: string
    briefing: string
    care_hub: string
    orb: string
    isn?: string
    isn_orb?: string
  }
  metadata?: Record<string, unknown>
  reviewed?: boolean
  reviewed_at?: string | null
}

type ApiEnvelope<T> = { success?: boolean; data?: T }

const EMPTY_BRIEF: ManagerDailyBrief = {
  generated_at: '',
  date: '',
  scope: { type: 'user' },
  title: 'Manager daily brief',
  opening_summary: '',
  recording_summary: '',
  review_summary: '',
  safeguarding_summary: '',
  action_summary: '',
  child_journey_summary: '',
  handover_summary: '',
  sections: [],
  recommendations: [],
  limitations: [],
  privacy_notice: '',
  orb_prompts: [],
  routes: {
    alerts: '/record/alerts',
    reviews: '/record/reviews',
    governance: '/record/governance',
    actions: '/actions',
    handover: '/handover',
    handover_reviews: '/handover/reviews',
    briefing: '/command-centre/briefing',
    care_hub: '/command-centre',
    orb: '/assistant/orb?mode=manager_daily_brief'
  }
}

async function parseEnvelope<T>(response: Response, fallback: T): Promise<{ data: T; ok: boolean }> {
  if (!response.ok) return { data: fallback, ok: false }
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | T
  const envelope = payload as ApiEnvelope<T>
  return {
    data: envelope && typeof envelope === 'object' && 'data' in envelope ? (envelope.data as T) : (payload as T),
    ok: true
  }
}

export async function getManagerDailyBriefHealth() {
  const response = await fetch('/api/manager-daily-brief/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, { status: 'unavailable', service: 'manager_daily_brief_service' })
}

export async function getManagerDailyBrief() {
  const response = await fetch('/api/manager-daily-brief', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, EMPTY_BRIEF)
}

export async function markManagerDailyBriefReviewed(body?: { date?: string; note?: string }) {
  const response = await fetch('/api/manager-daily-brief/mark-reviewed', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })
  return parseEnvelope(response, { ok: false, reviewed: false, reviewed_at: '', date: '', message: '' })
}

/** Operational ORB only — never pass brief payload in URL. */
export function managerBriefOrbHref(mode: string, query?: string) {
  const params = new URLSearchParams({ mode })
  if (query) params.set('q', query)
  return `/assistant/orb?${params.toString()}`
}
