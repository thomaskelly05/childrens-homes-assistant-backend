import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  shouldOpenOrbResidentialLandingFresh,
  stripOrbResidentialStationParam
} from './orb-residential-home-default.ts'

describe('ORB residential landing routing', () => {
  it('opens landing fresh only without deep-link params', () => {
    assert.equal(shouldOpenOrbResidentialLandingFresh(new URLSearchParams('station=voice')), false)
    assert.equal(shouldOpenOrbResidentialLandingFresh(new URLSearchParams('mic=voice')), false)
    assert.equal(shouldOpenOrbResidentialLandingFresh(new URLSearchParams('')), true)
  })

  it('strips station param from orb URLs', () => {
    assert.equal(
      stripOrbResidentialStationParam(new URLSearchParams('station=voice&q=hello')),
      '/orb?q=hello'
    )
    assert.equal(stripOrbResidentialStationParam(new URLSearchParams('')), null)
  })
})
