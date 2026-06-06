import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildOrbFrontDoorUrl,
  sanitizeOrbReturnUrl
} from './orb-front-door-routing.ts'

describe('orb front door return URL safety', () => {
  it('defaults empty and external URLs to /orb', () => {
    assert.equal(sanitizeOrbReturnUrl(null), '/orb')
    assert.equal(sanitizeOrbReturnUrl(''), '/orb')
    assert.equal(sanitizeOrbReturnUrl('https://evil.example/phish'), '/orb')
    assert.equal(sanitizeOrbReturnUrl('//evil.example'), '/orb')
  })

  it('maps legacy root targets to /orb', () => {
    assert.equal(sanitizeOrbReturnUrl('/'), '/orb')
    assert.equal(sanitizeOrbReturnUrl('/home'), '/orb')
    assert.equal(sanitizeOrbReturnUrl('%2F'), '/orb')
  })

  it('preserves safe ORB deep links', () => {
    assert.equal(sanitizeOrbReturnUrl('/orb/write'), '/orb/write')
    assert.equal(sanitizeOrbReturnUrl('/orb?station=dictate'), '/orb?station=dictate')
    assert.equal(sanitizeOrbReturnUrl('/orb/billing'), '/orb/billing')
  })

  it('rejects non-ORB paths', () => {
    assert.equal(sanitizeOrbReturnUrl('/os'), '/orb')
    assert.equal(sanitizeOrbReturnUrl('/select-scope'), '/orb')
  })

  it('buildOrbFrontDoorUrl omits query for canonical /orb', () => {
    assert.equal(buildOrbFrontDoorUrl('/orb'), '/orb')
    assert.equal(buildOrbFrontDoorUrl('/'), '/orb')
  })

  it('buildOrbFrontDoorUrl preserves ORB returnUrl query', () => {
    assert.equal(buildOrbFrontDoorUrl('/orb/write'), '/orb?returnUrl=%2Forb%2Fwrite')
  })
})
