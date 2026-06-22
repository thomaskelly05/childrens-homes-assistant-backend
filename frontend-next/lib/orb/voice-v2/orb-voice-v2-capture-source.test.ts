import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  traceOrbVoiceCapture,
  traceOrbVoiceCaptureModeSelected,
  traceOrbVoiceTranscriptSource
} from './orb-voice-v2-capture-source.ts'

describe('orb-voice-v2-capture-source', () => {
  it('emits safe capture traces without transcript content', () => {
    const logs: string[] = []
    const original = console.debug
    console.debug = (...args: unknown[]) => {
      logs.push(JSON.stringify(args))
    }
    try {
      traceOrbVoiceCaptureModeSelected('webrtc_active')
      traceOrbVoiceTranscriptSource('webrtc_final')
      traceOrbVoiceCapture('orb_voice_transcribe_skipped', { source: 'webrtc_final' })
      traceOrbVoiceCapture('orb_voice_standard_audio_blob', { size: 1200, mime: 'audio/webm' })
    } finally {
      console.debug = original
    }
    const joined = logs.join(' ')
    assert.match(joined, /orb_voice_capture_mode_selected/)
    assert.match(joined, /orb_voice_transcript_source/)
    assert.doesNotMatch(joined, /child|safeguarding|transcript":/i)
  })
})
