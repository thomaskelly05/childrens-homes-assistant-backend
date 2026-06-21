import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5D Voice v2 clickable idle', () => {
  it('Voice v2 idle click CSS and controls remain wired', () => {
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5d-voice-v2-clickable-idle/)
  })

  it('Start conversation is a real enabled button in idle', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /type="button"/)
    assert.match(station, /data-orb-voice-start-conversation/)
    assert.match(station, /const primaryDisabled/)
    assert.match(station, /disabled=\{primaryDisabled\}/)
    assert.match(station, /data-orb-voice-primary-disabled/)
  })

  it('start handler records click trace and calls startConversation', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /traceOrbVoiceV2StartClick/)
    assert.match(station, /startConversation/)
    assert.match(hook, /setState\('requesting_microphone'\)/)
  })

  it('mode selector and controls layers are interactive', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(station, /data-orb-voice-v2-mode-select/)
    assert.match(station, /data-orb-voice-controls/)
    assert.match(hero, /orb-voice-controls/)
    assert.match(css, /pointer-events:\s*none/)
    assert.match(css, /orb-voice-controls[\s\S]*z-index:\s*5/)
  })

  it('audio unlock failure does not swallow start click', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /ORB_VOICE_V2_AUDIO_UNLOCK_SOFT_FAIL/)
    assert.match(hook, /await resumeListening\(\{ fromUserGesture: true \}\)/)
  })

  it('voice v2 routes remain active without legacy station imports', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice|useOrbWebVoiceEngine|OrbVoiceLaunchControls/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /\/orb\/voice\/v2\/speak/)
  })
})
