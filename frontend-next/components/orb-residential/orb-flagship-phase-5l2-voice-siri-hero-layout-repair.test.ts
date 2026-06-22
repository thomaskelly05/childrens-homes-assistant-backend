import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { ORB_VOICE_V2_IDLE_PROMPT } from '../../lib/orb/voice-v2/orb-voice-v2-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5L.2 Voice Siri hero layout repair', () => {
  it('build marker is phase-5l2-voice-siri-hero-layout-repair', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5l2-voice-siri-hero-layout-repair')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5l2-voice-siri-hero-layout-repair/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('idle hero renders large wave without setup carousels in hero body', () => {
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hero, /OrbVoiceShowstopperWave/)
    assert.match(hero, /oneScreenWorkspace \? \(\s*wave/)
    assert.doesNotMatch(station, /preferenceControls/)
    assert.doesNotMatch(station, /voiceSettingsOpen/)
    assert.doesNotMatch(station, /\{preferenceControls\}/)
  })

  it('Voice setup trigger exists once and opens rail setup tab', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    assert.match(station, /data-orb-voice-setup-trigger/)
    assert.match(station, /openVoiceSetup/)
    assert.match(station, /setRailTab\('setup'\)/)
    assert.match(rail, /label: 'Voice setup'/)
    assert.match(rail, /data-orb-voice-setup-rail/)
  })

  it('purpose voice personality controls live only in rail setup panel', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    assert.match(station, /setupPanel/)
    assert.match(station, /data-orb-voice-v2-preferences/)
    assert.match(rail, /activeTab === 'setup'/)
    assert.match(rail, /data-orb-voice-setup-panel/)
  })

  it('realtime status is a badge in setup rail not an input-like hero box', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(station, /orb-voice-realtime-badge/)
    assert.match(station, /data-orb-voice-realtime-setup-label/)
    assert.doesNotMatch(station, /data-orb-voice-realtime-setup[\s\S]{0,120}rounded-xl border/)
    assert.match(shell, /orb-voice-realtime-badge/)
  })

  it('right rail has readable width rules and soft idle badges', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(content, /md:min-w-\[22\.5rem\]/)
    assert.match(content, /md:max-w-\[26\.25rem\]/)
    assert.match(shell, /min-width: min\(100%, 22\.5rem\)/)
    assert.match(shell, /max-width: min\(100%, 26\.25rem\)/)
    assert.match(stationSoftBadges(), /data-orb-voice-soft-badges/)
  })

  it('primary Start conversation remains visible with minimal idle copy', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(ORB_VOICE_V2_IDLE_PROMPT, 'Talk it through with ORB.')
    assert.match(station, /data-orb-voice-start-conversation/)
    assert.match(station, /orb-voice-primary-cta/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
  })

  it('voice v2 and realtime routes unchanged with one shell CSS import', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/status/)
    assert.match(read('../routers/orb_voice_residential_routes.py'), /\/realtime\/status/)
    assert.doesNotMatch(read('components/orb-residential/orb-voice.css'), /compliance guarantee|ofsted approved/i)
  })
})

function stationSoftBadges() {
  return read('components/orb-standalone/orb-voice-station.tsx')
}
