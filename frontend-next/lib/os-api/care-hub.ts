import { mapOsChronology } from '@/lib/os-api/chronology'
import type { CareAction } from '@/lib/evidence/types'
import type { ChronologyEvent } from '@/lib/chronology/types'

import { osGet } from './client'
import type { CommandCentreData, AttentionCard } from './platform'
import { mapOperationalRecord } from './platform'
import type { OsApiResult } from './types'
import type { OsPersonSummary } from './workspaces'

type UnknownRecord = Record<string, unknown>

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

function feedEvents(payload: CareHubPayload | null | undefined): UnknownRecord[] {
  const feed = (payload?.operational_feed || {}) as UnknownRecord
  const events = feed.events
  return Array.isArray(events) ? (events as UnknownRecord[]) : []
}

function mapFeedEventToChronology(event: UnknownRecord): ChronologyEvent {
  return mapOsChronology({
    id: event.event_id,
    event_at: event.event_at,
    title: event.title,
    summary: event.summary,
    full_text: event.summary,
    event_type: event.event_type,
    source_table: event.source_table,
    source_id: event.source_id,
    young_person_id: event.young_person_id,
    home_id: event.home_id,
    severity: event.severity,
    safeguarding_flags: event.safeguarding ? ['safeguarding'] : [],
    risk_flags: event.risk_tags,
    tags: [...(Array.isArray(event.risk_tags) ? event.risk_tags : []), ...(Array.isArray(event.emotional_tags) ? event.emotional_tags : [])]
  })
}

function buildAttentionFromCareHub(payload: CareHubPayload, chronology: ChronologyEvent[]): AttentionCard[] {
  const alerts = payload.alerts?.alerts || []
  const workflow = payload.workflow_completion || {}
  const safeguardingOpen = chronology.filter((event) => event.safeguardingFlags.length || event.severity === 'high' || event.severity === 'critical')
  const openActions = alerts.filter((alert) => /action|workflow|backlog/i.test(alert.type))

  const cards: AttentionCard[] = [
    {
      id: 'care-hub-safeguarding',
      priority: 1,
      theme: 'safeguarding',
      title: 'Safeguarding review queue',
      body: safeguardingOpen.length
        ? `${safeguardingOpen.length} safeguarding-linked events in the live Care Hub feed.`
        : 'No safeguarding pressure returned by Care Hub.',
      href: '/safeguarding',
      count: safeguardingOpen.length,
      status: safeguardingOpen.length ? 'needs review' : 'clear'
    },
    {
      id: 'care-hub-alerts',
      priority: 2,
      theme: 'operational_risk',
      title: 'Live operational alerts',
      body: alerts.length ? payload.alerts?.summary || 'Live alerts require review.' : 'No live operational alerts from Care Hub.',
      href: '/command-centre',
      count: alerts.length,
      status: alerts.length ? 'review suggested' : 'clear'
    },
    {
      id: 'care-hub-workflow',
      priority: 3,
      theme: 'compliance',
      title: 'Workflow completion',
      body:
        workflow.workflow_health_pct != null
          ? `Workflow health at ${workflow.workflow_health_pct}% across recent records.`
          : 'Workflow health not returned by Care Hub.',
      href: '/governance/command-centre',
      count: Number(workflow.gaps?.incomplete_workflows || openActions.length || 0),
      status: (workflow.workflow_health_pct || 100) < 70 ? 'follow-up needed' : 'stable'
    }
  ]
  return cards.filter((card) => card.count > 0).sort((a, b) => a.priority - b.priority)
}

