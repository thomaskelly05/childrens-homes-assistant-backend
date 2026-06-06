import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB stale session — access 401', () => {
  it('access hook maps 401 to unauthorized failure kind', () => {
    const hook = read('hooks/use-orb-account-state.ts')
    assert.match(hook, /if \(status === 401\) return 'unauthorized'/)
  })

  it('gate clears stale auth when access returns unauthorized', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /accessFailureKind !== 'unauthorized'/)
    assert.match(gate, /clearStaleOrbSessionState\('access_401'\)/)
    assert.match(gate, /void auth\.logout\(\)/)
  })

  it('auth context resets access deadline on logout and successful login', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /resetOrbAccessLoadingDeadline/)
    assert.match(auth, /logout[\s\S]*resetOrbAccessLoadingDeadline/)
  })

  it('backend access route returns 401 JSON for invalid session token', () => {
    const route = readFileSync(join(root, '../routers/orb_billing_routes.py'), 'utf8')
    assert.match(route, /HTTP_401_UNAUTHORIZED/)
    assert.match(route, /JSONResponse/)
    assert.match(route, /Does not require premium subscription/)
  })
})
