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
  it('prefers speech when SpeechRecognition is available (including Safari)', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /const preferSpeechRecognition = speechRecognitionAvailable/)
    assert.match(dictate, /const preferMediaRecorder = !speechRecognitionAvailable && mediaRecorderAvailable/)
    assert.doesNotMatch(dictate, /isSafariBrowser\(\)/)
    assert.match(dictate, /beginDictateSpeechCapture/)
  })

  it('speech mode sets listening status and data attributes', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /Listening — speech will appear as text/)
    assert.match(dictate, /data-orb-dictate-recorder-mode/)
    assert.match(dictate, /data-orb-dictate-recording-state/)
    assert.match(dictate, /data-orb-dictate-transcript-length/)
    assert.match(dictate, /Speech transcript captured — review before generating/)
    assert.match(dictate, /No speech was detected\. Try again/)
  })

  it('media fallback preserves speech transcript on zero-byte audio', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /existingSpeechTranscript/)
    assert.match(dictate, /preservedSpeechTranscript/)
    assert.match(dictate, /Try speech transcript, Chrome\/Edge/)
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
    assert.match(station, /isRealtimeVoiceProvider/)
    assert.match(station, /realtimeVoiceReady/)
    assert.match(station, /Live ORB Voice is not available yet/)
    assert.match(station, /voice_fake_active_prevented/)
  })
})

describe('Composer mic routing', () => {
  it('defaults to dictate unless realtime voice is configured', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(companion, /realtimeVoiceAvailable/)
    assert.match(companion, /voiceGenuinelyAvailable/)
    assert.match(companion, /if \(isSafariBrowser\(\)\) return 'dictate'/)
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
