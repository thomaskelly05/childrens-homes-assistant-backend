import { AuthApiError } from '@/lib/auth/api'

import {
  fetchOrbServerProjects,
  mergeServerProjectsWithLocal,
  syncOrbProjectsToServer,
  type OrbServerProject
} from '@/lib/orb/orb-projects-client'
import type { OrbResidentialProjectMemory } from '@/lib/orb/orb-residential-projects'
import { recordOrbFetchOutcome, shouldSkipAuthenticatedOrbFetch } from '@/lib/orb/orb-session-gate'

const SEED_PROJECT_PREFIX = 'orb-residential-seed-'
let syncInFlight: Promise<void> | null = null
let lastSyncAt = 0
const SYNC_DEBOUNCE_MS = 8_000

export function isOrbSeedProjectId(id: string): boolean {
  return id.startsWith(SEED_PROJECT_PREFIX) || id.startsWith('seed-')
}

export function isValidOrbProjectIdForApi(id: string): boolean {
  if (!id?.trim()) return false
  if (isOrbSeedProjectId(id)) return false
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id) || /^\d+$/.test(id)
}

export type OrbProjectsFetchResult = {
  server: OrbServerProject[]
  usedLocalFallback: boolean
  error: 'auth' | 'server' | null
}

export async function fetchOrbProjectsResilient(): Promise<OrbProjectsFetchResult> {
  if (shouldSkipAuthenticatedOrbFetch()) {
    return { server: [], usedLocalFallback: true, error: 'auth' }
  }
  try {
    const server = await fetchOrbServerProjects()
    recordOrbFetchOutcome(null)
    return { server, usedLocalFallback: false, error: null }
  } catch (caught) {
    const status = caught instanceof AuthApiError ? caught.status : 503
    recordOrbFetchOutcome(caught)
    if (status === 401 || status === 403) {
      return { server: [], usedLocalFallback: true, error: 'auth' }
    }
    return { server: [], usedLocalFallback: true, error: 'server' }
  }
}

export function mergeOrbProjectsSafely(
  local: OrbResidentialProjectMemory[],
  server: OrbServerProject[]
): OrbResidentialProjectMemory[] {
  if (!server.length) return local
  return mergeServerProjectsWithLocal(local, server)
}

export async function syncOrbProjectsDebounced(projects: OrbResidentialProjectMemory[]): Promise<void> {
  if (shouldSkipAuthenticatedOrbFetch()) return
  const syncable = projects.filter((p) => isValidOrbProjectIdForApi(p.id))
  if (!syncable.length) return
  const now = Date.now()
  if (now - lastSyncAt < SYNC_DEBOUNCE_MS) return
  if (syncInFlight) return syncInFlight

  const run = async () => {
    lastSyncAt = Date.now()
    try {
      await syncOrbProjectsToServer(syncable)
      recordOrbFetchOutcome(null)
    } catch (caught) {
      recordOrbFetchOutcome(caught)
    } finally {
      syncInFlight = null
    }
  }
  syncInFlight = run()
  return syncInFlight
}
