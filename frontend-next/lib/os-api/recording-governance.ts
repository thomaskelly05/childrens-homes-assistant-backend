'use client'

export type RecordingGovernanceRiskLevel = 'low' | 'medium' | 'high' | 'urgent'

export type RecordingGovernanceMetricCard = {
  id: string
  title: string
  value: string | number
  label?: string
  tone?: string
  route?: string | null
  description?: string | null
  trend?: string | null
  metadata?: Record<string, unknown>
}

export type RecordingGovernanceBacklogMetric = {
  awaiting_review: number
  urgent: number
  safeguarding_review: number
  changes_requested: number
  approved: number
  submitted: number
  overdue: number
  by_priority: Record<string, number>
}

export type RecordingGovernanceQualityMetric = {
  total_drafts: number
  incomplete_structured_forms: number
  missing_child_voice: number
  missing_follow_up: number
  judgemental_language_flags: number
  privacy_flags: number
  manager_review_flags: number
  safeguarding_review_flags: number
}

export type RecordingGovernanceFormUsage = {
  form_id?: string | null
  recording_type: string
  title: string
  category?: string | null
  count: number
  high_risk_count: number
  submitted_count: number
  review_required_count: number
}

export type RecordingGovernanceReviewOutcome = {
  approved: number
  changes_requested: number
  safeguarding_escalation: number
  submitted_after_approval: number
  archived: number
}

export type RecordingGovernanceAlert = {
  id: string
  title: string
  description: string
  risk_level: RecordingGovernanceRiskLevel
  route?: string | null
  action_label?: string | null
  metadata?: Record<string, unknown>
}

export type RecordingGovernanceItem = {
  draft_id: string
  title: string
  recording_type: string
  form_id?: string | null
  category?: string | null
  status: string
  review_status: string
  review_priority: string
  child_id?: number | null
  child_name?: string | null
  home_id?: number | null
  created_by_name?: string | null
  safeguarding_sensitive: boolean
  privacy_sensitive: boolean
  quality_flag_count: number
  privacy_flag_count: number
  structured_incomplete: boolean
  updated_at: string
  draft_route: string
  review_route?: string | null
  child_journey_route?: string | null
  metadata?: Record<string, unknown>
}

export type RecordingGovernanceDashboard = {
  generated_at: string
  scope: string
  summary_cards: RecordingGovernanceMetricCard[]
  backlog: RecordingGovernanceBacklogMetric
  quality: RecordingGovernanceQualityMetric
  form_usage: RecordingGovernanceFormUsage[]
  review_outcomes: RecordingGovernanceReviewOutcome
  alerts: RecordingGovernanceAlert[]
  recommendations: string[]
  privacy_notice: string
  limitations: string[]
  metadata?: Record<string, unknown>
}

export type RecordingGovernanceHealth = {
  status: string
  service: string
  storage_mode: string
  draft_count: number
  review_event_count: number
  persistence_available: boolean
  operational_only: boolean
  standalone_access: boolean
  degraded?: boolean
  warnings?: string[]
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

const EMPTY_DASHBOARD: RecordingGovernanceDashboard = {
  generated_at: '',
  scope: 'home',
  summary_cards: [],
  backlog: {
    awaiting_review: 0,
    urgent: 0,
    safeguarding_review: 0,
    changes_requested: 0,
    approved: 0,
    submitted: 0,
    overdue: 0,
    by_priority: {}
  },
  quality: {
    total_drafts: 0,
    incomplete_structured_forms: 0,
    missing_child_voice: 0,
    missing_follow_up: 0,
    judgemental_language_flags: 0,
    privacy_flags: 0,
    manager_review_flags: 0,
    safeguarding_review_flags: 0
  },
  form_usage: [],
  review_outcomes: {
    approved: 0,
    changes_requested: 0,
    safeguarding_escalation: 0,
    submitted_after_approval: 0,
    archived: 0
  },
  alerts: [],
  recommendations: [],
  privacy_notice:
    'This view uses recording metadata, flags and summaries. It does not display full raw record bodies.',
  limitations: []
}

export async function getRecordingGovernanceHealth() {
  const response = await fetch('/recording-governance/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingGovernanceHealth>(response, {
    status: 'unavailable',
    service: 'recording_governance_service',
    storage_mode: 'memory',
    draft_count: 0,
    review_event_count: 0,
    persistence_available: false,
    operational_only: true,
    standalone_access: false
  })
}

export async function getRecordingGovernanceDashboard(params?: {
  child_id?: number
  home_id?: number
  recording_type?: string
  category?: string
  status?: string
  review_status?: string
  high_risk_only?: boolean
  safeguarding_only?: boolean
}) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-governance/dashboard${qs}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope<RecordingGovernanceDashboard>(response, EMPTY_DASHBOARD)
}

export async function getRecordingGovernanceItems(params?: {
  child_id?: number
  home_id?: number
  limit?: number
  offset?: number
  high_risk_only?: boolean
  safeguarding_only?: boolean
}) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-governance/items${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<{ items: RecordingGovernanceItem[]; total: number }>(response, { items: [], total: 0 })
}

export async function getRecordingGovernanceAlerts(params?: { child_id?: number; safeguarding_only?: boolean }) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-governance/alerts${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingGovernanceAlert[]>(response, [])
}

export async function getRecordingGovernanceFormUsage(params?: { child_id?: number }) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-governance/form-usage${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingGovernanceFormUsage[]>(response, [])
}

export async function getRecordingGovernanceQuality(params?: { child_id?: number }) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-governance/quality${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingGovernanceQualityMetric>(response, EMPTY_DASHBOARD.quality)
}

export async function getRecordingGovernanceBacklog(params?: { child_id?: number }) {
  const qs = queryString(params || {})
  const response = await fetch(`/recording-governance/backlog${qs}`, { credentials: 'include', cache: 'no-store' })
  return parseEnvelope<RecordingGovernanceBacklogMetric>(response, EMPTY_DASHBOARD.backlog)
}

/** Operational ORB governance modes — never pass draft or child IDs in URL. */
export function operationalOrbGovernanceHref(
  mode: 'record_quality_review' | 'safeguarding_themes' | 'manager_daily_brief',
  query?: string
) {
  const params = new URLSearchParams({ mode })
  if (query) params.set('q', query)
  return `/assistant/orb?${params.toString()}`
}

export function buildGovernanceSummaryText(dashboard: RecordingGovernanceDashboard): string {
  const lines = [
    'Recording governance summary',
    `Generated: ${dashboard.generated_at}`,
    `Scope: ${dashboard.scope}`,
    `Total drafts: ${dashboard.quality.total_drafts}`,
    `Awaiting review: ${dashboard.backlog.awaiting_review}`,
    `Urgent: ${dashboard.backlog.urgent}`,
    `Safeguarding review: ${dashboard.backlog.safeguarding_review}`,
    `Privacy flags: ${dashboard.quality.privacy_flags}`,
    `Incomplete structured: ${dashboard.quality.incomplete_structured_forms}`,
    '',
    dashboard.privacy_notice
  ]
  if (dashboard.recommendations.length) {
    lines.push('', 'Recommendations:', ...dashboard.recommendations.map((r) => `- ${r}`))
  }
  return lines.join('\n')
}
