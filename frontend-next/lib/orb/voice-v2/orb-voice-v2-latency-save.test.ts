import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION } from '../orb-visual-build.ts'
import {
  ORB_VOICE_V2_LIVE_SPOKEN_MAX_WORDS,
  ORB_VOICE_V2_PREPARING_VOICE,
  ORB_VOICE_V2_TINY_TURN
} from './orb-voice-v2-copy.ts'
import { ORB_VOICE_V2_DIDNT_CATCH_COPY } from './orb-voice-v2-one-screen-workspace.ts'
import { buildOrbVoiceV2ReflectionPacket } from './orb-voice-v2-reflection.ts'
import { createOrbVoiceV2Turn } from './orb-voice-v2-turns.ts'
import {
  END_OF_TURN_DEBOUNCE_MS,
  isOrbVoiceV2TurnSubstantial,
  MIN_SPEECH_MS,
  MIN_TRANSCRIPT_CHARS,
  MIN_TRANSCRIPT_WORDS,
  traceOrbVoiceV2IgnoredTinyTurn
} from './orb-voice-v2-turn-guard.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function capSpokenWords(text: string): string {
  const cleaned = text.replace(/\*\*/g, '').replace(/[#*_`]/g, '').trim()
  const words = cleaned.split(/\s+/).filter(Boolean)
  const wordCapped =
    words.length <= ORB_VOICE_V2_LIVE_SPOKEN_MAX_WORDS
      ? cleaned
      : `${words.slice(0, ORB_VOICE_V2_LIVE_SPOKEN_MAX_WORDS).join(' ').replace(/[.,;:!?]+$/, '')}…`
  return wordCapped
}

describe('orb-voice-v2-latency-save', () => {
  it('build marker is phase-5k-voice-hero-response-tightening', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5k-voice-hero-response-tightening')
  })

  it('tiny transcript under threshold does not call respond', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.equal(isOrbVoiceV2TurnSubstantial('a'), false)
    assert.match(hook, /isOrbVoiceV2TurnSubstantial\(transcript\)/)
    assert.match(hook, /traceOrbVoiceV2IgnoredTinyTurn/)
    assert.doesNotMatch(
      hook,
      /isOrbVoiceV2TurnSubstantial[\s\S]{0,120}requestOrbVoiceV2Respond[\s\S]{0,40}!isOrbVoiceV2TurnSubstantial/
    )
  })

  it('tiny transcript returns to listening', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /setTinyTurnNotice\(ORB_VOICE_V2_DIDNT_CATCH_COPY\)/)
    assert.match(hook, /void resumeListening\(\)/)
    assert.match(ORB_VOICE_V2_DIDNT_CATCH_COPY, /didn’t catch enough/i)
    assert.equal(ORB_VOICE_V2_TINY_TURN, 'I didn’t catch enough to respond. You can continue speaking.')
  })

  it('end-of-turn debounce is reduced but not zero', () => {
    assert.equal(END_OF_TURN_DEBOUNCE_MS, 1000)
    assert.ok(END_OF_TURN_DEBOUNCE_MS >= 900)
    assert.ok(END_OF_TURN_DEBOUNCE_MS <= 1200)
    assert.equal(MIN_SPEECH_MS, 350)
    assert.equal(MIN_TRANSCRIPT_CHARS, 8)
    assert.equal(MIN_TRANSCRIPT_WORDS, 2)
  })

  it('ORB text appears before TTS completion', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const commitStart = hook.indexOf('const commitAdultTurn = useCallback')
    const commitEnd = hook.indexOf('const commitAdultTurnRef = useRef', commitStart)
    const commitBlock = hook.slice(commitStart, commitEnd)
    const setTurnsOrb = commitBlock.indexOf("createOrbVoiceV2Turn('orb'")
    const speakIndex = commitBlock.indexOf('speakReplyRef.current')
    assert.ok(setTurnsOrb > -1 && speakIndex > setTurnsOrb)
    assert.match(commitBlock, /transitionState\('speaking'\)[\s\S]{0,120}speakReplyRef\.current/)
  })

  it('TTS loading copy appears while voice prepares', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /ORB_VOICE_V2_PREPARING_VOICE/)
    assert.match(hook, /setVoicePreparingLongWait\(true\), 2500/)
    assert.match(hook, /setVoicePreparingSkipAvailable\(true\), 6000/)
    assert.equal(ORB_VOICE_V2_PREPARING_VOICE, 'Katherine is preparing voice…')
  })

  it('spoken replies are capped for live voice', () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ')
    const capped = capSpokenWords(long)
    const wordCount = capped.replace(/…$/, '').split(/\s+/).filter(Boolean).length
    assert.ok(wordCount <= ORB_VOICE_V2_LIVE_SPOKEN_MAX_WORDS)
    assert.equal(ORB_VOICE_V2_LIVE_SPOKEN_MAX_WORDS, 55)
    assert.match(read('../services/orb_voice_spoken_compression_service.py'), /VOICE_FAST_MAX_WORDS = 45/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /capOrbVoiceV2SpokenText/)
  })

  it('end and summarise creates Voice reflection packet', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /buildOrbVoiceV2ReflectionPacket/)
    assert.match(hook, /setReflectionPacket\(packet\)/)
    const turns = [
      createOrbVoiceV2Turn('adult', 'Two young people and bullying in the home.'),
      createOrbVoiceV2Turn('orb', 'What did each young person say?')
    ]
    const packet = buildOrbVoiceV2ReflectionPacket(turns, 'incident_reflection', 'elevenlabs')
    assert.ok(packet.summaryMarkdown.includes('Voice reflection summary'))
    assert.ok(packet.sections.whatHappened)
  })

  it('summary is labelled Generated for adult review', () => {
    const packet = buildOrbVoiceV2ReflectionPacket([], 'just_talk', null)
    assert.equal(packet.adultReviewStatus, 'generated_for_adult_review')
    assert.match(packet.summaryMarkdown, /Generated for adult review/)
  })

  it('packet includes source orb_voice_v2', () => {
    const packet = buildOrbVoiceV2ReflectionPacket([], 'just_talk', null)
    assert.equal(packet.source, 'orb_voice_v2')
  })

  it('packet includes conversation transcript', () => {
    const turns = [createOrbVoiceV2Turn('adult', 'Hello there')]
    const packet = buildOrbVoiceV2ReflectionPacket(turns, 'just_talk', null)
    assert.match(packet.conversationTranscript, /Hello there/)
  })

  it('packet includes audioStored false', () => {
    const packet = buildOrbVoiceV2ReflectionPacket([], 'just_talk', null)
    assert.equal(packet.audioStored, false)
  })

  it('ignored tiny turn trace is safe', () => {
    let logged = ''
    const original = console.debug
    console.debug = (...args: unknown[]) => {
      logged = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
    }
    traceOrbVoiceV2IgnoredTinyTurn(1)
    console.debug = original
    assert.match(logged, /orb_voice_v2_ignored_tiny_turn/)
    assert.match(logged, /transcript_chars["':= ]+1/)
    assert.doesNotMatch(logged, /transcript:/)
  })
})
