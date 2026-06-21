import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_NO_SPEECH_DETECTED,
  ORB_VOICE_TRANSCRIPTION_UNAVAILABLE,
  voiceInputStatusFromTranscriptionFailure
} from './orb-voice-speech-loop.ts'

const root = dirname(fileURLToPath(import.meta.url))

function read(name: string) {
  return readFileSync(join(root, name), 'utf8')
}

describe('ORB Voice server transcription runtime', () => {
  it('maps Safari-friendly mime types to matching filenames', () => {
    const capture = read('orb-voice-capture.ts')
    assert.match(capture, /filenameForVoiceCaptureMime/)
    assert.match(capture, /voice-capture\.mp4/)
    assert.match(capture, /voice-capture\.webm/)
  })

  it('prefers common browser mime types in order', () => {
    const capture = read('orb-voice-capture.ts')
    assert.match(capture, /ORB_VOICE_PREFERRED_MIME_TYPES/)
    assert.match(capture, /audio\/mp4/)
    assert.match(capture, /audio\/webm;codecs=opus/)
  })

  it('distinguishes transcription unavailable from no speech', () => {
    assert.equal(
      voiceInputStatusFromTranscriptionFailure({
        noTranscriptReason: 'transcription_unavailable',
        errorCode: 'voice_transcription_unavailable'
      }),
      'transcription_unavailable'
    )
    assert.equal(
      voiceInputStatusFromTranscriptionFailure({
        noTranscriptReason: 'empty_transcript',
        errorCode: 'voice_transcription_empty'
      }),
      'no_speech_detected'
    )
    assert.equal(
      voiceInputStatusFromTranscriptionFailure({
        noTranscriptReason: 'empty_audio_blob'
      }),
      'no_audio_captured'
    )
  })

  it('transcription client parses structured unavailable errors', () => {
    const client = read('orb-voice-server-transcription.ts')
    assert.match(client, /OrbVoiceTranscriptionRequestError/)
    assert.match(client, /voice_transcription_unavailable/)
    assert.match(client, /ORB_VOICE_TRANSCRIPTION_UNAVAILABLE/)
  })

  it('empty audio blob is blocked before backend call', () => {
    const client = read('orb-voice-server-transcription.ts')
    const transport = read('engine/transports/orb-server-transcription-transport.ts')
    assert.match(client, /if \(!blob\.size\)/)
    assert.match(transport, /size === 0/)
    assert.match(read('orb-voice-capture.ts'), /ORB_VOICE_NO_AUDIO_CAPTURED/)
    assert.match(client, /ORB_VOICE_NO_AUDIO_CAPTURED/)
  })

  it('no audio captured copy is distinct from no speech detected', () => {
    assert.match(ORB_VOICE_NO_SPEECH_DETECTED, /No speech was detected/)
    assert.match(ORB_VOICE_TRANSCRIPTION_UNAVAILABLE, /Type your reflection instead/)
    assert.notEqual(ORB_VOICE_NO_SPEECH_DETECTED, ORB_VOICE_TRANSCRIPTION_UNAVAILABLE)
  })
})
