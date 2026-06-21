import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { mapOrbVoiceV2ToCompanionState, orbVoiceV2PrimaryLabel } from './orb-voice-v2-state.ts'
import type { OrbVoiceV2State } from './orb-voice-v2-types.ts'

describe('orb-voice-v2-state', () => {
  it('maps intermediate capture states to listening or thinking', () => {
    assert.equal(mapOrbVoiceV2ToCompanionState('requesting_microphone'), 'listening')
    assert.equal(mapOrbVoiceV2ToCompanionState('speech_detected'), 'listening')
    assert.equal(mapOrbVoiceV2ToCompanionState('transcribing'), 'thinking')
    assert.equal(mapOrbVoiceV2ToCompanionState('listening'), 'listening')
    assert.equal(mapOrbVoiceV2ToCompanionState('thinking'), 'thinking')
    assert.equal(mapOrbVoiceV2ToCompanionState('speaking'), 'speaking')
    assert.equal(mapOrbVoiceV2ToCompanionState('idle'), 'idle')
  })

  it('primary label never exposes Stop and send', () => {
    const states: OrbVoiceV2State[] = [
      'idle',
      'requesting_microphone',
      'listening',
      'speech_detected',
      'transcribing',
      'thinking',
      'speaking',
      'paused',
      'summary_ready',
      'error'
    ]
    for (const state of states) {
      assert.doesNotMatch(orbVoiceV2PrimaryLabel(state), /Stop and send/i)
    }
  })
})
