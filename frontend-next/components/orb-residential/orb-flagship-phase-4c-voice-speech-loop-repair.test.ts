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
  it('build version marker is phase-4c-voice-speech-loop-repair', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4c-voice-speech-loop-repair')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('station wires auto-submit, guards and speech input status', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const loop = read('lib/orb/voice/orb-voice-speech-loop.ts')
    assert.match(station, /commitVoiceTranscriptOrBlock/)
    assert.match(station, /submitCapturedTranscript/)
    assert.match(station, /scheduleAutoSubmit/)
    assert.match(station, /voiceInputStatus/)
    assert.match(station, /onFinalTranscriptRef/)
    assert.match(station, /ORB_VOICE_AUTO_SUBMIT_DEBOUNCE_MS/)
    assert.match(station, /ORB_VOICE_NO_SPEECH_TIMEOUT_MS/)
    assert.match(loop, /VoiceInputStatus/)
  })

  it('listening copy tells adult to speak now', () => {
    assert.equal(ORB_VOICE_LISTENING_SPEAK_NOW, 'Listening… speak now.')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voiceInputStatusLabel/)
  })

  it('no-speech and empty transcript do not call ORB brain', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(ORB_VOICE_NO_SPEECH_DETECTED, /No speech was detected/)
    assert.match(station, /no_speech_detected/)
    assert.deepEqual(commitVoiceTranscriptOrBlock(''), { ok: false, reason: 'empty' })
    assert.match(station, /if \(!committed\.ok\)/)
  })

  it('non-empty transcript creates adult turn and triggers brain path', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /role: 'user'/)
    assert.match(station, /sendToOrbWithVoiceContext/)
    assert.match(station, /speakAloud/)
  })

  it('Katherine TTS path and spoken fallback copy exist', () => {
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /requestOrbPremiumTts/)
    assert.match(hook, /ORB_VOICE_TTS_SPOKEN_FALLBACK/)
    assert.equal(
      ORB_VOICE_TTS_SPOKEN_FALLBACK,
      'ORB could not speak the response, but the written reply is shown below.'
    )
    assert.match(station, /data-orb-voice-tts-spoken-fallback/)
  })

  it('Stop ORB stops premium audio and browser synthesis', () => {
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /activeAudioRef/)
    assert.match(hook, /speechSynthesis\?\.cancel/)
    assert.match(station, /handleStopOrbSpeaking/)
    assert.match(station, /cancelSpeaking/)
  })

  it('browser speech transport restarts recognition and ignores benign no-speech', () => {
    const transport = read('lib/orb/voice/engine/transports/orb-browser-speech-transport.ts')
    assert.match(transport, /restartRecognition/)
    assert.match(transport, /no-speech/)
  })

  it('type-in fallback uses same voice brain path', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-type-in-fallback/)
    assert.match(station, /handleTypeInSend/)
    assert.match(station, /appendUserTurn/)
    assert.equal(ORB_VOICE_TYPE_INSTEAD_LABEL, 'Type instead')
    assert.equal(ORB_VOICE_TYPE_INSTEAD_SEND, 'Send to ORB')
  })

  it('unsupported speech shows type-in guidance', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_SPEECH_UNSUPPORTED/)
    assert.match(ORB_VOICE_SPEECH_UNSUPPORTED, /type your reflection instead/)
    assert.match(station, /speech_unsupported/)
  })

  it('conversation transcript and summarise still wired', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const panel = read('components/orb-residential/OrbVoiceConversationPanel.tsx')
    assert.match(panel, /Adult/)
    assert.match(panel, /ORB/)
    assert.match(station, /OrbVoiceSummaryPanel/)
    assert.equal(ORB_VOICE_END_AND_SUMMARISE, 'End and summarise')
  })

  it('audio storage honesty and single shell remain', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(shell, /phase-4c-voice-speech-loop-repair/)
    assert.match(station, /ORB_VOICE_AUDIO_NOT_STORED/)
    assert.match(ORB_VOICE_MIC_ERROR, /microphone permission/)
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })
})
