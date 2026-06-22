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

describe('ORB Residential Phase 5N.3 Voice fast capture and modern UI', () => {
  it('build marker is phase-5o-orb-premium-ui-voice-timing-cleanup', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5o-orb-premium-ui-voice-timing-cleanup')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5o-orb-premium-ui-voice-timing-cleanup/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('only one active Voice station and hook', () => {
    const care = read('components/orb-standalone/orb-care-companion.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(care, /OrbVoiceStation/)
    assert.match(station, /useOrbVoiceV2\(open\)/)
    assert.doesNotMatch(care, /OrbVoiceStationDuplicate|orb-voice-station-2/i)
  })

  it('runtime status distinguishes configured vs active capture mode', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /activeCaptureMode/)
    assert.match(hook, /configuredRealtimeLabel/)
    assert.match(hook, /resolveOrbVoiceRuntimeSetupDetail/)
    assert.match(station, /data-orb-voice-active-capture-mode/)
    assert.match(station, /data-orb-voice-realtime-configured-label/)
    assert.doesNotMatch(station, /Realtime available/)
  })

  it('WebRTC and hybrid paths skip server transcribe when final transcript exists', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /onEndOfTurnFromTranscript/)
    assert.match(hook, /orb_voice_transcribe_skipped/)
    assert.match(hook, /hybrid_final/)
    assert.match(hook, /webrtc_final/)
    assert.doesNotMatch(
      hook,
      /onEndOfTurnFromTranscript[\s\S]{0,240}transcribeOrbVoiceV2Audio/
    )
  })

  it('standard capture still calls transcribe with safe traces', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /resolveTranscriptFromAudio/)
    assert.match(hook, /orb_voice_transcribe_started/)
    assert.match(hook, /transcribeOrbVoiceV2Audio/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-capture-source.ts'), /orb_voice_standard_audio_blob/)
  })

  it('modern glass rail and wave state styling exist', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    const wave = read('components/orb-standalone/orb-voice-showstopper-wave.tsx')
    assert.match(shell, /orb-voice-live-rail--glass/)
    assert.match(shell, /backdrop-filter: blur/)
    assert.match(rail, /orb-voice-live-rail--glass/)
    assert.match(wave, /data-orb-voice-wave-state/)
    assert.match(shell, /data-orb-voice-wave-state='listening'/)
  })

  it('written answer before TTS and routes preserved', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    assert.match(hook, /writtenReply/)
    assert.match(hook, /spokenReply/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_specialist/)
    assert.match(read('../services/orb_voice_v2_service.py'), /katherine/i)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /Records & Drafts/)
  })

  it('Safari capture tuning and backend transcription timing', () => {
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-capture.ts'), /SAFARI_END_OF_TURN_DEBOUNCE_MS/)
    assert.match(read('../services/orb_voice_transcription_service.py'), /orb_voice_transcription finished/)
    assert.match(read('../services/orb_voice_transcription_service.py'), /ORB_VOICE_TRANSCRIPTION_MODEL/)
  })
})
