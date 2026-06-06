import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { sanitizeOrbReturnUrl } from '../../lib/orb/orb-front-door-routing.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB login returnUrl handling', () => {
  it('embedded gate sanitises pathname return targets', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /sanitizeOrbReturnUrl/)
    assert.match(gate, /returnUrl=\{returnUrl\}/)
  })

  it('login screen sanitises returnUrl before OAuth and post-login navigation', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /sanitizeOrbReturnUrl/)
    assert.match(login, /orbOAuthStartUrl\('microsoft', returnUrl\)/)
  })

  it('external returnUrl is rejected', () => {
    assert.equal(sanitizeOrbReturnUrl('https://attacker.test'), '/orb')
  })

  it('/login?returnUrl=/orb/write style paths are preserved', () => {
    assert.equal(sanitizeOrbReturnUrl('/orb/write'), '/orb/write')
    assert.equal(sanitizeOrbReturnUrl('/orb?station=dictate'), '/orb?station=dictate')
  })
})
