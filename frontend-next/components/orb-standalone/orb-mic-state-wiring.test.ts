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
  it('voice session live requires capture loop in v2 hook', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const hook = readComponent('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /startOrbVoiceV2Capture/)
    assert.match(hook, /captureRef/)
    assert.match(station, /data-orb-voice-ui-state=\{voice\.state\}/)
    assert.match(station, /conversationLive/)
  })

  it('prevents fake active voice without capture session', () => {
    const hook = readComponent('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /processingRef/)
    assert.match(hook, /setState\('error'\)/)
    assert.match(hook, /ORB_VOICE_V2_TRANSCRIPTION_ERROR/)
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

  it('Voice does not show secondary controls until conversation is live', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /conversationLive \|\| voice\.state === 'paused'/)
    assert.match(station, /voice\.state === 'requesting_microphone'/)
    assert.match(station, /data-orb-voice-secondary-controls/)
    const startBlock = station.match(/workspaceMode === 'after_call'[\s\S]*?data-orb-voice-start-conversation/)?.[0] ?? ''
    assert.doesNotMatch(startBlock, /\bSpeak\b/)
  })

  it('Voice shows pause control during live conversation', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voice\.pauseConversation/)
    assert.match(station, /data-orb-voice-pause/)
  })

  it('Dictate shows Stop only once capture has started', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(dictate, /recordingActive \|\| captureStarting/)
    assert.match(dictate, /handleStopRecording/)
    assert.match(mobile, /mobilePrimaryLabel/)
    assert.doesNotMatch(mobile, /captureStarting \? 'Starting…'/)
  })

  it('Voice tracks v2 state through startConversation', () => {
    const hook = readComponent('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /transitionState\('requesting_microphone'\)/)
    assert.match(hook, /transitionState\('listening'\)/)
    assert.match(hook, /transitionState\('error'\)/)
  })
})
