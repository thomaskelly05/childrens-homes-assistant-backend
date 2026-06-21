import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  ORB_VOICE_AUDIO_NOT_STORED,
  ORB_VOICE_END_AND_SUMMARISE
} from '../../lib/orb/voice/orb-voice-reflective-copy.ts'
import {
  ORB_VOICE_NO_AUDIO_CAPTURED,
  ORB_VOICE_TRANSCRIPTION_UNAVAILABLE,
  ORB_VOICE_TYPE_INSTEAD_SEND,
  voiceInputStatusFromTranscriptionFailure
} from '../../lib/orb/voice/orb-voice-speech-loop.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4D Voice server transcription repair', () => {
  it('build version marker is phase-5e-render-build-memory-fix', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5e-render-build-memory-fix')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice capture chooses supported mime type and filename', () => {
    const capture = read('lib/orb/voice/orb-voice-capture.ts')
    const transport = read('lib/orb/voice/engine/transports/orb-server-transcription-transport.ts')
    assert.match(capture, /ORB_VOICE_PREFERRED_MIME_TYPES/)
    assert.match(capture, /filenameForVoiceCaptureMime/)
    assert.match(transport, /filenameForVoiceCaptureMime/)
    assert.match(capture, /audio\/mp4/)
  })

  it('empty audio blob is blocked before backend call', () => {
    const client = read('lib/orb/voice/orb-voice-server-transcription.ts')
    const transport = read('lib/orb/voice/engine/transports/orb-server-transcription-transport.ts')
    assert.match(client, /if \(!blob\.size\)/)
    assert.match(transport, /size === 0/)
    assert.match(ORB_VOICE_NO_AUDIO_CAPTURED, /No audio was captured/)
  })

  it('backend voice transcription service uses voice feature path', () => {
    const service = read('../services/orb_voice_transcription_service.py')
    const route = read('../routers/orb_voice_residential_routes.py')
    const governance = read('../services/ai_external_call_governance.py')
    assert.match(service, /FEATURE_VOICE_TRANSCRIPTION/)
    assert.match(service, /transcribe_voice_audio/)
    assert.match(route, /transcribe_voice_audio/)
    assert.match(governance, /FEATURE_VOICE_TRANSCRIPTION/)
    assert.match(route, /voice_transcription_unavailable/)
  })

  it('successful transcription commits adult turn through v2 hook', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /commitAdultTurn/)
    assert.match(hook, /createOrbVoiceV2Turn\('adult'/)
    assert.match(hook, /requestOrbVoiceV2Respond/)
  })

  it('transcription failure shows type-in fallback', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /ORB_VOICE_V2_TRANSCRIPTION_ERROR/)
    assert.match(station, /data-orb-voice-type-fallback/)
    assert.match(station, /sendTypedTurn/)
  })

  it('distinguishes no speech from transcription unavailable', () => {
    assert.equal(
      voiceInputStatusFromTranscriptionFailure({ noTranscriptReason: 'empty_transcript' }),
      'no_speech_detected'
    )
    assert.equal(
      voiceInputStatusFromTranscriptionFailure({ noTranscriptReason: 'transcription_unavailable' }),
      'transcription_unavailable'
    )
  })

  it('type-in fallback uses same conversation path', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /sendTypedTurn/)
    assert.match(station, /ORB_VOICE_V2_SEND_TYPED/)
  })

  it('summarise and audio honesty preserved', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-summary-panel/)
    assert.match(station, /End and summarise/)
    assert.match(station, /ORB_VOICE_V2_SAFETY_FOOTER/)
  })

  it('single shell and no compliance guarantee language', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(shell, /phase-5e-render-build-memory-fix/)
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })
})
