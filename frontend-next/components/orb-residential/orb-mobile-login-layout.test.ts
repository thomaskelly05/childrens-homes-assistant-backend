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

  it('mobile login renders compact brand area', () => {
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read('app/orb/orb-login.css')

    assert.match(login, /OrbLoginMobileHeader/)
    assert.match(mobile, /data-orb-login-mobile-brand/)
    assert.match(mobile, /data-orb-login-engine-line/)
    assert.match(mobile, /data-orb-login-mobile-mark/)
    assert.match(mobile, /PremiumMobileOrb/)
    assert.match(mobile, /flex items-center gap-3/)
    assert.doesNotMatch(mobile, /OrbHeroSphere/)
    assert.match(css, /orb-login-mobile-mark/)
    assert.match(css, /3rem/)
  })

  it('mobile login heading Sign in to continue is present and left-aligned', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const css = read('app/orb/orb-login.css')
    assert.match(authCard, /Sign in to continue/)
    assert.match(authCard, /data-orb-login-signin-title-mobile/)
    assert.match(authCard, /text-left/)
    assert.match(css, /text-align:\s*left/)
  })

  it('mobile login heading appears before auth actions', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const titleIdx = authCard.indexOf('data-orb-login-signin-title')
    const actionsIdx = authCard.indexOf('data-orb-login-auth-actions')
    const oauthIdx = authCard.indexOf('data-orb-oauth-buttons')
    assert.ok(titleIdx > -1 && actionsIdx > -1 && oauthIdx > -1)
    assert.ok(titleIdx < actionsIdx, 'heading should precede auth actions section')
    assert.ok(actionsIdx < oauthIdx, 'auth actions section should wrap oauth buttons')
  })

  it('Google button renders', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Continue with Google/)
    assert.match(authCard, /provider="google"/)
  })

  it('Microsoft button renders', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Continue with Microsoft/)
    assert.match(authCard, /provider="microsoft"/)
  })

  it('Apple button does not render', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.doesNotMatch(authCard, /Continue with Apple/)
    assert.doesNotMatch(authCard, /provider="apple"/)
  })

  it('email sign-in is collapsed by default on mobile', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(login, /emailExpanded/)
    assert.match(login, /useState\(false\)/)
    assert.match(authCard, /data-orb-email-collapsed/)
    assert.match(authCard, /data-orb-email-toggle/)
  })

  it('passkey is collapsed by default on mobile', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(login, /passkeyExpanded/)
    assert.match(authCard, /data-orb-passkey-collapsed/)
    assert.match(authCard, /data-orb-passkey-toggle/)
  })

  it('footer links render separately', () => {
    const footer = read('components/orb-residential/orb-login-legal-footer.tsx')
    const links = read('components/orb-residential/orb-legal-links.tsx')
    assert.match(footer, /OrbLegalLinks/)
    assert.match(footer, /variant="auth"/)
    assert.match(links, /orb-legal-links-separator/)
    assert.match(links, /Privacy/)
    assert.match(links, /Terms/)
    assert.match(links, /Cookies/)
    assert.match(links, /Support/)
  })

  it('settings mobile layout uses stacked screen pattern not clipped desktop modal', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const shell = read('components/orb-standalone/orb-standalone-panel-shell.tsx')
    const css = read('app/orb/orb-mobile.css')
    assert.match(settings, /data-orb-settings-mobile-layout/)
    assert.match(settings, /data-orb-settings-mobile-back/)
    assert.match(settings, /useOrbResponsiveMode/)
    assert.match(shell, /mobileMode/)
    assert.match(shell, /layout === 'drawer' \? 'full'/)
    assert.match(css, /data-orb-settings-mobile-layout='stack'/)
  })

  it('billing mobile layout shows Manage billing and Refresh status', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /Manage billing/)
    assert.match(billing, /data-orb-billing-refresh/)
    assert.match(billing, /Refresh status/)
    assert.match(billing, /data-orb-billing-mobile-layout="compact"/)
  })

  it('billing mobile layout does not show cancel/resume direct actions', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    for (const label of ['Cancel subscription', 'Resume subscription', 'Reactivate']) {
      assert.equal(billing.includes(label), false, `billing must not mention ${label}`)
    }
  })

  it('side menu account card remains visible', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /data-orb-sidebar-account-card/)
    assert.match(sidebar, /data-orb-sidebar-account-footer/)
    assert.match(sidebar, /OrbUserAvatar/)
  })

  it('sign out remains reachable via account path', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.match(sidebar, /data-orb-sidebar-sign-out-reachable/)
    assert.match(sidebar, /data-orb-sidebar-profile/)
    assert.match(menu, /Sign out/)
  })

  it('auth loading states still work', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const button = read('components/orb-residential/ui/orb-auth-button.tsx')
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(authCard, /loadingLabel/)
    assert.match(authCard, /oauthRedirecting/)
    assert.match(button, /aria-busy/)
    assert.match(button, /orb-auth-button--loading/)
    assert.match(login, /OrbAuthLoadingScreen/)
  })

  it('mobile supporting copy mentions Google Microsoft email and passkey', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Use Google, Microsoft, email or passkey to access ORB Residential/)
  })

  it('mobile login avoids modal card chrome', () => {
    const css = read('app/orb/orb-login.css')
    assert.match(css, /Flat mobile surface/)
    assert.match(css, /border:\s*none/)
    assert.match(css, /box-shadow:\s*none/)
  })
})
