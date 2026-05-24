'use client'

export type RecordingAlertSeverity = 'low' | 'medium' | 'high' | 'urgent'
export type RecordingAlertStatus = 'open' | 'acknowledged' | 'assigned' | 'resolved' | 'archived'

export type RecordingAlertRecord = {
  id: string
  alert_type: string
  severity: RecordingAlertSeverity
  status: RecordingAlertStatus
  title: string
  description: string
  safe_summary: string
  draft_id?: string | null
  review_event_id?: string | null
  child_id?: number | null
  child_name?: string | null
  home_id?: number | null
  recording_type?: string | null
  form_id?: string | null
  source: string
  route?: string | null
  action_label?: string | null
  owner_user_id?: string | null
  owner_name?: string | null
  acknowledged_by?: string | null
  acknowledged_at?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  resolution_note?: string | null
  linked_action_id?: string | null
  due_at?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type RecordingAlertSummary = {
  open_count: number
  urgent_count: number
  safeguarding_count: number
  privacy_count: number
  changes_requested_count: number
  overdue_count: number
  stale_count: number
  by_severity: Record<string, number>
  by_type: Record<string, number>
  by_status: Record<string, number>
}

export type RecordingAlertHealth = {
  status: string
  service: string
  storage_mode: string
  alert_count: number
  persistence_available: boolean
  operational_only: boolean
  standalone_access: boolean
  degraded?: boolean
  warnings?: string[]
}

export type RecordingAlertGenerationResponse = {
  generated: number
  created: number
  updated: number
  skipped: number
  dry_run: boolean
  alerts: RecordingAlertRecord[]
  warnings: string[]
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

const EMPTY_SUMMARY: RecordingAlertSummary = {
  open_count: 0,
  urgent_count: 0,
  safeguarding_count: 0,
  privacy_count: 0,
  changes_requested_count: 0,
  overdue_count: 0,
  stale_count: 0,
  by_severity: {},
  by_type: {},
  by_status: {}
}

export async function getRecordingAlertHealth() {
  const response = await fetch('/recording-alerts/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingAlertHealth>(response, {
    status: 'unavailable',
    service: 'recording_alert_service',
    storage_mode: 'memory',
    alert_count: 0,
    persistence_available: false,
    operational_only: true,
    standalone_access: false
  })
}

export async function listRecordingAlerts(params?: {
  status?: string
  severity?: string
  alert_type?: string
  child_id?: number
  home_id?: number
  draft_id?: string
  safeguarding_only?: boolean
  limit?: number
  offset?: number
}) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-alerts${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<{ items: RecordingAlertRecord[]; total: number }>(response, { items: [], total: 0 })
}

export async function getRecordingAlertSummary(params?: { child_id?: number; home_id?: number }) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-alerts/summary${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingAlertSummary>(response, EMPTY_SUMMARY)
}

export async function generateRecordingAlerts(body?: {
  child_id?: number
  home_id?: number
  force?: boolean
  dry_run?: boolean
}) {
  const response = await fetch('/recording-alerts/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })
  return parseEnvelope<RecordingAlertGenerationResponse>(response, {
    generated: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    dry_run: false,
    alerts: [],
    warnings: []
  })
}

export async function getRecordingAlert(alertId: string) {
  const response = await fetch(`/recording-alerts/${encodeURIComponent(alertId)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingAlertRecord | null>(response, null)
}

export async function applyRecordingAlertAction(
  alertId: string,
  body: {
    action: 'acknowledge' | 'assign' | 'resolve' | 'archive' | 'reopen' | 'create_intelligence_action'
    note?: string
    owner_user_id?: string
    owner_name?: string
    create_action?: boolean
  }
) {
  const response = await fetch(`/recording-alerts/${encodeURIComponent(alertId)}/action`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return parseEnvelope<{
    success: boolean
    alert?: RecordingAlertRecord
    linked_action_id?: string
    warning?: string
    message?: string
  }>(response, { success: false })
}

/** Operational ORB modes for recording alerts — never pass draft/child IDs in URL. */
export function operationalOrbAlertHref(
  mode: 'record_quality_review' | 'safeguarding_themes' | 'action_priority',
  query?: string
) {
  const params = new URLSearchParams({ mode })
  if (query) params.set('q', query)
  return `/assistant/orb?${params.toString()}`
}

export const RECORDING_ALERT_ORB_PROMPTS = [
  { label: 'Ask ORB what recording alerts mean', query: 'What do recording alerts mean for manager oversight?' },
  { label: 'Ask ORB what needs manager review', query: 'What recording items may need manager review?' },
  { label: 'Ask ORB how to prioritise recording follow-up', query: 'How should I prioritise recording follow-up?' },
  { label: 'Ask ORB about safeguarding-sensitive alerts', query: 'How should I handle safeguarding-sensitive recording alerts?' }
] as const
