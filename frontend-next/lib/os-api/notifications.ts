export type OsNotificationSeverity = 'low' | 'medium' | 'high' | 'urgent'

export type OsNotificationItem = {
  id: string
  type: string
  title: string
  safe_summary: string
  severity: OsNotificationSeverity
  status: string
  unread: boolean
  route: string
  action_label?: string | null
  source: string
  created_at: string
  category?: string | null
  metadata?: Record<string, unknown>
}

export type OsNotificationFeed = {
  items: OsNotificationItem[]
  unread: number
  urgent: number
  recording_alert_count: number
  daily_brief_unread: boolean
  categories: Record<string, number>
  privacy_notice: string
  limitations: string[]
  available: boolean
}

type ApiEnvelope<T> = { success?: boolean; data?: T }

const EMPTY_FEED: OsNotificationFeed = {
  items: [],
  unread: 0,
  urgent: 0,
  recording_alert_count: 0,
  daily_brief_unread: false,
  categories: {},
  privacy_notice: '',
  limitations: [],
  available: false
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

export async function getOperationalNotificationFeed(params?: { unread_only?: boolean; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.unread_only) qs.set('unread_only', 'true')
  if (params?.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const response = await fetch(`/api/notifications/operational-feed${suffix}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, EMPTY_FEED)
}

export async function getOperationalNotificationFeedHealth() {
  const response = await fetch('/api/notifications/operational-feed/health', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { status: 'unavailable', service: 'os_notification_adapter_service' })
}
