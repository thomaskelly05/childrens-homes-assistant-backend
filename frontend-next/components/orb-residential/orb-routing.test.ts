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
    assert.equal(isStandaloneOrbSurfaceRoute('/orb/review'), true)
    assert.equal(isStandaloneOrbSurfaceRoute('/homes'), false)
    assert.equal(isStandaloneOrbSurfaceRoute('/os'), false)
  })

  it('root page redirects to canonical /orb front door', () => {
    const page = readApp('app/page.tsx')
    assert.match(page, /redirect\('\/orb'\)/)
    assert.doesNotMatch(page, /OsHomeClient/)
  })

  it('canonical /orb login is the product front door via OrbAuthGate', () => {
    const shell = readApp('components/orb/orb-shell.tsx')
    const gate = readApp('components/orb-residential/orb-auth-gate.tsx')
    const login = readApp('components/orb-residential/orb-login-screen.tsx')
    const authCard = readApp('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(shell, /OrbAuthGate/)
    assert.match(gate, /OrbLoginScreen/)
    assert.match(authCard, /ORB Residential/)
    assert.match(login, /sanitizeOrbReturnUrl/)
  })

  it('/orb/login shows Microsoft, Google, Email with icons and OAuth return /orb', () => {
    const login = readApp('components/orb-residential/orb-login-screen.tsx')
    const authCard = readApp('components/orb-residential/orb-login-auth-card.tsx')
    const authBtn = readApp('components/orb-residential/ui/orb-auth-button.tsx')
    assert.match(authCard, /Continue with Microsoft/)
    assert.match(authCard, /Continue with Google/)
    assert.doesNotMatch(authCard, /Continue with Apple/)
    assert.match(authCard, /Sign in with email/)
    assert.match(authCard, /orbOAuthStartUrl\('microsoft', returnUrl\)/)
    assert.match(authCard, /Use passkey/)
    assert.match(login, /min-h-\[100dvh\]/s)
    assert.match(authBtn, /OrbAuthProviderIcon/)
    assert.match(authBtn, /MicrosoftIcon/)
  })

  it('passkey option uses orbPasskeysSupported guard', () => {
    const login = readApp('components/orb-residential/orb-login-screen.tsx')
    const authCard = readApp('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(login, /orbPasskeysSupported/)
    assert.match(authCard, /data-orb-passkey-sign-in/)
  })

  it('/orb/setup is minimal optional onboarding', () => {
    const setup = readApp('components/orb-residential/orb-setup-screen.tsx')
    assert.doesNotMatch(setup, /TOTAL_STEPS = 5/)
    assert.match(setup, /Optional profile setup/)
    assert.match(setup, /data-orb-setup-skip/)
    assert.match(setup, /Set this up later/)
  })

  it('/orb renders ChatGPT-style ORB shell via OrbCareCompanion', () => {
    const page = readApp('app/orb/page.tsx')
    const shell = readApp('components/orb/orb-shell.tsx')
    const companion = readApp('components/orb-standalone/orb-care-companion.tsx')
    assert.match(page, /OrbShell/)
    assert.match(shell, /OrbCareCompanion residentialSurface/)
    assert.match(companion, /OrbResidentialSidebar/)
    assert.match(companion, /h-\[100dvh\]/)
    assert.match(companion, /Ready when you are/)
    assert.doesNotMatch(companion, /AppShell/)
  })

  it('viewport scroll rules: sidebar and chat areas scroll independently', () => {
    const css = readApp('app/orb/_legacy-ui-archive/orb-desktop.css')
    const sidebar = readApp('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(css, /orb-chat-layout--residential/)
    assert.match(css, /overflow:\s*hidden/)
    assert.match(css, /overflow-y:\s*auto/)
    assert.match(sidebar, /data-orb-sidebar-scroll/)
    assert.match(readApp('components/orb-standalone/orb-care-companion.tsx'), /data-orb-chat-scroll-container/)
    assert.match(readApp('components/orb-standalone/orb-care-companion.tsx'), /OrbLayout/)
    assert.match(readApp('components/orb/orb-layout.tsx'), /data-orb-sidebar-scroll-container/)
  })

  it('stations are in sidebar but not on front door', () => {
    const sidebar = readApp('components/orb-residential/orb-residential-sidebar.tsx')
    for (const station of ['review', 'templates', 'knowledge', 'saved']) {
      assert.match(sidebar, new RegExp(`id: '${station}'`))
    }
    assert.match(sidebar, /data-orb-sidebar-station=\{item\.id\}|'data-orb-sidebar-station': stationId/)
  })

  it('capability routes deep-link into /orb stations', () => {
    assert.match(readApp('app/orb/ask/page.tsx'), /redirect\('\/orb'\)/)
    assert.match(readApp('app/orb/voice/page.tsx'), /redirect\('\/orb\?station=orb_voice'\)/)
    assert.match(readApp('app/orb/review/page.tsx'), /redirect\('\/orb\?station=orb_write'\)/)
    assert.match(readApp('app/orb/templates/page.tsx'), /redirect\('\/orb\?station=orb_dictate'\)/)
    assert.match(readApp('app/orb/communicate/page.tsx'), /redirect\('\/orb\?station=orb_communicate'\)/)
    assert.match(readApp('app/orb-residential/write/page.tsx'), /redirect\('\/orb\?station=orb_write'\)/)
    assert.match(readApp('app/orb-residential/communicate/page.tsx'), /redirect\('\/orb\?station=orb_communicate'\)/)
    assert.match(readApp('app/orb/learn/page.tsx'), /redirect\('\/orb'\)/)
    assert.match(readApp('app/orb/saved/page.tsx'), /redirect\('\/orb\?station=saved'\)/)
    assert.match(readApp('app/orb/outputs/page.tsx'), /redirect\('\/orb\?station=saved'\)/)
    assert.match(readApp('app/orb/projects/page.tsx'), /redirect\('\/orb'\)/)
    assert.doesNotMatch(readApp('app/orb/outputs/page.tsx'), /redirect\('\/orb\/outputs'\)/)
    assert.doesNotMatch(readApp('app/orb/projects/page.tsx'), /redirect\('\/orb\/projects'\)/)
    assert.match(readApp('app/orb-residential/shift-builder/page.tsx'), /redirect\('\/orb'\)/)
  })

  it('sidebar converges Shift Builder into Templates and Chat', () => {
    const sidebar = readApp('components/orb-residential/orb-residential-sidebar.tsx')
    const mainNav = sidebar.slice(
      sidebar.indexOf('const DESKTOP_MAIN_NAV'),
      sidebar.indexOf('const DESKTOP_LIBRARY_NAV')
    )
    assert.doesNotMatch(mainNav, /label: 'Shift Builder'/)
    assert.match(readApp('lib/orb/orb-navigation-convergence.ts'), /shift_builder/)
  })

  it('/os still renders IndiCare OS', () => {
    const page = readApp('app/os/page.tsx')
    assert.match(page, /OsHomeClient/)
    assert.match(page, /IndiCare OS/)
  })

  it('safety modal is compact single step', () => {
    const modal = readApp('components/orb-residential/orb-safety-modal.tsx')
    assert.match(modal, /Before using ORB/)
    assert.match(modal, /I understand/)
  })

  it('post-login routes to /orb not mandatory setup', () => {
    const login = readApp('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /return ORB_RETURN/)
    assert.match(login, /ORB_CANONICAL_FRONT_DOOR/)
    assert.doesNotMatch(login, /onboarding_completed.*\/orb\/setup/s)
  })
})
