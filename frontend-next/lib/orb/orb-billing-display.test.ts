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
})
