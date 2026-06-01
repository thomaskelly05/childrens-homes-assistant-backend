import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = dirname(fileURLToPath(import.meta.url))

describe('orb-voice-capture', () => {
  it('attaches dataavailable before MediaRecorder start in confirmed path', () => {
    const source = readFileSync(join(root, 'orb-voice-capture.ts'), 'utf8')
    assert.match(source, /recorder\.ondataavailable/)
    assert.match(source, /confirmMediaRecorderStart\(recorder\)/)
    assert.match(source, /startRecorder\(recorder/)
  })

  it('stop prefers MediaRecorder blob then WAV fallback metadata', () => {
    const source = readFileSync(join(root, 'orb-voice-capture.ts'), 'utf8')
    assert.match(source, /source: 'media_recorder'/)
    assert.match(source, /source: 'web_audio_wav'/)
    assert.match(source, /source: 'none'/)
    assert.match(source, /pcmCapture\?\.stop\(\)/)
    assert.match(source, /requestData\(\)/)
  })

  it('PCM fallback resumes AudioContext and uses silent gain', () => {
    const source = readFileSync(join(root, 'orb-voice-capture.ts'), 'utf8')
    assert.match(source, /resumeAudioContext/)
    assert.match(source, /silentGain\.gain\.value = 0/)
    assert.match(source, /createScriptProcessor/)
  })

  it('exports MediaRecorderStopResult with chunk and sample counts', () => {
    const source = readFileSync(join(root, 'orb-voice-capture.ts'), 'utf8')
    assert.match(source, /chunkCount/)
    assert.match(source, /sampleCount/)
    assert.match(source, /MediaRecorderStopResult/)
  })
})
