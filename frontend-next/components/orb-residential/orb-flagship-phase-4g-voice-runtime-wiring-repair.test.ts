import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { ORB_VOICE_START_CONVERSATION } from '../../lib/orb/voice/orb-voice-free-flowing-conversation.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4G Voice runtime wiring repair', () => {
  it('build version marker is phase-4g-voice-runtime-wiring-repair', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4g-voice-runtime-wiring-repair')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-4g-voice-runtime-wiring-repair/)
  })

  it('companion only exposes complete assistant replies to the voice station', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /pending\) return null/)
    assert.match(companion, /entry\.status !== 'streaming'/)
    assert.match(companion, /isOrbVoiceAssistantTurnReady/)
  })

  it('voice station blocks TTS until respond completes and uses full reply text', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_MIN_SPOKEN_CHARS/)
    assert.match(station, /resolveOrbVoiceTurnTtsText/)
    assert.match(station, /voiceFastPromptTier/)
    assert.match(station, /beginOrbVoiceTurnTrace/)
  })

  it('settings panel shows Katherine ready vs fallback honestly', () => {
    const panel = read('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /Katherine ready/)
    assert.match(panel, /Katherine unavailable — fallback voice active/)
    assert.match(panel, /runtimeStatus/)
  })

  it('single shell and start conversation label remain', () => {
    assert.equal(ORB_VOICE_START_CONVERSATION, 'Start conversation')
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /OrbVoiceStationContent/)
    assert.doesNotMatch(read('components/orb-standalone/orb-care-companion.tsx'), /compliance guarantee/i)
  })
})
