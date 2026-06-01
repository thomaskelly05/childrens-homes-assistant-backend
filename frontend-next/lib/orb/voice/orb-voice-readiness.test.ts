import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  assessOrbVoiceReadiness,
  orbVoiceReadinessPresentation
} from './orb-voice-readiness.ts'

describe('orb voice readiness', () => {
  it('marks subscription inactive state', () => {
    const readiness = assessOrbVoiceReadiness({
      recognitionAvailable: true,
      subscriptionActive: false
    })
    const ui = orbVoiceReadinessPresentation(readiness, { subscriptionActive: false })
    assert.equal(ui.state, 'subscription_inactive')
    assert.match(ui.headline, /once active/i)
  })

  it('marks microphone blocked state', () => {
    const readiness = assessOrbVoiceReadiness({
      recognitionAvailable: true,
      permissionDenied: true
    })
    readiness.microphone_permission = 'denied'
    const ui = orbVoiceReadinessPresentation(readiness)
    assert.equal(ui.state, 'microphone_blocked')
    assert.match(ui.headline, /blocked/i)
  })

  it('offers ready state when browser and mic are available', () => {
    const readiness = assessOrbVoiceReadiness({
      recognitionAvailable: true,
      permissionDenied: false,
      realtimeServiceAvailable: true,
      subscriptionActive: true
    })
    readiness.microphone_permission = 'granted'
    readiness.secure_context = true
    readiness.browser_supported = true
    readiness.can_use_realtime_voice = true
    readiness.fallback_available = true
    const ui = orbVoiceReadinessPresentation(readiness, { subscriptionActive: true })
    assert.equal(ui.state, 'ready')
    assert.match(ui.headline, /Start conversation|Voice session/i)
  })
})
