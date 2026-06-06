import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile front door — no access loop', () => {
  it('gate never shows embedded login while authenticated', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const authenticatedBlock = gate.slice(gate.indexOf("if (auth.status === 'unauthenticated')"))
    assert.doesNotMatch(authenticatedBlock, /accessFallback[\s\S]*OrbLoginScreen/)
    assert.doesNotMatch(authenticatedBlock, /account\.isLoading[\s\S]*OrbLoginScreen/)
  })

  it('gate does not call router.replace during access verification', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const inner = gate.slice(gate.indexOf('function OrbAuthGateInner'), gate.indexOf('export function OrbAuthGate'))
    assert.doesNotMatch(inner, /router\.replace\(\s*['"]\/orb['"]/)
    assert.doesNotMatch(inner, /router\.replace\(\s*['"]\/['"]/)
  })

  it('login screen authenticated redirect is not triggered by gate access fallback', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(login, /status !== 'authenticated'/)
    assert.doesNotMatch(gate, /if \(\s*accessFallback[\s\S]*OrbLoginScreen/)
  })

  it('front-door routing keeps /orb canonical without /orb/login bounce', () => {
    const routing = read('lib/orb/orb-front-door-routing.ts')
    const middleware = readFileSync(join(root, 'middleware.ts'), 'utf8')
    assert.match(routing, /ORB_CANONICAL_FRONT_DOOR = '\/orb'/)
    assert.match(middleware, /\/orb\/login/)
    assert.match(middleware, /\/orb/)
  })
})
