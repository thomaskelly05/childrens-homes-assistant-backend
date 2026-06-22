import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { compressOrbVoiceReplyForSpeech, VOICE_TTS_CHAR_SOFT_CAP } from './orb-voice-v2-spoken-compression.ts'
import { pickOrbVoiceV2Acknowledgement } from './orb-voice-v2-showstopper.ts'
import { traceOrbVoiceRealtime } from './orb-voice-v2-realtime-trace.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-voice-v2-latency-flow', () => {
  it('instant acknowledgement is short and non-diagnostic', () => {
    const ack = pickOrbVoiceV2Acknowledgement([])
    assert.ok(ack.length < 60)
    assert.doesNotMatch(ack, /diagnos|decision|guarantee/i)
  })

  it('spoken compression keeps TTS under soft cap', () => {
    const long =
      'This is a long reflective answer with many sentences. ' +
      'It should be compressed for Katherine. ' +
      'The child was upset after tea. ' +
      'What support do you think they need tonight?'
    const spoken = compressOrbVoiceReplyForSpeech(long, 'general_reflection', 'voice_fast')
    assert.ok(spoken.length <= VOICE_TTS_CHAR_SOFT_CAP + 40)
  })

  it('commit flow sets written turn before async speak', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const commitStart = hook.indexOf('const commitAdultTurn = useCallback')
    const commitEnd = hook.indexOf('const commitAdultTurnRef = useRef', commitStart)
    const block = hook.slice(commitStart, commitEnd)
    assert.match(block, /setTurns\(\(current\) => \[\.\.\.current, orbTurn\]\)/)
    assert.match(block, /void speakReplyRef\.current\(orbTurn\.id, spokenReply\)/)
  })

  it('end-of-turn stops listening then acknowledges then thinks', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const block = hook.slice(
      hook.indexOf('onEndOfTurnFromTranscript'),
      hook.indexOf('onEndOfTurnFromAudio')
    )
    assert.match(block, /captureRef\.current\?\.dispose\(\)/)
    assert.match(block, /fireInstantAcknowledgement\(\)/)
    assert.match(block, /transitionState\('thinking'\)/)
  })

  it('realtime traces never include transcript payload keys', () => {
    const logs: string[] = []
    const original = console.debug
    console.debug = (...args: unknown[]) => {
      logs.push(JSON.stringify(args))
    }
    try {
      traceOrbVoiceRealtime('orb_voice_realtime_partial_received')
      traceOrbVoiceRealtime('orb_voice_realtime_fallback', { reason: 'webrtc_unavailable' })
    } finally {
      console.debug = original
    }
    const joined = logs.join(' ')
    assert.match(joined, /orb_voice_realtime_partial_received/)
    assert.doesNotMatch(joined, /transcript|care_content|child/i)
  })

  it('barge-in increments speak generation to drop stale TTS', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /speakGenerationRef\.current \+= 1/)
    assert.match(hook, /generation !== speakGenerationRef\.current/)
  })
})
