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
  const authCard = () => read('components/orb-residential/orb-login-auth-card.tsx')
  const login = () => read('components/orb-residential/orb-login-screen.tsx')
  const css = () => read(loginCss)

  it('uses single-column mobile markers and scrollable page', () => {
    assert.match(login(), /data-orb-login-mobile-single-column/)
    assert.match(login(), /data-orb-login-scrollable/)
    assert.match(css(), /100svh/)
    assert.match(css(), /safe-area-inset-bottom/)
    assert.match(css(), /overflow-y:\s*auto/)
  })

  it('mobile login renders one unified auth surface inside the auth card', () => {
    const card = authCard()
    const screen = login()

    assert.doesNotMatch(screen, /OrbLoginMobileHeader/)
    assert.match(card, /data-orb-login-mobile-unified-surface/)
    assert.match(card, /data-orb-login-mobile-brand/)
    assert.match(card, /data-orb-login-auth-card/)
    assert.match(card, /lg:hidden/)
    assert.match(card, /ORB_LOGIN_ENTERPRISE_TITLE/)
    assert.match(card, /data-orb-login-engine-line/)
    assert.match(card, /data-orb-login-mobile-mark/)
    assert.match(card, /GlassOrbMark/)
  })

  it('mobile login does not render separate outer marketing card and inner welcome card', () => {
    const card = authCard()
    const screen = login()

    assert.doesNotMatch(screen, /OrbLoginMobileHeader/)
    const mobileBrandBlock = card.slice(card.indexOf('data-orb-login-mobile-brand'), card.indexOf('data-orb-login-auth-brand-hook'))
    assert.doesNotMatch(mobileBrandBlock, /Welcome to ORB Residential/)
    assert.match(card, /hidden items-start gap-3 lg:flex[\s\S]*Welcome to ORB Residential/)
    assert.match(css(), /single unified auth card/)
  })

  it('mobile login shows one safety boundary statement only', () => {
    const card = authCard()
    assert.match(card, /data-orb-login-professional-boundary/)
    assert.match(card, /hidden text-center text-xs[\s\S]*data-orb-login-adult-reviewed/)
    assert.equal((card.match(/data-orb-login-professional-boundary/g) ?? []).length, 1)
    assert.equal((card.match(/data-orb-login-adult-reviewed/g) ?? []).length, 1)
  })

  it('Google and Microsoft buttons render before collapsed secondary options', () => {
    const card = authCard()
    const oauthIdx = card.indexOf('data-orb-oauth-buttons')
    const moreIdx = card.indexOf('data-orb-login-more-sign-in')
    const createIdx = card.indexOf('data-orb-create-account')

    assert.match(card, /Continue with Google/)
    assert.match(card, /Continue with Microsoft/)
    assert.ok(oauthIdx > -1 && moreIdx > oauthIdx, 'more sign-in should follow oauth buttons')
    assert.ok(createIdx > moreIdx, 'create account should be inside more sign-in panel')
  })

  it('create account, email and passkey are collapsed under More sign-in options by default', () => {
    const screen = login()
    const card = authCard()

    assert.match(screen, /moreSignInExpanded/)
    assert.match(screen, /useState\(false\)/)
    assert.match(card, /data-orb-login-more-sign-in-toggle/)
    assert.match(card, /More sign-in options/)
    assert.match(card, /hidden lg:block/)
    assert.match(card, /data-orb-email-collapsed/)
    assert.match(card, /data-orb-passkey-collapsed/)
  })

  it('Why ORB is collapsed by default at the bottom of the mobile surface', () => {
    const card = authCard()
    const boundaryIdx = card.indexOf('data-orb-login-professional-boundary')
    const whyIdx = card.indexOf('data-orb-login-why-orb')

    assert.match(card, /data-orb-login-why-orb-toggle/)
    assert.match(card, /Why ORB\?/)
    assert.match(card, /data-orb-login-capability-groups-collapsed/)
    assert.match(card, /useState\(false\)/)
    assert.ok(whyIdx > boundaryIdx, 'Why ORB should follow the safety boundary on mobile')
    assert.match(card, /orb-login-why-orb mt-3 lg:hidden/)
  })

  it('mobile brand copy includes subheadline and supporting line without duplicate welcome', () => {
    const card = authCard()
    assert.match(card, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)
    assert.match(card, /ORB_LOGIN_ENTERPRISE_SUPPORTING/)
    assert.match(card, /data-orb-login-subheadline/)
    assert.match(card, /data-orb-login-supporting/)
    assert.doesNotMatch(card, /Sign in to continue\./)
  })

  it('footer links render separately with compact mobile disclaimer', () => {
    const footer = read('components/orb-residential/orb-login-legal-footer.tsx')
    const links = read('components/orb-residential/orb-legal-links.tsx')
    const card = authCard()

    assert.match(card, /compactMobile/)
    assert.match(footer, /compactMobile/)
    assert.match(footer, /hidden lg:block/)
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
    const legacyCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(settings, /data-orb-settings-mobile-layout/)
    assert.match(settings, /data-orb-settings-mobile-back/)
    assert.match(settings, /useOrbResponsiveMode/)
    assert.match(shell, /mobileMode/)
    assert.match(shell, /layout === 'drawer' \? 'full'/)
    assert.match(legacyCss, /data-orb-settings-mobile-layout='stack'/)
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
    const card = authCard()
    const button = read('components/orb-residential/ui/orb-auth-button.tsx')
    assert.match(card, /loadingLabel/)
    assert.match(card, /oauthRedirecting/)
    assert.match(button, /aria-busy/)
    assert.match(button, /orb-auth-button--loading/)
    assert.match(login(), /OrbAuthLoadingScreen/)
  })

  it('mobile login avoids modal card chrome and heavy blue framing', () => {
    const sheet = css()
    assert.match(sheet, /Flat mobile surface/)
    assert.match(sheet, /border:\s*none/)
    assert.match(sheet, /box-shadow:\s*none/)
    assert.match(sheet, /background:\s*transparent/)
    assert.match(sheet, /\.orb-login-shell__auth[\s\S]*background:\s*transparent/)
  })

  it('mobile login does not render large hero ORB in mobile header', () => {
    const card = authCard()
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.doesNotMatch(card, /OrbHeroSphere/)
    assert.doesNotMatch(card, /orb-presence--hero/)
    assert.match(hero, /lg:flex/)
  })

  it('email and passkey options are available inside more sign-in panel', () => {
    const card = authCard()
    assert.match(card, /data-orb-email-toggle/)
    assert.match(card, /data-orb-passkey-toggle/)
    assert.match(card, /Use passkey/)
    assert.match(card, /Sign in with email/)
  })

  it('mobile shell applies shared safe-area class', () => {
    const shell = read('components/orb-residential/orb-mobile-shell.tsx')
    const shellCss = read('app/orb/_legacy-ui-archive/orb-mobile-shell.css')
    assert.match(shell, /ORB_MOBILE_SAFE_AREA_CLASS/)
    assert.match(shellCss, /\.orb-mobile-safe-area/)
    assert.match(login(), /ORB_MOBILE_VIEWPORT_CLASS/)
    assert.match(read('lib/orb/orb-theme.ts'), /ORB_MOBILE_SAFE_AREA_CLASS/)
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
    const legacyCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(menu, /data-orb-account-menu-sign-out-wrap/)
    assert.match(menu, /Sign out/)
    assert.match(legacyCss, /data-orb-account-menu-sign-out-wrap/)
  })

  it('Dictate and Voice CTAs remain reachable on mobile', () => {
    const legacyCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(legacyCss, /data-orb-dictate-primary-action/)
    assert.match(legacyCss, /data-orb-voice-actions/)
    assert.match(legacyCss, /safe-area-inset-bottom/)
  })

  it('document view action remains reachable on mobile', () => {
    const legacyCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    const toolbar = read('components/orb-write/orb-write-mobile-toolbar.tsx')
    assert.match(legacyCss, /orb-write-mobile-toolbar/)
    assert.match(toolbar, /data-orb-write-approve/)
    assert.match(legacyCss, /safe-area-inset-bottom/)
  })

  it('mobile login uses safe-area bottom padding', () => {
    const screen = login()
    const sheet = css()
    assert.match(screen, /safe-area-inset-bottom/)
    assert.match(sheet, /safe-area-inset-bottom/)
    assert.match(sheet, /max\(1\.75rem, env\(safe-area-inset-bottom/)
  })

  it('mobile login places OAuth CTAs directly after unified brand header', () => {
    const card = authCard()
    const brandIdx = card.indexOf('data-orb-login-mobile-brand')
    const oauthIdx = card.indexOf('data-orb-oauth-buttons')
    assert.ok(brandIdx > -1 && oauthIdx > brandIdx, 'oauth buttons should follow unified mobile brand')
  })

  it('mobile login avoids horizontal overflow rules', () => {
    const sheet = css()
    assert.match(sheet, /overflow-x:\s*hidden/)
    assert.match(sheet, /max-width:\s*100%/)
  })

  it('mobile viewport utilities avoid browser-specific regression', () => {
    const shellCss = read('app/orb/_legacy-ui-archive/orb-mobile-shell.css')
    assert.match(shellCss, /100dvh/)
    assert.match(shellCss, /100svh/)
    assert.match(shellCss, /-webkit-fill-available/)
    assert.match(shellCss, /safe-area-inset-top/)
    assert.match(shellCss, /safe-area-inset-bottom/)
  })

  it('desktop login still renders expected welcome layout', () => {
    const screen = login()
    const card = authCard()
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')

    assert.match(screen, /OrbLoginDesktopHero/)
    assert.match(screen, /lg:grid-cols-\[58%_42%\]/)
    assert.match(card, /Welcome to ORB Residential/)
    assert.match(card, /specialist intelligence workspace/)
    assert.match(card, /Every output remains adult-reviewed/)
    assert.match(hero, /hidden flex-col justify-center lg:flex/)
  })
})
