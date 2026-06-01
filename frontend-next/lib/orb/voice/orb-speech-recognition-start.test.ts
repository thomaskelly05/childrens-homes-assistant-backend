import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  RECOGNITION_START_TIMEOUT_MS,
  SPEECH_RECOGNITION_MINIMUM_HOLD_MS,
  confirmSpeechRecognitionStart
} from './orb-speech-recognition-start.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

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
  onErrorBeforeStart?: boolean
  onEndBeforeStart?: boolean
  onEndAfterStartMs?: number
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
    }
  }
  return recognition
}

describe('confirmSpeechRecognitionStart', () => {
  it('resolves true when onstart fires', async () => {
    const recognition = createMockRecognition({ onStart: 'immediate' })
    const result = await confirmSpeechRecognitionStart(recognition, { timeoutMs: 500 })
    assert.equal(result.ok, true)
  })

  it('can still enforce a hold window when explicitly requested', async () => {
    const recognition = createMockRecognition({
      onStart: 'immediate',
      onEndAfterStartMs: 30
    })
    const result = await confirmSpeechRecognitionStart(recognition, {
      timeoutMs: 500,
      minimumHoldMs: 80
    })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'speech_recognition_ended_immediately')
  })

  it('resolves false on onerror before onstart', async () => {
    const recognition = createMockRecognition({ onErrorBeforeStart: true })
    const result = await confirmSpeechRecognitionStart(recognition, { timeoutMs: 500 })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'onerror_before_onstart')
  })

  it('resolves false on onend before onstart', async () => {
    const recognition = createMockRecognition({ onEndBeforeStart: true })
    const result = await confirmSpeechRecognitionStart(recognition, { timeoutMs: 500 })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'onend_before_onstart')
  })

  it('resolves false when onend fires before explicit minimumHoldMs', async () => {
    const recognition = createMockRecognition({
      onStart: 'immediate',
      onEndAfterStartMs: 30
    })
    const result = await confirmSpeechRecognitionStart(recognition, {
      timeoutMs: 500,
      minimumHoldMs: 80
    })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'speech_recognition_ended_immediately')
  })

  it('resolves false on timeout when onstart never fires', async () => {
    const recognition = createMockRecognition({ onStart: 'never' })
    const started = Date.now()
    const result = await confirmSpeechRecognitionStart(recognition, { timeoutMs: 80 })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'timeout')
    assert.ok(Date.now() - started >= 75)
  })

  it('resolves false when start() throws', async () => {
    const recognition = createMockRecognition({ startThrows: true })
    const result = await confirmSpeechRecognitionStart(recognition, { timeoutMs: 500 })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'start_throw')
  })
})

describe('ORB voice hook confirmed capture', () => {
  it('beginSpeechRecognitionCapture awaits startRecognitionSessionConfirmed', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /startRecognitionSessionConfirmed/)
    assert.match(hook, /confirmSpeechRecognitionStart/)
    assert.match(hook, /not stable in this browser/i)
    assert.match(hook, /await startRecognitionSessionConfirmed/)
  })

  it('voice station only treats session as live when capture is active', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voiceSessionLive = voiceStartStage === 'active' && captureActive/)
    assert.match(station, /browserCaptureActiveRef/)
    assert.match(station, /Live voice is not stable in this browser/)
  })

  it('dictate uses recordingUiState before showing recording', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /setRecordingUiState\('starting'\)/)
    assert.match(dictate, /setRecordingUiState\('recording'\)/)
    assert.match(dictate, /Starting microphone/)
    assert.match(dictate, /SPEECH_START_FAILED_MESSAGE/)
  })

  it('light mode voice and dictate use orb theme tokens', () => {
    const tokens = readFileSync(join(root, 'app/orb/orb-premium-tokens.css'), 'utf8')
    assert.match(tokens, /--orb-background: #f7fbff/)
    assert.match(tokens, /--orb-surface: #ffffff/)
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(voice, /var\(--orb-foreground\)/)
    assert.match(dictate, /var\(--orb-surface\)/)
    assert.doesNotMatch(dictate, /bg-black\/20/)
  })
})

describe('RECOGNITION_START_TIMEOUT_MS', () => {
  it('defaults to 2500ms', () => {
    assert.equal(RECOGNITION_START_TIMEOUT_MS, 2500)
  })

  it('does not require a hold window by default', () => {
    assert.equal(SPEECH_RECOGNITION_MINIMUM_HOLD_MS, 0)
  })
})
