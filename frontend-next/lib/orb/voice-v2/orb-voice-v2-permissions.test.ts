import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isNotAllowedError,
  isOrbVoiceV2CaptureNotAllowed,
  permissionNoticeForState,
  resolveOrbVoiceV2KatherineStatusMessage
} from './orb-voice-v2-permissions.ts'
import { OrbVoiceV2CaptureError } from './orb-voice-v2-capture.ts'
import {
  ORB_VOICE_V2_CONTINUE_CONVERSATION,
  ORB_VOICE_V2_KATHERINE_FORCED_OPENAI,
  ORB_VOICE_V2_MIC_DENIED,
  ORB_VOICE_V2_SAFARI_AUTO_RESUME
} from './orb-voice-v2-copy.ts'

describe('orb-voice-v2-permissions', () => {
  it('detects NotAllowedError by name and message', () => {
    assert.equal(isNotAllowedError({ name: 'NotAllowedError', message: 'denied' }), true)
    assert.equal(isNotAllowedError({ name: 'Error', message: 'The request is not allowed by the user agent' }), true)
    assert.equal(isNotAllowedError({ name: 'Error', message: 'network' }), false)
  })

  it('maps capture not_allowed errors', () => {
    assert.equal(
      isOrbVoiceV2CaptureNotAllowed(new OrbVoiceV2CaptureError('not_allowed', 'microphone_not_allowed')),
      true
    )
  })

  it('permission notices match product copy', () => {
    assert.equal(permissionNoticeForState('microphone_denied'), ORB_VOICE_V2_MIC_DENIED)
    assert.equal(permissionNoticeForState('auto_resume_blocked'), ORB_VOICE_V2_SAFARI_AUTO_RESUME)
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

  it('continue conversation label is distinct from start', () => {
    assert.equal(ORB_VOICE_V2_CONTINUE_CONVERSATION, 'Continue conversation')
    assert.notEqual(ORB_VOICE_V2_CONTINUE_CONVERSATION, 'Start conversation')
  })

  it('forced OpenAI copy is explicit', () => {
    assert.equal(
      resolveOrbVoiceV2KatherineStatusMessage({
        katherineReady: false,
        ttsProviderEffective: 'openai',
        ttsProviderForced: 'openai'
      }),
      ORB_VOICE_V2_KATHERINE_FORCED_OPENAI
    )
  })
})
