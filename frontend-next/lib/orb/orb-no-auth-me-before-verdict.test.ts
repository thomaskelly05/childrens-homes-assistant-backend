import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB no /auth/me before verdict', () => {
  it('AuthProvider defers /auth/me on ORB surface until verdict resolves', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /shouldDeferOrbAuthMeProbe/)
    assert.match(auth, /recordOrbBootstrapRequest\('auth_me'\)/)
  })

  it('verdict store exposes defer probe flag', () => {
    const store = read('lib/orb/orb-front-door-verdict-store.ts')
    assert.match(store, /shouldDeferOrbAuthMeProbe/)
    assert.match(store, /markOrbFrontDoorVerdictResolved/)
  })
})
