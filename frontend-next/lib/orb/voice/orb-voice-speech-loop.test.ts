import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  commitVoiceTranscriptOrBlock,
  ORB_VOICE_AUTO_SUBMIT_DEBOUNCE_MS,
  ORB_VOICE_LISTENING_SPEAK_NOW,
  ORB_VOICE_NO_SPEECH_DETECTED,
  ORB_VOICE_NO_SPEECH_TIMEOUT_MS,
  ORB_VOICE_SPEECH_UNSUPPORTED,
  ORB_VOICE_TTS_SPOKEN_FALLBACK,
  ORB_VOICE_TYPE_INSTEAD_LABEL,
  ORB_VOICE_TYPE_INSTEAD_PLACEHOLDER,
  ORB_VOICE_TYPE_INSTEAD_SEND,
  voiceInputStatusFromTranscriptionFailure,
  voiceInputStatusLabel
} from './orb-voice-speech-loop.ts'

describe('ORB Voice speech loop runtime', () => {
  it('blocks empty transcript commit', () => {
    assert.deepEqual(commitVoiceTranscriptOrBlock('   '), { ok: false, reason: 'empty' })
    assert.deepEqual(commitVoiceTranscriptOrBlock('Hello ORB'), { ok: true, text: 'Hello ORB' })
  })

  it('maps transcription failures to distinct input statuses', () => {
    assert.equal(
      voiceInputStatusFromTranscriptionFailure({ noTranscriptReason: 'transcription_unavailable' }),
      'transcription_unavailable'
    )
    assert.equal(
      voiceInputStatusFromTranscriptionFailure({ noTranscriptReason: 'empty_audio_blob' }),
      'no_audio_captured'
    )
  })

  it('exposes listening and no-speech copy', () => {
    assert.equal(ORB_VOICE_LISTENING_SPEAK_NOW, 'Listening… speak now.')
    assert.match(ORB_VOICE_NO_SPEECH_DETECTED, /No speech was detected/)
    assert.equal(ORB_VOICE_SPEECH_UNSUPPORTED, voiceInputStatusLabel('speech_unsupported'))
    assert.match(ORB_VOICE_TTS_SPOKEN_FALLBACK, /written reply is shown below/)
  })

  it('uses sensible auto-submit and no-speech timeouts', () => {
    assert.ok(ORB_VOICE_AUTO_SUBMIT_DEBOUNCE_MS >= 1_000)
    assert.ok(ORB_VOICE_NO_SPEECH_TIMEOUT_MS >= 10_000)
  })

  it('type-in fallback labels are stable', () => {
    assert.equal(ORB_VOICE_TYPE_INSTEAD_LABEL, 'Type instead')
    assert.match(ORB_VOICE_TYPE_INSTEAD_PLACEHOLDER, /Type what you wanted/)
    assert.equal(ORB_VOICE_TYPE_INSTEAD_SEND, 'Send to ORB')
  })
})
