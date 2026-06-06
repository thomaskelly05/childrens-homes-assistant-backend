/**
 * Centralised /orb/standalone/access fetch with in-flight dedupe, short cache,
 * and stale-request abort. One active access check per page lifecycle window.
 */

import { AuthApiError } from '@/lib/auth/api'
import { fetchOrbAccess, type OrbAccessPayload } from '@/lib/orb/orb-billing-client'

const ACCESS_CACHE_MS = 4_000

type CachedAccess = {
  payload: OrbAccessPayload
  fetchedAt: number
}

let inFlight: Promise<OrbAccessPayload> | null = null
let abortController: AbortController | null = null
let cached: CachedAccess | null = null
let accessRequestCount = 0

export function getOrbAccessRequestCount(): number {
  return accessRequestCount
}

export function resetOrbAccessRequestCache(_reason?: string): void {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  inFlight = null
  cached = null
}

async function executeAccessFetch(controller: AbortController): Promise<OrbAccessPayload> {
  const payload = await fetchOrbAccess()
  if (controller.signal.aborted) {
    throw new AuthApiError(0, 'ORB access request superseded')
  }
  cached = { payload, fetchedAt: Date.now() }
  return payload
}

export async function fetchOrbAccessCached(options?: {
  force?: boolean
  reason?: string
}): Promise<OrbAccessPayload> {
  const force = Boolean(options?.force)
  const now = Date.now()

  if (!force && cached && now - cached.fetchedAt < ACCESS_CACHE_MS) {
    return cached.payload
  }

  if (inFlight && !force) {
    return inFlight
  }

  if (force && abortController) {
    abortController.abort()
    abortController = null
    inFlight = null
  }

  const controller = new AbortController()
  abortController = controller
  accessRequestCount += 1

  const promise = executeAccessFetch(controller).finally(() => {
    if (abortController === controller) {
      abortController = null
    }
    if (inFlight === promise) {
      inFlight = null
    }
  })

  inFlight = promise
  return promise
}
