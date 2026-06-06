import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB login embedded gate mode — no auto-redirect', () => {
  it('embeddedGateMode disables autoRedirectAuthenticated', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /embeddedGateMode/)
    assert.match(login, /autoRedirectAuthenticated = !embeddedGateMode/)
    assert.match(login, /if \(!autoRedirectAuthenticated\) return/)
  })

  it('embeddedGateMode afterAuth calls onLoginSuccess instead of router.replace', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /if \(embeddedGateMode\)[\s\S]*onLoginSuccess\?\.\(\)/)
  })

  it('gate passes embeddedGateMode to login screen', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /embeddedGateMode/)
    assert.match(gate, /onLoginSuccess=\{handleLoginSuccess\}/)
  })

  it('gate login path does not router.replace to /orb', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.doesNotMatch(gate, /router\.replace\(\s*['"]\/orb['"]/)
  })
})
