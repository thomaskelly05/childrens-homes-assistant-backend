/**
 * Deduped /auth/passkeys/status — at most one in-flight request and one
 * successful call per allowed context per page lifecycle.
 */

import { fetchOrbPasskeyStatus, type OrbPasskeyListResponse } from '@/lib/orb/orb-passkey-client'

export type PasskeyStatusContext = 'login' | 'settings' | 'none'

let allowedContext: PasskeyStatusContext = 'none'
let pageLifecycleRequestCount = 0
let inFlight: Promise<OrbPasskeyListResponse | null> | null = null
let cachedResult: OrbPasskeyListResponse | null = null

export function getPasskeyStatusRequestCount(): number {
  return pageLifecycleRequestCount
}

export function allowPasskeyStatusFetch(context: Exclude<PasskeyStatusContext, 'none'>): void {
  allowedContext = context
}

export function clearPasskeyStatusAllowance(): void {
  allowedContext = 'none'
}

export function resetPasskeyStatusCache(): void {
  allowedContext = 'none'
  pageLifecycleRequestCount = 0
  inFlight = null
  cachedResult = null
}

export async function fetchPasskeyStatusCached(options?: {
  force?: boolean
}): Promise<OrbPasskeyListResponse | null> {
  if (allowedContext === 'none') return null
  if (!options?.force && cachedResult) return cachedResult
  if (inFlight && !options?.force) return inFlight

  pageLifecycleRequestCount += 1
  const promise = fetchOrbPasskeyStatus()
    .then((result) => {
      cachedResult = result
      return result
    })
    .catch(() => null)
    .finally(() => {
      if (inFlight === promise) inFlight = null
    })

  inFlight = promise
  return promise
}
