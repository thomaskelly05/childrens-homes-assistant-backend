import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isOrbSpeechRecognitionErrorMessage,
  orbVoiceCalmSpeechNotice,
  orbVoiceStationHeadline
} from './orb-voice-speech-notice.ts'

describe('orb-voice-speech-notice', () => {
  it('detects speech recognition failure copy', () => {
    assert.equal(isOrbSpeechRecognitionErrorMessage('Speech recognition could not start.'), true)
    assert.equal(isOrbSpeechRecognitionErrorMessage('Microphone access is needed'), false)
  })

  it('returns calm notice instead of blocking headline copy', () => {
    const calm = orbVoiceCalmSpeechNotice('Speech recognition could not start. Open Dictate or type instead.')
    assert.match(calm!, /optional/)
    assert.match(calm!, /Dictate/)
  })

  it('keeps preferred headline when realtime may still work', () => {
    const result = orbVoiceStationHeadline({
      preferredHeadline: 'Ready for voice',
      speechError: 'Speech recognition could not start',
      realtimeAvailable: true,
      sessionLive: false
    })
    assert.equal(result.headline, 'Ready for voice')
    assert.ok(result.speechNotice)
  })
})
