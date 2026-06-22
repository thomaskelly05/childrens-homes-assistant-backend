import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_V2_BARGE_IN_STOPPED_COPY,
  ORB_VOICE_V2_WAKE_PHRASE_HINT,
  isOrbVoiceHybridSpeechAvailable,
  orbVoiceRealtimeAvailable,
  orbVoiceRealtimeEnabled,
  resolveOrbVoiceRealtimeMode
} from './orb-voice-v2-realtime-beta.ts'
import { detectOrbWakePhrase, stripOrbWakePhrase } from './orb-voice-v2-wake-phrase.ts'

describe('ORB Voice v2 realtime beta layer', () => {
  it('resolves fallback when realtime is not configured', () => {
    const mode = resolveOrbVoiceRealtimeMode(
      { available: false, reason: 'not_configured', fallback: 'voice_v2', hybridSpeech: true },
      true
    )
    assert.equal(mode, 'beta')
    const safariFallback = resolveOrbVoiceRealtimeMode(
      { available: false, reason: 'not_configured', fallback: 'voice_v2', hybridSpeech: true },
      false
    )
    assert.equal(safariFallback, 'fallback')
  })

  it('orbVoiceRealtimeEnabled tracks beta mode only', () => {
    assert.equal(orbVoiceRealtimeEnabled('beta'), true)
    assert.equal(orbVoiceRealtimeEnabled('fallback'), false)
    assert.equal(orbVoiceRealtimeEnabled('off'), false)
  })

  it('orbVoiceRealtimeAvailable mirrors enabled beta', () => {
    assert.equal(
      orbVoiceRealtimeAvailable(
        { available: false, reason: 'not_configured', fallback: 'voice_v2', hybridSpeech: true },
        true
      ),
      true
    )
    assert.equal(
      orbVoiceRealtimeAvailable(
        { available: false, reason: 'not_configured', fallback: 'voice_v2', hybridSpeech: true },
        false
      ),
      false
    )
  })

  it('wake phrase detects Hey ORB inside session copy only', () => {
    assert.equal(detectOrbWakePhrase('Hey ORB, can you help?'), true)
    assert.equal(detectOrbWakePhrase('two young people involved'), false)
    assert.equal(stripOrbWakePhrase('Hey ORB what happened'), 'what happened')
    assert.equal(ORB_VOICE_V2_WAKE_PHRASE_HINT.includes('Hey ORB'), true)
    assert.equal(ORB_VOICE_V2_BARGE_IN_STOPPED_COPY, 'Stopped. I’m listening.')
  })

  it('hybrid speech availability is false without window', () => {
    assert.equal(isOrbVoiceHybridSpeechAvailable(), false)
  })
})
