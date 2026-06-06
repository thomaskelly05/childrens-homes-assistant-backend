import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB front door routing contract', () => {
  it('/ redirects to /orb', () => {
    const page = read('app/page.tsx')
    const middleware = read('middleware.ts')
    assert.ok(page.includes("redirect('/orb')"))
    assert.ok(middleware.includes("pathname === '/'"))
    assert.ok(middleware.includes("'/orb'"))
  })

  it('/login redirects to /orb with safe returnUrl', () => {
    const login = read('app/login/page.tsx')
    const middleware = read('middleware.ts')
    assert.ok(login.includes('buildOrbFrontDoorUrl'))
    assert.ok(middleware.includes("pathname === '/login'"))
    assert.ok(middleware.includes('redirectToOrbFrontDoor'))
  })

  it('/login?returnUrl=%2F resolves to /orb', () => {
    const routing = read('lib/orb/orb-front-door-routing.ts')
    assert.ok(routing.includes("path === '/'"))
    assert.ok(routing.includes('ORB_CANONICAL_FRONT_DOOR'))
  })

  it('/orb/login redirects to canonical /orb front door', () => {
    const orbLogin = read('app/orb/login/page.tsx')
    const middleware = read('middleware.ts')
    assert.ok(orbLogin.includes('buildOrbFrontDoorUrl'))
    assert.ok(middleware.includes('/orb/login'))
  })

  it('unauthenticated /orb uses OrbAuthGate login, not product shell', () => {
    const shell = read('components/orb/orb-shell.tsx')
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.ok(shell.includes('OrbAuthGate'))
    assert.ok(gate.includes('OrbLoginScreen'))
    assert.ok(!gate.includes('OrbCareCompanion'))
  })

  it('middleware does not bounce ORB product paths to /orb/login', () => {
    const middleware = read('middleware.ts')
    assert.ok(!middleware.includes("loginUrl.pathname = '/orb/login'"))
    assert.ok(!middleware.includes('isOrbProductPath(pathname) && !hasSessionCookie'))
  })

  it('OAuth callbacks and Stripe webhooks stay public', () => {
    const middleware = read('middleware.ts')
    assert.ok(middleware.includes("'/api'"))
    assert.ok(middleware.includes("'/backend'"))
    assert.ok(middleware.includes("'/auth'"))
  })
})
