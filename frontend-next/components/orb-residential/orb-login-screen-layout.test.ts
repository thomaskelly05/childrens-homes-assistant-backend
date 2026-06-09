import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB premium login screen layout', () => {
  it('desktop two-column layout markers exist', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const css = read('app/orb/orb-login.css')

    assert.match(login, /data-orb-login-two-column/)
    assert.match(login, /lg:grid-cols-\[1\.05fr_0\.95fr\]/)
    assert.match(login, /OrbLoginDesktopHero/)
    assert.match(hero, /data-orb-login-hero-top-aligned/)
    assert.match(hero, /data-orb-login-desktop-hero/)
    assert.match(login, /data-orb-login-panel-centered/)
    assert.match(css, /orb-login-hero/)
    assert.match(css, /orb-login-panel/)
  })

  it('right sign-in panel is centred in a premium card', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const css = read('app/orb/orb-login.css')
    assert.match(login, /OrbLoginAuthCard/)
    assert.match(authCard, /orb-login-card/)
    assert.match(authCard, /orb-login-panel-inner/)
    assert.match(css, /align-items:\s*center/)
  })

  it('left hero places ORB visual above brand and copy in document flow', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const css = read('app/orb/orb-login.css')

    const sphereIdx = hero.indexOf('data-orb-login-hero-sphere')
    const brandIdx = hero.indexOf('data-orb-login-brand')
    const titleIdx = hero.indexOf('data-orb-login-title')

    assert.ok(sphereIdx < brandIdx, 'ORB visual should precede product name')
    assert.ok(brandIdx < titleIdx, 'Product name should precede functional headline')

    assert.match(hero, /ORB Residential/)
    assert.match(hero, /Powered by IndiCare Intelligence/)
    assert.match(hero, /AI support for residential children/)
    assert.match(hero, /Record better\. Reflect faster\. Respond safer\./)
    assert.match(hero, /data-orb-login-trust-points/)
    assert.match(hero, /orb-login-hero-visual/)
    assert.match(hero, /OrbHeroSphere/)
    assert.match(hero, /Safeguarding-aware support/)
    assert.match(hero, /Designed for adults working in and around children/)
    assert.match(hero, /orb-login-hero-heading-stack/)
    assert.match(hero, /data-orb-login-hero-heading-stack/)
    assert.match(css, /orb-login-hero-visual/)
    assert.match(css, /align-items:\s*flex-start/)
    assert.match(css, /overflow:\s*visible/)
    assert.match(css, /clamp\(1\.25rem,\s*12vh/)
  })

  it('mobile layout is single column with separate compact header', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')

    assert.match(login, /data-orb-login-mobile-single-column/)
    assert.match(login, /OrbLoginMobileHeader/)
    assert.match(mobile, /data-orb-login-mobile-layout/)
    assert.match(mobile, /data-orb-login-mobile-mark/)
    assert.match(mobile, /lg:hidden/)
    assert.match(hero, /hidden flex-col justify-center lg:flex/)
    assert.match(mobile, /data-orb-login-mobile-brand/)
    assert.doesNotMatch(authCard, /OrbLoginMobileHeader/)
  })

  it('authenticated users on login route redirect away', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /status === 'authenticated'/)
    assert.match(login, /resolvePostLoginRoute/)
  })

  it('OAuth, email, passkey and create account remain available in launch order', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const footer = read('components/orb-residential/orb-login-legal-footer.tsx')

    assert.match(authCard, /Welcome to ORB Residential/)
    assert.match(authCard, /Sign in to continue/)
    assert.match(authCard, /Sign in or create your account to continue|Use Google, Microsoft, email or passkey/)
    assert.match(authCard, /Continue with Microsoft/)
    assert.match(authCard, /data-orb-create-account/)
    assert.match(authCard, /Sign in with email/)
    assert.match(authCard, /data-testid="orb-login-email"/)
    assert.match(authCard, /data-orb-email-toggle/)
    assert.match(footer, /variant="auth"/)
    assert.match(authCard, /data-orb-passkey-sign-in/)
    assert.match(authCard, /href="\/orb\/signup"/)
    assert.match(footer, /OrbLegalLinks/)

    const oauthIdx = authCard.indexOf('data-orb-oauth-buttons')
    const createIdx = authCard.indexOf('data-orb-create-account')
    const emailIdx = authCard.indexOf('data-orb-email-toggle')
    const passkeyIdx = authCard.indexOf('data-orb-login-passkey-section')
    assert.ok(oauthIdx < createIdx, 'OAuth should appear before create account')
    assert.ok(createIdx < emailIdx, 'Create account should appear before email')
    assert.ok(emailIdx < passkeyIdx, 'Email should appear before passkey')
  })

  it('does not use numbered step headings', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.doesNotMatch(authCard, /1\. Continue with/)
    assert.doesNotMatch(authCard, /2\. Continue with/)
    assert.doesNotMatch(authCard, /3\. Use passkey/)
  })

  it('desktop card scrolls on short viewports with safe bottom padding', () => {
    const css = read('app/orb/orb-login.css')
    assert.match(css, /max-height:\s*calc\([\s\S]*100svh/)
    assert.match(css, /overflow-y:\s*auto/)
    assert.match(css, /scroll-padding-bottom/)
    assert.match(css, /max-height:\s*760px\)/)
  })
})
