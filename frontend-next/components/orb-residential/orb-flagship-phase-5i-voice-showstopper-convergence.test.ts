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

describe('ORB Residential Phase 5I Voice showstopper convergence', () => {
  it('build marker is phase-5l2-voice-siri-hero-layout-repair', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5l2-voice-siri-hero-layout-repair')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5l2-voice-siri-hero-layout-repair/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('only one active Voice v2 station and hook', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
    assert.doesNotMatch(station, /\/orb\/voice\/session\/status/)
    assert.match(companion, /OrbVoiceStation/)
  })

  it('no legacy Voice UI in active residential Voice station', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(station, /OrbVoiceSettingsPanel/)
    assert.doesNotMatch(station, /use-standalone-orb-voice/)
  })

  it('premium showstopper wave UI with reduced motion', () => {
    const wave = read('components/orb-standalone/orb-voice-showstopper-wave.tsx')
    const css = read('components/orb-standalone/orb-voice-studio-layout.css')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    assert.match(wave, /data-orb-voice-wave-state/)
    assert.match(wave, /prefers-reduced-motion/)
    assert.match(css, /orb-voice-showstopper-wave/)
    assert.match(hero, /OrbVoiceShowstopperWave/)
  })

  it('instant acknowledgement and barge-in wiring', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const showstopper = read('lib/orb/voice-v2/orb-voice-v2-showstopper.ts')
    assert.match(hook, /pickOrbVoiceV2Acknowledgement/)
    assert.match(hook, /setAcknowledgement/)
    assert.match(hook, /traceOrbVoiceV2BargeIn/)
    assert.match(hook, /bargeIn/)
    assert.match(showstopper, /orb_voice_v2_barge_in/)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /data-orb-voice-barge-in/)
  })

  it('voice, personality and purpose carousels render', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /OrbVoiceV2Carousel/)
    assert.match(station, /dataAttr="purpose"/)
    assert.match(station, /dataAttr="voice"/)
    assert.match(station, /dataAttr="personality"/)
  })

  it('respond and speak payloads include personality and voice', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(client, /personality/)
    assert.match(client, /voice/)
    assert.match(hook, /personality: personalityRef/)
    assert.match(hook, /resolveSpeakVoiceId/)
  })

  it('specialist brain routing preserved', () => {
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_fast|voice_specialist|voice_safeguarding/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /brainTier/)
  })

  it('end summary adult-review draft and save pathway preserved', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_ADULT_REVIEW_LABEL/)
    assert.match(station, /data-orb-voice-save-records-drafts/)
    assert.match(read('components/orb-standalone/orb-voice-live-rail.tsx'), /data-orb-voice-summary-integrated/)
  })

  it('open flicker fix — reset only on close', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.doesNotMatch(hook, /resetLiveSession\(\)\s*\n\s*void fetchOrbVoiceV2Status/)
  })

  it('no compliance guarantee language and safe barge-in trace', () => {
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    const trace = read('lib/orb/voice-v2/orb-voice-v2-showstopper.ts')
    assert.doesNotMatch(copy, /compliance guarantee|final record|ofsted approved/i)
    assert.match(trace, /event: 'orb_voice_v2_barge_in'/)
    assert.doesNotMatch(trace, /console\.debug\([^)]*transcript/i)
  })

  it('Katherine and Voice v2 routes remain active', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(read('../services/orb_voice_v2_service.py'), /katherine/i)
  })
})
