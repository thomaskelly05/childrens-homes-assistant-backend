import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice residential layout unification', () => {
  it('Voice uses standard ORB workspace frame without duplicate production headers', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const frame = read('components/orb-standalone/orb-workspace-frame.tsx')

    assert.match(station, /presentation="workspace"/)
    assert.match(station, /panelId="voice"/)
    assert.match(station, /title=\{ORB_VOICE_PANEL_TITLE\}/)
    assert.match(station, /subtitle=\{ORB_VOICE_PANEL_SUBTITLE\}/)
    assert.match(station, /headerActions=/)
    assert.match(station, /data-orb-voice-settings-chip/)
    assert.doesNotMatch(station, /orb-voice-studio__header/)
    assert.doesNotMatch(station, /orb-voice-studio__title/)
    assert.match(frame, /data-orb-workspace-header/)
  })

  it('production Voice does not render state showcase unless debugVisual gate is present', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')

    assert.match(station, /isOrbDebugVisualEnabled/)
    assert.match(station, /debugVisual \?/)
    assert.match(station, /OrbVoiceDebugVisualShowcase/)
    assert.doesNotMatch(station, /OrbVoiceStatePanel activeState/)
    assert.doesNotMatch(station, /OrbVoiceMobilePreviewStrip activeState/)
    assert.doesNotMatch(station, /OrbVoiceTrustStrip \/>/)
    assert.doesNotMatch(station, /data-orb-voice-studio/)
  })

  it('Voice renders OrbVoiceHead through OrbVoiceCompanion hero stage', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const companion = read('components/orb-residential/orb-voice-companion.tsx')

    assert.match(station, /OrbVoiceStationContent/)
    assert.match(hero, /OrbVoiceCompanion/)
    assert.match(companion, /OrbVoiceHead/)
    assert.match(head, /data-orb-voice-head/)
    assert.doesNotMatch(station, /GlassOrbMark/)
    assert.doesNotMatch(station, /OrbSphere/)
    assert.doesNotMatch(station, /orb-living-sphere/)
  })

  it('desktop and mobile share OrbVoiceStationContent source of truth', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')

    assert.match(station, /OrbVoiceStationContent/)
    assert.doesNotMatch(station, /isMobileViewport/)
    assert.doesNotMatch(station, /data-orb-desktop-branch/)
    assert.doesNotMatch(station, /data-orb-mobile-branch/)
    assert.match(content, /data-orb-voice-station-content/)
    assert.match(content, /OrbVoiceHeroStage/)
  })
})
