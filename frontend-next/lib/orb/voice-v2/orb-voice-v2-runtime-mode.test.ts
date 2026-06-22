import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  mapRealtimeModeToActiveCapture,
  resolveOrbVoiceActiveCaptureLabel,
  resolveOrbVoiceConfiguredRealtimeLabel,
  resolveOrbVoiceRuntimeSetupDetail,
  resolveOrbVoiceRuntimeStatusCopy
} from './orb-voice-v2-runtime-mode.ts'

describe('orb-voice-v2-runtime-mode', () => {
  it('maps realtime modes to active capture modes', () => {
    assert.equal(mapRealtimeModeToActiveCapture('webrtc'), 'webrtc_active')
    assert.equal(mapRealtimeModeToActiveCapture('hybrid'), 'hybrid_active')
    assert.equal(mapRealtimeModeToActiveCapture('fallback'), 'standard_capture')
  })

  it('distinguishes configured realtime from active browser path', () => {
    const status = {
      available: true,
      provider: 'openai',
      mode: 'webrtc',
      transport: 'openai_realtime',
      fallback: 'voice_v2' as const
    }
    assert.equal(resolveOrbVoiceConfiguredRealtimeLabel(status, 'fallback'), 'Realtime configured')
    assert.match(
      resolveOrbVoiceRuntimeSetupDetail({
        status,
        resolvedMode: 'fallback',
        activeCaptureMode: 'standard_capture',
        sessionStarted: false
      }) ?? '',
      /standard capture/i
    )
    assert.equal(resolveOrbVoiceActiveCaptureLabel('webrtc_active'), 'WebRTC capture active')
  })

  it('exposes state-specific runtime status copy', () => {
    assert.equal(
      resolveOrbVoiceRuntimeStatusCopy({ state: 'thinking', activeCaptureMode: 'webrtc_active' }),
      'ORB is thinking this through'
    )
    assert.match(
      resolveOrbVoiceRuntimeStatusCopy({ state: 'speaking', activeCaptureMode: 'standard_capture' }) ?? '',
      /Katherine is responding/
    )
  })
})
