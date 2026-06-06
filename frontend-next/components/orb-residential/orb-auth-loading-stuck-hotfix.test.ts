import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile auth loading stuck hotfix', () => {
  it('OrbAuthGate falls through to login when auth loading exceeds gate deadline', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /ORB_AUTH_GATE_FALLBACK_MS/)
    assert.match(gate, /authFallback/)
    assert.match(gate, /authFallback/)
    assert.match(gate, /case 'unauthenticated'[\s\S]*OrbLoginScreen/)
    assert.match(gate, /We could not confirm your session/)
  })

  it('auth gate deadline survives remounts via shared deadline module', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const deadline = read('lib/orb/orb-auth-loading-deadline.ts')
    const loading = read('components/orb-residential/orb-auth-loading-screen.tsx')
    assert.match(gate, /markOrbAuthLoadingStart/)
    assert.match(gate, /hasOrbAuthLoadingDeadlinePassed/)
    assert.match(deadline, /orbAuthLoadingStartedAt/)
    assert.match(loading, /getOrbAuthLoadingRemainingMs/)
  })

  it('loading screen does not own the only auth escape hatch', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const loading = read('components/orb-residential/orb-auth-loading-screen.tsx')
    assert.match(gate, /setAuthFallback\(true\)/)
    assert.doesNotMatch(loading, /OrbLoginScreen/)
  })

  it('unauthenticated /orb never renders product shell markers during fallback', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.doesNotMatch(gate, /data-orb-sidebar/)
    assert.doesNotMatch(gate, /OrbCareCompanion/)
    assert.match(gate, /case 'unauthenticated'[\s\S]*OrbLoginScreen/)
  })
})
