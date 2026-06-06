/**
 * ORB product bootstrap guard — product APIs must not run until OrbAuthGate is ready.
 */

import type { OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import type { OrbGateState } from '@/lib/orb/orb-auth-state-machine'
import { getOrbGateState } from '@/lib/orb/orb-gate-state-store'

export type OrbBootstrapBlockReason =
  | 'gate_not_ready'
  | 'gate_unauthenticated'
  | 'gate_checking_auth'
  | 'gate_checking_access'
  | 'gate_access_retry'
  | 'gate_inactive'
  | 'gate_safety_required'
  | 'gate_error'

let lastBlockedBootstrapReason: OrbBootstrapBlockReason | null = null

let projectRequestCount = 0
let configRequestCount = 0
let voiceStatusRequestCount = 0
let outputsSummaryRequestCount = 0
let passkeyStatusRequestCount = 0

export function getOrbBootstrapNetworkCounts() {
  return {
    projectRequestCount,
    configRequestCount,
    voiceStatusRequestCount,
    outputsSummaryRequestCount,
    passkeyStatusRequestCount
  }
}

export function recordOrbProjectBootstrapRequest(): void {
  projectRequestCount += 1
}

export function recordOrbConfigBootstrapRequest(): void {
  configRequestCount += 1
}

export function recordOrbVoiceStatusBootstrapRequest(): void {
  voiceStatusRequestCount += 1
}

export function recordOrbOutputsSummaryBootstrapRequest(): void {
  outputsSummaryRequestCount += 1
}

export function recordOrbPasskeyStatusBootstrapRequest(): void {
  passkeyStatusRequestCount += 1
}

export function resetOrbBootstrapNetworkCounts(): void {
  projectRequestCount = 0
  configRequestCount = 0
  voiceStatusRequestCount = 0
  outputsSummaryRequestCount = 0
  passkeyStatusRequestCount = 0
  lastBlockedBootstrapReason = null
}

export function getLastBlockedBootstrapReason(): OrbBootstrapBlockReason | null {
  return lastBlockedBootstrapReason
}

const READY_GATE: OrbGateState = 'ready'

export function canBootstrapOrbProduct(
  gateState: OrbGateState = getOrbGateState(),
  _access?: OrbAccessPayload | null
): boolean {
  return gateState === READY_GATE
}

export function canFetchOrbPasskeyStatus(gateState: OrbGateState = getOrbGateState()): boolean {
  return gateState === READY_GATE
}

export function assertOrbProductBootstrapAllowed(
  reason: string,
  gateState: OrbGateState = getOrbGateState()
): void {
  if (canBootstrapOrbProduct(gateState)) return

  const blockReason: OrbBootstrapBlockReason =
    gateState === 'unauthenticated'
      ? 'gate_unauthenticated'
      : gateState === 'checking_auth'
        ? 'gate_checking_auth'
        : gateState === 'checking_access'
          ? 'gate_checking_access'
          : gateState === 'access_retry'
            ? 'gate_access_retry'
            : gateState === 'inactive'
              ? 'gate_inactive'
              : gateState === 'safety_required'
                ? 'gate_safety_required'
                : gateState === 'error' || gateState === 'signing_out'
                  ? 'gate_error'
                  : 'gate_not_ready'

  lastBlockedBootstrapReason = blockReason

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[orb-bootstrap-guard] blocked', reason, blockReason, gateState)
  }
}

export function shouldAllowOrbProductFetch(feature: string): boolean {
  const gateState = getOrbGateState()
  if (canBootstrapOrbProduct(gateState)) return true
  assertOrbProductBootstrapAllowed(feature, gateState)
  return false
}
