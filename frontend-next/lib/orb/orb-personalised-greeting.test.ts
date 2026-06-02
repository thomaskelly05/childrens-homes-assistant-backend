import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  extractOrbFirstName,
  orbPersonalisedGreeting,
  orbTimeOfDayFromHour
} from './orb-personalised-greeting.ts'

describe('orbPersonalisedGreeting', () => {
  it('uses first name in morning greeting', () => {
    const { heading } = orbPersonalisedGreeting({ firstName: 'Tom', hour: 9 })
    assert.match(heading, /Good morning, Tom/)
    assert.match(heading, /Ready when you are/)
  })

  it('falls back safely without a name', () => {
    const morning = orbPersonalisedGreeting({ hour: 8 })
    assert.match(morning.heading, /Good morning/)
    assert.doesNotMatch(morning.heading, /undefined/)

    const generic = orbPersonalisedGreeting({ hour: 3 })
    assert.equal(generic.heading, 'Ready when you are.')
  })

  it('provides afternoon and evening variants', () => {
    const afternoon = orbPersonalisedGreeting({ firstName: 'Tom', hour: 14 })
    assert.match(afternoon.heading, /Good afternoon, Tom/)
    assert.match(afternoon.heading, /What are we working on/)

    const evening = orbPersonalisedGreeting({ firstName: 'Tom', hour: 19 })
    assert.match(evening.heading, /Good evening, Tom/)
    assert.match(evening.heading, /here when you're ready/i)
  })

  it('extracts first name from full name', () => {
    assert.equal(extractOrbFirstName('Tom Kelly'), 'Tom')
    assert.equal(extractOrbFirstName(''), null)
  })

  it('maps hours to time-of-day buckets', () => {
    assert.equal(orbTimeOfDayFromHour(8), 'morning')
    assert.equal(orbTimeOfDayFromHour(13), 'afternoon')
    assert.equal(orbTimeOfDayFromHour(20), 'evening')
    assert.equal(orbTimeOfDayFromHour(2), 'generic')
  })
})
