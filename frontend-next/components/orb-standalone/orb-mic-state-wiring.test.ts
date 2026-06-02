import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  SPEECH_RECOGNITION_MINIMUM_HOLD_MS,
  confirmSpeechRecognitionStart
} from '../../lib/orb/voice/orb-speech-recognition-start.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

type MockRecognition = {
  onstart: (() => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  onresult?: ((event: unknown) => void) | null
  start: () => void
}

function createMockRecognition(behaviour: {
  onStart?: 'immediate' | 'never'
  onEndAfterStartMs?: number
  onErrorBeforeStart?: boolean
  onEndBeforeStart?: boolean
  onResultAfterStartMs?: number
  startThrows?: boolean
}): MockRecognition {
  const recognition: MockRecognition = {
    onstart: null,
    onerror: null,
    onend: null,
    onresult: null,
    start: () => {
      if (behaviour.startThrows) throw new Error('start failed')
      if (behaviour.onErrorBeforeStart) {
        queueMicrotask(() => recognition.onerror?.())
        return
      }
      if (behaviour.onEndBeforeStart) {
        queueMicrotask(() => recognition.onend?.())
        return
      }
      if (behaviour.onStart === 'immediate') {
        queueMicrotask(() => recognition.onstart?.())
      }
      if (behaviour.onEndAfterStartMs != null) {
        setTimeout(() => recognition.onend?.(), behaviour.onEndAfterStartMs)
      }
      if (behaviour.onResultAfterStartMs != null) {
        setTimeout(() => recognition.onresult?.({}), behaviour.onResultAfterStartMs)
      }
    }
  }
  return recognition
}

describe('ORB mic state wiring', () => {
  it('voice session live requires realtime session connected', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /realtimeSessionConnected/)
    assert.match(station, /voiceTransportLive/)
    assert.match(station, /voiceSessionLive[\s\S]*voiceTransportLive/)
    assert.match(station, /data-orb-voice-session-connected/)
  })

  it('prevents fake active voice without realtime connection', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voice_fake_active_prevented/)
    assert.match(station, /setVoiceStartStage\('failed'\)/)
  })

  it('SpeechRecognition confirmed start fails if onend occurs before minimumHoldMs', async () => {
    const recognition = createMockRecognition({
      onStart: 'immediate',
      onEndAfterStartMs: 50
    })
    const result = await confirmSpeechRecognitionStart(recognition, {
      timeoutMs: 800,
      minimumHoldMs: 200
    })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'speech_recognition_ended_immediately')
  })

  it('SpeechRecognition confirmed start succeeds after minimum hold', async () => {
    const recognition = createMockRecognition({ onStart: 'immediate' })
    const result = await confirmSpeechRecognitionStart(recognition, {
      timeoutMs: 800,
      minimumHoldMs: 40
    })
    assert.equal(result.ok, true)
  })

  it('SpeechRecognition confirmed start succeeds early on onresult', async () => {
    const recognition = createMockRecognition({
      onStart: 'immediate',
      onResultAfterStartMs: 20
    })
    const result = await confirmSpeechRecognitionStart(recognition, {
      timeoutMs: 800,
      minimumHoldMs: 500
    })
    assert.equal(result.ok, true)
  })

  it('Dictate uses explicit speech start and optional audio fallback', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /beginMediaRecorderCapture/)
    assert.match(dictate, /handleAudioFallbackClick/)
    assert.match(dictate, /handleStartSpeechTranscript/)
    assert.match(dictate, /beginDictateSpeechCapture/)
    assert.match(dictate, /dictate_media_fallback_started/)
  })

  it('Dictate recording UI uses explicit recordingUiState machine', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /recordingUiState/)
    assert.match(dictate, /setRecordingUiState\('starting'\)/)
    assert.match(dictate, /setRecordingUiState\('recording'\)/)
    assert.match(dictate, /data-orb-dictate-recording-state/)
  })

  it('Voice does not show Speak/End during start stage', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voiceSessionLive \?/)
    assert.match(station, /voiceStarting \?/)
    assert.match(station, /handleCancelStart/)
    const startBlock = station.match(/voiceStarting \?[\s\S]*? : voiceSessionLive/)?.[0] ?? ''
    assert.doesNotMatch(startBlock, /\bSpeak\b/)
  })

  it('Voice shows Cancel during start stage', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /handleCancelStart/)
    assert.match(station, /Cancel/)
  })

  it('Dictate shows Stop only once capture has started', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /!recordingActive && !captureStarting/)
    assert.match(dictate, /data-orb-dictate-capture-starting/)
    assert.match(dictate, /handleStopRecording/)
    assert.match(dictate, /aria-label="Stop"/)
  })

  it('Voice tracks voiceStartStage through handleStart', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /starting_browser_speech/)
    assert.match(station, /setVoiceStartStage\('active'\)/)
    assert.match(station, /setVoiceStartStage\('failed'\)/)
  })
})
