/**
 * Module-level ORB gate state for bootstrap guards outside React context.
 * OrbAuthGate is the sole writer; product hooks read before fetching.
 */

import type { OrbGateState } from '@/lib/orb/orb-auth-state-machine'
import { syncOrbBootstrapLock } from '@/lib/orb/orb-bootstrap-lock'

let currentGateState: OrbGateState = 'boot'
let childrenMounted = false

export function setOrbGateState(state: OrbGateState, productChildrenMounted: boolean): void {
  currentGateState = state
  childrenMounted = productChildrenMounted
  syncOrbBootstrapLock(state)
}

export function getOrbGateState(): OrbGateState {
  return currentGateState
}

export function areOrbProductChildrenMounted(): boolean {
  return childrenMounted
}

export function resetOrbGateStateStore(): void {
  currentGateState = 'boot'
  childrenMounted = false
  syncOrbBootstrapLock('boot')
}
