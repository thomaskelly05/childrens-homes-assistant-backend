import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  VOICE_FAST_MAX_WORDS,
  VOICE_TTS_CHAR_HARD_CAP,
  compressOrbVoiceReplyForSpeech
} from '../../lib/orb/voice-v2/orb-voice-v2-spoken-compression.ts'
import { MIN_TRANSCRIPT_CHARS } from '../../lib/orb/voice-v2/orb-voice-v2-turn-guard.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5K Voice hero and spoken-response tightening', () => {
  it('build marker is phase-5n1-voice-full-viewport-canvas', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5n1-voice-full-viewport-canvas')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5n1-voice-full-viewport-canvas/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('wave is primary visual hero with dominant layout', () => {
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const css = read('components/orb-standalone/orb-voice-studio-layout.css')
    assert.match(hero, /data-orb-voice-hero-dominant/)
    assert.match(hero, /orb-voice-hero-stage__waveform--dominant/)
    assert.match(css, /orb-voice-hero-stage--dominant/)
  })

  it('setup carousels collapse behind Voice setup rail tab by default', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    assert.match(station, /data-orb-voice-idle-preferences/)
    assert.match(rail, /data-orb-voice-setup-panel/)
    assert.match(station, /openVoiceSetup/)
    assert.match(station, /data-orb-voice-start-conversation/)
    assert.match(station, /orbVoiceV2PrimaryActionLabel/)
  })

  it('selected purpose voice personality soft badges remain visible', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-preference-badges/)
    assert.match(station, /data-orb-voice-soft-badges/)
  })

  it('right rail remains mounted with calmer companion styling', () => {
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(rail, /data-orb-voice-live-rail-mounted/)
    assert.match(station, /OrbVoiceLiveRail/)
    assert.match(rail, /data-orb-voice-specialist-badge/)
    assert.match(rail, /Residential childcare brain/)
  })

  it('spoken compression caps and backend mirror exist', () => {
    assert.equal(VOICE_FAST_MAX_WORDS, 45)
    assert.equal(VOICE_TTS_CHAR_HARD_CAP, 220)
    assert.match(read('../services/orb_voice_spoken_compression_service.py'), /compress_voice_reply_for_speech/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /capOrbVoiceV2SpokenText/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /fireInstantAcknowledgement/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-showstopper.ts'), /orb_voice_v2_instant_ack/)
  })

  it('tiny transcripts under 8 meaningful chars are ignored', () => {
    assert.equal(MIN_TRANSCRIPT_CHARS, 8)
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /isOrbVoiceV2TurnSubstantial/)
    assert.match(hook, /lastIgnoredPartialRef/)
    assert.doesNotMatch(hook, /isOrbVoiceV2TurnSubstantial[\s\S]{0,200}requestOrbVoiceV2Respond/)
  })

  it('specialist brain routing and v2 routes preserved', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_specialist|voice_safeguarding/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
    assert.doesNotMatch(station, /\/orb\/voice\/session\/status/)
  })

  it('no compliance guarantee language in voice copy', () => {
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    assert.doesNotMatch(copy, /compliance guarantee|ofsted approved/i)
    const compressed = compressOrbVoiceReplyForSpeech('ORB can guarantee compliance for your home.', 'general_reflection', 'voice_fast')
    assert.doesNotMatch(compressed, /guarantee compliance/i)
  })

  it('instant acknowledgement trace has no care content', () => {
    const trace = read('lib/orb/voice-v2/orb-voice-v2-showstopper.ts')
    assert.match(trace, /event: 'orb_voice_v2_instant_ack'/)
    assert.doesNotMatch(trace, /console\.debug\([^)]*transcript/i)
  })
})
