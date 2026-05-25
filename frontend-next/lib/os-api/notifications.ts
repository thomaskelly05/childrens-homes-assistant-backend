export type OsNotificationSeverity = 'low' | 'medium' | 'high' | 'urgent'

export type OsNotificationSource =
  | 'recording_alert'
  | 'recording_alerts'
  | 'isn'
  | 'manager_daily_brief'
  | 'recording_review'
  | 'intelligence_action'
  | 'governance'
  | 'connect'
  | 'system'

export type OsNotificationCategory =
  | 'recording'
  | 'safeguarding_network'
  | 'daily_brief'
  | 'review'
  | 'action'
  | 'governance'
  | 'handover'
  | 'system'

export type OsNotificationStatus =
  | 'unread'
  | 'read'
  | 'acknowledged'
  | 'assigned'
  | 'resolved'
  | 'archived'

export type OsNotificationActionType =
  | 'mark_read'
  | 'mark_unread'
  | 'acknowledge'
  | 'assign'
  | 'resolve'
  | 'archive'
  | 'reopen'

export type OsNotificationItem = {
  id: string
  notification_key?: string | null
  type: string
  title: string
  safe_summary: string
  severity: OsNotificationSeverity
  status: OsNotificationStatus | string
  unread: boolean
  route: string
  action_label?: string | null
  source: OsNotificationSource | string
  category?: OsNotificationCategory | string | null
  related_id?: string | null
  related_type?: string | null
  child_id?: number | null
  child_name?: string | null
  home_id?: number | null
  owner_user_id?: string | null
  owner_name?: string | null
  created_at: string
  read_at?: string | null
  acknowledged_at?: string | null
  resolved_at?: string | null
  metadata?: Record<string, unknown>
  metadata_only?: boolean
  no_raw_body?: boolean
}

export type OsNotificationFeed = {
  items: OsNotificationItem[]
  unread: number
  unread_count?: number
  urgent: number
  urgent_count?: number
  recording_alert_count: number
  recording_count?: number
  isn_count?: number
  daily_brief_unread: boolean
  daily_brief_count?: number
  review_count?: number
  action_count?: number
  governance_count?: number
  generated_at?: string
  categories: Record<string, number>
  privacy_notice: string
  limitations: string[]
  available: boolean
  metadata?: Record<string, unknown>
}

export type OsNotificationSummary = {
  unread_count: number
  urgent_count: number
  recording_count: number
  isn_count: number
  daily_brief_count: number
  review_count: number
  action_count: number
  governance_count: number
  generated_at: string
  available: boolean
}

export type OsNotificationActionRequest = {
  action: OsNotificationActionType
  note?: string | null
  owner_user_id?: string | null
  owner_name?: string | null
  metadata?: Record<string, unknown>
}

export type OsNotificationActionResponse = {
  success: boolean
  notification_key: string
  action: string
  status: string
  unread: boolean
  message?: string | null
  warning?: string | null
  synced_to_source?: boolean
}

type ApiEnvelope<T> = { success?: boolean; data?: T }

const EMPTY_FEED: OsNotificationFeed = {
  items: [],
  unread: 0,
  urgent: 0,
  recording_alert_count: 0,
  isn_count: 0,
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

function encodeNotificationKey(key: string) {
  return encodeURIComponent(key)
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

export async function getOperationalNotificationSummary() {
  const response = await fetch('/api/notifications/operational-summary', {
    credentials: 'include',
    cache: 'no-store'
  })
  const fallback: OsNotificationSummary = {
    unread_count: 0,
    urgent_count: 0,
    recording_count: 0,
    isn_count: 0,
    daily_brief_count: 0,
    review_count: 0,
    action_count: 0,
    governance_count: 0,
    generated_at: '',
    available: false
  }
  return parseEnvelope(response, fallback)
}

export async function applyOperationalNotificationAction(
  notificationKey: string,
  action: OsNotificationActionRequest
) {
  const response = await fetch(`/api/notifications/${encodeNotificationKey(notificationKey)}/action`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action)
  })
  const fallback: OsNotificationActionResponse = {
    success: false,
    notification_key: notificationKey,
    action: action.action,
    status: 'unread',
    unread: true
  }
  return parseEnvelope(response, fallback)
}

export async function markAllOperationalNotificationsRead(notificationKeys?: string[]) {
  const response = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification_keys: notificationKeys || [] })
  })
  return parseEnvelope(response, { ok: false, updated: 0, warnings: [] as string[] })
}

export async function getOperationalNotificationFeedHealth() {
  const response = await fetch('/api/notifications/operational-feed/health', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { status: 'unavailable', service: 'os_notification_adapter_service' })
}

