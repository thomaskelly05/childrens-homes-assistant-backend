import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate speech-first routing', () => {
  it('Start uses server realtime first; Safari avoids browser SpeechRecognition by default', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /handleStartSpeechTranscript/)
    assert.match(dictate, /Start speech transcript/)
    assert.match(dictate, /isSafariBrowser/)
    assert.match(dictate, /OrbDictateRealtimeTranscription/)
    assert.match(dictate, /realtime_transcription/)
    assert.match(dictate, /handleBrowserSpeechFallbackClick/)
    assert.match(dictate, /handleAudioFallbackClick/)
    const startHandler =
      dictate.match(/async function handleStartSpeechTranscript[\s\S]*?async function handleBrowserSpeechFallbackClick/m)?.[0] ?? ''
    assert.doesNotMatch(startHandler, /beginDictateSpeechCapture\(\)/)
  })

  it('speech mode sets listening status and data attributes', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /DICTATE_LISTENING_MESSAGE|Listening — speech will appear as text/)
    assert.match(dictate, /data-orb-dictate-state=/)
    assert.match(dictate, /data-orb-dictate-capture-mode=/)
    assert.match(dictate, /data-orb-dictate-recording-state/)
    assert.match(dictate, /data-orb-dictate-transcript-length/)
    assert.match(dictate, /Speech transcript captured — review before generating/)
    assert.match(dictate, /DICTATE_NO_SPEECH_MESSAGE|No speech was detected/)
  })

  it('media fallback preserves speech transcript on zero-byte audio', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /existingSpeechTranscript/)
    assert.match(dictate, /preservedSpeechTranscript/)
    assert.match(dictate, /DICTATE_AUDIO_FALLBACK_FAILED_MESSAGE|Try speech transcript, Chrome\/Edge/)
  })

  it('hook does not prefer MediaRecorder on Safari when Recognition exists', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.doesNotMatch(hook, /isSafariBrowser\(\) && detectMediaRecorderSupported/)
    assert.match(hook, /beginDictateSpeechCapture/)
    assert.match(hook, /dictateSpeechCaptureRef/)
  })
})

describe('ORB Voice realtime availability', () => {
  it('isRealtimeVoiceProvider helper distinguishes realtime providers', () => {
    const client = readComponent('lib/orb/voice/orb-voice-client.ts')
    assert.match(client, /export function isRealtimeVoiceProvider/)
    assert.match(client, /openai_realtime/)
    assert.match(client, /websocket_realtime/)
    assert.match(client, /browser_fallback/)
  })

  it('voice station requires realtime before live session', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /fetchOrbVoiceRealtimeStatus|isRealtimeVoiceProvider/)
    assert.match(station, /realtimeVoiceReady/)
    assert.match(station, /Live ORB Voice is not available yet/)
    assert.match(station, /voice_fake_active_prevented/)
  })
})

describe('Composer mic routing', () => {
  it('composer mic defaults to dictate without auto-start', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(companion, /isOrbRealtimeVoiceAvailable/)
    assert.match(companion, /openOrbDictatePanel\(\)/)
    assert.match(composer, /data-orb-composer-mic-route/)
  })

  it('flight recorder reads dictate data attributes', () => {
    const recorder = readComponent('components/orb-standalone/orb-client-flight-recorder.tsx')
    assert.match(recorder, /dictateTranscriptLength/)
    assert.match(recorder, /dictateCaptureSource/)
    assert.match(recorder, /dictateChunkCount/)
    assert.match(recorder, /composerMicRoute/)
  })
})
