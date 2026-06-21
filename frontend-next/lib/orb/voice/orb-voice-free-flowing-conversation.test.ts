import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  END_OF_TURN_DEBOUNCE_MS,
  isOrbVoiceFreeFlowMode,
  ORB_VOICE_FREE_FLOW_DEFAULTS,
  ORB_VOICE_KATHERINE_UNAVAILABLE,
  ORB_VOICE_START_CONVERSATION,
  orbVoiceFreeFlowPrimaryLabel,
  shouldAutoResumeListening
} from './orb-voice-free-flowing-conversation.ts'
import { ORB_VOICE_AUTO_SUBMIT_DEBOUNCE_MS } from './orb-voice-speech-loop.ts'
import { ORB_VOICE_BUTTON_START } from './orb-voice-reflective-copy.ts'
import { resolveTtsVoiceProfileId, ORB_KATHERINE_VOICE_ID } from './orb-voice-human-conversation.ts'

describe('ORB Voice free-flowing conversation runtime', () => {
  it('defaults to continuous conversation without push-to-talk', () => {
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.continuousConversation, true)
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.pushToTalk, false)
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.autoListenAfterReply, true)
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.autoSubmitOnPause, true)
    assert.equal(ORB_VOICE_AUTO_SUBMIT_DEBOUNCE_MS, END_OF_TURN_DEBOUNCE_MS)
  })

  it('primary label is Start conversation when idle', () => {
    assert.equal(ORB_VOICE_BUTTON_START, ORB_VOICE_START_CONVERSATION)
    assert.equal(
      orbVoiceFreeFlowPrimaryLabel({
        listening: false,
        thinking: false,
        speaking: false,
        transcribing: false,
        pushToTalk: false,
        continuousConversation: true
      }),
      ORB_VOICE_START_CONVERSATION
    )
  })

  it('listening in free flow does not require stop and send', () => {
    assert.equal(
      orbVoiceFreeFlowPrimaryLabel({
        listening: true,
        thinking: false,
        speaking: false,
        transcribing: false,
        pushToTalk: false,
        continuousConversation: true
      }),
      'Listening…'
    )
    assert.equal(
      orbVoiceFreeFlowPrimaryLabel({
        listening: true,
        thinking: false,
        speaking: false,
        transcribing: false,
        pushToTalk: true,
        continuousConversation: true
      }),
      'Stop and send'
    )
  })

  it('auto-resume listening follows settings', () => {
    assert.equal(isOrbVoiceFreeFlowMode(ORB_VOICE_FREE_FLOW_DEFAULTS), true)
    assert.equal(shouldAutoResumeListening(ORB_VOICE_FREE_FLOW_DEFAULTS), true)
    assert.equal(
      shouldAutoResumeListening({ continuousConversation: true, pushToTalk: true, autoListenAfterReply: true }),
      false
    )
  })

  it('Katherine profile resolves for TTS requests', () => {
    assert.equal(resolveTtsVoiceProfileId('katherine'), ORB_KATHERINE_VOICE_ID)
    assert.equal(resolveTtsVoiceProfileId('orb_british_female'), ORB_KATHERINE_VOICE_ID)
    assert.match(ORB_VOICE_KATHERINE_UNAVAILABLE, /fallback voice/)
  })
})
