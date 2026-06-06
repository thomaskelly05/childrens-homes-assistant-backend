/**
 * Global ORB product bootstrap lock — default locked until gate reaches ready.
 */

import type { OrbGateState } from '@/lib/orb/orb-auth-state-machine'

const LOCKED_GATE_STATES = new Set<OrbGateState>([
  'boot',
  'checking_auth',
  'unauthenticated',
  'checking_access',
  'access_retry',
  'inactive',
  'safety_required',
  'signing_out',
  'error'
])

let bootstrapLocked = true
const blockedBootstrapCalls: string[] = []
let projectFetchBlocked = 0
let configFetchBlocked = 0
let voiceFetchBlocked = 0
let outputsFetchBlocked = 0

export function syncOrbBootstrapLock(gateState: OrbGateState): void {
  bootstrapLocked = LOCKED_GATE_STATES.has(gateState)
}

export function lockOrbBootstrap(reason = 'manual'): void {
  bootstrapLocked = true
  recordBootstrapBlocked('bootstrap', reason)
}

export function unlockOrbBootstrap(): void {
  bootstrapLocked = false
}

export function isOrbBootstrapUnlocked(): boolean {
  return !bootstrapLocked
}

export function getOrbBootstrapLockState(): 'locked' | 'unlocked' {
  return bootstrapLocked ? 'locked' : 'unlocked'
}

export function recordBootstrapBlocked(feature: string, reason: string): void {
  const entry = `${feature}:${reason}`
  blockedBootstrapCalls.push(entry)
  if (feature.includes('project')) projectFetchBlocked += 1
  else if (feature.includes('config')) configFetchBlocked += 1
  else if (feature.includes('voice')) voiceFetchBlocked += 1
  else if (feature.includes('output')) outputsFetchBlocked += 1
}

export function getOrbBootstrapLockDebugSnapshot() {
  return {
    bootstrapLock: getOrbBootstrapLockState(),
    blockedBootstrapCalls: [...blockedBootstrapCalls].slice(-40),
    projectFetchBlocked,
    configFetchBlocked,
    voiceFetchBlocked,
    outputsFetchBlocked
  }
}

export function resetOrbBootstrapLock(): void {
  bootstrapLocked = true
  blockedBootstrapCalls.length = 0
  projectFetchBlocked = 0
  configFetchBlocked = 0
  voiceFetchBlocked = 0
  outputsFetchBlocked = 0
}
