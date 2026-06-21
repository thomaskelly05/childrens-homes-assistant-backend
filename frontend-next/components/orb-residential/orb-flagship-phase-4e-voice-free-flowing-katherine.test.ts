import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { orbVoiceV2PrimaryLabel } from '../../lib/orb/voice-v2/orb-voice-v2-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4E Voice free-flowing Katherine', () => {
  it('build version marker is phase-5e-render-build-memory-fix', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5e-render-build-memory-fix')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice v2 uses continuous conversation without push-to-send', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /resumeListening/)
    assert.doesNotMatch(read('components/orb-standalone/orb-voice-station.tsx'), /Stop and send/)
  })

  it('primary button says Start conversation and listening does not require send', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(orbVoiceV2PrimaryLabel('idle'), 'Start conversation')
    assert.match(station, /orbVoiceV2PrimaryLabel/)
    assert.match(station, /data-orb-voice-start-conversation/)
  })

  it('end-of-turn debounce auto-submits and blocks empty transcript', () => {
    const capture = read('lib/orb/voice-v2/orb-voice-v2-capture.ts')
    assert.match(capture, /SILENCE_MS = 1400/)
    assert.match(capture, /blob\.size < 256/)
  })

  it('voice uses lightweight v2 respond route instead of deep standalone stream', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const service = read('../services/orb_voice_v2_service.py')
    const route = read('../routers/orb_voice_v2_routes.py')
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(service, /voice_fast/)
    assert.match(route, /\/respond/)
  })

  it('TTS prefers ElevenLabs Katherine with provider metadata', () => {
    const tts = read('../services/orb_voice_tts_service.py')
    const route = read('../routers/orb_voice_v2_routes.py')
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(tts, /elevenlabs/)
    assert.match(route, /X-ORB-Voice-Name/)
    assert.match(client, /X-ORB-TTS-Provider/)
  })

  it('companion avoids duplicate voice TTS when station owns speech', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(companion, /!voiceOriginatedSend/)
    assert.match(hook, /spokenTurnKeysRef/)
    assert.match(hook, /requestOrbVoiceV2Speak/)
  })

  it('CSP allows blob audio playback', () => {
    const middleware = read('middleware.ts')
    assert.match(middleware, /media-src 'self' blob: data: https:/)
  })

  it('session status fetch fails quietly in v2 client', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /fetchOrbVoiceV2Status/)
    assert.match(client, /catch \{/)
  })

  it('audio-not-stored copy and single shell remain true', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_SAFETY_FOOTER/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5e-render-build-memory-fix/)
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })
})
