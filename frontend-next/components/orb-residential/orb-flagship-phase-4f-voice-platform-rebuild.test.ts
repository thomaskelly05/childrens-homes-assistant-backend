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

describe('ORB Residential Phase 4F Voice platform rebuild', () => {
  it('build version marker is phase-5h-voice-v2-specialist-brain', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5h-voice-v2-specialist-brain')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5h-voice-v2-specialist-brain/)
  })

  it('there is one primary Voice station path', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbVoiceStation/)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /useOrbVoiceV2/)
    assert.doesNotMatch(companion, /OrbVoiceStationDuplicate|orb-voice-station-2/i)
  })

  it('continuous conversation is default in voice v2 hook', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /resumeListening/)
    assert.match(hook, /audio\.onended/)
    assert.doesNotMatch(read('components/orb-standalone/orb-voice-station.tsx'), /Stop and send/)
  })

  it('primary button says Start conversation and listening does not show Stop and send', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(orbVoiceV2PrimaryLabel('idle'), 'Start conversation')
    assert.match(station, /orbVoiceV2PrimaryLabel/)
    assert.match(station, /startOrbVoiceV2Capture|use-orb-voice-v2/)
  })

  it('end-of-turn auto-submits transcript via v2 capture', () => {
    const capture = read('lib/orb/voice-v2/orb-voice-v2-capture.ts')
    const guard = read('lib/orb/voice-v2/orb-voice-v2-turn-guard.ts')
    assert.match(capture, /END_OF_TURN_DEBOUNCE_MS/)
    assert.match(guard, /END_OF_TURN_DEBOUNCE_MS = 1000/)
    assert.match(capture, /onEndOfTurn/)
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
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /spokenTurnKeysRef/)
  })

  it('companion avoids duplicate voice TTS when station owns speech', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(companion, /!voiceOriginatedSend/)
    assert.match(station, /useOrbVoiceV2/)
    assert.match(station, /stopOrbAudio/)
  })

  it('CSP allows blob audio playback and session status fails quietly', () => {
    const middleware = read('middleware.ts')
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(middleware, /media-src 'self' blob: data: https:/)
    assert.match(client, /catch \{[\s\S]*katherineReady: false/)
  })

  it('audio-not-stored copy and single shell remain true', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_SAFETY_FOOTER/)
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })

  it('typed fallback uses same conversation loop and summary handoff is honest', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /sendTypedTurn/)
    assert.match(hook, /buildOrbVoiceV2Handoff/)
    assert.match(hook, /commitAdultTurn/)
  })
})
