import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile no router bounce', () => {
  it('auth gate uses state machine deriveOrbGateState', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /deriveOrbGateState/)
    assert.match(gate, /switch \(gateState\)/)
  })

  it('access hang shows retry not login while authenticated', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'access_retry'/)
    assert.match(gate, /OrbAccessRetryScreen/)
    assert.doesNotMatch(gate, /case 'checking_access'[\s\S]*OrbLoginScreen/)
  })

  it('auth context does not redirect from orb surface when unauthenticated', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /isOrbSurfacePath\(pathname\)\) return/)
  })

  it('logout on /orb does not router.replace when already on /orb', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /pathname === '\/orb'/)
    assert.match(auth, /logoutRedirecting\.current = false/)
  })

  it('access hook does not import router', () => {
    const hook = read('hooks/use-orb-account-state.ts')
    assert.doesNotMatch(hook, /useRouter/)
    assert.doesNotMatch(hook, /router\.replace/)
    assert.doesNotMatch(hook, /router\.push/)
  })
})
