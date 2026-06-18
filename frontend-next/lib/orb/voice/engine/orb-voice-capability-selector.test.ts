import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-voice-capability-selector', () => {
  it('Chrome prefers browser speech recognition', () => {
    const source = readSource('lib/orb/voice/engine/orb-voice-capability-selector.ts')
    assert.match(source, /chromeDetected/)
    assert.match(source, /browser_speech_recognition/)
    assert.match(source, /preferServerAfterFailures/)
  })

  it('Safari prefers server transcription', () => {
    const source = readSource('lib/orb/voice/engine/orb-voice-capability-selector.ts')
    assert.match(source, /safariDetected/)
    assert.match(source, /server_transcription/)
    assert.match(source, /safari_browser_speech_unreliable/)
  })

  it('Firefox rejects browser speech recognition', () => {
    const source = readSource('lib/orb/voice/engine/orb-voice-capability-selector.ts')
    assert.match(source, /firefoxDetected/)
    assert.match(source, /firefox_no_speech_recognition/)
  })

  it('voice engine wires capability selector and transports', () => {
    const engine = readSource('lib/orb/voice/engine/orb-web-voice-engine.ts')
    const station = readSource('components/orb-standalone/orb-voice-station.tsx')
    assert.match(engine, /selectOrbVoiceTransport/)
    assert.match(engine, /OrbBrowserSpeechTransport/)
    assert.match(engine, /OrbServerTranscriptionTransport/)
    assert.match(station, /useOrbWebVoiceEngine/)
    assert.match(station, /voiceEngine\.start/)
  })
})
