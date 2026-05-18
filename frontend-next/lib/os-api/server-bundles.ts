import { osServerGet } from './server-client'
import {
  emptyChildProfileBundle,
  emptyHomeOperationalBundle,
  emptyWorkspaceBundle,
  type ChildProfileBundle,
  type HomeOperationalBundle,
  type WorkspaceBundle
} from './bundles'
import type { OsApiResult } from './types'

export async function getServerWorkspaceBundle(): Promise<OsApiResult<WorkspaceBundle>> {
  return osServerGet<WorkspaceBundle>('/api/me/workspace', emptyWorkspaceBundle)
}

export async function getServerChildProfileBundle(id: string): Promise<OsApiResult<ChildProfileBundle>> {
  return osServerGet<ChildProfileBundle>(`/api/young-people/${encodeURIComponent(id)}/profile-bundle`, emptyChildProfileBundle)
}

export async function getServerHomeOperationalBundle(id: string): Promise<OsApiResult<HomeOperationalBundle>> {
  return osServerGet<HomeOperationalBundle>(`/api/homes/${encodeURIComponent(id)}/operational-bundle`, emptyHomeOperationalBundle)
}
