import { mapOsChronology } from './chronology'
import { osGet } from './client'
import { mapOsAction } from './actions'
import { mapOsEvidence } from './evidence'
import type { OsApiResult } from './types'

export type OsPersonSummary = {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  preferredName?: string
  dateOfBirth?: string
  age?: number | string
  homeId?: string | number
  providerId?: string | number
  riskLevel?: string
  keyWorkerId?: string | number
  role?: string
  email?: string
  status?: string
  placementStatus?: string
  legalStatus?: string
  carePlanning?: string
  photoUrl?: string
  profilePhotoPath?: string
  socialWorkerName?: string
  socialWorkerEmail?: string
  socialWorkerPhone?: string
  placingAuthority?: string
  admissionDate?: string
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

export function mapPerson(row: Record<string, any>): OsPersonSummary {
  const firstName = row.first_name || row.firstName || ''
  const lastName = row.last_name || row.lastName || ''
  const preferredName = row.preferred_name || row.preferredName || firstName || row.display_name || row.displayName
  const displayName = row.display_name || row.displayName || row.name || [preferredName || firstName, lastName].filter(Boolean).join(' ') || row.title || 'Person'
  return {
    ...row,
    id: String(row.id || row.source_id || ''),
    homeId: row.home_id || row.homeId,
    providerId: row.provider_id || row.providerId,
    firstName: String(firstName || ''),
    lastName: String(lastName || ''),
    displayName: String(displayName),
    status: row.placement_status || row.placementStatus || row.status,
    placementStatus: row.placement_status || row.placementStatus || row.status,
    legalStatus: row.legal_status_summary || row.legal_status || row.legalStatus,
    carePlanning: row.current_placement_plan_status || row.care_planning || row.carePlanning || row.summary,
    preferredName: preferredName ? String(preferredName) : undefined,
    dateOfBirth: row.date_of_birth || row.dateOfBirth,
    admissionDate: row.admission_date || row.admissionDate,
    age: row.age,
    riskLevel: row.summary_risk_level || row.risk_level || row.riskLevel,
    keyWorkerId: row.key_worker_id || row.primary_keyworker_id || row.allocated_key_worker_id || row.keyWorkerId,
    photoUrl: row.photo_url || row.photoUrl || row.profile_photo_path || row.profilePhotoPath || row.image_url || row.avatar_url,
    profilePhotoPath: row.profile_photo_path || row.profilePhotoPath,
    socialWorkerName: row.social_worker_name || row.socialWorkerName,
    socialWorkerEmail: row.social_worker_email || row.socialWorkerEmail,
    socialWorkerPhone: row.social_worker_phone || row.socialWorkerPhone,
    placingAuthority: row.placing_authority || row.placingAuthority,
    role: row.role,
    email: row.email
  }
}

export function mapWorkspaceData(result: OsApiResult<Record<string, any>>, fallback: OsWorkspace): OsApiResult<OsWorkspace> {
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

export function mapAdultWorkspaceData(result: OsApiResult<Record<string, any>>, fallback: OsWorkspace): OsApiResult<OsWorkspace> {
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

export async function getOsYoungPeople(): Promise<OsApiResult<OsPersonSummary[]>> {
  const result = await osGet<Record<string, any>[]>('/os/young-people', [])
  return { ...result, data: result.data.map(mapPerson) }
}

export async function getOsYoungPersonWorkspace(id: string): Promise<OsApiResult<OsWorkspace>> {
  const fallback: OsWorkspace = { chronology: [], actions: [], evidence: [] }
  const result = await osGet<Record<string, any>>(`/os/young-people/${encodeURIComponent(id)}/workspace`, fallback as any)
  return mapWorkspaceData(result, fallback)
}

export async function getOsAdultWorkspace(id: string): Promise<OsApiResult<OsWorkspace>> {
  const fallback: OsWorkspace = { chronology: [], actions: [], evidence: [] }
  const result = await osGet<Record<string, any>>(`/os/adults/${encodeURIComponent(id)}/workspace`, fallback as any)
  return mapAdultWorkspaceData(result, fallback)
}