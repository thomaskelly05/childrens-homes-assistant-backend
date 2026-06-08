import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile login layout', () => {
  it('uses single-column mobile markers and scrollable page', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read('app/orb/orb-login.css')
    assert.match(login, /data-orb-login-mobile-single-column/)
    assert.match(login, /data-orb-login-scrollable/)
    assert.match(css, /100svh/)
    assert.match(css, /safe-area-inset-bottom/)
    assert.match(css, /overflow-y:\s*auto/)
  })

  it('keeps mobile brand compact with small ORB mark, not desktop hero sphere', () => {
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const css = read('app/orb/orb-login.css')

    assert.match(mobile, /data-orb-login-mobile-brand/)
    assert.match(mobile, /data-orb-login-engine-line/)
    assert.match(mobile, /data-orb-login-mobile-mark/)
    assert.match(mobile, /PremiumMobileOrb/)
    assert.doesNotMatch(mobile, /OrbHeroSphere/)
    assert.match(hero, /OrbHeroSphere/)
    assert.match(hero, /hidden flex-col justify-start lg:flex/)
    assert.match(css, /orb-login-mobile-mark/)
    assert.match(css, /data-orb-login-safe-bottom/)
  })

  it('short desktop viewport keeps hero top-aligned', () => {
    const css = read('app/orb/orb-login.css')
    const passCss = read('app/orb/orb-premium-layout-pass.css')
    assert.match(css, /align-items:\s*flex-start/)
    assert.match(css, /clamp\(1\.25rem,\s*12vh/)
    assert.match(passCss, /align-items:\s*flex-start/)
    assert.match(passCss, /justify-content:\s*flex-start/)
  })

  it('OAuth buttons are readable when disabled', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const button = read('components/orb-residential/ui/orb-auth-button.tsx')
    const css = read('app/orb/orb-login.css')
    assert.match(authCard, /sign-in unavailable/)
    assert.match(button, /unavailableLabel/)
    assert.match(css, /orb-auth-button--disabled/)
  })

  it('passkey section collapses by default with toggle', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(login, /passkeyExpanded/)
    assert.match(login, /emailExpanded/)
    assert.match(authCard, /data-orb-passkey-toggle/)
    assert.match(authCard, /data-orb-email-toggle/)
  })

  it('mobile sign-in title differs from desktop', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Sign in to continue/)
    assert.match(authCard, /lg:hidden/)
    assert.match(authCard, /hidden lg:inline/)
    assert.match(authCard, /Welcome to ORB Residential/)
  })
})
