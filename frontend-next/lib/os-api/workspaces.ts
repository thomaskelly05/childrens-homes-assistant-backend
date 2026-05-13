import { demoChronologyEvents } from '@/lib/chronology/demo-data'
import { demoCareActions, demoEvidenceItems } from '@/lib/evidence/demo-data'
import { indicareData } from '@/lib/indicare/demo-data'

import { mapOsChronology } from './chronology'
import { osGet } from './client'
import { mapOsAction } from './actions'
import { mapOsEvidence } from './evidence'
import type { OsApiResult } from './types'

export type OsPersonSummary = {
  id: string
  displayName: string
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
  actions: ReturnType<typeof mapOsAction>[]
  evidence: ReturnType<typeof mapOsEvidence>[]
}

function demoYoungPerson(id: string): OsPersonSummary | undefined {
  const person = indicareData.youngPeople.find((item) => item.id === id)
  return person ? {
    ...person,
    id: person.id,
    displayName: `${person.firstName} ${person.lastName}`,
    placementStatus: person.status,
    carePlanning: person.educationStatus
  } : undefined
}

function mapPerson(row: Record<string, any>): OsPersonSummary {
  return {
    ...row,
    id: String(row.id || row.source_id || ''),
    displayName: String(row.display_name || row.displayName || row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.title || 'Person'),
    status: row.status,
    placementStatus: row.placement_status || row.placementStatus || row.status,
    legalStatus: row.legal_status || row.legalStatus,
    carePlanning: row.care_planning || row.carePlanning || row.summary
  }
}

export async function getOsYoungPeople(): Promise<OsApiResult<OsPersonSummary[]>> {
  const fallback = indicareData.youngPeople.map((person) => demoYoungPerson(person.id)).filter(Boolean) as OsPersonSummary[]
  const result = await osGet<Record<string, any>[]>('/os/young-people', fallback)
  return { ...result, data: result.data.map(mapPerson) }
}

export async function getOsYoungPersonWorkspace(id: string): Promise<OsApiResult<OsWorkspace>> {
  const fallback: OsWorkspace = {
    youngPerson: demoYoungPerson(id),
    chronology: demoChronologyEvents.filter((event) => event.youngPersonIds.includes(id)),
    actions: demoCareActions.filter((action) => action.youngPersonId === id),
    evidence: demoEvidenceItems.filter((item) => item.youngPersonId === id)
  }
  const result = await osGet<Record<string, any>>(`/os/young-people/${encodeURIComponent(id)}/workspace`, fallback as any)
  if (result.source === 'fallback') return { ...result, data: fallback }
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
  const fallback: OsWorkspace = { adult: { id, displayName: `Staff ${id}` }, chronology: [], actions: [], evidence: [] }
  const result = await osGet<Record<string, any>>(`/os/adults/${encodeURIComponent(id)}/workspace`, fallback as any)
  if (result.source === 'fallback') return { ...result, data: fallback }
  return {
    ...result,
    data: {
      adult: result.data.adult ? mapPerson(result.data.adult) : undefined,
      chronology: Array.isArray(result.data.chronology) ? result.data.chronology.map(mapOsChronology) : [],
      actions: Array.isArray(result.data.actions) ? result.data.actions.map(mapOsAction) : [],
      evidence: Array.isArray(result.data.evidence) ? result.data.evidence.map(mapOsEvidence) : []
    }
  }
}
