import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  VOICE_FAST_MAX_WORDS,
  VOICE_SAFEGUARDING_MAX_WORDS,
  VOICE_SPECIALIST_MAX_WORDS,
  VOICE_TTS_CHAR_HARD_CAP,
  VOICE_TTS_CHAR_SOFT_CAP,
  compressOrbVoiceReplyForSpeech
} from './orb-voice-v2-spoken-compression.ts'

describe('orb-voice-v2-spoken-compression', () => {
  it('exports tier word caps and TTS char caps', () => {
    assert.equal(VOICE_FAST_MAX_WORDS, 40)
    assert.equal(VOICE_SPECIALIST_MAX_WORDS, 55)
    assert.equal(VOICE_SAFEGUARDING_MAX_WORDS, 65)
    assert.equal(VOICE_TTS_CHAR_SOFT_CAP, 180)
    assert.equal(VOICE_TTS_CHAR_HARD_CAP, 220)
  })

  it('compresses supervision-style essay into one useful question', () => {
    const long =
      "It sounds like you're preparing for supervision. Reflecting on the incident is important. Think about how it affected you, the child, and the team. What support do you think you need going forward?"
    const compressed = compressOrbVoiceReplyForSpeech(long, 'supervision_prep', 'voice_specialist')
    assert.match(compressed, /supervision/i)
    assert.ok(compressed.length <= VOICE_TTS_CHAR_HARD_CAP)
    assert.ok(compressed.split(/\s+/).length <= VOICE_SPECIALIST_MAX_WORDS + 2)
  })

  it('keeps bullying replies practical and child-centred', () => {
    const compressed = compressOrbVoiceReplyForSpeech(
      'Consider emotional well-being and holistic support for everyone involved in this bullying situation with many checklist items.',
      'bullying_or_peer_conflict',
      'voice_specialist'
    )
    assert.match(compressed, /seen or heard|young people safe/i)
    assert.doesNotMatch(compressed, /emotional well-being/i)
  })

  it('enforces hard char cap for TTS', () => {
    const reply = `${'Reflective question about the incident. '.repeat(20)}What happened next?`
    const compressed = compressOrbVoiceReplyForSpeech(reply, 'general_reflection', 'voice_fast')
    assert.ok(compressed.length <= VOICE_TTS_CHAR_HARD_CAP)
  })
})
