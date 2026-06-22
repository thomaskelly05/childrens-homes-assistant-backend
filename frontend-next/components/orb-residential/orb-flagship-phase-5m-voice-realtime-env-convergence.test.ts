import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5M Voice realtime env convergence', () => {
  it('build marker is phase-5n1-voice-full-viewport-canvas', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5n1-voice-full-viewport-canvas')
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('canonical backend config service and status route exist', () => {
    assert.match(read('../services/orb_voice_realtime_config_service.py'), /resolve_orb_voice_realtime_config/)
    assert.match(read('../services/orb_voice_realtime_beta_service.py'), /public_realtime_status_payload/)
    assert.match(read('../routers/orb_voice_residential_routes.py'), /\/realtime\/status/)
  })

  it('active hook routes webrtc hybrid and fallback without legacy UI', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /startOrbVoiceV2RealtimeWebRtcCapture/)
    assert.match(hook, /startOrbVoiceV2HybridCapture/)
    assert.match(hook, /startOrbVoiceV2Capture/)
    assert.match(hook, /resolveOrbVoiceRealtimeMode/)
    assert.match(hook, /handleWakePhrase/)
    assert.match(station, /useOrbVoiceV2/)
    assert.match(station, /data-orb-voice-realtime-setup-label/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
    assert.doesNotMatch(hook, /\/orb\/voice\/session\/status/)
  })

  it('reuses existing WebRTC client without mounting legacy station', () => {
    const webrtc = read('lib/orb/voice-v2/orb-voice-v2-realtime-webrtc-capture.ts')
    assert.match(webrtc, /OrbOpenAIRealtimeWebRTCClient/)
    assert.match(webrtc, /startOrbRealtimeVoiceSession/)
    assert.match(webrtc, /transcriptionOnly: true/)
    assert.doesNotMatch(webrtc, /OrbRealtimeVoiceClient/)
  })

  it('v2 routes Katherine and specialist brain remain', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(hook, /requestOrbVoiceV2Speak/)
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_specialist/)
  })

  it('no compliance guarantee language in voice copy', () => {
    assert.doesNotMatch(read('lib/orb/voice-v2/orb-voice-v2-copy.ts'), /compliance guarantee|ofsted approved/i)
  })
})
