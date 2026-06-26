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

describe('ORB Residential Phase 4H Voice fresh sessions and low latency', () => {
  it('build version marker is phase-5o-orb-premium-ui-voice-timing-cleanup', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5o-orb-premium-ui-voice-timing-cleanup')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5o-orb-premium-ui-voice-timing-cleanup/)
  })

  it('/orb opens Home by default without persisting station param', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /shouldOpenOrbResidentialLandingFresh/)
    assert.match(companion, /stripOrbResidentialStationParam/)
    assert.match(companion, /setActivePanel\(null\)/)
  })

  it('deep link /orb/voice emits canonical param and legacy ?station=voice still opens Voice', () => {
    assert.match(read('app/orb/voice/page.tsx'), /station=orb_voice/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /stationParam === 'voice'/)
    assert.match(companion, /'orb_voice'/)
  })

  it('Voice mount resets live session and blocks startup TTS', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /useOrbVoiceV2/)
    assert.match(hook, /resetLiveSession/)
    assert.match(hook, /if \(!open\)/)
    assert.doesNotMatch(hook, /audio\.play\(\)[\s\S]*open/)
  })

  it('Katherine readiness and forced OpenAI fallback copy are honest', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /fetchOrbVoiceV2Status/)
    assert.match(hook, /resolveOrbVoiceV2KatherineStatusMessage/)
    const service = read('../services/orb_voice_v2_service.py')
    assert.match(service, /voice_v2_status_payload/)
  })

  it('text-first TTS: visible reply before audio and spoken cap', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /voicePreparing/)
    assert.match(hook, /capOrbVoiceV2SpokenText/)
    assert.match(hook, /setTurns[\s\S]*requestOrbVoiceV2Speak/)
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_CONTINUE_WITHOUT_VOICE/)
  })

  it('resetLiveSession is wired through the voice v2 hook and station', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /resetLiveSession/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /export function useOrbVoiceV2/)
  })

  it('single shell and start conversation label remain', () => {
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /orbVoiceV2PrimaryActionLabel|startConversation/)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /OrbVoiceStationContent/)
    assert.doesNotMatch(read('components/orb-standalone/orb-care-companion.tsx'), /compliance guarantee/i)
  })

  it('residential landing helper strips station param from URL', () => {
    const helper = read('lib/orb/orb-residential-home-default.ts')
    assert.match(helper, /stripOrbResidentialStationParam/)
    assert.match(helper, /shouldOpenOrbResidentialLandingFresh/)
  })
})
