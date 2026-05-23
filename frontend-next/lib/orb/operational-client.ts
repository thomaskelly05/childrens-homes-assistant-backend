import { authFetch, AuthApiError } from '@/lib/auth/api'
import type { OsApiResult } from '@/lib/os-api/types'

export type OrbOperationalMode =
  | 'operational_summary'
  | 'manager_daily_brief'
  | 'record_quality_review'
  | 'safeguarding_themes'
  | 'ofsted_evidence_review'
  | 'action_priority'
  | 'staff_support'
  | 'child_journey_summary'
  | 'governance_briefing'
  | 'general_operational_question'

export type OrbOperationalScope = 'home' | 'child' | 'staff' | 'provider' | 'current_user'

export type OrbOperationalRequest = {
  message: string
  mode?: OrbOperationalMode
  scope?: OrbOperationalScope
  home_id?: number | null
  child_id?: number | null
  staff_id?: number | null
  days?: number
  include_actions?: boolean
  include_record_quality?: boolean
  include_patterns?: boolean
  require_manager_review?: boolean
}

export type OrbOperationalSource = {
  label: string
  source_type: string
  basis?: string | null
  route?: string | null
  excerpt?: string | null
}

export type OrbOperationalContextSummary = {
  headline?: string
  summary_lines?: string[]
  themes?: string[]
  attention_items?: string[]
  record_quality_notes?: string[]
  safeguarding_signals?: string[]
  ofsted_evidence_notes?: string[]
  staff_support_notes?: string[]
  child_journey_notes?: string[]
  governance_notes?: string[]
  degraded?: boolean
  unavailable?: boolean
  permission_warnings?: string[]
}

export type OrbOperationalPermissionSummary = {
  role?: string | null
  allowed_home_ids?: number[]
  home_id?: number | null
  provider_id?: number | null
  care_record_access?: boolean
  scope_resolved?: string | null
}

export type OrbOperationalIntelligenceOutput = {
  id?: string
  title?: string
  summary?: string
  sources?: Array<Record<string, unknown>>
  citations?: Array<Record<string, unknown>>
  model_routing?: Record<string, unknown>
  quality?: Record<string, unknown>
  os_linked?: boolean
  care_record_access?: boolean
  standalone_only?: boolean
}

export type OrbOperationalResponse = {
  answer: string
  intelligence_output?: OrbOperationalIntelligenceOutput | null
  context_summary: OrbOperationalContextSummary
  sources: OrbOperationalSource[]
  citations?: Array<Record<string, unknown>>
  evaluation?: Record<string, unknown> | null
  model_routing?: Record<string, unknown> | null
  permissions: OrbOperationalPermissionSummary
  boundaries?: {
    permissioned_context_only?: boolean
    manager_review_required?: boolean
    notices?: string[]
  }
  warnings?: string[]
  audit_reference?: string | null
  os_linked: boolean
  care_record_access: boolean
  standalone_only: boolean
  permissioned_context: boolean
}

export type OrbOperationalHealth = {
  status: string
  surface: string
  os_linked: boolean
  care_record_access: boolean
  standalone_only: boolean
  permissioned_context: boolean
  modes: string[]
  scopes: string[]
}

function unavailable(message: string): OsApiResult<OrbOperationalResponse> {
  return {
    source: 'unavailable',
    warning: message,
    data: {
      answer:
        "Operational ORB could not be reached. No operational conclusion has been made. Please use Care Hub or Intelligence Spine for live review.",
      context_summary: {
        unavailable: true,
        headline: 'Operational ORB unavailable',
        permission_warnings: [message]
      },
      sources: [],
      permissions: { care_record_access: false },
      os_linked: true,
      care_record_access: false,
      standalone_only: false,
      permissioned_context: true
    }
  }
}

async function postOperational<T>(path: string, body: unknown, signal?: AbortSignal): Promise<OsApiResult<T>> {
  try {
    const envelope = await authFetch<{ success?: boolean; data: T }>(path, {
      method: 'POST',
      signal,
      body: JSON.stringify(body)
    })
    const data = (envelope as { data?: T }).data ?? (envelope as unknown as T)
    return { data, source: 'live' }
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 401) {
        return unavailable('Your session has expired. Please sign in again.') as OsApiResult<T>
      }
      if (error.status === 403) {
        return unavailable('You do not have permission to use operational ORB.') as OsApiResult<T>
      }
      return unavailable(error.message) as OsApiResult<T>
    }
    return unavailable(error instanceof Error ? error.message : 'Operational ORB unavailable.') as OsApiResult<T>
  }
}

export async function sendOperationalOrbMessage(
  request: OrbOperationalRequest,
  signal?: AbortSignal
): Promise<OsApiResult<OrbOperationalResponse>> {
  return postOperational<OrbOperationalResponse>('/api/assistant/orb/operational', request, signal)
}

export async function sendOperationalOrbConversation(
  request: OrbOperationalRequest,
  signal?: AbortSignal
): Promise<OsApiResult<OrbOperationalResponse>> {
  return postOperational<OrbOperationalResponse>('/api/assistant/orb/conversation', request, signal)
}

export async function getOperationalOrbHealth(signal?: AbortSignal): Promise<OsApiResult<OrbOperationalHealth>> {
  try {
    const envelope = await authFetch<{ success?: boolean; data: OrbOperationalHealth }>(
      '/api/assistant/orb/health',
      { signal }
    )
    const data =
      (envelope as { data?: OrbOperationalHealth }).data ??
      (envelope as unknown as OrbOperationalHealth)
    return { data, source: 'live' }
  } catch (error) {
    return {
      source: 'unavailable',
      warning: error instanceof Error ? error.message : 'Health check failed',
      data: {
        status: 'unavailable',
        surface: 'operational_os_orb',
        os_linked: true,
        care_record_access: false,
        standalone_only: false,
        permissioned_context: true,
        modes: [],
        scopes: []
      }
    }
  }
}

export async function getOperationalContextSummary(
  request: OrbOperationalRequest,
  signal?: AbortSignal
): Promise<OsApiResult<{ context_summary: OrbOperationalContextSummary; sources: OrbOperationalSource[] }>> {
  return postOperational('/api/assistant/orb/context-summary', request, signal)
}

export async function getOperationalCapabilities(signal?: AbortSignal): Promise<OsApiResult<Record<string, unknown>>> {
  try {
    const envelope = await authFetch<{ success?: boolean; data: Record<string, unknown> }>(
      '/api/assistant/orb/capabilities',
      { signal }
    )
    const data = (envelope as { data?: Record<string, unknown> }).data ?? {}
    return { data, source: 'live' }
  } catch (error) {
    return { source: 'unavailable', data: {}, warning: 'Capabilities unavailable' }
  }
}
