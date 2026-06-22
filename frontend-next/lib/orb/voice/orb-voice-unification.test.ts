import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_WEBRTC_FAILED_HEADLINE,
  sanitizeOrbVoiceUserMessage
} from './orb-voice-user-messages.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice unification', () => {
  it('status probe emits voice_status_requested and voice_status_received', () => {
    const availability = readComponent('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /voice_status_requested/)
    assert.match(availability, /voice_status_received/)
    assert.match(availability, /configured: status\.reason === 'configured'/)
    assert.match(availability, /voice_status_skipped_unauthenticated/)
  })

  it('realtime session emits voice_session_received with secret and model', () => {
    const availability = readComponent('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /voice_session_requested/)
    assert.match(availability, /voice_session_received/)
    assert.match(availability, /hasClientSecret/)
  })

  it('network client emits WebRTC flight recorder events in order', () => {
    const network = readComponent('lib/orb/network/index.ts')
    for (const event of [
      'voice_peer_created',
      'voice_peer_connected',
      'voice_sdp_offer_created',
      'voice_sdp_post_started',
      'voice_sdp_post_failed',
      'voice_sdp_answer_received',
      'voice_remote_description_set',
      'voice_data_channel_open',
      'voice_remote_track_received',
      'voice_audio_play_attempt',
      'voice_session_live',
      'voice_transport_live'
    ]) {
      assert.match(network, new RegExp(event))
    }
    assert.doesNotMatch(network, /OpenAI-Beta/)
  })

  it('registers active realtime client so session survives begin()', () => {
    const registry = readComponent('lib/orb/voice/orb-voice-session-registry.ts')
    const availability = readComponent('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(registry, /registerActiveOrbRealtimeVoiceClient/)
    assert.match(availability, /registerActiveOrbRealtimeVoiceClient/)
    assert.match(availability, /clearActiveOrbRealtimeVoiceClient/)
  })

  it('exposes ORB_VOICE_DIAG global helper', () => {
    const diag = readComponent('lib/orb/voice/orb-voice-diag.ts')
    assert.match(diag, /ORB_VOICE_DIAG/)
    assert.match(diag, /peerConnectionState/)
    assert.match(diag, /lastSdpEndpoint/)
    assert.match(diag, /authStatus/)
    assert.match(diag, /transportLive/)
    assert.match(diag, /lastError/)
  })

  it('configured status does not render configure realtime copy in station', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(station, /Configure realtime voice/i)
    assert.match(station, /useOrbVoiceV2/)
    assert.match(station, /orbVoiceV2PrimaryActionLabel/)
  })

  it('session 200 but WebRTC fail shows Dictate-ready headline', () => {
    assert.equal(
      sanitizeOrbVoiceUserMessage('Realtime audio could not connect just now.', {
        debug: false,
        dictateRealtimeReady: true
      }),
      ORB_VOICE_WEBRTC_FAILED_HEADLINE
    )
    const availability = readComponent('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /Live voice could not connect\. Dictate is ready\./)
  })

  it('voice live requires capture loop not only status probe', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const hook = readComponent('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /startOrbVoiceV2Capture/)
    assert.match(station, /data-orb-voice-ui-state=\{voice\.state\}/)
    assert.match(hook, /resumeListening/)
  })

  it('no env vars in normal voice UI sources', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.doesNotMatch(station, /OPENAI_API_KEY/)
    assert.doesNotMatch(mobile, /ORB_REALTIME_ENABLED/)
  })
})

describe('ORB shell markers', () => {
  it('care companion exposes companion root and composer markers', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-companion-root/)
    assert.doesNotMatch(companion, /data-orb-shell="true"/)
    assert.match(companion, /data-orb-composer-mounted/)
    assert.match(companion, /data-orb-appearance=/)
  })

  it('panel shell uses shared app panel marker', () => {
    const shell = readComponent('components/orb-standalone/orb-standalone-panel-shell.tsx')
    assert.match(shell, /OrbAppPanelShell/)
    const panel = readComponent('components/orb-standalone/orb-app-panel-shell.tsx')
    assert.match(panel, /data-orb-app-panel-shell/)
  })
})
