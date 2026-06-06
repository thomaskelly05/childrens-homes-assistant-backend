'use client'

import { AuthApiError } from '@/lib/auth/api'

import type { OrbResidentialProjectMemory } from '@/lib/orb/orb-residential-projects'
import {
  fetchOrbServerProjects,
  mergeServerProjectsWithLocal,
  syncOrbProjectsToServer,
  type OrbServerProject
} from '@/lib/orb/orb-projects-client'
import {
  recordOrbProjectBootstrapRequest,
  shouldAllowOrbProductFetch
} from '@/lib/orb/orb-product-bootstrap-guard'
import { recordOrbFetchOutcome, shouldSkipAuthenticatedOrbFetch } from '@/lib/orb/orb-session-gate'
import {
  DEFAULT_STANDALONE_PROJECTS,
  STANDALONE_GENERAL_PROJECT_ID
} from '@/lib/orb/standalone-local-store'

const ORB_RESIDENTIAL_SEED_PROJECT_IDS = new Set([
  STANDALONE_GENERAL_PROJECT_ID,
  ...DEFAULT_STANDALONE_PROJECTS.map((project) => project.id),
  'project-my-home',
  'project-inspection-prep',
  'project-templates',
  'project-training'
])

const SYNC_DEBOUNCE_MS = 1200
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncInFlight = false

export function isOrbSeedProjectId(projectId: string): boolean {
  const id = projectId.trim()
  if (!id) return true
  if (ORB_RESIDENTIAL_SEED_PROJECT_IDS.has(id)) return true
  return id.startsWith('orb-residential-seed')
}

/** Client-only / template project IDs must not be PATCH/POST'd to the API. */
export function isValidOrbProjectIdForApi(projectId: string): boolean {
  const id = projectId.trim()
  if (!id || id.length > 80) return false
  if (isOrbSeedProjectId(id)) return false
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) return false
  return true
}

export function mergeOrbProjectsSafely(
  local: OrbResidentialProjectMemory[],
  server: OrbServerProject[]
): OrbResidentialProjectMemory[] {
  return mergeServerProjectsWithLocal(local, server)
}

export async function fetchOrbProjectsResilient(): Promise<{
  server: OrbServerProject[]
  usedLocalFallback: boolean
}> {
  if (!shouldAllowOrbProductFetch('projects_resilient')) {
    return { server: [], usedLocalFallback: true }
  }
  if (shouldSkipAuthenticatedOrbFetch()) {
    return { server: [], usedLocalFallback: true }
  }
  recordOrbProjectBootstrapRequest()
  try {
    const server = await fetchOrbServerProjects()
    recordOrbFetchOutcome(null)
    return { server, usedLocalFallback: false }
  } catch (error) {
    recordOrbFetchOutcome(error)
    if (error instanceof AuthApiError && process.env.NODE_ENV === 'development') {
      console.debug('[orb-projects] list failed', error.status, error.message)
    }
    return { server: [], usedLocalFallback: true }
  }
}

export function syncOrbProjectsDebounced(projects: OrbResidentialProjectMemory[]): void {
  if (shouldSkipAuthenticatedOrbFetch()) return
  const syncable = projects.filter((project) => isValidOrbProjectIdForApi(project.id))
  if (!syncable.length) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    if (syncInFlight) return
    syncInFlight = true
    void syncOrbProjectsToServer(syncable)
      .then(() => recordOrbFetchOutcome(null))
      .catch((error) => {
        recordOrbFetchOutcome(error)
        if (process.env.NODE_ENV === 'development') {
          console.debug('[orb-projects] sync failed', error)
        }
      })
      .finally(() => {
        syncInFlight = false
      })
  }, SYNC_DEBOUNCE_MS)
}
