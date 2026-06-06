import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const repoRoot = join(root, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readRepo(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('ORB mobile front door no loading loop', () => {
  it('/ redirects to /orb once', () => {
    const page = read('app/page.tsx')
    const middleware = read('middleware.ts')
    assert.match(page, /redirect\('\/orb'\)/)
    assert.match(middleware, /pathname === '\/'[\s\S]*\/orb/)
  })

  it('/login?returnUrl=%2F resolves to /orb without /orb/login bounce', () => {
    const login = read('app/login/page.tsx')
    const routing = read('lib/orb/orb-front-door-routing.ts')
    const middleware = read('middleware.ts')
    assert.match(login, /buildOrbFrontDoorUrl/)
    assert.match(routing, /path === '\/'/)
    assert.match(middleware, /redirectToOrbFrontDoor/)
    assert.doesNotMatch(middleware, /loginUrl\.pathname = '\/orb\/login'/)
  })

  it('/orb/login redirects to /orb not /orb/login', () => {
    const orbLogin = read('app/orb/login/page.tsx')
    const middleware = read('middleware.ts')
    assert.match(orbLogin, /buildOrbFrontDoorUrl/)
    assert.match(middleware, /\/orb\/login[\s\S]*redirectToOrbFrontDoor/)
    assert.doesNotMatch(middleware, /loginUrl\.pathname = '\/orb\/login'/)
  })

  it('auth gate does not router.replace while embedded login is shown on /orb', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const auth = read('contexts/auth-context.tsx')
    assert.doesNotMatch(gate, /router\.replace\(\s*['"]\/orb['"]/)
    assert.doesNotMatch(gate, /window\.location/)
    assert.match(auth, /isOrbSurfacePath\(pathname\)\) return/)
    assert.match(gate, /wrapOrbRouter/)
  })

  it('loading screen is scrollable with safe-area padding on mobile', () => {
    const loading = read('components/orb-residential/orb-auth-loading-screen.tsx')
    assert.match(loading, /overflow-y-auto/)
    assert.match(loading, /safe-area-inset-top/)
    assert.match(loading, /safe-area-inset-bottom/)
    assert.match(loading, /100dvh/)
  })

  it('middleware does not redirect /orb product paths to /orb/login', () => {
    const middleware = read('middleware.ts')
    assert.doesNotMatch(middleware, /isOrbProductPath\(pathname\)[\s\S]*\/orb\/login/)
    assert.doesNotMatch(middleware, /hasSessionCookie\(request\)[\s\S]*loginUrl\.pathname = '\/orb\/login'/)
  })

  it('rate limiting does not target /auth/me or provider diagnostics', () => {
    const policy = readRepo('services/security_rate_limit_service.py')
    assert.doesNotMatch(policy, /\/auth\/me/)
    assert.doesNotMatch(policy, /\/orb\/auth\/providers/)
    assert.doesNotMatch(policy, /\/orb\/standalone\/auth\/providers/)
  })
})
