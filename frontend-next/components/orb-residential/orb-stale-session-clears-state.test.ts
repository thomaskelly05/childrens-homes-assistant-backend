import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB stale session clears state', () => {
  it('stale session clear module exists and clears auth cache', () => {
    const mod = read('lib/orb/orb-stale-session-clear.ts')
    assert.match(mod, /clearStaleOrbSessionState/)
    assert.match(mod, /indicare\.auth\.identity\.v1/)
    assert.match(mod, /resetOrbAuthLoadingDeadline/)
    assert.match(mod, /resetOrbAccessLoadingDeadline/)
    assert.match(mod, /resetOrbSessionGate/)
  })

  it('gate clears stale state on access 401 before logout', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /clearStaleOrbSessionState\('access_401'\)/)
    assert.match(gate, /void auth\.logout\(\)/)
  })

  it('auth context clears stale state on auth 401', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /clearStaleOrbSessionState\('auth_me_401'/)
  })
})
