import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { orbVoiceV2PrimaryLabel } from '../../lib/orb/voice-v2/orb-voice-v2-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4G Voice runtime wiring repair', () => {
  it('build version marker is phase-5f-voice-v2-microphone-transition', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5f-voice-v2-microphone-transition')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5f-voice-v2-microphone-transition/)
  })

  it('voice v2 hook owns respond and speak without companion assistant relay', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /requestOrbVoiceV2Respond/)
    assert.match(hook, /requestOrbVoiceV2Speak/)
    assert.doesNotMatch(read('components/orb-standalone/orb-care-companion.tsx'), /voiceStationAssistant/)
  })

  it('voice station shows ORB text before audio via state ordering', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /setTurns[\s\S]*setState\('speaking'\)/)
    assert.match(hook, /capOrbVoiceV2SpokenText/)
    assert.match(hook, /voicePreparing/)
  })

  it('settings panel shows Katherine ready vs fallback honestly', () => {
    const panel = read('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /Katherine ready/)
    assert.match(panel, /Katherine unavailable — fallback voice active/)
    assert.match(panel, /runtimeStatus/)
  })

  it('single shell and start conversation label remain', () => {
    assert.equal(orbVoiceV2PrimaryLabel('idle'), 'Start conversation')
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /OrbVoiceStationContent/)
    assert.doesNotMatch(read('components/orb-standalone/orb-care-companion.tsx'), /compliance guarantee/i)
  })
})
