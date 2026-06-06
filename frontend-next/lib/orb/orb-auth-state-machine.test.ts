import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  deriveOrbGateState,
  reduceOrbGateState,
  type OrbGateContext
} from './orb-auth-state-machine.ts'

function baseContext(overrides: Partial<OrbGateContext> = {}): OrbGateContext {
  return {
    authStatus: 'loading',
    isSignedIn: false,
    accessLoading: false,
    accessFailureKind: 'none',
    hasConfirmedAccess: false,
    adminBypass: false,
    safetyAccepted: null,
    safetyRequired: false,
    authFallback: false,
    accessFallback: false,
    loopBroken: false,
    contractMismatch: false,
    mode: 'product',
    ...overrides
  }
}

describe('orb-auth-state-machine', () => {
  it('auth loading resolves to checking_auth', () => {
    assert.equal(deriveOrbGateState(baseContext()), 'checking_auth')
  })

  it('auth fallback resolves to unauthenticated login', () => {
    assert.equal(deriveOrbGateState(baseContext({ authFallback: true })), 'unauthenticated')
  })

  it('authenticated access loading resolves to checking_access', () => {
    assert.equal(
      deriveOrbGateState(
        baseContext({
          authStatus: 'authenticated',
          isSignedIn: true,
          accessLoading: true
        })
      ),
      'checking_access'
    )
  })

  it('access fallback resolves to access_retry not login', () => {
    assert.equal(
      deriveOrbGateState(
        baseContext({
          authStatus: 'authenticated',
          isSignedIn: true,
          accessFallback: true
        })
      ),
      'access_retry'
    )
  })

  it('access 401 resolves to unauthenticated', () => {
    assert.equal(
      deriveOrbGateState(
        baseContext({
          authStatus: 'authenticated',
          isSignedIn: true,
          accessFailureKind: 'unauthorized'
        })
      ),
      'unauthenticated'
    )
  })

  it('inactive subscription resolves to inactive upgrade', () => {
    assert.equal(
      deriveOrbGateState(
        baseContext({
          authStatus: 'authenticated',
          isSignedIn: true,
          accessFailureKind: 'payment_required'
        })
      ),
      'inactive'
    )
  })

  it('active user resolves to ready', () => {
    assert.equal(
      deriveOrbGateState(
        baseContext({
          authStatus: 'authenticated',
          isSignedIn: true,
          hasConfirmedAccess: true,
          safetyAccepted: true
        })
      ),
      'ready'
    )
  })

  it('loop broken forces unauthenticated', () => {
    assert.equal(deriveOrbGateState(baseContext({ loopBroken: true })), 'unauthenticated')
  })

  it('reduce handles ACCESS_401 to unauthenticated', () => {
    assert.equal(reduceOrbGateState('checking_access', { type: 'ACCESS_401' }), 'unauthenticated')
  })

  it('reduce handles ACCESS_OK_READY to ready', () => {
    assert.equal(reduceOrbGateState('checking_access', { type: 'ACCESS_OK_READY' }), 'ready')
  })

  it('safety required resolves to safety_required', () => {
    assert.equal(
      deriveOrbGateState(
        baseContext({
          authStatus: 'authenticated',
          isSignedIn: true,
          safetyRequired: true
        })
      ),
      'safety_required'
    )
  })
})
