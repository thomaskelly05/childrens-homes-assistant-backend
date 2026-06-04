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
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /Continue with work account/)
    assert.match(login, /Continue with email/)
    assert.match(login, /Other secure options/)
    assert.match(login, /Continue with Microsoft/)
    assert.match(login, /Continue with Google/)
    assert.match(login, /Continue with Apple/)
    assert.match(login, /data-testid="orb-login-email"/)
    assert.match(login, /data-testid="orb-login-submit"/)
  })

  it('passkey is presented as existing-user option with email explanation', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /Use passkey if you have already set one up/)
    assert.match(login, /find your saved passkey/)
    assert.match(login, /Other secure options[\s\S]*data-orb-passkey-sign-in/)
  })

  it('login hero uses premium positioning copy', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /ORB Residential/)
    assert.match(login, /Powered by IndiCare Intelligence/)
    assert.match(login, /AI support for residential children/)
    assert.match(login, /Record better\. Reflect faster\. Respond safer\./)
    assert.match(login, /professional judgement, not replace it/)
    assert.match(login, /Human review required/)
  })

  it('create account and provider email hints exist', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /href="\/orb\/signup"/)
    assert.match(login, /Create account/)
    assert.match(login, /Already subscribed through your provider/)
    assert.match(login, /data-orb-provider-email-hint/)
  })

  it('inactive user upgrade screen shows subscribe path and refresh', () => {
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    assert.match(upgrade, /Start ORB Residential/)
    assert.match(upgrade, /data-orb-subscribe/)
    assert.match(upgrade, /data-orb-billing-refresh/)
    assert.match(upgrade, /data-orb-upgrade-sign-out/)
  })

  it('active billing modal shows manage subscription and individual plan', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /ORB Residential — Individual/)
    assert.match(billing, /£9\.99\/month/)
    assert.match(billing, /data-orb-billing-portal/)
    assert.match(billing, /data-orb-billing-upgrade/)
    assert.match(billing, /data-orb-billing-refresh/)
    assert.match(billing, /Opening checkout/)
    assert.match(billing, /Refreshing…/)
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
    assert.match(billing, /data-orb-billing-provider-cta/)
    assert.match(billing, /Contact IndiCare/)
  })

  it('billing trust copy is concise', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-trust/)
    assert.match(billing, /Provider AI settings|Providers can control AI settings/)
    assert.match(billing, /professional judgement/)
  })

  it('stripe client does not hardcode secret keys', () => {
    const client = read('lib/orb/orb-billing-client.ts')
    assert.doesNotMatch(client, /sk_live|sk_test|STRIPE_SECRET/)
    assert.match(client, /checkout_url/)
    assert.match(client, /portal_url/)
    assert.match(client, /refreshOrbAccessAfterCheckout/)
  })
})
