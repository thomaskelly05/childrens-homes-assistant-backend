import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { OrbVoiceV2CaptureError } from './orb-voice-v2-capture.ts'
import {
  ORB_VOICE_V2_MIC_DENIED,
  ORB_VOICE_V2_MIC_NOT_FOUND,
  ORB_VOICE_V2_MIC_TIMEOUT
} from './orb-voice-v2-copy.ts'
import { orbVoiceV2PrimaryActionLabel } from './orb-voice-v2-one-screen-workspace.ts'
import { orbVoiceV2PrimaryLabel } from './orb-voice-v2-state.ts'
import {
  AUDIO_UNLOCK_PARALLEL_TIMEOUT_MS,
  mapOrbVoiceV2MicError,
  MICROPHONE_REQUEST_TIMEOUT_MS
} from './orb-voice-v2-microphone.ts'

describe('orb-voice-v2-microphone-transition', () => {
  it('start label and try again label', () => {
    assert.equal(orbVoiceV2PrimaryActionLabel('idle'), 'Start conversation')
    assert.equal(orbVoiceV2PrimaryLabel('requesting_microphone'), 'Requesting microphone…')
    assert.equal(orbVoiceV2PrimaryLabel('listening'), 'Listening…')
    assert.equal(orbVoiceV2PrimaryLabel('error', true), 'Try again')
  })

  it('timeout guard constant is 8 seconds', () => {
    assert.equal(MICROPHONE_REQUEST_TIMEOUT_MS, 8000)
  })

  it('audio unlock parallel timeout is short', () => {
    assert.equal(AUDIO_UNLOCK_PARALLEL_TIMEOUT_MS, 1500)
  })

  it('maps NotAllowedError to blocked copy', () => {
    const mapped = mapOrbVoiceV2MicError(new OrbVoiceV2CaptureError('not_allowed', 'microphone_not_allowed'))
    assert.equal(mapped.message, ORB_VOICE_V2_MIC_DENIED)
  })

  it('maps not found and timeout errors', () => {
    assert.equal(
      mapOrbVoiceV2MicError(new OrbVoiceV2CaptureError('not_found', 'microphone_not_found')).message,
      ORB_VOICE_V2_MIC_NOT_FOUND
    )
    assert.equal(
      mapOrbVoiceV2MicError(new OrbVoiceV2CaptureError('timeout', 'microphone_timeout')).message,
      ORB_VOICE_V2_MIC_TIMEOUT
    )
  })

  it('maps DOM NotAllowedError name', () => {
    const mapped = mapOrbVoiceV2MicError({ name: 'NotAllowedError', message: 'denied' })
    assert.equal(mapped.code, 'not_allowed')
    assert.equal(mapped.message, ORB_VOICE_V2_MIC_DENIED)
  })
})
