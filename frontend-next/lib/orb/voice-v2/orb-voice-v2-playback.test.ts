import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED,
  ORB_VOICE_V2_FALLBACK_VOICE_TURN,
  ORB_VOICE_V2_PLAY_ORB_VOICE
} from './orb-voice-v2-copy.ts'
import { isNotAllowedError } from './orb-voice-v2-permissions.ts'
import { resolveOrbVoiceV2KatherineStatusMessage } from './orb-voice-v2-permissions.ts'

describe('orb-voice-v2-playback', () => {
  it('playback blocked copy prompts manual play', () => {
    assert.match(ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED, /Play ORB voice/)
    assert.equal(ORB_VOICE_V2_PLAY_ORB_VOICE, 'Play ORB voice')
  })

  it('turn fallback copy is distinct from settings fallback', () => {
    assert.equal(ORB_VOICE_V2_FALLBACK_VOICE_TURN, 'Using fallback voice for this reply.')
  })

  it('NotAllowedError detection covers Safari autoplay failures', () => {
    assert.equal(isNotAllowedError({ name: 'NotAllowedError' }), true)
    assert.equal(
      isNotAllowedError({ name: 'Error', message: 'The request is not allowed by the user agent' }),
      true
    )
  })

  it('Katherine ready only when backend says ready', () => {
    assert.equal(
      resolveOrbVoiceV2KatherineStatusMessage({
        katherineReady: true,
        ttsProviderEffective: 'elevenlabs'
      }),
      'Katherine ready'
    )
    assert.match(
      resolveOrbVoiceV2KatherineStatusMessage({
        katherineReady: false,
        ttsProviderEffective: 'openai',
        ttsProviderForced: 'openai',
        fallbackReason: 'provider_forced_openai'
      }),
      /forced in server settings/
    )
  })
})
