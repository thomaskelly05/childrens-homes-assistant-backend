import { mapOsChronology } from './chronology'
import { osGet } from './client'
import { mapOsAction } from './actions'
import { mapOsEvidence } from './evidence'
import type { OsApiResult } from './types'

export type OsPersonSummary = {
  id: string
  displayName: string
  preferredName?: string
  age?: number | string
  riskLevel?: string
  keyWorkerId?: string
  role?: string
  email?: string
  status?: string
  placementStatus?: string
  legalStatus?: string
  carePlanning?: string
  [key: string]: unknown
}

export type OsWorkspace = {
  youngPerson?: OsPersonSummary
  adult?: OsPersonSummary
  chronology: ReturnType<typeof mapOsChronology>[]
  recordsAuthored?: ReturnType<typeof mapOsChronology>[]
  actions: ReturnType<typeof mapOsAction>[]
  evidence: ReturnType<typeof mapOsEvidence>[]
}

function mapPerson(row: Record<string, any>): OsPersonSummary {
  return {
    ...row,
    id: String(row.id || row.source_id || ''),
    displayName: String(row.display_name || row.displayName || row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.title || 'Person'),
    status: row.status,
    placementStatus: row.placement_status || row.placementStatus || row.status,
    legalStatus: row.legal_status || row.legalStatus,
    carePlanning: row.care_planning || row.carePlanning || row.summary,
    preferredName: row.preferred_name || row.preferredName || row.first_name,
    age: row.age,
    riskLevel: row.risk_level || row.riskLevel,
    keyWorkerId: row.key_worker_id || row.allocated_key_worker_id || row.keyWorkerId,
    role: row.role,
    email: row.email
  }
}

export async function getOsYoungPeople(): Promise<OsApiResult<OsPersonSummary[]>> {
  const result = await osGet<Record<string, any>[]>('/os/young-people', [])
  return { ...result, data: result.data.map(mapPerson) }
}

export async function getOsYoungPersonWorkspace(id: string): Promise<OsApiResult<OsWorkspace>> {
  const fallback: OsWorkspace = {
    chronology: [],
    actions: [],
    evidence: []
  }
  const result = await osGet<Record<string, any>>(`/os/young-people/${encodeURIComponent(id)}/workspace`, fallback as any)
  if (result.source === 'unavailable') return { ...result, data: fallback }
  return {
    ...result,
    data: {
      youngPerson: result.data.young_person ? mapPerson(result.data.young_person) : result.data.youngPerson ? mapPerson(result.data.youngPerson) : undefined,
      chronology: Array.isArray(result.data.chronology) ? result.data.chronology.map(mapOsChronology) : [],
      actions: Array.isArray(result.data.actions) ? result.data.actions.map(mapOsAction) : [],
      evidence: Array.isArray(result.data.evidence) ? result.data.evidence.map(mapOsEvidence) : []
    }
  }
}

export async function getOsAdultWorkspace(id: string): Promise<OsApiResult<OsWorkspace>> {
  const fallback: OsWorkspace = { chronology: [], actions: [], evidence: [] }
  const result = await osGet<Record<string, any>>(`/os/adults/${encodeURIComponent(id)}/workspace`, fallback as any)
  if (result.source === 'unavailable') return { ...result, data: fallback }
  return {
    ...result,
    data: {
      adult: result.data.adult ? mapPerson(result.data.adult) : undefined,
      chronology: Array.isArray(result.data.chronology) ? result.data.chronology.map(mapOsChronology) : [],
      recordsAuthored: Array.isArray(result.data.records_authored) ? result.data.records_authored.map(mapOsChronology) : Array.isArray(result.data.recordsAuthored) ? result.data.recordsAuthored.map(mapOsChronology) : [],
      actions: Array.isArray(result.data.actions) ? result.data.actions.map(mapOsAction) : [],
      evidence: Array.isArray(result.data.evidence) ? result.data.evidence.map(mapOsEvidence) : []
    }
  }
}
