/**
 * Explicit ORB front-door gate state machine.
 * OrbAuthGate owns all transitions; login/access hooks do not route.
 */

import type { OrbAccessFailureKind } from '@/hooks/use-orb-account-state'

export type OrbGateState =
  | 'boot'
  | 'checking_auth'
  | 'unauthenticated'
  | 'checking_access'
  | 'access_retry'
  | 'inactive'
  | 'safety_required'
  | 'ready'
  | 'signing_out'
  | 'error'

export type OrbGateEvent =
  | { type: 'AUTH_OK' }
  | { type: 'AUTH_401' }
  | { type: 'AUTH_TIMEOUT' }
  | { type: 'AUTH_ERROR' }
  | { type: 'ACCESS_OK_READY' }
  | { type: 'ACCESS_OK_INACTIVE' }
  | { type: 'ACCESS_SAFETY_REQUIRED' }
  | { type: 'ACCESS_401' }
  | { type: 'ACCESS_402' }
  | { type: 'ACCESS_403' }
  | { type: 'ACCESS_429' }
  | { type: 'ACCESS_TIMEOUT' }
  | { type: 'ACCESS_ERROR' }
  | { type: 'RETRY' }
  | { type: 'SIGN_OUT' }
  | { type: 'CONTRACT_MISMATCH' }
  | { type: 'LOOP_BROKEN' }

export type OrbGateMode = 'product' | 'billing'

export type OrbGateContext = {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated'
  isSignedIn: boolean
  accessLoading: boolean
  accessFailureKind: OrbAccessFailureKind
  hasConfirmedAccess: boolean
  adminBypass: boolean
  safetyAccepted: boolean | null
  safetyRequired: boolean
  authFallback: boolean
  accessFallback: boolean
  loopBroken: boolean
  contractMismatch: boolean
  mode: OrbGateMode
}

export function reduceOrbGateState(state: OrbGateState, event: OrbGateEvent): OrbGateState {
  switch (event.type) {
    case 'SIGN_OUT':
      return 'signing_out'
    case 'RETRY':
      if (state === 'access_retry' || state === 'error') return 'checking_access'
      if (state === 'unauthenticated') return 'checking_auth'
      return state
    case 'LOOP_BROKEN':
      return 'unauthenticated'
    case 'CONTRACT_MISMATCH':
      return 'access_retry'
    case 'AUTH_401':
    case 'AUTH_TIMEOUT':
    case 'AUTH_ERROR':
      return 'unauthenticated'
    case 'AUTH_OK':
      return 'checking_access'
    case 'ACCESS_401':
      return 'unauthenticated'
    case 'ACCESS_402':
      return 'inactive'
    case 'ACCESS_SAFETY_REQUIRED':
    case 'ACCESS_403':
      return 'safety_required'
    case 'ACCESS_429':
    case 'ACCESS_TIMEOUT':
    case 'ACCESS_ERROR':
      return 'access_retry'
    case 'ACCESS_OK_INACTIVE':
      return 'inactive'
    case 'ACCESS_OK_READY':
      return 'ready'
    default:
      return state
  }
}

export function deriveOrbGateState(ctx: OrbGateContext): OrbGateState {
  if (ctx.loopBroken) return 'unauthenticated'
  if (ctx.contractMismatch) return 'access_retry'

  if (ctx.authStatus === 'loading') {
    return ctx.authFallback ? 'unauthenticated' : 'checking_auth'
  }

  if (ctx.authStatus === 'unauthenticated') {
    return 'unauthenticated'
  }

  if (!ctx.isSignedIn) {
    return 'unauthenticated'
  }

  if (ctx.accessLoading && !ctx.accessFallback) {
    return 'checking_access'
  }

  if (ctx.accessFailureKind === 'unauthorized') {
    return 'unauthenticated'
  }

  if (ctx.accessFailureKind === 'safety_required' || ctx.safetyRequired) {
    return 'safety_required'
  }

  if (ctx.accessFailureKind === 'payment_required') {
    return 'inactive'
  }

  if (
    ctx.accessFallback ||
    ctx.accessFailureKind === 'timeout' ||
    ctx.accessFailureKind === 'unavailable' ||
    ctx.accessFailureKind === 'rate_limited'
  ) {
    return 'access_retry'
  }

  if (ctx.mode === 'product' && !ctx.hasConfirmedAccess && !ctx.adminBypass) {
    return 'inactive'
  }

  if (ctx.hasConfirmedAccess || ctx.adminBypass || ctx.mode === 'billing') {
    return 'ready'
  }

  return 'checking_access'
}

export function gateDecisionLabel(state: OrbGateState): string {
  return state
}
