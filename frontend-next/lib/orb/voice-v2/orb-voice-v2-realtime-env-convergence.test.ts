import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isOrbVoiceHybridSpeechAvailable,
  isOrbVoiceWebRtcSupported,
  orbVoiceRealtimeEnabled,
  resolveOrbVoiceRealtimeMode,
  resolveOrbVoiceRealtimeSetupLabel
} from './orb-voice-v2-realtime-beta.ts'

describe('ORB Voice v2 realtime env convergence', () => {
  it('chooses v2 fallback when status unavailable and browser lacks partials', () => {
    const mode = resolveOrbVoiceRealtimeMode(
      { available: false, provider: 'none', mode: 'fallback', fallback: 'voice_v2', hybridSpeech: true },
      false,
      false
    )
    assert.equal(mode, 'fallback')
    assert.equal(orbVoiceRealtimeEnabled(mode), false)
  })

  it('chooses hybrid when realtime unavailable but browser partials supported', () => {
    const mode = resolveOrbVoiceRealtimeMode(
      { available: false, provider: 'none', mode: 'fallback', fallback: 'voice_v2', hybridSpeech: true },
      true,
      false
    )
    assert.equal(mode, 'hybrid')
  })

  it('chooses webrtc when status available and browser supports RTCPeerConnection', () => {
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
    assert.equal(resolveOrbVoiceRealtimeSetupLabel(mode), 'Realtime: Available')
  })

  it('falls back when webrtc unavailable in browser', () => {
    const mode = resolveOrbVoiceRealtimeMode(
      {
        available: true,
        provider: 'openai',
        mode: 'webrtc',
        fallback: 'voice_v2',
        hybridSpeech: false
      },
      false,
      false
    )
    assert.equal(mode, 'fallback')
  })

  it('hybrid speech unavailable without window', () => {
    assert.equal(isOrbVoiceHybridSpeechAvailable(), false)
    assert.equal(isOrbVoiceWebRtcSupported(), false)
  })
})
