import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5F Voice v2 microphone transition', () => {
  it('Voice v2 click fix and memory lazy-load regressions remain', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const shell = read('components/orb/orb-shell.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(station, /traceOrbVoiceV2StartClick/)
    assert.match(station, /data-orb-voice-controls/)
    assert.match(shell, /import\('@\/components\/orb-standalone\/orb-care-companion'\)/)
    assert.match(css, /phase-5d-voice-v2-clickable-idle/)
  })

  it('start conversation requests microphone immediately with parallel audio unlock', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /transitionState\('requesting_microphone'\)/)
    assert.match(hook, /runParallelAudioUnlock\(\)/)
    assert.match(hook, /await resumeListening\(\{ fromUserGesture: true \}\)/)
    assert.doesNotMatch(
      hook,
      /setState\('requesting_microphone'\)[\s\S]{0,400}await unlockOrbVoiceV2AudioPlayback\(\)[\s\S]{0,400}await resumeListening/
    )
  })

  it('microphone timeout and Safari error copy are wired', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const mic = read('lib/orb/voice-v2/orb-voice-v2-microphone.ts')
    assert.match(hook, /MICROPHONE_REQUEST_TIMEOUT_MS/)
    assert.match(hook, /voice_v2_microphone_timeout/)
    assert.match(mic, /ORB_VOICE_V2_MIC_TIMEOUT/)
    assert.match(mic, /ORB_VOICE_V2_MIC_DENIED/)
    assert.match(mic, /ORB_VOICE_V2_MIC_NOT_FOUND/)
  })

  it('recorder start transitions to listening before first audio chunk', () => {
    const capture = read('lib/orb/voice-v2/orb-voice-v2-capture.ts')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(capture, /onListeningReady/)
    assert.match(hook, /onListeningReady/)
    assert.match(hook, /ORB_VOICE_V2_LISTENING_HINT/)
  })

  it('typed fallback and retry microphone are visible on mic failure', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /data-orb-voice-type-fallback/)
    assert.match(station, /retryMicrophone/)
    assert.match(hook, /setShowTypeFallback\(true\)/)
    assert.match(hook, /retryMicrophone/)
  })

  it('typed fallback uses v2 respond path', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(hook, /requestOrbVoiceV2Respond/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
  })

  it('active Voice v2 station does not poll legacy session status', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.doesNotMatch(station, /voice\/session\/status/)
    assert.doesNotMatch(hook, /voice\/session\/status/)
    assert.doesNotMatch(station, /isOrbRealtimeVoiceAvailable/)
    assert.match(hook, /fetchOrbVoiceV2Status/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /\/orb\/voice\/v2\/status/)
  })

  it('residential /orb skips legacy session status polling', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /if \(residentialSurface\) return/)
  })

  it('lifecycle trace events are safe QA instrumentation', () => {
    const trace = read('lib/orb/voice-v2/orb-voice-v2-lifecycle-trace.ts')
    assert.match(trace, /voice_v2_get_user_media_start/)
    assert.match(trace, /voice_v2_recorder_started/)
    assert.match(trace, /voice_v2_state_transition/)
  })
})
