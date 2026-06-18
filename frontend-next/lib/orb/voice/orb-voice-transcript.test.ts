import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  appendOrbVoiceFinalTranscriptChunk,
  buildOrbVoiceDisplayTranscript
} from './orb-voice-transcript.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('orb-voice-transcript', () => {
  it('accumulates full transcript across multiple final chunks', () => {
    const first = appendOrbVoiceFinalTranscriptChunk('', 'Hello ORB')
    const second = appendOrbVoiceFinalTranscriptChunk(first, 'please help with my email')
    assert.equal(second, 'Hello ORB please help with my email')
  })

  it('does not overwrite earlier transcript chunks', () => {
    const merged = appendOrbVoiceFinalTranscriptChunk('First sentence.', 'Second sentence.')
    assert.equal(merged, 'First sentence. Second sentence.')
    assert.ok(merged.startsWith('First sentence.'))
  })

  it('keeps interim separate from committed transcript for display', () => {
    const display = buildOrbVoiceDisplayTranscript('Committed text', 'live interim')
    assert.equal(display, 'Committed text live interim')
    assert.notEqual(display, 'live interim')
  })

  it('voice hook promotes interim transcript on finalize', () => {
    const hook = readFileSync(
      join(root, 'components/orb-standalone/use-standalone-orb-voice.ts'),
      'utf8'
    )
    assert.match(hook, /promoteInterimTranscriptCommitted/)
    assert.match(hook, /finalizeBrowserSpeechCapture/)
    assert.match(hook, /resolveBrowserSpeechCaptureText/)
  })

  it('send actions use display transcript including interim', () => {
    const station = readFileSync(
      join(root, 'components/orb-standalone/orb-voice-station.tsx'),
      'utf8'
    )
    assert.match(station, /voice\.displayTranscript \|\| voice\.transcript/)
    assert.match(station, /onSendToOrb\(voiceTranscriptText/)
  })
})
