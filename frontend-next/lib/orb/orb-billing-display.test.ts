import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getOrbBillingDisplayStatus,
  isPaidSubscriptionActive,
  shouldShowTrialChip
} from './orb-billing-display.ts'
import type { OrbAccessPayload } from './orb-billing-client.ts'

function access(partial: Partial<OrbAccessPayload>): OrbAccessPayload {
  return {
    product: 'ORB Residential',
    price_label: '£9.99/month',
    can_use_orb: true,
    access_state: 'subscription_active',
    trial: {},
    subscription: {},
    billing: { stripe_configured: true },
    standalone: true,
    os_records_accessed: false,
    os_access_granted: false,
    ...partial
  }
}

describe('orb billing display', () => {
  it('active paid subscription hides trial chip and upgrade', () => {
    const payload = access({
      access_state: 'subscription_active',
      trial: { active: true, days_left: 7 },
      subscription: { active: true, status: 'active' }
    })
    assert.equal(isPaidSubscriptionActive(payload), true)
    assert.equal(shouldShowTrialChip(payload), false)
    const display = getOrbBillingDisplayStatus(payload)
    assert.equal(display.headline, 'Active')
    assert.equal(display.showUpgrade, false)
    assert.equal(display.showManageBilling, true)
  })

  it('trialing subscription counts as active', () => {
    const payload = access({
      access_state: 'subscription_active',
      subscription: { active: true, status: 'trialing' }
    })
    assert.equal(isPaidSubscriptionActive(payload), true)
    assert.equal(getOrbBillingDisplayStatus(payload).headline, 'Active')
  })

  it('admin bypass shows active instead of inactive', () => {
    const payload = access({
      access_state: 'admin_bypass',
      can_use_orb: true,
      subscription: { active: false }
    })
    assert.equal(isPaidSubscriptionActive(payload), true)
    assert.equal(getOrbBillingDisplayStatus(payload).headline, 'Active')
  })

  it('loading does not show inactive', () => {
    const display = getOrbBillingDisplayStatus(null, { isLoading: true, isSignedIn: true })
    assert.equal(display.headline, 'Syncing…')
    assert.notEqual(display.headline, 'Inactive')
    assert.equal(display.showUpgrade, false)
  })

  it('failed status fetch does not show inactive', () => {
    const display = getOrbBillingDisplayStatus(null, { hasError: true, isSignedIn: true })
    assert.equal(display.headline, 'Status unavailable')
    assert.notEqual(display.headline, 'Inactive')
    assert.equal(display.showUpgrade, false)
  })

  it('refresh-ready active subscription shows active', () => {
    const payload = access({
      access_state: 'subscription_active',
      subscription: { active: true, status: 'active' }
    })
    const display = getOrbBillingDisplayStatus(payload, { isSignedIn: true })
    assert.equal(display.headline, 'Active')
    assert.equal(display.statusKind, 'active')
  })

  it('inactive only when backend confirms inactive', () => {
    const payload = access({
      can_use_orb: false,
      access_state: 'authenticated_no_subscription',
      trial: { active: false, available: true },
      subscription: { active: false, status: 'inactive' }
    })
    const display = getOrbBillingDisplayStatus(payload)
    assert.equal(display.headline, 'Inactive')
    assert.equal(display.statusKind, 'inactive')
  })

  it('trial without paid subscription shows upgrade path', () => {
    const payload = access({
      access_state: 'trial_active',
      trial: { active: true, days_left: 7, available: false },
      subscription: { active: false }
    })
    const display = getOrbBillingDisplayStatus(payload)
    assert.match(display.headline, /trial active/i)
    assert.equal(display.showTrialChip, true)
    assert.equal(display.showUpgrade, false)
  })

  it('inactive account shows upgrade', () => {
    const payload = access({
      can_use_orb: false,
      access_state: 'trial_available',
      trial: { active: false, available: true },
      subscription: { active: false }
    })
    const display = getOrbBillingDisplayStatus(payload)
    assert.equal(display.showUpgrade, true)
  })

  it('upgrade CTA remains available for confirmed inactive accounts', () => {
    const payload = access({
      can_use_orb: false,
      access_state: 'trial_available',
      trial: { active: false, available: true },
      subscription: { active: false }
    })
    const display = getOrbBillingDisplayStatus(payload)
    assert.equal(display.showUpgrade, true)
  })
})
