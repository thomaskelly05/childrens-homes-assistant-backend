import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB auth context timeout', () => {
  it('session check uses Promise.race with context timeout', () => {
    const auth = read('contexts/auth-context.tsx')
    const routing = read('lib/orb/orb-front-door-routing.ts')
    assert.match(auth, /ORB_AUTH_CONTEXT_TIMEOUT_MS/)
    assert.match(auth, /Promise\.race/)
    assert.match(routing, /ORB_AUTH_CONTEXT_TIMEOUT_MS/)
  })

  it('timeout and network failure resolve to unauthenticated', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /setStatus\('unauthenticated'\)/)
    assert.match(auth, /authError\.status === 0/)
    assert.match(auth, /Session check timed out/)
  })

  it('401 auth failures resolve to unauthenticated', () => {
    const auth = read('contexts/auth-context.tsx')
    const api = read('lib/auth/api.ts')
    assert.match(api, /isAuthFailureStatus/)
    assert.match(auth, /isAuthFailureStatus\(authError\.status\)/)
  })

  it('503 without cached user resolves to unauthenticated', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /isTemporaryUnavailableStatus/)
    assert.match(auth, /setStatus\('unauthenticated'\)/)
  })

  it('429 rate limit resolves to unauthenticated login state', () => {
    const auth = read('contexts/auth-context.tsx')
    const api = read('lib/auth/api.ts')
    assert.match(api, /isRateLimitedStatus/)
    assert.match(auth, /isRateLimitedStatus\(authError\.status\)/)
    assert.match(auth, /Too many requests/)
  })

  it('background refresh does not flip authenticated users back to loading', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /current === 'authenticated' \? current : 'loading'/)
  })

  it('access fetch uses timeout race', () => {
    const account = read('hooks/use-orb-account-state.ts')
    assert.match(account, /Promise\.race\(\[fetchOrbAccess\(\)/)
    assert.match(account, /ORB_AUTH_LOADING_TIMEOUT_MS/)
  })
})
