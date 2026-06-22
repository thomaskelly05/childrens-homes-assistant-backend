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

describe('ORB Residential Phase 5L.1 Voice idle Siri hero activation', () => {
  it('build marker is phase-5l2-voice-siri-hero-layout-repair', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5l2-voice-siri-hero-layout-repair')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5l2-voice-siri-hero-layout-repair/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('idle Voice renders showstopper wave without session gate', () => {
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(hero, /OrbVoiceShowstopperWave/)
    assert.match(hero, /oneScreenWorkspace \? \(\s*wave/)
    assert.doesNotMatch(hero, /sessionStarted.*OrbVoiceShowstopperWave/)
    assert.match(content, /oneScreenWorkspace/)
    assert.match(content, /data-orb-voice-idle-hero/)
  })

  it('shell CSS applies large wave sizing for idle and active states', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(shell, /\[data-orb-voice-one-screen-workspace\].*orb-voice-showstopper-wave/)
    assert.match(shell, /clamp\(360px, 42vh, 460px\)/)
    assert.match(shell, /clamp\(620px, 68vh, 720px\)/)
    assert.match(shell, /\[data-orb-voice-wave-state='idle'\]/)
    assert.match(shell, /\[data-orb-voice-wave-state='requesting_microphone'\]/)
    assert.match(shell, /min-height: unset !important/)
  })

  it('idle copy stays minimal and setup remains collapsed', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    assert.equal(ORB_VOICE_V2_IDLE_PROMPT, 'Talk it through with ORB.')
    assert.match(hero, /companionState === 'idle'/)
    assert.match(station, /openVoiceSetup/)
    assert.match(station, /data-orb-voice-setup-trigger/)
    assert.match(station, /data-orb-voice-start-conversation/)
    assert.match(station, /detailLine=\{sessionStarted \? voice\.detailLine : null\}/)
  })

  it('right rail mounted, single voice UI, v2 routes unchanged', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(station, /OrbVoiceLiveRail/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/status/)
  })

  it('no compliance guarantee language in voice copy', () => {
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    assert.doesNotMatch(copy, /compliance guarantee|ofsted approved/i)
  })
})
