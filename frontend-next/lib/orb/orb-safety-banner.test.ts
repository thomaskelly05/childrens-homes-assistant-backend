import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  classifySafeguardingUrgency,
  isCasualGreetingOrProductChat,
  shouldShowUrgentSafeguardingBanner
} from './orb-safety-banner.ts'

describe('orb safety banner', () => {
  it('hello has no urgent banner', () => {
    assert.equal(isCasualGreetingOrProductChat('hello'), true)
    assert.equal(shouldShowUrgentSafeguardingBanner('hello'), false)
    assert.equal(classifySafeguardingUrgency('hello'), 'none')
  })

  it('restraint recording without current risk has no urgent banner', () => {
    assert.equal(
      shouldShowUrgentSafeguardingBanner('What should I record after a restraint incident earlier?'),
      false
    )
  })

  it('abuse disclosure shows urgent banner', () => {
    assert.equal(
      shouldShowUrgentSafeguardingBanner('A young person has disclosed abuse'),
      true
    )
  })

  it('unknown adult/car shows urgent banner', () => {
    assert.equal(
      shouldShowUrgentSafeguardingBanner('An unknown adult in a white van collected them'),
      true
    )
  })
})
