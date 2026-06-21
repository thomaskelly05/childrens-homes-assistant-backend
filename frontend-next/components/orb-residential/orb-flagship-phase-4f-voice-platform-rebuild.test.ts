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
import { ORB_VOICE_SESSION_AUDIT } from '../../lib/orb/voice/orb-voice-session-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4F Voice platform rebuild', () => {
  it('build version marker is phase-4g-voice-runtime-wiring-repair', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4g-voice-runtime-wiring-repair')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-4g-voice-runtime-wiring-repair/)
  })

  it('there is one primary Voice station path', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbVoiceStation/)
    assert.equal(ORB_VOICE_SESSION_AUDIT.station, 'components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(companion, /OrbVoiceStationDuplicate|orb-voice-station-2/i)
  })

  it('continuous conversation is default and push-to-talk is optional only', () => {
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.pushToTalk, false)
    assert.equal(ORB_VOICE_FREE_FLOW_DEFAULTS.continuousConversation, true)
    assert.match(hook, /autoListenAfterReply: true/)
    assert.match(hook, /autoSubmitOnPause: true/)
  })

  it('primary button says Start conversation and listening does not show Stop and send', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(ORB_VOICE_START_CONVERSATION, 'Start conversation')
    assert.match(station, /orbVoiceSessionPrimaryLabel/)
    assert.match(station, /sessionPrimaryLabel/)
    assert.match(station, /createOrbVoiceCaptureController/)
    assert.match(station, /resumeListeningAfterTurn/)
  })

  it('end-of-turn auto-submits transcript and blocks empty transcript', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(END_OF_TURN_DEBOUNCE_MS, 1_400)
    assert.match(station, /handleFinalTranscript/)
    assert.match(station, /commitVoiceTranscriptOrBlock/)
  })

  it('voice uses lightweight respond route instead of deep standalone stream', () => {
    const transport = read('hooks/use-orb-conversation.ts')
    const client = read('lib/orb/voice/orb-voice-respond-client.ts')
    const service = read('../services/orb_voice_respond_service.py')
    const route = read('../routers/orb_voice_residential_routes.py')
    assert.match(transport, /requestOrbVoiceRespond/)
    assert.match(transport, /sessionTurns/)
    assert.match(client, /\/orb\/voice\/respond/)
    assert.match(service, /prompt_tier=voice_fast/)
    assert.match(service, /embeddings=0/)
    assert.match(route, /\/respond/)
    assert.match(route, /sessionTurns/)
  })

  it('TTS prefers ElevenLabs Katherine with provider metadata', () => {
    const tts = read('../services/orb_voice_tts_service.py')
    const ttsRoute = read('../routers/orb_voice_tts_routes.py')
    const client = read('lib/orb/voice/orb-voice-client.ts')
    assert.match(tts, /elevenlabs/)
    assert.match(ttsRoute, /X-ORB-Voice-Name/)
    assert.match(client, /X-ORB-TTS-Provider/)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /spokenTurnGuardRef/)
  })

  it('companion avoids duplicate voice TTS when station owns speech', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(companion, /!voiceOriginatedSend/)
    assert.match(station, /createOrbVoiceSpokenTurnGuard/)
    assert.match(station, /speakAloud/)
  })

  it('CSP allows blob audio playback and session status fails quietly', () => {
    const middleware = read('middleware.ts')
    const availability = read('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(middleware, /media-src 'self' blob: data: https:/)
    assert.match(availability, /VOICE_STATUS_CACHE_MS/)
    assert.match(availability, /cachedVoiceStatus/)
  })

  it('audio-not-stored copy and single shell remain true', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_AUDIO_NOT_STORED/)
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })

  it('typed fallback uses same conversation loop and summary handoff is honest', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /buildOrbVoiceRespondPayload/)
    assert.match(station, /buildOrbVoiceHandoffWithTts/)
    assert.match(station, /handleTypeInSend/)
  })
})
