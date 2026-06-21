import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  isOrbRealtimeStatusConfigured,
  normaliseOrbVoiceUiState,
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

const configuredOpenAi = {
  ok: true,
  realtime_enabled: true,
  provider: 'openai',
  model: 'gpt-realtime',
  reason: 'configured' as const
}

const configuredOpenAiRealtime = {
  ok: true,
  realtime_enabled: true,
  provider: 'openai_realtime',
  model: 'gpt-realtime',
  reason: 'configured' as const
}

const baseInput = {
  authStatus: 'authenticated' as const,
  statusProbe: 'done' as const,
  realtimeStatus: configuredOpenAi,
  startStage: 'idle' as const,
  sessionEnded: false,
  transportLive: false,
  realtimeState: 'idle',
  webrtcFailed: false
}

describe('ORB Voice UI state — ready before session', () => {
  it('authenticated + status configured + no session renders Start talking', () => {
    assert.equal(resolveOrbVoiceUiState(baseInput), 'ready')
    assert.equal(orbVoiceUiStatusLine('ready'), "Ready to talk")
    assert.equal(orbVoiceUiPrimaryLabel('ready'), 'Start conversation')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-ui-state=\{voice\.state\}/)
    assert.match(station, /orbVoiceV2PrimaryLabel/)
  })

  it('hasClientSecret false before start does not affect ready state resolver', () => {
    assert.equal(
      resolveOrbVoiceUiState({
        ...baseInput,
        transportLive: false,
        startStage: 'idle'
      }),
      'ready'
    )
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(station, /hasClientSecret/)
    assert.match(station, /primaryDisabled/)
    assert.match(station, /useOrbVoiceV2/)
  })

  it('provider openai is accepted as configured', () => {
    assert.equal(isOrbRealtimeStatusConfigured(configuredOpenAi), true)
    assert.equal(resolveOrbVoiceUiState({ ...baseInput, realtimeStatus: configuredOpenAi }), 'ready')
  })

  it('provider openai_realtime is accepted as configured', () => {
    assert.equal(isOrbRealtimeStatusConfigured(configuredOpenAiRealtime), true)
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, realtimeStatus: configuredOpenAiRealtime }),
      'ready'
    )
  })

  it('Start click requests realtime session and moves to preparing', () => {
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, startStage: 'starting', transportLive: false }),
      'preparing'
    )
    const hook = readComponent('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /setState\('requesting_microphone'\)/)
    assert.match(hook, /startConversation/)
    assert.match(readComponent('components/orb-standalone/orb-voice-station.tsx'), /voice\.startConversation/)
  })

  it('transportLive false before Start does not imply unavailable', () => {
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, transportLive: false, startStage: 'idle' }),
      'ready'
    )
    assert.notEqual(
      resolveOrbVoiceUiState({ ...baseInput, transportLive: false, startStage: 'idle' }),
      'unsupported'
    )
  })

  it('session/client secret is only required after Start (active without transport is reconnecting)', () => {
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, startStage: 'active', transportLive: false }),
      'reconnecting'
    )
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, startStage: 'active', transportLive: true, realtimeState: 'listening' }),
      'listening'
    )
  })
})

describe('ORB Voice UI state — auth and fallback', () => {
  it('unauthenticated still shows Sign in', () => {
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, authStatus: 'unauthenticated', statusProbe: 'done' }),
      'unauthenticated'
    )
    assert.equal(orbVoiceUiPrimaryLabel('unauthenticated'), 'Sign in')
  })

  it('unsupported still shows Try voice again / Type instead / Use Dictate', () => {
    assert.equal(
      resolveOrbVoiceUiState({
        ...baseInput,
        realtimeStatus: { ok: true, realtime_enabled: false, provider: null, reason: 'not_configured' }
      }),
      'unsupported'
    )
    assert.equal(orbVoiceUiPrimaryLabel('unsupported'), 'Try voice again')
    assert.equal(orbVoiceUiPrimaryLabel('provider_unavailable'), 'Try voice again')
    assert.match(readLib('orb/voice/orb-voice-ui-state.ts'), /Try voice again/)
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(actions, /Type instead/)
    assert.match(actions, /Turn speech into a record/)
    assert.match(actions, /isOrbVoiceFailureState/)
  })

  it('failed_connection when session attempt failed but status was configured', () => {
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, startStage: 'failed', webrtcFailed: true }),
      'failed_connection'
    )
    assert.equal(normaliseOrbVoiceUiState('webrtc_failed'), 'failed_connection')
  })
})
