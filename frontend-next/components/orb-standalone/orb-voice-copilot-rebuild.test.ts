import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  orbVoiceUiPrimaryLabel,
  orbVoiceUiStatusLine,
  resolveOrbVoiceUiState
} from '../../lib/orb/voice/orb-voice-ui-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readLib(relativePath: string) {
  return readFileSync(join(root, 'lib', relativePath), 'utf8')
}

describe('ORB Voice copilot rebuild — auth', () => {
  it('unauthenticated renders Sign in to use ORB Voice', () => {
    assert.equal(orbVoiceUiStatusLine('unauthenticated'), 'Sign in to use ORB Voice.')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /Sign in to use ORB Voice/)
    assert.match(station, /data-orb-voice-auth/)
    assert.match(station, /probeOrbVoiceAuth/)
  })

  it('unauthenticated does not render Live voice is unavailable right now', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.doesNotMatch(station, /Live voice is unavailable right now/)
    assert.doesNotMatch(mobile, /Live voice is unavailable right now/)
  })

  it('unauthenticated does not spam status calls', () => {
    const availability = readLib('orb/voice/orb-realtime-availability.ts')
    const auth = readLib('orb/voice/orb-voice-auth.ts')
    assert.match(availability, /voice_status_skipped_unauthenticated/)
    assert.match(auth, /voice_auth_check_unauthenticated/)
    assert.match(availability, /probeOrbVoiceAuth/)
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /auth === 'unauthenticated'/)
    assert.doesNotMatch(station, /setInterval/)
  })
})

describe('ORB Voice copilot rebuild — ready', () => {
  it('configured status renders Start voice', () => {
    assert.equal(orbVoiceUiPrimaryLabel('ready'), 'Start voice')
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(actions, /Start voice/)
  })

  it('ready state does not render Open Dictate as primary', () => {
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.doesNotMatch(actions, /Open Dictate/)
    assert.match(actions, /Turn speech into a record/)
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(station, /Open Dictate instead/)
    assert.doesNotMatch(station, /Open Dictate again/)
  })
})

describe('ORB Voice copilot rebuild — fallback', () => {
  it('WebRTC fail renders Try voice again, Type instead, Use Dictate', () => {
    assert.equal(orbVoiceUiPrimaryLabel('failed_connection'), 'Try voice again')
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(actions, /Try voice again/)
    assert.match(actions, /Type instead/)
    assert.match(actions, /Turn speech into a record/)
  })

  it('only one Dictate fallback control component', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.match(station, /OrbVoiceActions/)
    assert.match(mobile, /OrbVoiceActions/)
    const openDictateCount = (station.match(/Open Dictate/g) || []).length
    assert.equal(openDictateCount, 0)
  })

  it('no duplicate Type instead in mobile fallbacks', () => {
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const typeCount = (mobile.match(/data-orb-voice-type-instead/g) || []).length
    assert.ok(typeCount <= 2, 'post-session and actions may each expose one type-instead control')
  })
})

describe('ORB Voice copilot rebuild — conversation', () => {
  it('transport live renders End button', () => {
    assert.equal(orbVoiceUiPrimaryLabel('listening'), 'End')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voiceTransportLive/)
    assert.match(station, /data-orb-voice-transport-live/)
  })

  it('wires transcript callbacks from realtime session', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /onFinalTranscript: appendUserTurn/)
    assert.match(station, /onAssistantDone/)
    assert.match(station, /data-orb-voice-transcript/)
  })

  it('ended session shows Send transcript to Dictate', () => {
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(mobile, /Send transcript to Dictate/)
    assert.match(station, /Send transcript to Dictate/)
    assert.equal(
      resolveOrbVoiceUiState({
        authStatus: 'authenticated',
        statusProbe: 'done',
        realtimeStatus: { ok: true, realtime_enabled: true, provider: 'openai_realtime', reason: 'configured' },
        startStage: 'idle',
        sessionEnded: true,
        transportLive: false,
        realtimeState: 'idle',
        webrtcFailed: false
      }),
      'ended'
    )
  })
})

describe('ORB Voice copilot rebuild — diagnostics', () => {
  it('ORB_VOICE_DIAG includes authStatus, transportLive and lastError', () => {
    const diag = readLib('orb/voice/orb-voice-diag.ts')
    assert.match(diag, /authStatus/)
    assert.match(diag, /transportLive/)
    assert.match(diag, /lastError/)
    assert.match(diag, /statusHttpStatus/)
    assert.match(diag, /audioElementReady/)
    assert.match(diag, /lastRawEventTypes/)
    assert.match(diag, /responseCreateSent/)
    assert.match(diag, /sessionUpdateSent/)
    assert.match(diag, /audioPlaySucceeded/)
    assert.match(diag, /localMicTrackMuted/)
  })

  it('flight recorder auth and transport events exist', () => {
    const auth = readLib('orb/voice/orb-voice-auth.ts')
    const availability = readLib('orb/voice/orb-realtime-availability.ts')
    for (const event of [
      'voice_auth_check_requested',
      'voice_auth_check_authenticated',
      'voice_start_clicked',
      'voice_session_requested',
      'voice_session_received',
      'voice_transport_live',
      'voice_session_ended'
    ]) {
      assert.match(`${auth}\n${availability}`, new RegExp(event))
    }
  })

  it('non-debug UI does not expose env vars', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.doesNotMatch(station, /OPENAI_API_KEY/)
    assert.doesNotMatch(actions, /ORB_REALTIME_ENABLED/)
  })
})

describe('ORB Voice copilot rebuild — UI state machine', () => {
  it('checking state while auth unknown', () => {
    assert.equal(
      resolveOrbVoiceUiState({
        authStatus: 'unknown',
        statusProbe: 'loading',
        realtimeStatus: null,
        startStage: 'idle',
        sessionEnded: false,
        transportLive: false,
        realtimeState: 'idle',
        webrtcFailed: false
      }),
      'checking'
    )
  })

  it('unsupported when not configured', () => {
    assert.equal(
      resolveOrbVoiceUiState({
        authStatus: 'authenticated',
        statusProbe: 'done',
        realtimeStatus: { ok: true, realtime_enabled: false, provider: null, reason: 'not_configured' },
        startStage: 'idle',
        sessionEnded: false,
        transportLive: false,
        realtimeState: 'idle',
        webrtcFailed: false
      }),
      'unsupported'
    )
  })

  it('ready with provider openai before any realtime session', () => {
    assert.equal(
      resolveOrbVoiceUiState({
        authStatus: 'authenticated',
        statusProbe: 'done',
        realtimeStatus: {
          ok: true,
          realtime_enabled: true,
          provider: 'openai',
          model: 'gpt-realtime',
          reason: 'configured'
        },
        startStage: 'idle',
        sessionEnded: false,
        transportLive: false,
        realtimeState: 'idle',
        webrtcFailed: false
      }),
      'ready'
    )
  })
})
