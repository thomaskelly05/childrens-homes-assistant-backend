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
  const loginCss = 'app/orb/orb-residential-shell.css'

  it('uses single-column mobile markers and scrollable page', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read(loginCss)
    assert.match(login, /data-orb-login-mobile-single-column/)
    assert.match(login, /data-orb-login-scrollable/)
    assert.match(css, /100svh/)
    assert.match(css, /safe-area-inset-bottom/)
    assert.match(css, /overflow-y:\s*auto/)
  })

  it('mobile login renders compact brand area', () => {
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read(loginCss)

    assert.match(login, /OrbLoginMobileHeader/)
    assert.match(mobile, /data-orb-login-mobile-brand/)
    assert.match(mobile, /data-orb-login-engine-line/)
    assert.match(mobile, /data-orb-login-mobile-mark/)
    assert.match(mobile, /GlassOrbMark/)
    assert.match(mobile, /flex items-center gap-2\.5/)
    assert.doesNotMatch(mobile, /OrbHeroSphere/)
    assert.match(css, /orb-login-mobile-mark/)
    assert.match(css, /2\.25rem/)
  })

  it('mobile login heading Sign in to continue is present and left-aligned', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const css = read(loginCss)
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
    const css = read('app/orb/_legacy-ui-archive/orb-mobile.css')
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

  it('mobile supporting copy keeps short lead and auth options', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    assert.match(authCard, /Sign in to continue\./)
    assert.match(mobile, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)
    assert.match(mobile, /data-orb-login-subheadline/)
    assert.match(authCard, /Continue with Google/)
    assert.match(authCard, /Continue with Microsoft/)
    assert.match(authCard, /Sign in with email/)
    assert.match(authCard, /Use passkey/)
  })

  it('mobile login avoids modal card chrome', () => {
    const css = read(loginCss)
    assert.match(css, /Flat mobile surface/)
    assert.match(css, /border:\s*none/)
    assert.match(css, /box-shadow:\s*none/)
  })

  it('mobile login does not render large hero ORB in mobile header', () => {
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.doesNotMatch(mobile, /OrbHeroSphere/)
    assert.doesNotMatch(mobile, /orb-presence--hero/)
    assert.match(hero, /lg:flex/)
  })

  it('email and passkey options are available', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /data-orb-email-toggle/)
    assert.match(authCard, /data-orb-passkey-toggle/)
    assert.match(authCard, /Use passkey/)
  })

  it('mobile shell applies shared safe-area class', () => {
    const shell = read('components/orb-residential/orb-mobile-shell.tsx')
    const shellCss = read('app/orb/_legacy-ui-archive/orb-mobile-shell.css')
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const theme = read('lib/orb/orb-theme.ts')
    assert.match(shell, /ORB_MOBILE_SAFE_AREA_CLASS/)
    assert.match(shellCss, /\.orb-mobile-safe-area/)
    assert.match(login, /ORB_MOBILE_VIEWPORT_CLASS/)
    assert.match(theme, /ORB_MOBILE_SAFE_AREA_CLASS/)
  })

  it('settings mobile uses full-screen native sheet mode', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const modal = read('components/orb-standalone/orb-app-modal.tsx')
    assert.match(settings, /mobileMode:\s*'full'/)
    assert.match(modal, /mobileMode:\s*'full'/)
  })

  it('billing mobile shows active status and price compactly', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-status-row/)
    assert.match(billing, /data-orb-billing-price-row/)
    assert.match(billing, /mobileMode="full"/)
  })

  it('account menu keeps Sign out reachable', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    const css = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(menu, /data-orb-account-menu-sign-out-wrap/)
    assert.match(menu, /Sign out/)
    assert.match(css, /data-orb-account-menu-sign-out-wrap/)
  })

  it('Dictate and Voice CTAs remain reachable on mobile', () => {
    const css = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(css, /data-orb-dictate-primary-action/)
    assert.match(css, /data-orb-voice-actions/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('document view action remains reachable on mobile', () => {
    const css = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    const toolbar = read('components/orb-write/orb-write-mobile-toolbar.tsx')
    assert.match(css, /orb-write-mobile-toolbar/)
    assert.match(toolbar, /data-orb-write-approve/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('mobile login collapses Think/Capture/Evidence by default', () => {
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    assert.match(mobile, /data-orb-login-why-orb-toggle/)
    assert.match(mobile, /Why ORB\?/)
    assert.match(mobile, /data-orb-login-capability-groups-collapsed/)
    assert.match(mobile, /useState\(false\)/)
  })

  it('mobile login includes safety boundary text in auth card', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const copy = read('lib/orb/orb-login-stations-copy.ts')
    assert.match(authCard, /data-orb-login-professional-boundary/)
    assert.match(copy, /does not replace safeguarding procedures/)
  })

  it('mobile login uses safe-area bottom padding', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read(loginCss)
    assert.match(login, /safe-area-inset-bottom/)
    assert.match(css, /safe-area-inset-bottom/)
    assert.match(css, /max\(1\.5rem, env\(safe-area-inset-bottom/)
  })

  it('mobile login places Google CTA after compact header in render order', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const renderBlock = login.slice(login.indexOf('return ('))
    const mobileIdx = renderBlock.indexOf('<OrbLoginMobileHeader')
    const authIdx = renderBlock.indexOf('<OrbLoginAuthCard')
    const oauthIdx = authCard.indexOf('data-orb-oauth-buttons')
    assert.ok(mobileIdx > -1 && authIdx > mobileIdx, 'auth card should follow mobile header in render tree')
    assert.ok(oauthIdx > -1, 'google oauth buttons should exist in auth card')
  })

  it('mobile login avoids horizontal overflow rules', () => {
    const css = read(loginCss)
    assert.match(css, /overflow-x:\s*hidden/)
    assert.match(css, /max-width:\s*100%/)
  })

  it('mobile viewport utilities avoid browser-specific regression', () => {
    const shellCss = read('app/orb/_legacy-ui-archive/orb-mobile-shell.css')
    assert.match(shellCss, /100dvh/)
    assert.match(shellCss, /100svh/)
    assert.match(shellCss, /-webkit-fill-available/)
    assert.match(shellCss, /safe-area-inset-top/)
    assert.match(shellCss, /safe-area-inset-bottom/)
  })
})