export type NotificationPreferenceRule = {
  id: string
  scope?: string
  scope_id?: string | null
  role?: string | null
  source: string
  category: string
  enabled: boolean
  min_severity: OsNotificationSeverity
  in_app_enabled: boolean
  email_enabled: boolean
  push_enabled: boolean
  urgent_override: boolean
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
  metadata?: Record<string, unknown>
}

export type NotificationPreferenceSet = {
  scope: string
  scope_id?: string | null
  role?: string | null
  rules: NotificationPreferenceRule[]
  urgent_safeguarding_always_on: boolean
  limitations: string[]
  updated_at?: string | null
}

export type NotificationPreferenceResponse = {
  preferences: NotificationPreferenceSet
  role_defaults: NotificationPreferenceRule[]
  effective_rules: NotificationPreferenceRule[]
  limitations: string[]
  push_email_status: string
}

export type NotificationEscalationRule = {
  id: string
  name: string
  source: string
  category: string
  min_severity: OsNotificationSeverity
  status: string
  trigger_after_minutes: number
  route_to_role?: string | null
  route_to_user_id?: string | null
  route_to_user_name?: string | null
  home_id?: number | null
  applies_to_safeguarding?: boolean
  applies_to_isn?: boolean
  applies_to_recording?: boolean
  urgent_override?: boolean
  metadata?: Record<string, unknown>
}

export type NotificationEscalationCandidate = {
  notification_key: string
  source: string
  category: string
  severity: OsNotificationSeverity
  title: string
  safe_summary: string
  route: string
  age_minutes: number
  current_status: string
  escalation_rule_id: string
  route_to_role?: string | null
  route_to_user_id?: string | null
  metadata?: Record<string, unknown>
}

export type NotificationEscalationCheckResult = {
  generated_at: string
  dry_run: boolean
  run_id?: string | null
  candidates: NotificationEscalationCandidate[]
  created_notifications: string[]
  candidate_count?: number
  event_count?: number
  urgent_count?: number
  safeguarding_count?: number
  recording_count?: number
  isn_count?: number
  daily_brief_count?: number
  warnings: string[]
  recommendations: string[]
  metadata?: Record<string, unknown>
}

export type NotificationEscalationRunRecord = {
  id: string
  triggered_by_user_id?: string | null
  triggered_by_name?: string | null
  home_id?: number | null
  dry_run: boolean
  started_at: string
  completed_at?: string | null
  candidate_count: number
  event_count: number
  urgent_count: number
  safeguarding_count: number
  recording_count: number
  isn_count: number
  daily_brief_count: number
  warnings: string[]
  recommendations: string[]
  metadata?: Record<string, unknown>
}

export type NotificationResponseMetric = {
  total_notifications: number
  unread: number
  acknowledged: number
  resolved: number
  archived: number
  urgent_unacknowledged: number
  safeguarding_unacknowledged: number
  average_minutes_to_read?: number | null
  average_minutes_to_acknowledge?: number | null
  average_minutes_to_resolve?: number | null
  oldest_unacknowledged_minutes?: number | null
  metadata?: Record<string, unknown>
}

export type NotificationGovernanceSummary = {
  generated_at: string
  feed_health: string
  preference_health: string
  escalation_health: string
  urgent_override_active: boolean
  push_configured: boolean
  email_configured: boolean
  last_escalation_check?: NotificationEscalationRunRecord | null
  response_metrics: NotificationResponseMetric
  unresolved_escalation_candidates: NotificationEscalationCandidate[]
  recommendations: string[]
  limitations: string[]
  metadata?: Record<string, unknown>
}

export type NotificationAutomationHealth = {
  status: string
  manual_checks_available: boolean
  scheduler_configured: boolean
  push_configured: boolean
  email_configured: boolean
  last_check_at?: string | null
  warnings: string[]
  metadata?: Record<string, unknown>
}

export async function getNotificationPreferencesHealth() {
  const response = await fetch('/api/notifications/preferences/health', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { status: 'unavailable', service: 'os_notification_preference_service' })
}

export async function getNotificationPreferences() {
  const response = await fetch('/api/notifications/preferences', {
    credentials: 'include',
    cache: 'no-store'
  })
  const fallback: NotificationPreferenceResponse = {
    preferences: {
      scope: 'user',
      rules: [],
      urgent_safeguarding_always_on: true,
      limitations: []
    },
    role_defaults: [],
    effective_rules: [],
    limitations: [],
    push_email_status: 'not_configured_yet'
  }
  return parseEnvelope(response, fallback)
}

