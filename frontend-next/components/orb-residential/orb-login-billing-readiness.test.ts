import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB login and billing readiness', () => {
  it('sign-in page renders grouped auth methods', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Sign in or create your account to continue/)
    assert.match(authCard, /Sign in with email/)
    assert.match(authCard, /Use passkey/)
    assert.match(authCard, /Continue with Microsoft/)
    assert.match(authCard, /Continue with Google/)
    assert.match(authCard, /data-testid="orb-login-email"/)
    assert.match(authCard, /data-testid="orb-login-submit"/)
  })

  it('passkey is presented as existing-user option with email explanation', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Use passkey/)
    assert.match(login, /find your saved passkey/)
    assert.match(authCard, /data-orb-passkey-sign-in/)
    assert.match(authCard, /data-orb-passkey-toggle/)
  })

  it('login hero uses premium positioning copy', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_TITLE/)
    assert.match(hero, /Powered by IndiCare Intelligence/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_TITLE/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)
    assert.match(hero, /orb-login-headline--showstopper/)
    assert.match(hero, /professional judgement/)
    assert.match(hero, /data-orb-login-demo-path/)
  })

  it('create account and provider email hints exist', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    assert.match(authCard, /href="\/orb\/signup"/)
    assert.match(authCard, /Create account/)
    assert.match(upgrade, /Already subscribed/)
  })

  it('inactive user upgrade screen shows subscribe path, refresh and switch account', () => {
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    assert.match(upgrade, /data-orb-subscribe/)
    assert.match(upgrade, /data-orb-billing-refresh/)
    assert.match(upgrade, /data-orb-switch-account/)
    assert.match(upgrade, /data-orb-return-to-orb/)
  })

  it('active billing modal shows manage subscription and individual plan', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /ORB_RESIDENTIAL_BILLING_SUBTITLE/)
    assert.match(billing, /£9\.99\/month/)
    assert.match(billing, /data-orb-billing-portal/)
    assert.match(billing, /data-orb-billing-upgrade/)
    assert.match(billing, /data-orb-billing-refresh/)
    assert.match(billing, /Opening checkout/)
    assert.match(billing, /Refresh status/)
  })

  it('billing modal does not expose internal AI brain metadata', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const forbidden = ['expert_brain', 'brain_metadata', 'cognitive_architecture', 'neural']
    for (const term of forbidden) {
      assert.equal(billing.includes(term), false, `billing modal must not mention ${term}`)
    }
  })

  it('standalone boundary and provider team CTA appear in billing', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /does not access IndiCare OS records/)
    assert.match(billing, /data-orb-billing-provider-team/)
    assert.match(billing, /support@indicare\.co\.uk/)
  })

  it('billing trust copy is concise', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-trust/)
    assert.match(billing, /IndiCare residential intelligence/)
    assert.match(billing, /Trust &amp; data|Trust & data/)
  })

  it('stripe client does not hardcode secret keys', () => {
    const client = read('lib/orb/orb-billing-client.ts')
    assert.doesNotMatch(client, /sk_live|sk_test|STRIPE_SECRET/)
    assert.match(client, /checkout_url/)
    assert.match(client, /portal_url/)
    assert.match(client, /refreshOrbAccessAfterCheckout/)
  })
})
