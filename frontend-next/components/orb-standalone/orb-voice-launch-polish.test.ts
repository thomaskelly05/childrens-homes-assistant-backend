import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_BOUNDARY_COPY,
  ORB_VOICE_PANEL_MOBILE_SUBTITLE,
  ORB_VOICE_PANEL_SUBTITLE,
  ORB_VOICE_PANEL_TITLE,
  orbVoiceLaunchStatusLabel,
  resolveOrbVoiceLaunchMode,
  resolveOrbVoiceLaunchUiState,
  shouldSuppressOrbAutoReadAloud
} from '../../lib/orb/voice/orb-voice-launch-mode.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice launch polish', () => {
  it('panel title and subtitle', () => {
    assert.equal(ORB_VOICE_PANEL_TITLE, 'Voice')
    assert.equal(ORB_VOICE_PANEL_SUBTITLE, 'Talk it through with ORB before you write.')
    assert.equal(ORB_VOICE_PANEL_MOBILE_SUBTITLE, 'Talk it through with ORB before you write.')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_PANEL_TITLE/)
    assert.match(station, /ORB_VOICE_PANEL_SUBTITLE/)
    assert.match(station, /ORB_VOICE_PANEL_MOBILE_SUBTITLE/)
  })

  it('launch state labels render', () => {
    assert.equal(orbVoiceLaunchStatusLabel('listening'), 'Listening')
    assert.equal(orbVoiceLaunchStatusLabel('transcribing'), 'Transcribing')
    assert.equal(orbVoiceLaunchStatusLabel('unavailable'), 'Unavailable')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /statusLine/)
    assert.match(station, /data-orb-voice-ui-state=\{voice\.state\}/)
  })

  it('composer voice button exists with unavailable aria', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-voice/)
    assert.match(composer, /aria-label/)
    assert.match(composer, /data-orb-composer-voice-unavailable/)
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /voicePanelUnavailable/)
  })

  it('transcript can route to ORB chat, Dictate, copy and save', () => {
    const controls = readComponent('components/orb-standalone/orb-voice-launch-controls.tsx')
    const actions = readComponent('components/orb-standalone/orb-voice-transcript-actions.tsx')
    assert.match(controls, /OrbVoiceTranscriptActions/)
    assert.match(actions, /data-orb-voice-send-to-orb/)
    assert.match(actions, /data-orb-voice-to-dictate/)
    assert.match(actions, /Send to ORB chat/)
    assert.match(actions, /Send to Dictate/)
    assert.match(actions, /Save to ORB/)
  })

  it('browser launch mode when realtime not configured or launch gate off', () => {
    assert.equal(
      resolveOrbVoiceLaunchMode({
        realtimeStatus: { ok: true, realtime_enabled: false, provider: null, reason: 'not_configured' },
        recognitionAvailable: true,
        synthesisAvailable: false,
        liveVoiceAllowed: true
      }),
      'browser_ptt'
    )
    assert.equal(
      resolveOrbVoiceLaunchMode({
        realtimeStatus: {
          ok: true,
          realtime_enabled: true,
          provider: 'openai',
          reason: 'configured'
        },
        recognitionAvailable: true,
        synthesisAvailable: true,
        liveVoiceAllowed: true
      }),
      'browser_ptt'
    )
  })

  it('standalone boundary copy is shown', () => {
    assert.ok(ORB_VOICE_BOUNDARY_COPY.some((line) => line.includes('emergencies')))
    assert.ok(ORB_VOICE_BOUNDARY_COPY.some((line) => line.includes('live care records')))
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(readComponent('components/orb-standalone/orb-voice-live-rail.tsx'), /ORB_VOICE_V2_SAFETY_FOOTER/)
  })

  it('safeguarding suppresses auto read-aloud', () => {
    assert.equal(shouldSuppressOrbAutoReadAloud('Safeguarding Thinking', false), true)
    assert.equal(shouldSuppressOrbAutoReadAloud('Ask ORB', false), false)
    assert.equal(shouldSuppressOrbAutoReadAloud('Ask ORB', true), true)
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /Safeguarding Thinking/)
    assert.match(companion, /showUrgentSafeguardingBanner/)
  })

  it('unsupported browser launch state', () => {
    assert.equal(
      resolveOrbVoiceLaunchUiState({
        launchMode: 'unavailable',
        captureState: 'idle',
        phase: 'idle',
        listening: false,
        speaking: false
      }),
      'unavailable'
    )
    const readiness = readComponent('lib/orb/voice/orb-voice-readiness.ts')
    assert.match(readiness, /browser_unsupported/)
  })

  it('thinking state while ORB pending', () => {
    assert.equal(
      resolveOrbVoiceLaunchUiState({
        launchMode: 'browser_ptt',
        captureState: 'ready',
        phase: 'idle',
        listening: false,
        speaking: false,
        pending: true
      }),
      'thinking'
    )
  })

  it('mobile and desktop layout hooks remain', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /OrbVoiceStationContent/)
    const content = readComponent('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(content, /data-orb-voice-station-content/)
    const mobile = readComponent('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(mobile, /data-orb-voice-mobile/)
  })
})
