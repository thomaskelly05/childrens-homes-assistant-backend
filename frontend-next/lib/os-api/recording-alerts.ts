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

export type RecordingAlertDigestTopItem = {
  id: string
  alert_type: string
  severity: RecordingAlertSeverity
  status: RecordingAlertStatus
  title: string
  safe_summary?: string
  action_label?: string | null
  route?: string | null
  due_at?: string | null
  child_name?: string | null
}

export type RecordingAlertDigest = {
  generated_at: string
  scope: 'user' | 'home' | 'provider'
  total_open: number
  urgent: number
  high: number
  safeguarding: number
  privacy: number
  changes_requested: number
  stale_drafts: number
  structured_missing: number
  formal_submission_gaps: number
  due_today: number
  overdue: number
  last_check_at?: string | null
  recommendations: string[]
  top_alerts: RecordingAlertDigestTopItem[]
  routes: {
    alerts: string
    governance: string
    reviews: string
    orb: string
  }
  privacy_notice: string
  limitations: string[]
  metadata?: Record<string, unknown>
}

export type RecordingAlertBadgeSummary = {
  total_open: number
  urgent: number
  safeguarding: number
  review_due: number
  changes_requested: number
  privacy_flags: number
  route: string
  label: string
  tone: 'neutral' | 'attention' | 'urgent'
  last_check_at?: string | null
}

export type RecordingAlertCheckRun = {
  run_id: string
  started_at: string
  completed_at?: string | null
  generated: number
  created: number
  updated: number
  skipped: number
  warnings: string[]
  triggered_by?: string | null
  dry_run: boolean
  metadata?: Record<string, unknown>
}

const EMPTY_DIGEST: RecordingAlertDigest = {
  generated_at: '',
  scope: 'provider',
  total_open: 0,
  urgent: 0,
  high: 0,
  safeguarding: 0,
  privacy: 0,
  changes_requested: 0,
  stale_drafts: 0,
  structured_missing: 0,
  formal_submission_gaps: 0,
  due_today: 0,
  overdue: 0,
  recommendations: [],
  top_alerts: [],
  routes: {
    alerts: '/record/alerts',
    governance: '/record/governance',
    reviews: '/record/reviews',
    orb: '/assistant/orb?mode=manager_daily_brief'
  },
  privacy_notice: 'This digest uses recording metadata and flags, not full record bodies.',
  limitations: []
}

const EMPTY_BADGE: RecordingAlertBadgeSummary = {
  total_open: 0,
  urgent: 0,
  safeguarding: 0,
  review_due: 0,
  changes_requested: 0,
  privacy_flags: 0,
  route: '/record/alerts',
  label: 'Recording alerts',
  tone: 'neutral'
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

export async function getRecordingAlertDigest(params?: {
  child_id?: number
  home_id?: number
  scope?: string
}) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-alerts/digest${qs}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingAlertDigest>(response, EMPTY_DIGEST)
}

export async function getRecordingAlertBadgeSummary(params?: {
  child_id?: number
  home_id?: number
}) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-alerts/badge-summary${qs}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingAlertBadgeSummary>(response, EMPTY_BADGE)
}

export async function runRecordingAlertChecks(body?: {
  force?: boolean
  dry_run?: boolean
  child_id?: number
  home_id?: number
  scope?: string
}) {
  const response = await fetch('/recording-alerts/run-checks', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })
  return parseEnvelope<RecordingAlertCheckRun>(response, {
    run_id: '',
    started_at: '',
    generated: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    warnings: [],
    dry_run: false
  })
}

export async function getRecordingAlertLastCheck() {
  const response = await fetch('/recording-alerts/last-check', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingAlertCheckRun | null>(response, null)
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
  mode:
    | 'record_quality_review'
    | 'safeguarding_themes'
    | 'action_priority'
    | 'manager_daily_brief',
  query?: string
) {
  const params = new URLSearchParams({ mode })
  if (query) params.set('q', query)
  return `/assistant/orb?${params.toString()}`
}

export const RECORDING_ALERT_ORB_PROMPTS = [
  {
    label: 'Ask ORB for a recording oversight summary',
    mode: 'manager_daily_brief' as const,
    query: 'Give me a recording oversight summary for manager review today.'
  },
  {
    label: 'Ask ORB what needs manager review',
    mode: 'action_priority' as const,
    query: 'What recording items may need manager review?'
  },
  {
    label: 'Ask ORB how to prioritise recording alerts',
    mode: 'action_priority' as const,
    query: 'How should I prioritise recording follow-up and alerts?'
  },
  {
    label: 'Ask ORB about safeguarding-sensitive recording',
    mode: 'safeguarding_themes' as const,
    query: 'How should I handle safeguarding-sensitive recording alerts?'
  },
  {
    label: 'Ask ORB for recording quality themes',
    mode: 'record_quality_review' as const,
    query: 'What recording quality themes should I check before shift end?'
  }
] as const
