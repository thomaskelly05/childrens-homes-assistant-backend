import { osGet } from './client'
import type { OsApiResult } from './types'

type UnknownRecord = Record<string, any>

export type ProjectionSnapshotStatus = {
  hit?: boolean
  projection_key?: string
  version?: number | string
  generated_at?: string
  stored?: boolean
}

export type GovernanceCommandCentre = {
  generated_at?: string
  home_id?: string | number | null
  snapshot?: ProjectionSnapshotStatus
  summary: UnknownRecord
  inspection_readiness: UnknownRecord
  governance_risk: UnknownRecord
  workforce_health: UnknownRecord
  safeguarding_drift: UnknownRecord
  child_journey_health: UnknownRecord
  governance_actions: UnknownRecord[]
  unresolved_concerns: UnknownRecord[]
  relational_stability: UnknownRecord
  evidence_matrix: { summary: UnknownRecord; entries: UnknownRecord[] }
  reg44: UnknownRecord
  reg45: UnknownRecord
  provider_oversight: UnknownRecord
  orb_governance_summary: UnknownRecord
  feature_flags: Record<string, boolean>
}

function object(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
}

function array(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value as UnknownRecord[] : []
}

function emptyCommandCentre(): GovernanceCommandCentre {
  return {
    snapshot: {},
    summary: {},
    inspection_readiness: {},
    governance_risk: {},
    workforce_health: {},
    safeguarding_drift: {},
    child_journey_health: {},
    governance_actions: [],
    unresolved_concerns: [],
    relational_stability: {},
    evidence_matrix: { summary: {}, entries: [] },
    reg44: {},
    reg45: {},
    provider_oversight: {},
    orb_governance_summary: {},
    feature_flags: {}
  }
}

function envelopeData(value: unknown): GovernanceCommandCentre {
  const root = object(value)
  const data = object(root.data ?? root)
  return {
    ...emptyCommandCentre(),
    ...data,
    snapshot: object(data.snapshot) as ProjectionSnapshotStatus,
    summary: object(data.summary),
    inspection_readiness: object(data.inspection_readiness),
    governance_risk: object(data.governance_risk),
    workforce_health: object(data.workforce_health),
    safeguarding_drift: object(data.safeguarding_drift),
    child_journey_health: object(data.child_journey_health),
    governance_actions: array(data.governance_actions),
    unresolved_concerns: array(data.unresolved_concerns),
    relational_stability: object(data.relational_stability),
    evidence_matrix: {
      summary: object(object(data.evidence_matrix).summary),
      entries: array(object(data.evidence_matrix).entries)
    },
    reg44: object(data.reg44),
    reg45: object(data.reg45),
    provider_oversight: object(data.provider_oversight),
    orb_governance_summary: object(data.orb_governance_summary),
    feature_flags: object(data.feature_flags) as Record<string, boolean>
  }
}

export async function getGovernanceCommandCentre(): Promise<OsApiResult<GovernanceCommandCentre>> {
  const result = await osGet<UnknownRecord>('/api/governance-os/command-centre', {})
  return { ...result, data: envelopeData(result.data) }
}

export async function getGovernanceAudit() {
  return osGet<UnknownRecord>('/api/governance-os/audit', {})
}
