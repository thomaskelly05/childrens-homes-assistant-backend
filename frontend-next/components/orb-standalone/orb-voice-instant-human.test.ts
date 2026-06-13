import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildOrbVoiceAfterCallContent,
  orbVoiceNeedsEscalationPrompt,
  orbVoiceNeedsManagementOversight
} from '../../lib/orb/voice/orb-voice-after-call.ts'
import {
  isOrbRealtimeStatusConfigured,
  normaliseOrbVoiceUiState,
  orbVoiceUiDetailLine,
  orbVoiceUiPrimaryLabel,
  orbVoiceUiStatusLine,
  resolveOrbVoiceUiState
} from '../../lib/orb/voice/orb-voice-ui-state.ts'
import { orbVoiceLivePanelStatusLabel } from '../orb-standalone/orb-voice-live-panel.tsx'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const configuredOpenAi = {
  ok: true,
  realtime_enabled: true,
  provider: 'openai',
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

describe('ORB Voice instant-human refinement', () => {
  it('idle → preparing → listening state copy', () => {
    assert.equal(orbVoiceUiStatusLine('ready'), "I'm ready when you are.")
    assert.equal(orbVoiceUiStatusLine('preparing'), 'Preparing voice…')
    assert.equal(orbVoiceUiStatusLine('listening'), "I'm listening.")
    assert.equal(resolveOrbVoiceUiState({ ...baseInput, startStage: 'starting' }), 'preparing')
    assert.equal(
      resolveOrbVoiceUiState({
        ...baseInput,
        startStage: 'active',
        transportLive: true,
        realtimeState: 'listening'
      }),
      'listening'
    )
    assert.equal(
      resolveOrbVoiceUiState({
        ...baseInput,
        startStage: 'active',
        transportLive: true,
        realtimeState: 'speech_detected'
      }),
      'user_speaking'
    )
    assert.equal(orbVoiceUiStatusLine('user_speaking'), 'I heard that.')
    assert.equal(orbVoiceUiStatusLine('thinking'), 'Give me a moment.')
    assert.equal(orbVoiceUiStatusLine('speaking'), 'ORB is responding.')
  })

  it('permission denied and connection failed copy', () => {
    assert.equal(orbVoiceUiStatusLine('failed_permission'), 'Microphone access is needed.')
    assert.equal(
      orbVoiceUiDetailLine('failed_permission'),
      'You can still type or use Dictate.'
    )
    assert.equal(orbVoiceUiStatusLine('failed_connection'), 'Voice could not connect.')
    assert.equal(
      orbVoiceUiDetailLine('failed_connection'),
      'You can try again, type instead, or use Dictate.'
    )
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, startStage: 'failed', permissionDenied: true }),
      'failed_permission'
    )
    assert.equal(
      resolveOrbVoiceUiState({ ...baseInput, startStage: 'failed', webrtcFailed: true }),
      'failed_connection'
    )
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /Microphone access is needed to use Voice/)
    assert.match(hook, /Voice may not be supported in this browser/)
  })

  it('unsupported browser copy', () => {
    assert.equal(orbVoiceUiStatusLine('unsupported'), 'Voice is not available in this browser.')
    assert.equal(
      resolveOrbVoiceUiState({
        ...baseInput,
        realtimeStatus: { ok: true, realtime_enabled: false, provider: null, reason: 'not_configured' }
      }),
      'unsupported'
    )
    assert.equal(normaliseOrbVoiceUiState('provider_unavailable'), 'unsupported')
    assert.equal(normaliseOrbVoiceUiState('webrtc_failed'), 'failed_connection')
  })

  it('live transcript empty state and pause hint', () => {
    const live = read('components/orb-standalone/orb-voice-live-panel.tsx')
    assert.match(live, /Start speaking when you/)
    assert.match(live, /data-orb-voice-pause-hint/)
    assert.match(live, /You can keep going, or end the session when ready/)
    assert.equal(orbVoiceLivePanelStatusLabel('listening'), "I'm listening.")
    assert.equal(orbVoiceLivePanelStatusLabel('preparing'), 'Preparing voice…')
  })

  it('after-call actions and safeguarding prompts', () => {
    const after = read('components/orb-standalone/orb-voice-after-call-panel.tsx')
    assert.match(after, /Voice session captured/)
    assert.match(after, /Continue talking/)
    assert.match(after, /Turn speech into a record/)
    assert.match(after, /Send to ORB Write/)
    assert.match(after, /Copy transcript/)
    assert.match(after, /New voice session/)
    assert.match(after, /data-orb-voice-management-oversight/)
    assert.ok(orbVoiceNeedsManagementOversight('There was a restraint during the incident'))
    assert.ok(orbVoiceNeedsEscalationPrompt('There is immediate risk and a disclosure'))
    assert.match(after, /Adult review required/)
  })

  it('turn speech into record uses shared template selector and preserves transcript', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const after = read('components/orb-standalone/orb-voice-after-call-panel.tsx')
    assert.match(station, /handleCreateDraftFromVoice/)
    assert.match(station, /onOpenDictate\(transcript/)
    assert.match(after, /OrbDictateTemplateSelector/)
    assert.match(after, /data-orb-voice-create-draft-record/)
    assert.doesNotMatch(station, /orb-voice-mobile-experience/)
  })

  it('optimistic preparing on start and double-tap guard', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /start_in_flight/)
    assert.match(station, /setBrowserStartStage\('starting'\)/)
    assert.match(station, /setVoiceStartStage\('starting'\)/)
    assert.match(station, /Preparing voice…/)
  })

  it('mobile safe-area dock and no duplicate voice shell', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(content, /env\(safe-area-inset-bottom\)/)
    assert.match(mobileCss, /\[data-orb-voice-workspace-mode='live'\]/)
    assert.match(mobileCss, /\[data-orb-voice-after-call\]/)
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /OrbVoiceStationContent/)
    assert.doesNotMatch(station, /OrbVoiceMobileExperience/)
  })

  it('after-call summary does not invent details', () => {
    const empty = buildOrbVoiceAfterCallContent([])
    assert.equal(empty.summary, null)
    assert.equal(empty.hasTranscript, false)
    assert.equal(empty.recordingHints.length, 0)
  })

  it('primary labels remain human on failure and live session', () => {
    assert.equal(orbVoiceUiPrimaryLabel('ready'), 'Start voice')
    assert.equal(orbVoiceUiPrimaryLabel('preparing'), 'Cancel')
    assert.equal(orbVoiceUiPrimaryLabel('listening'), 'End')
    assert.equal(orbVoiceUiPrimaryLabel('unsupported'), 'Try voice again')
  })
})
