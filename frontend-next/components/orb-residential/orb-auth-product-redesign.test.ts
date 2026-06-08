import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB auth product redesign', () => {
  it('Google button still renders', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Continue with Google/)
    assert.match(authCard, /provider="google"/)
  })

  it('Microsoft button still renders when enabled', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Continue with Microsoft/)
    assert.match(authCard, /oauth\.microsoft \?/)
  })

  it('Apple does not render', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.doesNotMatch(authCard, /Continue with Apple/)
    assert.doesNotMatch(authCard, /provider="apple"/)
  })

  it('Create account button still works', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /data-orb-create-account/)
    assert.match(authCard, /href="\/orb\/signup"/)
    assert.match(authCard, /Create account/)
  })

  it('Email sign-in still works', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /data-testid="orb-login-email"/)
    assert.match(authCard, /data-testid="orb-login-password"/)
    assert.match(authCard, /data-testid="orb-login-submit"/)
    assert.match(authCard, /Sign in with email/)
  })

  it('Passkey option still renders', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /data-orb-passkey-sign-in/)
    assert.match(authCard, /data-orb-passkey-toggle/)
    assert.match(authCard, /Use passkey/)
  })

  it('Legal links render separately and correctly', () => {
    const footer = read('components/orb-residential/orb-login-legal-footer.tsx')
    const legal = read('components/orb-residential/orb-legal-links.tsx')
    assert.match(footer, /OrbLegalLinks/)
    assert.match(footer, /variant="auth"/)
    assert.match(legal, /Privacy/)
    assert.match(legal, /Terms/)
    assert.match(legal, /Cookies/)
    assert.match(legal, /Support/)
    assert.match(legal, /orb-legal-links-separator/)
  })

  it('auth layout preserves provider order', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const oauthIdx = authCard.indexOf('data-orb-oauth-buttons')
    const createIdx = authCard.indexOf('data-orb-create-account')
    const emailIdx = authCard.indexOf('data-orb-email-toggle')
    const passkeyIdx = authCard.indexOf('data-orb-login-passkey-section')
    const legalIdx = authCard.indexOf('<OrbLoginLegalFooter')
    assert.ok(oauthIdx < createIdx)
    assert.ok(createIdx < emailIdx)
    assert.ok(emailIdx < passkeyIdx)
    assert.ok(passkeyIdx < legalIdx)
  })

  it('billing/access screen shows safe recovery actions', () => {
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    const retry = read('components/orb-residential/orb-access-retry-screen.tsx')
    assert.match(upgrade, /data-orb-return-to-orb/)
    assert.match(upgrade, /data-orb-switch-account/)
    assert.match(retry, /data-orb-access-back-to-sign-in/)
    assert.match(retry, /data-orb-access-retry-action/)
  })

  it('Return to ORB is present where needed', () => {
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    assert.match(upgrade, /Return to ORB/)
    assert.match(upgrade, /href="\/orb"/)
  })

  it('uses warm product front-door styling markers', () => {
    const css = read('app/orb/orb-login.css')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(css, /orb-front-door-root/)
    assert.match(css, /orb-login-auth-section/)
    assert.match(hero, /data-orb-login-trust-note/)
    assert.match(hero, /Designed for adults working in and around children/)
  })
})
