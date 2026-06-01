import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  canUseComposerMic,
  canUseDictateMic,
  canUseLiveVoice,
  isOrbTestMode,
  orbMicDevLog
} from './orb-voice-readiness.ts'

describe('orb mic access', () => {
  it('gates live voice on subscription unless admin/dev/test', () => {
    assert.equal(canUseLiveVoice({ subscriptionActive: false }), false)
    assert.equal(canUseLiveVoice({ subscriptionActive: false, isAdminUser: true }), true)
    assert.equal(canUseLiveVoice({ subscriptionActive: false, isDeveloperMode: true }), true)
    assert.equal(canUseLiveVoice({ subscriptionActive: false, isTestMode: true }), true)
    assert.equal(canUseLiveVoice({ subscriptionActive: true }), true)
  })

  it('keeps dictate mic available regardless of subscription', () => {
    assert.equal(canUseDictateMic(), true)
    assert.equal(canUseDictateMic({ browserMicUnsupported: true }), false)
  })

  it('composer mic is always routable', () => {
    assert.equal(canUseComposerMic(), true)
  })

  it('test mode follows development NODE_ENV', () => {
    assert.equal(isOrbTestMode(), process.env.NODE_ENV === 'development')
  })

  it('development-only orb-mic console logs', () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    let logged = ''
    const originalDebug = console.debug
    console.debug = (message: string) => {
      logged = message
    }
    orbMicDevLog('composer mic clicked')
    console.debug = originalDebug
    process.env.NODE_ENV = original
    assert.match(logged, /\[orb-mic\] composer mic clicked/)
  })
})
