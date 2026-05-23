import 'server-only'

import { osServerGet } from './server-client'
import type { OsApiResult } from './types'

export type AiPrivacyDashboardSummary = {
  total_events: number
  denied_attempts: number
  redaction_applied_count: number
  minimisation_applied_count: number
  child_scoped_attempts: number
  raw_record_blocked: number
  standalone_os_context_blocked: number
  safeguarding_review_required: number
  manager_review_required: number
  exports_allowed: number
  exports_blocked: number
  model_send_blocked: number
}

export type AiPrivacyEventRecord = {
  id: string
  surface: string
  action: string
  decision: string
  user_role?: string | null
  redaction_applied?: boolean
  minimisation_applied?: boolean
  manager_review_required?: boolean
  created_at?: string
}

export type AiPrivacyDashboardData = {
  summary: AiPrivacyDashboardSummary
  health: {
    status: string
    storage_mode: string
    privacy_notice: string
    warnings: string[]
  }
  alerts: Array<{ id: string; level: string; title: string; message: string }>
  recent_events: AiPrivacyEventRecord[]
}

const emptyPrivacyDashboard: AiPrivacyDashboardData = {
  summary: {
    total_events: 0,
    denied_attempts: 0,
    redaction_applied_count: 0,
    minimisation_applied_count: 0,
    child_scoped_attempts: 0,
    raw_record_blocked: 0,
    standalone_os_context_blocked: 0,
    safeguarding_review_required: 0,
    manager_review_required: 0,
    exports_allowed: 0,
    exports_blocked: 0,
    model_send_blocked: 0
  },
  health: {
    status: 'degraded',
    storage_mode: 'memory',
    privacy_notice:
      'Privacy governance uses metadata and redacted previews only. Raw care records are not displayed.',
    warnings: []
  },
  alerts: [],
  recent_events: []
}

export function fetchAiPrivacyDashboard(
  period = '7d'
): Promise<OsApiResult<AiPrivacyDashboardData>> {
  return osServerGet<AiPrivacyDashboardData>(
    `/intelligence/governance/privacy/dashboard?period=${encodeURIComponent(period)}`,
    emptyPrivacyDashboard
  )
}
