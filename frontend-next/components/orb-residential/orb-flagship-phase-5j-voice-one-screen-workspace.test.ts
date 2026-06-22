import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5J Voice one-screen live workspace', () => {
  it('build marker is phase-5n3-voice-fast-capture-modern-ui', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5n3-voice-fast-capture-modern-ui')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5n3-voice-fast-capture-modern-ui/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Voice renders one persistent workspace container', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(station, /data-orb-voice-one-screen-workspace/)
    assert.match(content, /data-orb-voice-one-screen-workspace/)
    assert.match(content, /orb-voice-one-screen-workspace/)
  })

  it('wave and live rail remain mounted through state changes', () => {
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const wave = read('components/orb-standalone/orb-voice-showstopper-wave.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(hero, /OrbVoiceShowstopperWave/)
    assert.match(wave, /orb-voice-showstopper-wave__core/)
    assert.match(rail, /data-orb-voice-live-rail-mounted/)
    assert.match(content, /data-orb-voice-live-rail-slot/)
  })

  it('summary renders in integrated rail not full replacement', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    assert.match(station, /OrbVoiceLiveRail/)
    assert.match(rail, /data-orb-voice-summary-integrated/)
    assert.doesNotMatch(station, /workspaceMode === 'after_call' \? null :/)
  })

  it('empty transcription maps to soft miss copy', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const workspace = read('lib/orb/voice-v2/orb-voice-v2-one-screen-workspace.ts')
    assert.match(workspace, /I didn’t catch enough there/)
    assert.match(hook, /ORB_VOICE_V2_DIDNT_CATCH_COPY/)
    assert.match(hook, /traceOrbVoiceV2IgnoredTinyTurn\(0\)/)
  })

  it('barge-in and interrupt stay on same screen', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /Interrupt/)
    assert.match(station, /orbVoiceV2PrimaryActionLabel/)
    assert.match(hook, /interrupted: true/)
    assert.match(hook, /intentionally deferred/)
  })

  it('specialist brain and v2 routes preserved', () => {
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_specialist/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /\/orb\/voice\/v2\/respond/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /setLastBrainTier/)
  })

  it('no legacy Voice in active station', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
    assert.doesNotMatch(station, /\/orb\/voice\/session\/status/)
  })

  it('one shell CSS import and reduced motion wave', () => {
    assert.match(read('app/orb/layout.tsx'), /import '\.\/orb-residential-shell\.css'/)
    assert.match(read('components/orb-standalone/orb-voice-showstopper-wave.tsx'), /prefers-reduced-motion/)
  })
})
