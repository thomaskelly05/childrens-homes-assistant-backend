import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_V2_BARGE_IN_STOPPED_COPY,
  ORB_VOICE_V2_WAKE_PHRASE_HINT,
  isOrbVoiceHybridSpeechAvailable,
  isOrbVoiceWebRtcSupported,
  orbVoiceRealtimeAvailable,
  orbVoiceRealtimeEnabled,
  resolveOrbVoiceRealtimeMode,
  resolveOrbVoiceRealtimeSetupLabel
} from './orb-voice-v2-realtime-beta.ts'
import { detectOrbWakePhrase, stripOrbWakePhrase } from './orb-voice-v2-wake-phrase.ts'

describe('ORB Voice v2 realtime beta layer', () => {
  it('resolves webrtc when configured and supported', () => {
    const mode = resolveOrbVoiceRealtimeMode(
      {
        available: true,
        provider: 'openai',
        mode: 'webrtc',
        fallback: 'voice_v2',
        hybridSpeech: true,
        transport: 'openai_realtime'
      },
      true,
      true
    )
    assert.equal(mode, 'webrtc')
    assert.equal(resolveOrbVoiceRealtimeSetupLabel(mode), 'Realtime available')
  })

  it('resolves hybrid on safari-style fallback path', () => {
    const mode = resolveOrbVoiceRealtimeMode(
      { available: false, provider: 'none', mode: 'fallback', fallback: 'voice_v2', hybridSpeech: true },
      true,
      false
    )
    assert.equal(mode, 'hybrid')
    const safariFallback = resolveOrbVoiceRealtimeMode(
      { available: false, provider: 'none', mode: 'fallback', fallback: 'voice_v2', hybridSpeech: true },
      false,
      false
    )
    assert.equal(safariFallback, 'fallback')
  })

  it('orbVoiceRealtimeEnabled tracks webrtc and hybrid modes', () => {
    assert.equal(orbVoiceRealtimeEnabled('webrtc'), true)
    assert.equal(orbVoiceRealtimeEnabled('hybrid'), true)
    assert.equal(orbVoiceRealtimeEnabled('fallback'), false)
    assert.equal(orbVoiceRealtimeEnabled('off'), false)
  })

  it('orbVoiceRealtimeAvailable mirrors enabled non-fallback modes', () => {
    assert.equal(
      orbVoiceRealtimeAvailable(
        { available: true, provider: 'openai', mode: 'webrtc', fallback: 'voice_v2', hybridSpeech: true },
        true,
        true
      ),
      true
    )
    assert.equal(
      orbVoiceRealtimeAvailable(
        { available: false, provider: 'none', mode: 'fallback', fallback: 'voice_v2', hybridSpeech: true },
        false,
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

  it('hybrid speech and webrtc availability are false without window', () => {
    assert.equal(isOrbVoiceHybridSpeechAvailable(), false)
    assert.equal(isOrbVoiceWebRtcSupported(), false)
  })
})
