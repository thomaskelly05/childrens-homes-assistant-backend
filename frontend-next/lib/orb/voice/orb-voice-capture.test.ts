import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB voice capture', () => {
  it('separates permission probe from active stream acquisition', () => {
    const capture = read('lib/orb/voice/orb-voice-capture.ts')
    assert.match(capture, /probeMicrophoneAccess/)
    assert.match(capture, /acquireMicrophoneStream/)
    assert.match(capture, /releaseMicrophoneStream/)
    assert.doesNotMatch(capture, /probeMicrophoneAccess[\s\S]*releaseMicrophoneStream[\s\S]*probeMicrophoneAccess/)
  })

  it('voice hook does not stop stream immediately after permission for capture', () => {
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /acquireMicrophoneStream/)
    assert.match(hook, /probeOnly/)
    assert.match(hook, /voiceCaptureState/)
    assert.match(hook, /beginMediaRecorderCapture/)
  })

  it('readiness does not claim active session without capture', () => {
    const readiness = read('lib/orb/voice/orb-voice-readiness.ts')
    assert.match(readiness, /captureActive/)
    assert.match(readiness, /Microphone not active yet/)
  })

  it('voice station waits for capture before session active', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /captureStarted/)
    assert.match(station, /setSessionActive\(true\)/)
    const startIdx = station.indexOf('async function handleStart')
    const block = station.slice(startIdx, startIdx + 3500)
    const activeIdx = block.indexOf('setSessionActive(true)')
    const captureIdx = block.indexOf('captureStarted')
    assert.ok(captureIdx > 0 && activeIdx > captureIdx)
  })

  it('composer mic opens dictate when speech recognition unavailable', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /openOrbDictatePanel/)
    assert.match(companion, /!voice\.recognitionAvailable/)
  })

  it('dictate uses continuous capture or media recorder fallback', () => {
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /mode: 'continuous'/)
    assert.match(dictate, /beginMediaRecorderCapture/)
    assert.match(dictate, /applyPaste/)
  })
})
