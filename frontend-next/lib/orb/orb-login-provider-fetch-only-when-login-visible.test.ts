import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB login provider fetch only when login visible', () => {
  it('login screen fetches auth providers in login panel effect', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /ORB_BILLING_API\.authProviders/)
    assert.match(login, /embeddedGateMode/)
  })

  it('gate renders login only for unauthenticated verdict', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'unauthenticated':[\s\S]*OrbLoginScreen/)
  })
})
