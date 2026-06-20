import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB auth UX polish', () => {
  it('login page renders Google and Microsoft with OAuth loading states', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const authButton = read('components/orb-residential/ui/orb-auth-button.tsx')
    const oauthState = read('lib/orb/orb-oauth-redirect-state.ts')

    assert.match(authCard, /Continue with Google/)
    assert.match(authCard, /Continue with Microsoft/)
    assert.match(authCard, /oauthRedirecting/)
    assert.match(authCard, /Redirecting to Google/)
    assert.match(authCard, /Redirecting to Microsoft/)
    assert.match(authButton, /loadingLabel/)
    assert.match(authButton, /markOrbOAuthRedirect/)
    assert.match(oauthState, /markOrbOAuthRedirect/)
    assert.doesNotMatch(authCard, /Continue with Apple/)
  })

  it('social login buttons appear above email and passkey', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const oauthIdx = authCard.indexOf('data-orb-oauth-buttons')
    const emailIdx = authCard.indexOf('data-testid="orb-login-email"')
    const passkeyIdx = authCard.indexOf('data-orb-login-passkey-section')
    assert.ok(oauthIdx < emailIdx)
    assert.ok(emailIdx < passkeyIdx)
  })

  it('access screen uses front-door styling with recovery actions', () => {
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    const css = read('app/orb/_legacy-ui-archive/orb-login.css')
    assert.match(upgrade, /data-orb-return-to-orb/)
    assert.match(upgrade, /data-orb-switch-account/)
    assert.match(upgrade, /Switch account/)
    assert.match(upgrade, /data-orb-manage-billing/)
    assert.match(upgrade, /data-orb-billing-refresh/)
    assert.match(upgrade, /data-orb-upgrade-duplicate-provider-guidance/)
    assert.match(upgrade, /does not currently have an active ORB Residential subscription/)
    assert.match(upgrade, /data-orb-upgrade-signed-in-provider/)
    assert.match(upgrade, /data-orb-upgrade-access-state/)
    assert.match(upgrade, /orb-front-door-root/)
    assert.match(upgrade, /orb-front-door-card/)
    assert.match(css, /orb-front-door-card/)
  })

  it('login screen exposes auth build variant marker for deploy verification', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(visualBuild, /ORB_AUTH_BUILD_VARIANT = 'orb-auth-product-redesign'/)
    assert.match(login, /data-orb-auth-build-variant=\{ORB_AUTH_BUILD_VARIANT\}/)
  })

  it('route loop guard covers billing redirects', () => {
    const guard = read('lib/orb/orb-route-loop-guard.ts')
    assert.match(guard, /\/orb\/billing/)
  })

  it('auth gate shows Finishing sign in during OAuth handoff', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(gate, /Finishing sign in/)
    assert.match(gate, /peekOrbOAuthRedirect/)
    assert.match(login, /Finishing sign in/)
  })

  it('passkey and email flows still render on login card', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /data-testid="orb-login-email"/)
    assert.match(authCard, /data-orb-passkey-sign-in/)
    assert.match(authCard, /Sign in with email/)
  })
})
