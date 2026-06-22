import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION } from '../orb-visual-build.ts'
import { createOrbVoiceCaptureController } from './orb-voice-capture-controller.ts'
import {
  buildOrbVoiceHandoffWithTts,
  buildOrbVoiceRespondPayload,
  createOrbVoiceSpokenTurnGuard,
  voiceResponseLooksReflective
} from './orb-voice-conversation-loop.ts'
import { END_OF_TURN_DEBOUNCE_MS, ORB_VOICE_FREE_FLOW_DEFAULTS } from './orb-voice-free-flowing-conversation.ts'
import {
  orbVoiceSessionBlocksPrimaryAction,
  orbVoiceSessionPrimaryLabel,
  resolveOrbVoiceSessionState,
  ORB_VOICE_SESSION_AUDIT
} from './orb-voice-session-state.ts'
import { commitVoiceTranscriptOrBlock } from './orb-voice-speech-loop.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice platform rebuild (Phase 4F)', () => {
  it('build marker is phase-5g-voice-v2-latency-save', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5g-voice-v2-latency-save')
  })

  it('session state machine resolves listening and thinking', () => {
    assert.equal(
      resolveOrbVoiceSessionState({
        engineState: 'idle',
        conversationActive: false
      }),
      'idle'
    )
    assert.equal(
      resolveOrbVoiceSessionState({
        engineState: 'listening',
        conversationActive: true
      }),
      'listening'
    )
    assert.equal(
      resolveOrbVoiceSessionState({
        engineState: 'idle',
        pending: true,
        conversationActive: true
      }),
      'thinking'
    )
    assert.equal(orbVoiceSessionPrimaryLabel('idle'), 'Start conversation')
    assert.equal(
      orbVoiceSessionPrimaryLabel('listening', { continuousConversation: true, pushToTalk: false }),
      'Listening…'
    )
    assert.equal(
      orbVoiceSessionBlocksPrimaryAction('listening', {
        continuousConversation: true,
        pushToTalk: false
      }),
      true
    )
  })

  it('capture controller debounces end-of-turn and blocks empty transcript', async () => {
    assert.equal(END_OF_TURN_DEBOUNCE_MS, 1_400)
    let submitted = ''
    const controller = createOrbVoiceCaptureController(ORB_VOICE_FREE_FLOW_DEFAULTS, {
      onPartialSpeech: () => {},
      onFinalSpeech: () => {},
      onSubmitTranscript: async (text) => {
        submitted = text
      }
    })
    controller.handleFinalTranscript('  ')
    assert.equal(submitted, '')
    const blocked = await controller.submitNow('   ')
    assert.equal(blocked, false)
    assert.equal(commitVoiceTranscriptOrBlock('').ok, false)
    controller.dispose()
  })

  it('conversation loop builds respond payload and guards duplicate TTS', () => {
    const payload = buildOrbVoiceRespondPayload({
      mode: 'incident_reflection',
      transcript: 'I need to reflect on an incident.',
      turns: [{ id: '1', role: 'user', text: 'Earlier point', startedAt: '', mode: 'incident_reflection' }]
    })
    assert.equal(payload.transcript, 'I need to reflect on an incident.')
    assert.equal(payload.sessionTurns.at(-1)?.role, 'adult')
    assert.match(read('hooks/use-orb-conversation.ts'), /requestOrbVoiceRespond/)
    assert.match(read('lib/orb/voice/orb-voice-respond-client.ts'), /\/orb\/voice\/respond/)

    const guard = createOrbVoiceSpokenTurnGuard()
    assert.equal(guard.shouldSpeak('turn-1'), true)
    assert.equal(guard.shouldSpeak('turn-1'), false)
  })

  it('handoff payload is honest about Katherine fallback', () => {
    const katherine = buildOrbVoiceHandoffWithTts({
      mode: 'incident_reflection',
      conversationTranscript: 'Adult spoke',
      summary: 'Summary for review',
      tts: { provider: 'elevenlabs', voiceName: 'Katherine', fallbackUsed: false }
    })
    assert.equal(katherine.source, 'orb_voice')
    assert.equal(katherine.audioStored, false)
    assert.equal(katherine.selectedVoice, 'Katherine')

    const fallback = buildOrbVoiceHandoffWithTts({
      mode: 'incident_reflection',
      conversationTranscript: 'Adult spoke',
      summary: 'Summary for review',
      tts: { provider: 'openai', voiceName: 'Alloy', fallbackUsed: true }
    })
    assert.equal(fallback.ttsFallbackUsed, true)
    assert.notEqual(fallback.selectedVoice, 'Katherine')
  })

  it('voice responses stay reflective and bounded', () => {
    const reply =
      'I can help you think that through. What happened just before the young person became upset?'
    assert.equal(voiceResponseLooksReflective(reply), true)
    assert.match(read('../services/orb_voice_respond_service.py'), /voice_fast/)
    assert.match(read('../services/orb_voice_respond_service.py'), /embeddings=0/)
  })

  it('audit map points to single voice v2 platform modules', () => {
    assert.equal(ORB_VOICE_SESSION_AUDIT.station, 'components/orb-standalone/orb-voice-station.tsx')
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /useOrbVoiceV2/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /startOrbVoiceV2Capture|orb-voice-v2-capture/)
    assert.match(read('../routers/orb_voice_v2_routes.py'), /@router\.post\("\/respond"\)|orb_voice_v2_respond_route/)
  })

  it('Safari MIME and CSP media-src blob are wired', () => {
    assert.match(read('middleware.ts'), /media-src 'self' blob: data: https:/)
    const capture = read('lib/orb/voice-v2/orb-voice-v2-capture.ts')
    assert.match(capture, /audio\/mp4/)
  })
})
