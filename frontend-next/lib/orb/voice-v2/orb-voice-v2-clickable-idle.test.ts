import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ORB_VOICE_V2_AUDIO_UNLOCK_SOFT_FAIL } from './orb-voice-v2-copy.ts'
import { traceOrbVoiceV2StartClick } from './orb-voice-v2-click-trace.ts'
import { orbVoiceV2PrimaryActionLabel } from './orb-voice-v2-one-screen-workspace.ts'
import { orbVoiceV2PrimaryLabel } from './orb-voice-v2-state.ts'

describe('orb-voice-v2-clickable-idle', () => {
  it('idle primary label is Start conversation', () => {
    assert.equal(orbVoiceV2PrimaryActionLabel('idle'), 'Start conversation')
  })

  it('start click trace emits safe QA payload', () => {
    const payload = traceOrbVoiceV2StartClick({
      currentState: 'idle',
      buttonDisabled: false,
      audioUnlocked: false,
      permissionState: 'ready'
    })
    assert.equal(payload.event, 'voice_v2_start_click')
    assert.equal(payload.currentState, 'idle')
    assert.equal(payload.buttonDisabled, false)
  })

  it('audio unlock soft fail copy does not block conversation', () => {
    assert.match(ORB_VOICE_V2_AUDIO_UNLOCK_SOFT_FAIL, /still start the conversation/)
  })

  it('requesting microphone copy is explicit', () => {
    assert.match(orbVoiceV2PrimaryLabel('requesting_microphone'), /Requesting microphone/)
  })
})
