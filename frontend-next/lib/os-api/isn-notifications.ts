export type IsnDigestTopItem = {
  id: string
  title: string
  safe_summary: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
  type: string
  route: string
  action_label?: string | null
  status: string
}

export type IsnDigest = {
  generated_at: string
  available: boolean
  total_open: number
  urgent: number
  high: number
  review_required: number
  escalation_required: number
  follow_up_due: number
  network_updates: number
  linked_recording_alerts: number
  top_items: IsnDigestTopItem[]
  recommendations: string[]
  routes: {
    safeguarding: string
    alerts: string
    recording_alerts: string
    orb: string
    care_hub: string
    briefing: string
  }
  privacy_notice: string
  limitations: string[]
}

export type IsnBadgeSummary = {
  unread: number
  urgent: number
  review_required: number
  available: boolean
}

type ApiEnvelope<T> = { success?: boolean; data?: T }

const EMPTY_DIGEST: IsnDigest = {
  generated_at: '',
  available: false,
  total_open: 0,
  urgent: 0,
  high: 0,
  review_required: 0,
  escalation_required: 0,
  follow_up_due: 0,
  network_updates: 0,
  linked_recording_alerts: 0,
  top_items: [],
  recommendations: [],
  routes: {
    safeguarding: '/safeguarding',
    alerts: '/safeguarding',
    recording_alerts: '/record/alerts',
    orb: '/assistant/orb?mode=safeguarding_themes',
    care_hub: '/command-centre',
    briefing: '/command-centre/briefing'
  },
  privacy_notice: '',
  limitations: []
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

export async function getIsnNotificationHealth() {
  const response = await fetch('/api/isn/notifications/health', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { status: 'unavailable', service: 'isn_digest_service' })
}

export async function getIsnDigest() {
  const response = await fetch('/api/isn/notifications/digest', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, EMPTY_DIGEST)
}

export async function getIsnBadgeSummary() {
  const response = await fetch('/api/isn/notifications/badge-summary', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { unread: 0, urgent: 0, review_required: 0, available: false })
}

export async function listIsnNotificationItems(limit = 30) {
  const response = await fetch(`/api/isn/notifications/items?limit=${limit}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, [] as IsnDigestTopItem[])
}

export function isnOrbHref(mode = 'safeguarding_themes', query?: string) {
  const params = new URLSearchParams({ mode })
  if (query) params.set('q', query)
  return `/assistant/orb?${params.toString()}`
}