export async function updateNotificationPreferences(payload: {
  rules: NotificationPreferenceRule[]
  urgent_safeguarding_always_on?: boolean
}) {
  const response = await fetch('/api/notifications/preferences', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const fallback: NotificationPreferenceResponse = {
    preferences: { scope: 'user', rules: [], urgent_safeguarding_always_on: true, limitations: [] },
    role_defaults: [],
    effective_rules: [],
    limitations: [],
    push_email_status: 'not_configured_yet'
  }
  return parseEnvelope(response, fallback)
}

export async function getNotificationEscalationHealth() {
  const response = await fetch('/api/notifications/escalations/health', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { status: 'unavailable', service: 'os_notification_escalation_service' })
}

export async function getNotificationEscalationRules() {
  const response = await fetch('/api/notifications/escalations/rules', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, [] as NotificationEscalationRule[])
}

export async function runNotificationEscalationCheck(params?: { dry_run?: boolean; force?: boolean }) {
  const response = await fetch('/api/notifications/escalations/check', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run: params?.dry_run ?? true, force: params?.force ?? false })
  })
  const fallback: NotificationEscalationCheckResult = {
    generated_at: '',
    dry_run: true,
    candidates: [],
    created_notifications: [],
    warnings: [],
    recommendations: []
  }
  return parseEnvelope(response, fallback)
}

export async function createOrUpdateNotificationEscalationRule(rule: NotificationEscalationRule) {
  const response = await fetch('/api/notifications/escalations/rules', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  })
  return parseEnvelope(response, rule)
}

export async function listNotificationEscalationRuns(params?: { home_id?: number; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.home_id) qs.set('home_id', String(params.home_id))
  if (params?.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const response = await fetch(`/api/notifications/escalations/runs${suffix}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, [] as NotificationEscalationRunRecord[])
}

export async function getLastNotificationEscalationRun() {
  const response = await fetch('/api/notifications/escalations/last-run', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, null as NotificationEscalationRunRecord | null)
}

export async function getNotificationAnalyticsHealth() {
  const response = await fetch('/api/notifications/analytics/health', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { status: 'unavailable', service: 'os_notification_analytics_service' })
}

export async function getNotificationResponseMetrics(params?: { home_id?: number; source?: string; category?: string }) {
  const qs = new URLSearchParams()
  if (params?.home_id) qs.set('home_id', String(params.home_id))
  if (params?.source) qs.set('source', params.source)
  if (params?.category) qs.set('category', params.category)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const response = await fetch(`/api/notifications/analytics/response-metrics${suffix}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  const fallback: NotificationResponseMetric = {
    total_notifications: 0,
    unread: 0,
    acknowledged: 0,
    resolved: 0,
    archived: 0,
    urgent_unacknowledged: 0,
    safeguarding_unacknowledged: 0
  }
  return parseEnvelope(response, fallback)
}

export async function getNotificationGovernanceSummary(params?: { home_id?: number }) {
  const qs = new URLSearchParams()
  if (params?.home_id) qs.set('home_id', String(params.home_id))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const response = await fetch(`/api/notifications/analytics/governance-summary${suffix}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  const fallback: NotificationGovernanceSummary = {
    generated_at: '',
    feed_health: 'degraded',
    preference_health: 'degraded',
    escalation_health: 'degraded',
    urgent_override_active: true,
    push_configured: false,
    email_configured: false,
    response_metrics: {
      total_notifications: 0,
      unread: 0,
      acknowledged: 0,
      resolved: 0,
      archived: 0,
      urgent_unacknowledged: 0,
      safeguarding_unacknowledged: 0
    },
    unresolved_escalation_candidates: [],
    recommendations: [],
    limitations: ['Governance summary unavailable.']
  }
  return parseEnvelope(response, fallback)
}

export async function getNotificationAutomationHealth() {
  const response = await fetch('/api/notifications/automation/health', {
    credentials: 'include',
    cache: 'no-store'
  })
  const fallback: NotificationAutomationHealth = {
    status: 'degraded',
    manual_checks_available: true,
    scheduler_configured: false,
    push_configured: false,
    email_configured: false,
    warnings: []
  }
  return parseEnvelope(response, fallback)
}

export function categoryLabel(category?: string | null): string {
  const labels: Record<string, string> = {
    recording: 'Recording',
    safeguarding_network: 'Safeguarding network',
    daily_brief: 'Daily brief',
    review: 'Review',
    action: 'Action',
    governance: 'Governance',
    handover: 'Handover',
    system: 'System'
  }
  if (!category) return 'Operational'
  return labels[category] || category.replaceAll('_', ' ')
}
