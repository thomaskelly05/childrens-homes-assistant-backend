import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { isStandaloneOrbSurfaceRoute } from '../../lib/orb/product-mode.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readApp(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential routing', () => {
  it('treats / and /orb/* as standalone surfaces without OS shell', () => {
    assert.equal(isStandaloneOrbSurfaceRoute('/'), true)
    assert.equal(isStandaloneOrbSurfaceRoute('/orb'), true)
    assert.equal(isStandaloneOrbSurfaceRoute('/orb/login'), true)
    assert.equal(isStandaloneOrbSurfaceRoute('/homes'), false)
    assert.equal(isStandaloneOrbSurfaceRoute('/os'), false)
  })

  it('root page renders ORB front door', () => {
    const page = readApp('app/page.tsx')
    assert.match(page, /OrbFrontDoor/)
    assert.doesNotMatch(page, /OsHomeClient/)
  })

  it('/os renders IndiCare OS landing', () => {
    const page = readApp('app/os/page.tsx')
    assert.match(page, /OsHomeClient/)
    assert.match(page, /IndiCare OS/)
  })

  it('/orb/login renders OAuth options with setup return_url', () => {
    const login = readApp('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /Continue with Microsoft/)
    assert.match(login, /orbOAuthStartUrl\('microsoft', SETUP_RETURN\)/)
    assert.match(login, /SETUP_RETURN = '\/orb\/setup'/)
  })

  it('/orb/setup renders onboarding steps', () => {
    const setup = readApp('components/orb-residential/orb-setup-screen.tsx')
    assert.match(setup, /TOTAL_STEPS = 5/)
    assert.match(setup, /Enter ORB/)
    assert.match(setup, /saveOrbOnboarding/)
  })

  it('canonical capability routes exist', () => {
    for (const route of ['review', 'templates', 'learn', 'saved', 'setup', 'billing']) {
      const page = readApp(`app/orb/${route}/page.tsx`)
      assert.ok(page.length > 0, `missing app/orb/${route}/page.tsx`)
    }
  })

  it('legacy onboarding and access redirect', () => {
    assert.match(readApp('app/orb/onboarding/page.tsx'), /redirect\('\/orb\/setup'\)/)
    assert.match(readApp('app/orb/access/page.tsx'), /redirect\('\/orb\/billing'\)/)
  })

  it('front door links to trial login and OS', () => {
    const door = readApp('components/orb-residential/orb-front-door.tsx')
    assert.match(door, /\/orb\/login\?returnUrl=\/orb\/setup/)
    assert.match(door, /href="\/os"/)
    assert.match(door, /Start Free Trial/)
  })

  it('ORB home does not import OS AppShell', () => {
    const home = readApp('components/orb-residential/orb-residential-chat-home.tsx')
    assert.doesNotMatch(home, /AppShell/)
    assert.doesNotMatch(home, /OsScopeGate/)
    assert.match(home, /OrbShell/)
  })
})
