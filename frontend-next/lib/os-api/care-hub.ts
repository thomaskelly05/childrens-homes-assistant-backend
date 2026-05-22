import { osGet } from './client'

export type CareHubLiveStatus = {
  status?: string
  live_emotional_climate?: Record<string, unknown>
  live_safeguarding_pressure?: Record<string, unknown>
  missing_from_home_pressure?: Record<string, unknown>
  workflow_completion_pct?: number
  child_voice_quality_pct?: number
  evidence_linkage_pct?: number
  inspection_readiness_pct?: number
  staff_pressure_score?: number
  live_operational_risk_score?: number
  summary?: string
}

export type CareHubAlert = {
  type: string
  severity: string
  message: string
}

export type CareHubSafeguardingQueues = {
  ok?: boolean
  summary?: Record<string, number>
  total?: number
  queues?: {
    missing_episode_queue?: unknown[]
    reg_40_queue?: unknown[]
    restraint_physical_intervention_queue?: unknown[]
    allegation_queue?: unknown[]
    medication_risk_queue?: unknown[]
  }
}

export type CareHubPayload = {
  ok?: boolean
  scope?: Record<string, unknown>
  operational_feed?: Record<string, unknown>
  safeguarding_queues?: CareHubSafeguardingQueues
  live_status?: CareHubLiveStatus
  risk_matrix?: {
    matrix_state?: string
    live_operational_risk_score?: number
    dimensions?: Record<string, number>
  }
  workflow_completion?: {
    workflow_health_pct?: number
    operational_completion_pct?: number
    inspection_vulnerability_pct?: number
    gaps?: Record<string, number>
  }
  chronology_patterns?: Record<string, unknown>
  alerts?: {
    total?: number
    critical?: number
    high?: number
    alerts?: CareHubAlert[]
    summary?: string
  }
  orb_reasoning?: {
    operational_summary?: string
    inspection_summary?: string
    cognition?: Record<string, unknown>
    conversation_summary?: string
  }
  summary?: string
}

const EMPTY_CARE_HUB: CareHubPayload = {
  ok: false,
  live_status: {},
  risk_matrix: {},
  workflow_completion: {},
  alerts: { alerts: [] },
  orb_reasoning: {}
}

export function getCareHub(params?: { youngPersonId?: string; homeId?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.youngPersonId) query.set('young_person_id', params.youngPersonId)
  if (params?.homeId) query.set('home_id', params.homeId)
  if (params?.limit) query.set('limit', String(params.limit))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return osGet<CareHubPayload>(`/os/care-hub${suffix}`, EMPTY_CARE_HUB)
}

export function getCareHubSafeguardingQueues(params?: { youngPersonId?: string; homeId?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.youngPersonId) query.set('young_person_id', params.youngPersonId)
  if (params?.homeId) query.set('home_id', params.homeId)
  if (params?.limit) query.set('limit', String(params.limit))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return osGet<CareHubSafeguardingQueues>(`/os/care-hub/safeguarding-queues${suffix}`, { ok: false, queues: {} })
}

export function getCareHubLive(params?: { youngPersonId?: string; homeId?: string }) {
  const query = new URLSearchParams()
  if (params?.youngPersonId) query.set('young_person_id', params.youngPersonId)
  if (params?.homeId) query.set('home_id', params.homeId)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return osGet<{ live_status?: CareHubLiveStatus; risk_matrix?: CareHubPayload['risk_matrix']; alerts?: CareHubPayload['alerts'] }>(
    `/os/care-hub/live${suffix}`,
    { live_status: {}, alerts: { alerts: [] } }
  )
}
