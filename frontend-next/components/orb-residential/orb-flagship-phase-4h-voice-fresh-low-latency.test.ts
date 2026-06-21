import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { ORB_VOICE_START_CONVERSATION } from '../../lib/orb/voice/orb-voice-free-flowing-conversation.ts'
import {
  ORB_VOICE_LIVE_SPOKEN_CAP,
  resolveOrbVoiceSpokenText
} from '../../lib/orb/voice/orb-voice-low-latency.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4H Voice fresh sessions and low latency', () => {
  it('build version marker is phase-4h-voice-fresh-low-latency', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4h-voice-fresh-low-latency')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-4h-voice-fresh-low-latency/)
  })

  it('/orb opens Home by default without persisting station param', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /shouldOpenOrbResidentialLandingFresh/)
    assert.match(companion, /createStandaloneChat[\s\S]*temporary: true[\s\S]*title: 'ORB'/)
    assert.match(companion, /stripOrbResidentialStationParam/)
    assert.match(companion, /setActivePanel\(null\)/)
  })

  it('deep link /orb/voice and ?station=voice still open Voice', () => {
    assert.match(read('app/orb/voice/page.tsx'), /station=voice/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /stationParam === 'voice'/)
    assert.match(companion, /'orb_voice'/)
  })

  it('Voice mount resets live session and blocks startup TTS', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /resetOrbVoiceLiveSession/)
    assert.match(station, /prevVoiceOpenRef/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /voiceSessionChatId/)
    assert.match(companion, /if \(lastUserIdx < 0\) return null/)
  })

  it('Katherine readiness and forced OpenAI fallback copy are honest', () => {
    const panel = read('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /katherineReady/)
    assert.match(panel, /Katherine unavailable — OpenAI fallback is active/)
    const availability = read('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /katherineReady/)
    assert.match(availability, /ttsProviderEffective/)
    assert.match(availability, /fallbackReason/)
  })

  it('text-first TTS: visible reply before audio and spoken cap', () => {
    const voiceHook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(voiceHook, /voicePreparing/)
    assert.match(voiceHook, /ORB_VOICE_LIVE_SPOKEN_CAP/)
    assert.match(voiceHook, /context: options\?\.source === 'orb_turn' \? 'live_voice'/)
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_TTS_PREPARING/)
    assert.match(station, /ORB_VOICE_CONTINUE_WITHOUT_VOICE/)
    const long = 'A'.repeat(400)
    const spoken = resolveOrbVoiceSpokenText({ visibleReply: long, promptTier: 'voice_fast' })
    assert.ok(spoken.spokenText.length <= ORB_VOICE_LIVE_SPOKEN_CAP)
    assert.equal(spoken.spokenCapApplied, true)
  })

  it('resetOrbVoiceLiveSession is wired through the voice station', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /resetOrbVoiceLiveSession/)
    assert.match(read('lib/orb/voice/orb-voice-fresh-session.ts'), /export function resetOrbVoiceLiveSession/)
  })

  it('single shell and start conversation label remain', () => {
    assert.equal(ORB_VOICE_START_CONVERSATION, 'Start conversation')
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /OrbVoiceStationContent/)
    assert.doesNotMatch(read('components/orb-standalone/orb-care-companion.tsx'), /compliance guarantee/i)
  })

  it('residential landing helper strips station param from URL', () => {
    const helper = read('lib/orb/orb-residential-home-default.ts')
    assert.match(helper, /stripOrbResidentialStationParam/)
    assert.match(helper, /shouldOpenOrbResidentialLandingFresh/)
  })
})
