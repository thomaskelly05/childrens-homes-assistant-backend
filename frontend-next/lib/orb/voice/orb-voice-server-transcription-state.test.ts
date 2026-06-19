import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  canShowServerTranscriptionNoSpeechPanel,
  isServerTranscriptionFinalizeInProgress
} from './orb-voice-server-transcription-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const recordingDiagnostics = {
  serverTranscriptionStatus: 'recording',
  mediaRecorderStarted: true,
  mediaRecorderStopped: false
}

const processingDiagnostics = {
  serverTranscriptionStatus: 'processing',
  mediaRecorderStarted: true,
  mediaRecorderStopped: true
}

const emptyDiagnostics = {
  serverTranscriptionStatus: 'empty',
  mediaRecorderStarted: true,
  mediaRecorderStopped: true
}

describe('ORB server transcription finalize state', () => {
  it('does not show no-speech while recorder is still recording', () => {
    assert.equal(
      isServerTranscriptionFinalizeInProgress(recordingDiagnostics, 'capturing', false),
      true
    )
    assert.equal(
      canShowServerTranscriptionNoSpeechPanel(true, recordingDiagnostics, 'capturing', false),
      false
    )
  })

  it('does not show no-speech while processing after stop', () => {
    assert.equal(
      isServerTranscriptionFinalizeInProgress(processingDiagnostics, 'transcribing', true),
      true
    )
    assert.equal(
      canShowServerTranscriptionNoSpeechPanel(true, processingDiagnostics, 'transcribing', true),
      false
    )
  })

  it('shows no-speech only after empty finalisation', () => {
    assert.equal(
      canShowServerTranscriptionNoSpeechPanel(true, emptyDiagnostics, 'failed', false),
      true
    )
  })

  it('transport stop sets processing before upload and completed after transcript', () => {
    const transport = read('lib/orb/voice/engine/transports/orb-server-transcription-transport.ts')
    assert.match(transport, /serverTranscriptionStatus: 'processing'/)
    assert.match(transport, /await capture\.stop\(\)/)
    assert.match(transport, /mediaRecorderStopped: true/)
    assert.match(transport, /recordedAudioSizeBytes/)
    assert.match(transport, /serverTranscriptionStatus: 'empty'/)
    assert.match(transport, /empty_audio_blob/)
    assert.match(transport, /serverTranscriptionStatus: 'completed'/)
    assert.match(transport, /serverTranscriptionStatus: 'failed'/)
  })

  it('capture stop polls for Safari dataavailable before finalising blob', () => {
    const capture = read('lib/orb/voice/orb-voice-capture.ts')
    assert.match(capture, /maxWaitMs = isSafariLike\(\) \? 2500 : 800/)
    assert.match(capture, /recorder\.stop\(\)/)
    assert.match(capture, /dataavailable/)
  })

  it('voice station guards no-transcript panel during recording', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /canShowServerTranscriptionNoSpeechPanel/)
    assert.match(station, /isServerTranscriptionFinalizeInProgress/)
    assert.match(station, /setIsFinalizingRecording\(true\)/)
    assert.match(station, /await voiceEngine\.stop\(\)/)
    assert.match(station, /serverTranscriptionStatus === 'failed'/)
  })

  it('chrome browser speech route unchanged in capability selector', () => {
    const selector = read('lib/orb/voice/engine/orb-voice-capability-selector.ts')
    assert.match(selector, /browser_speech_recognition/)
    assert.match(selector, /failures >= 2/)
    assert.match(selector, /safari_browser_speech_unreliable/)
  })

  it('engine stop uses server transport when recording', () => {
    const engine = read('lib/orb/voice/engine/orb-web-voice-engine.ts')
    assert.match(engine, /serverTransport\.isRecording\(\)/)
    assert.match(engine, /serverTranscriptionStatus: 'processing'/)
  })
})
