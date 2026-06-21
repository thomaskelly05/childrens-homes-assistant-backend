import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION } from '../orb-visual-build.ts'
import {
  ORB_VOICE_MIN_SPOKEN_CHARS,
  ORB_VOICE_TTS_TOO_SHORT_MESSAGE,
  isOrbVoiceAssistantTurnReady,
  resolveOrbVoiceTurnTtsText,
  resolveOrbVoiceLaunchUiCaptureState,
  shouldInvokeOrbVoiceTts
} from './orb-voice-runtime-wiring.ts'
import { createOrbVoiceSpokenTurnGuard } from './orb-voice-conversation-loop.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice runtime wiring (Phase 4G)', () => {
  it('blocks TTS below minimum spoken length', () => {
    assert.equal(ORB_VOICE_MIN_SPOKEN_CHARS, 8)
    assert.equal(shouldInvokeOrbVoiceTts('Hi'), false)
    assert.equal(shouldInvokeOrbVoiceTts('I need to reflect on an incident after contact.'), true)
    assert.match(ORB_VOICE_TTS_TOO_SHORT_MESSAGE, /shown as text/)
  })

  it('voice_fast replies use full ORB text for TTS', () => {
    const reply =
      'I can help you think that through. First, make sure everyone is safe and your home’s procedure has been followed. What happened just before the young person became upset?'
    const resolved = resolveOrbVoiceTurnTtsText({
      visibleReply: reply,
      promptTier: 'voice_fast'
    })
    assert.equal(resolved.source, 'full_reply')
    assert.ok(resolved.spokenText.length > 40)
    assert.ok(resolved.spokenText.includes('think that through'))
  })

  it('pending or streaming assistant turns are not ready for TTS', () => {
    assert.equal(isOrbVoiceAssistantTurnReady({ status: 'streaming', content: 'Partial', pending: false }), false)
    assert.equal(isOrbVoiceAssistantTurnReady({ status: 'complete', content: 'Short', pending: false }), false)
    assert.equal(
      isOrbVoiceAssistantTurnReady({
        status: 'complete',
        content: 'I can help you think that through. What happened just before things escalated?',
        pending: false
      }),
      true
    )
    assert.equal(
      isOrbVoiceAssistantTurnReady({
        status: 'complete',
        content: 'I can help you think that through. What happened just before things escalated?',
        pending: true
      }),
      false
    )
  })

  it('capture UI leaves recording when pending after transcription', () => {
    assert.equal(
      resolveOrbVoiceLaunchUiCaptureState({
        pending: true,
        engineState: 'capturing'
      }),
      'thinking'
    )
    assert.equal(
      resolveOrbVoiceLaunchUiCaptureState({
        pending: false,
        engineState: 'idle'
      }),
      'idle'
    )
  })

  it('spoken turn guard only allows committed ORB turns once', () => {
    const guard = createOrbVoiceSpokenTurnGuard()
    assert.equal(guard.shouldSpeak('orb-1', 'orb'), true)
    assert.equal(guard.shouldSpeak('orb-1', 'orb'), false)
    assert.equal(guard.shouldSpeak('orb-1', 'adult'), false)
  })

  it('turn trace module exists on station and hook', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /beginOrbVoiceTurnTrace/)
    assert.match(station, /patchOrbVoiceTurnTrace/)
    assert.match(read('lib/orb/voice/orb-voice-turn-trace.ts'), /voice_turn_trace/)
  })

  it('station waits for complete reply before TTS and uses orb_turn source', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(station, /resolveOrbVoiceTurnTtsText/)
    assert.match(station, /!pending/)
    assert.match(station, /source: 'orb_turn'/)
    assert.match(hook, /shouldInvokeOrbVoiceTts/)
  })

  it('backend prefers ElevenLabs and logs unavailable reasons', () => {
    const tts = read('../services/orb_voice_tts_service.py')
    const routes = read('../routers/orb_voice_residential_routes.py')
    assert.match(tts, /orb_voice_tts_elevenlabs_unavailable/)
    assert.match(tts, /voice_runtime_tts_status_payload/)
    assert.match(tts, /Fallback voice/)
    assert.match(routes, /orb_voice_turn_trace stage=transcribe/)
    assert.match(routes, /orb_voice_turn_trace stage=respond/)
  })
})
