import { osServerGet } from './server-client'
import { mapAdultWorkspaceData, mapPerson, mapWorkspaceData, type OsPersonSummary, type OsWorkspace } from './workspaces'
import type { OsApiResult } from './types'

export async function getServerOsYoungPeople(): Promise<OsApiResult<OsPersonSummary[]>> {
  const result = await osServerGet<Record<string, any>[]>('/os/young-people', [])
  return { ...result, data: result.data.map(mapPerson) }
}

export async function getServerOsYoungPersonWorkspace(id: string): Promise<OsApiResult<OsWorkspace>> {
  const fallback: OsWorkspace = { chronology: [], actions: [], evidence: [] }
  const result = await osServerGet<Record<string, any>>(`/os/young-people/${encodeURIComponent(id)}/workspace`, fallback as any)
  return mapWorkspaceData(result, fallback)
}

export async function getServerOsAdultWorkspace(id: string): Promise<OsApiResult<OsWorkspace>> {
  const fallback: OsWorkspace = { chronology: [], actions: [], evidence: [] }
  const result = await osServerGet<Record<string, any>>(`/os/adults/${encodeURIComponent(id)}/workspace`, fallback as any)
  return mapAdultWorkspaceData(result, fallback)
}
