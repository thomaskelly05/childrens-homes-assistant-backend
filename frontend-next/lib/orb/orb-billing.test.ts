import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('ORB login copy includes product name', () => {
  const login = readFileSync(new URL('../../app/orb/login/page.tsx', import.meta.url), 'utf8')
  assert.match(login, /Sign in to ORB Residential/)
  assert.match(login, /Powered by IndiCare/)
  assert.match(login, /ORB Residential does not access IndiCare OS records/)
})

test('upgrade screen shows £9.99/month', () => {
  const upgrade = readFileSync(new URL('../../components/orb-standalone/orb-upgrade-screen.tsx', import.meta.url), 'utf8')
  assert.match(upgrade, /£9\.99\/month/)
  assert.match(upgrade, /ORB Residential does not access IndiCare OS records/)
})

test('onboarding role options include NVQ assessor and learner', () => {
  const onboarding = readFileSync(new URL('../../app/orb/onboarding/page.tsx', import.meta.url), 'utf8')
  const roles = readFileSync(new URL('./orb-billing-client.ts', import.meta.url), 'utf8')
  assert.match(onboarding, /ORB_ROLE_OPTIONS/)
  assert.match(roles, /NVQ assessor/)
  assert.match(roles, /NVQ learner/)
})

test('safety acceptance statements present', () => {
  const client = readFileSync(new URL('./orb-billing-client.ts', import.meta.url), 'utf8')
  assert.match(client, /does not access IndiCare OS records/)
  assert.match(client, /safeguarding procedures/)
})

test('OAuth buttons only shown when configured', () => {
  const login = readFileSync(new URL('../../app/orb/login/page.tsx', import.meta.url), 'utf8')
  assert.match(login, /NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED/)
  assert.match(login, /not configured/)
})

test('billing settings section references meter endpoints', () => {
  const billing = readFileSync(new URL('../../components/orb-standalone/orb-billing-settings-section.tsx', import.meta.url), 'utf8')
  assert.match(billing, /fetchOrbBillingMeter/)
  assert.match(billing, /ORB Residential billing is separate from IndiCare OS/)
  assert.match(billing, /Refresh billing status/)
})

test('billing success page refreshes access after checkout', () => {
  const success = readFileSync(new URL('../../app/orb/billing/success/page.tsx', import.meta.url), 'utf8')
  assert.match(success, /refreshOrbAccessAfterCheckout/)
  assert.match(success, /Continue to ORB/)
  assert.doesNotMatch(success, /\/oslogin|IndiCare OS dashboard/i)
})

test('billing cancel page offers retry and return', () => {
  const cancel = readFileSync(new URL('../../app/orb/billing/cancel/page.tsx', import.meta.url), 'utf8')
  assert.match(cancel, /Try again/)
  assert.match(cancel, /Return to ORB/)
  assert.match(cancel, /Start trial|Create account/)
})

test('signup uses public standalone route', () => {
  const client = readFileSync(new URL('./orb-billing-client.ts', import.meta.url), 'utf8')
  assert.match(client, /\/orb\/standalone\/auth\/signup/)
})

test('public orb auth paths still hydrate session via refreshSession', () => {
  const auth = readFileSync(new URL('../../contexts/auth-context.tsx', import.meta.url), 'utf8')
  assert.match(auth, /\/orb\/billing\/success/)
  assert.match(auth, /isOrbSurfacePath\(pathname\)[\s\S]*refreshSession/)
  assert.doesNotMatch(auth, /hasLikelySessionCookie/)
})

test('orb product copy helper exports canonical strings', () => {
  const copy = readFileSync(new URL('./orb-product-copy.ts', import.meta.url), 'utf8')
  assert.match(copy, /ORB Residential/)
  assert.match(copy, /Powered by IndiCare/)
  assert.match(copy, /does not access IndiCare OS records/)
})