export function mapCareHubToCommandCentre(
  careHub: OsApiResult<CareHubPayload>,
  people: OsApiResult<OsPersonSummary[]>
): OsApiResult<CommandCentreData> {
  const payload = careHub.data
  const events = feedEvents(payload)
  const chronology = events.map((event) => mapFeedEventToChronology(event))
  const safeguarding = chronology
    .filter((event) => event.safeguardingFlags.length)
    .map((event) =>
      mapOperationalRecord(
        {
          id: event.id,
          record_type: 'safeguarding',
          title: event.title,
          summary: event.summary,
          young_person_id: event.youngPersonIds[0],
          status: event.severity
        },
        'safeguarding'
      )
    )

  const managerQueue = ((payload?.operational_feed as UnknownRecord)?.manager_queue || {}) as UnknownRecord
  const queueItems = Array.isArray(managerQueue.items) ? (managerQueue.items as UnknownRecord[]) : []
  const actions: CareAction[] = queueItems.map((item) => ({
    id: String(item.id || item.queue_id || item.source_id || 'action'),
    title: String(item.title || item.label || 'Operational follow-up'),
    description: String(item.detail || item.summary || ''),
    sourceType: String(item.source_table || item.category || 'manager_queue'),
    sourceId: String(item.source_id || item.id || ''),
    assignedToStaffId: String(item.staff_id || ''),
    youngPersonId: item.young_person_id ? String(item.young_person_id) : undefined,
    homeId: String(item.home_id || payload?.scope?.home_id || ''),
    dueDate: item.due_at ? String(item.due_at) : '',
    priority: (['low', 'medium', 'high', 'urgent'].includes(String(item.priority || 'medium')) ? item.priority : 'medium') as CareAction['priority'],
    status: (['open', 'in_progress', 'completed', 'overdue', 'blocked'].includes(String(item.status || 'open')) ? item.status : 'open') as CareAction['status'],
    evidenceRequired: [],
    evidenceIds: [],
    createdAt: item.created_at ? String(item.created_at) : new Date().toISOString()
  }))

  const workforce = queueItems
    .filter((item) => /staff|workforce|supervision|training/i.test(String(item.category || item.type || '')))
    .map((item) => mapOperationalRecord(item as UnknownRecord, 'staff'))

  const base: Omit<CommandCentreData, 'attention'> = {
    children: people.data,
    chronology,
    safeguarding,
    actions,
    documents: [],
    evidence: [],
    workforce,
    homes: [],
    lifecycle: [...safeguarding.map((record) => record.lifecycle), ...workforce.map((record) => record.lifecycle)]
  }

  return {
    data: {
      ...base,
      attention: payload?.ok ? buildAttentionFromCareHub(payload, chronology) : []
    },
    source: careHub.source === 'live' && people.source === 'live' ? 'live' : careHub.source,
    warning: careHub.warning || people.warning,
    error: careHub.error || people.error,
    meta: careHub.meta
  }
}

export type CareHubGovernanceSlice = {
  summary?: { evidence_gaps?: number; inspection_readiness?: string }
  alerts: UnknownRecord[]
  inspection?: UnknownRecord
}

export function mapCareHubGovernanceSlice(payload: CareHubPayload | null | undefined): CareHubGovernanceSlice {
  const feed = (payload?.operational_feed || {}) as UnknownRecord
  const inspection = (feed.inspection_intelligence || {}) as UnknownRecord
  const workflow = payload?.workflow_completion || {}
  return {
    summary: {
      evidence_gaps: Number((workflow.gaps as UnknownRecord | undefined)?.weak_evidence || 0),
      inspection_readiness: String(inspection.overall_readiness || payload?.live_status?.inspection_readiness_pct || '')
    },
    alerts: (payload?.alerts?.alerts || []) as UnknownRecord[],
    inspection
  }
}

export type CareHubWorkforceSlice = {
  alerts: UnknownRecord[]
  summary?: UnknownRecord
}

export function mapCareHubWorkforceSlice(payload: CareHubPayload | null | undefined): CareHubWorkforceSlice {
  const feed = (payload?.operational_feed || {}) as UnknownRecord
  const queue = (feed.manager_queue || {}) as UnknownRecord
  const climate = (((feed.home_operational_intelligence as UnknownRecord)?.home_climate || {}) as UnknownRecord)
  return {
    alerts: Array.isArray(queue.items) ? (queue.items as UnknownRecord[]) : [],
    summary: {
      queue_total: queue.total,
      workforce_pressure: climate.workforce_pressure,
      staff_pressure_score: payload?.live_status?.staff_pressure_score
    }
  }
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
