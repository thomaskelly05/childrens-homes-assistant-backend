import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  ORB_VOICE_AUDIO_NOT_STORED,
  ORB_VOICE_END_AND_SUMMARISE,
  ORB_VOICE_MIC_ERROR
} from '../../lib/orb/voice/orb-voice-reflective-copy.ts'
import {
  ORB_VOICE_LISTENING_SPEAK_NOW,
  ORB_VOICE_NO_SPEECH_DETECTED,
  ORB_VOICE_SPEECH_UNSUPPORTED,
  ORB_VOICE_TTS_SPOKEN_FALLBACK,
  ORB_VOICE_TYPE_INSTEAD_LABEL,
  ORB_VOICE_TYPE_INSTEAD_SEND,
  commitVoiceTranscriptOrBlock
} from '../../lib/orb/voice/orb-voice-speech-loop.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4C Voice speech loop repair', () => {
  it('build version marker is phase-5h-voice-v2-specialist-brain', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5h-voice-v2-specialist-brain')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice v2 hook wires end-of-turn capture and speech input status', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const capture = read('lib/orb/voice-v2/orb-voice-v2-capture.ts')
    assert.match(hook, /startOrbVoiceV2Capture/)
    assert.match(hook, /transitionState\('transcribing'\)/)
    assert.match(hook, /transitionState\('speech_detected'\)/)
    assert.match(capture, /onEndOfTurn/)
    assert.match(read('lib/orb/voice/orb-voice-speech-loop.ts'), /VoiceInputStatus/)
  })

  it('listening copy tells adult to speak now', () => {
    const state = read('lib/orb/voice-v2/orb-voice-v2-state.ts')
    assert.match(state, /listening: 'Listening…'/)
  })

  it('empty transcript does not call ORB brain', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /if \(!trimmed\)/)
    assert.deepEqual(commitVoiceTranscriptOrBlock(''), { ok: false, reason: 'empty' })
  })

  it('non-empty transcript creates adult turn and triggers respond path', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /createOrbVoiceV2Turn\('adult'/)
    assert.match(hook, /requestOrbVoiceV2Respond/)
    assert.match(hook, /requestOrbVoiceV2Speak/)
  })

  it('Katherine TTS path and spoken fallback copy exist', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /requestOrbVoiceV2Speak/)
    assert.match(hook, /resolveOrbVoiceV2KatherineStatusMessage/)
    assert.match(hook, /voicePreparingSkipAvailable/)
  })

  it('Stop ORB stops premium audio', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /audioRef/)
    assert.match(hook, /stopOrbAudio/)
    assert.match(station, /stopOrbAudio/)
  })

  it('browser speech transport restarts recognition and ignores benign no-speech', () => {
    const transport = read('lib/orb/voice/engine/transports/orb-browser-speech-transport.ts')
    assert.match(transport, /restartRecognition/)
    assert.match(transport, /no-speech/)
  })

  it('type-in fallback uses same voice brain path', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-type-fallback/)
    assert.match(station, /sendTypedTurn/)
    assert.match(station, /ORB_VOICE_V2_TYPE_INSTEAD/)
    assert.match(station, /ORB_VOICE_V2_SEND_TYPED/)
  })

  it('unsupported speech shows type-in guidance', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /ORB_VOICE_V2_TRANSCRIPTION_ERROR/)
    assert.match(hook, /setShowTypeFallback\(true\)/)
  })

  it('conversation transcript and summarise still wired', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /Adult/)
    assert.match(station, /ORB/)
    assert.match(station, /data-orb-voice-summary-panel/)
    assert.equal(ORB_VOICE_END_AND_SUMMARISE, 'End and summarise')
  })

  it('audio storage honesty and single shell remain', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(shell, /phase-5h-voice-v2-specialist-brain/)
    assert.match(station, /ORB_VOICE_V2_SAFETY_FOOTER/)
    assert.match(ORB_VOICE_MIC_ERROR, /microphone permission/)
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })
})
