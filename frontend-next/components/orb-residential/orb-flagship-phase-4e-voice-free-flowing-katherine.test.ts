import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  END_OF_TURN_DEBOUNCE_MS,
  ORB_VOICE_FREE_FLOW_DEFAULTS,
  ORB_VOICE_START_CONVERSATION
} from '../../lib/orb/voice/orb-voice-free-flowing-conversation.ts'
import { ORB_VOICE_AUDIO_NOT_STORED } from '../../lib/orb/voice/orb-voice-reflective-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4E Voice free-flowing Katherine', () => {
  it('build version marker is phase-4g-voice-runtime-wiring-repair', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4g-voice-runtime-wiring-repair')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('default mode is continuous conversation, not push-to-talk', () => {
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.pushToTalk, false)
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.continuousConversation, true)
    assert.match(hook, /autoListenAfterReply: true/)
    assert.match(hook, /autoSubmitOnPause: true/)
  })

  it('primary button says Start conversation and listening does not require send', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const launch = read('lib/orb/voice/orb-voice-launch-mode.ts')
    assert.equal(ORB_VOICE_START_CONVERSATION, 'Start conversation')
    assert.match(launch, /ORB_VOICE_BUTTON_LISTENING/)
    assert.match(station, /isOrbVoiceFreeFlowMode/)
    assert.match(station, /resumeListeningAfterTurn/)
  })

  it('end-of-turn debounce auto-submits and blocks empty transcript', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(END_OF_TURN_DEBOUNCE_MS, 1_400)
    assert.match(station, /scheduleAutoSubmit/)
    assert.match(station, /commitVoiceTranscriptOrBlock/)
  })

  it('voice uses lightweight respond route instead of deep standalone stream', () => {
    const transport = read('hooks/use-orb-conversation.ts')
    const client = read('lib/orb/voice/orb-voice-respond-client.ts')
    const service = read('../services/orb_voice_respond_service.py')
    const route = read('../routers/orb_voice_residential_routes.py')
    assert.match(transport, /requestOrbVoiceRespond/)
    assert.match(client, /\/orb\/voice\/respond/)
    assert.match(service, /prompt_tier=voice_fast/)
    assert.match(service, /embeddings=0/)
    assert.match(route, /\/respond/)
  })

  it('TTS prefers ElevenLabs Katherine with provider metadata', () => {
    const tts = read('../services/orb_voice_tts_service.py')
    const ttsRoute = read('../routers/orb_voice_tts_routes.py')
    const client = read('lib/orb/voice/orb-voice-client.ts')
    assert.match(tts, /_resolve_primary_tts_provider/)
    assert.match(tts, /elevenlabs/)
    assert.match(tts, /voice_name/)
    assert.match(ttsRoute, /X-ORB-Voice-Name/)
    assert.match(client, /X-ORB-TTS-Provider/)
  })

  it('companion avoids duplicate voice TTS when station owns speech', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(companion, /!voiceOriginatedSend/)
    assert.match(station, /lastAutoSpokenKeyRef/)
    assert.match(station, /speakAloud/)
  })

  it('CSP allows blob audio playback', () => {
    const middleware = read('middleware.ts')
    assert.match(middleware, /media-src 'self' blob: data: https:/)
  })

  it('session status fetch is cached and fails quietly', () => {
    const availability = read('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /VOICE_STATUS_CACHE_MS/)
    assert.match(availability, /cachedVoiceStatus/)
  })

  it('audio-not-stored copy and single shell remain true', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_AUDIO_NOT_STORED/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-4g-voice-runtime-wiring-repair/)
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })
})
