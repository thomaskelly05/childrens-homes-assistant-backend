import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { ORB_VOICE_V2_LIVE_SPOKEN_CAP } from '../../lib/orb/voice-v2/orb-voice-v2-copy.ts'
import { orbVoiceV2PrimaryLabel } from '../../lib/orb/voice-v2/orb-voice-v2-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice v2 state machine', () => {
  it('primary labels match product copy', () => {
    assert.equal(orbVoiceV2PrimaryLabel('idle'), 'Start conversation')
    assert.equal(orbVoiceV2PrimaryLabel('listening'), 'Listening…')
    assert.equal(orbVoiceV2PrimaryLabel('thinking'), 'ORB is thinking…')
    assert.equal(orbVoiceV2PrimaryLabel('speaking'), 'ORB is responding…')
    assert.equal(orbVoiceV2PrimaryLabel('paused'), 'Resume')
  })

  it('state type covers required machine states', () => {
    const types = read('lib/orb/voice-v2/orb-voice-v2-types.ts')
    for (const state of [
      'idle',
      'requesting_microphone',
      'listening',
      'speech_detected',
      'transcribing',
      'thinking',
      'speaking',
      'paused',
      'summary_ready',
      'error'
    ]) {
      assert.match(types, new RegExp(`'${state}'`))
    }
  })
})

describe('ORB Voice v2 flow contracts', () => {
  it('spoken text is capped at 320 characters', () => {
    assert.equal(ORB_VOICE_V2_LIVE_SPOKEN_CAP, 320)
  })

  it('handoff payload uses orb_voice_v2 source', () => {
    const summary = read('lib/orb/voice-v2/orb-voice-v2-summary.ts')
    assert.match(summary, /source: 'orb_voice_v2'/)
    assert.match(summary, /generated_for_adult_review/)
    assert.match(summary, /audioStored: false/)
  })

  it('client uses fast v2 respond and speak routes', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.doesNotMatch(client, /\/orb\/standalone\/stream/)
  })

  it('capture uses silence end-of-turn and Safari mime preference', () => {
    const capture = read('lib/orb/voice-v2/orb-voice-v2-capture.ts')
    assert.match(capture, /SILENCE_MS = 1400/)
    assert.match(capture, /audio\/mp4/)
    assert.match(capture, /blob\.size < 256/)
  })
})

describe('ORB Residential Phase 5A Voice clean rebuild', () => {
  it('build version marker is phase-5e-render-build-memory-fix', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5e-render-build-memory-fix')
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5e-render-build-memory-fix/)
  })

  it('active voice station uses v2 hook and not legacy voice modules', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /useOrbVoiceV2/)
    assert.match(station, /OrbVoiceStationContent/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice|useOrbWebVoiceEngine|OrbVoiceLaunchControls/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice/)
    assert.doesNotMatch(station, /Stop and send/)
  })

  it('one voice station is wired in companion', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbVoiceStation/)
    assert.doesNotMatch(companion, /OrbVoiceStationDuplicate|orb-voice-station-2/i)
  })

  it('voice opens fresh with reset on mount and no heavy chat route', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /resetLiveSession/)
    assert.match(hook, /requestOrbVoiceV2Respond/)
    assert.doesNotMatch(hook, /sendMessage/)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /data-orb-voice-start-conversation/)
  })

  it('backend exposes v2 fast routes', () => {
    const routes = read('../routers/orb_voice_v2_routes.py')
    const service = read('../services/orb_voice_v2_service.py')
    assert.match(routes, /\/respond/)
    assert.match(routes, /\/speak/)
    assert.match(routes, /\/transcribe/)
    assert.match(service, /promptTier.*voice_fast/)
    assert.match(service, /voice_v2_respond/)
  })

  it('Katherine fallback copy and audio-not-stored footer are present', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_SAFETY_FOOTER/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /resolveOrbVoiceV2KatherineStatusMessage/)
    assert.match(station, /Generated for adult review|ORB_VOICE_V2_ADULT_REVIEW_LABEL/)
    assert.doesNotMatch(station, /compliance guarantee|Ofsted approved/i)
  })

  it('leaving voice cancels composer mic audio in companion', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /activePanel === 'orb_voice'/)
    assert.match(companion, /voice\.cancelSpeaking/)
  })
})
