import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  ORB_VOICE_V2_WAKE_PHRASE_HINT,
  resolveOrbVoiceRealtimeMode
} from '../../lib/orb/voice-v2/orb-voice-v2-realtime-beta.ts'
import { detectOrbWakePhrase } from '../../lib/orb/voice-v2/orb-voice-v2-wake-phrase.ts'
import { MIN_TRANSCRIPT_CHARS } from '../../lib/orb/voice-v2/orb-voice-v2-turn-guard.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5L Voice realtime beta and Siri convergence', () => {
  it('build marker is phase-5o-orb-premium-ui-voice-timing-cleanup', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5o-orb-premium-ui-voice-timing-cleanup')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5o-orb-premium-ui-voice-timing-cleanup/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('current v2 fallback routes remain active', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/status/)
    assert.match(read('../routers/orb_voice_residential_routes.py'), /\/realtime\/status/)
    assert.match(read('../routers/orb_voice_residential_routes.py'), /\/realtime\/token/)
  })

  it('realtime beta layer and hybrid capture exist without duplicate CSS', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /startOrbVoiceV2HybridCapture/)
    assert.match(hook, /fetchOrbVoiceRealtimeBetaStatus/)
    assert.match(hook, /realtimeMode/)
    assert.doesNotMatch(read('components/orb-standalone/orb-voice-station.tsx'), /orb-voice-realtime-shell\.css/)
    const cssFiles = read('lib/orb/orb-visual-build.ts')
    assert.match(cssFiles, /orb-residential-shell\.css/)
  })

  it('wave tap and mic press can barge-in during speaking', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const showstopper = read('lib/orb/voice-v2/orb-voice-v2-showstopper.ts')
    assert.match(station, /bargeIn\('mic'\)/)
    assert.match(station, /bargeIn\('wave'\)/)
    assert.match(station, /bargeIn\('tap'\)/)
    assert.match(hero, /data-orb-voice-wave-interruptible/)
    assert.match(showstopper, /orb_voice_v2_barge_in.*source/)
  })

  it('Hey ORB wake phrase is session-scoped in hook and station hint', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const station = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(hook, /handleWakePhrase/)
    assert.match(hook, /onWakePhrase/)
    assert.match(station, /data-orb-voice-wake-phrase-hint/)
    assert.equal(detectOrbWakePhrase('ORB help me'), true)
    assert.equal(ORB_VOICE_V2_WAKE_PHRASE_HINT.includes('Voice session'), true)
  })

  it('one-screen wave-led workspace with setup in right rail', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(content, /data-orb-voice-one-screen-workspace/)
    assert.match(rail, /data-orb-voice-setup-panel/)
    assert.match(station, /openVoiceSetup/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
  })

  it('protocol progression service avoids repeating bullying slots', () => {
    const service = read('../services/orb_voice_protocol_progression_service.py')
    assert.match(service, /peopleInvolvedKnown/)
    assert.match(service, /refine_voice_reply_for_progression/)
    assert.match(read('../services/orb_voice_respond_service.py'), /protocol_progression_prompt_block/)
  })

  it('tiny turns, Katherine, compression and traces preserved', () => {
    assert.equal(MIN_TRANSCRIPT_CHARS, 8)
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /isOrbVoiceV2TurnSubstantial/)
    assert.match(hook, /requestOrbVoiceV2Speak/)
    assert.match(hook, /fireInstantAcknowledgement/)
    assert.match(hook, /endAndSummarise/)
    const trace = read('lib/orb/voice-v2/orb-voice-v2-showstopper.ts')
    assert.match(trace, /event: 'orb_voice_v2_barge_in'/)
    assert.doesNotMatch(trace, /console\.debug\([^)]*transcript/i)
  })

  it('Safari hybrid fallback resolves to voice v2 capture path', () => {
    const mode = resolveOrbVoiceRealtimeMode(
      { available: false, reason: 'not_configured', fallback: 'voice_v2', hybridSpeech: true },
      false,
      false
    )
    assert.equal(mode, 'fallback')
  })
})
