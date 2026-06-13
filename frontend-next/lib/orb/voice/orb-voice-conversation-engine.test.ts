import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS,
  buildOrbVoiceAfterCallSections,
  evaluateOrbVoiceConversation,
  findClarificationQuestion,
  orbVoiceConversationHasEnoughTranscript,
  orbVoiceTextHasSafetyConcern,
  pickFollowUpQuestion,
  pickOrbVoiceAcknowledgement,
  recommendOrbVoiceRecordType
} from './orb-voice-conversation-engine.ts'
import type { VoiceTurn } from './orb-voice-types.ts'

function userTurn(text: string): VoiceTurn {
  return {
    id: 'u1',
    role: 'user',
    text,
    startedAt: new Date().toISOString()
  }
}

describe('ORB Voice conversation engine', () => {
  it('selects acknowledgement without overuse', () => {
    assert.equal(pickOrbVoiceAcknowledgement(1, 'Something happened at tea time'), 'That sounds important.')
    assert.equal(pickOrbVoiceAcknowledgement(2, 'More detail'), null)
    assert.equal(pickOrbVoiceAcknowledgement(3, 'police were called'), 'That may need recording carefully.')
  })

  it('asks follow-up when adult response is missing', () => {
    const text = 'After school he was unsettled in the lounge. He would not speak to anyone.'
    const question = pickFollowUpQuestion(text)
    assert.ok(question)
    assert.match(question!, /staff|support|own words/i)
  })

  it('clarifies judgemental or ambiguous wording', () => {
    assert.match(findClarificationQuestion('When they left I was worried')!, /room or left the home/i)
    assert.match(findClarificationQuestion('It escalated quickly')!, /what did you observe/i)
    assert.match(findClarificationQuestion('He was aggressive')!, /actually do or say/i)
  })

  it('handles silence without ending session', () => {
    const short = evaluateOrbVoiceConversation({
      turns: [userTurn('We had a difficult evening.')],
      voiceState: 'listening',
      silenceDurationMs: 4_000
    })
    assert.equal(short.move, 'wait')
    assert.match(short.livePrompt!, /Take your time/i)

    const long = evaluateOrbVoiceConversation({
      turns: [userTurn('We had a difficult evening with lots of detail about school and tea and bedtime.')],
      voiceState: 'listening',
      silenceDurationMs: 16_000
    })
    assert.equal(long.move, 'suggest_record')
    assert.match(long.livePrompt!, /turn what you/i)
  })

  it('detects safety prompts for escalation topics', () => {
    assert.ok(orbVoiceTextHasSafetyConcern('There is immediate risk and a disclosure'))
    const out = evaluateOrbVoiceConversation({
      turns: [userTurn('There is immediate risk and a disclosure from the young person.')],
      voiceState: 'listening'
    })
    assert.equal(out.move, 'safety_prompt')
    assert.match(out.safetyPrompt!, /safeguarding/i)
  })

  it('recommends record type from transcript keywords', () => {
    const incident =
      'There was an incident with restraint after he damaged the door and police attended.'
    const rec = recommendOrbVoiceRecordType(incident)
    assert.ok(rec)
    assert.equal(rec!.templateId, 'incident')

    const handover = recommendOrbVoiceRecordType('End of shift handover update for the night team.')
    assert.ok(handover)
    assert.equal(handover!.templateId, 'handover')
  })

  it('suggests record creation after enough transcript', () => {
    const turns = [
      userTurn(
        'After school he was unsettled in the lounge. I gave him space and he settled after twenty minutes with a drink.'
      )
    ]
    assert.ok(orbVoiceConversationHasEnoughTranscript(turns))
    const out = evaluateOrbVoiceConversation({
      turns,
      voiceState: 'listening',
      userWantsRecord: true
    })
    assert.equal(out.suggestRecordCreation, true)
  })

  it('does not invent after-call summary when transcript is empty', () => {
    const sections = buildOrbVoiceAfterCallSections([])
    assert.equal(sections.summary, null)
    assert.equal(sections.hasTranscript, false)
    assert.equal(sections.recordingHints.length, 0)
  })

  it('after-call sections use transcript only', () => {
    const sections = buildOrbVoiceAfterCallSections([
      userTurn('He said he hates school. I sat with him and offered a drink.')
    ])
    assert.ok(sections.summary)
    assert.ok(sections.childVoicePresentation?.includes('said'))
    assert.ok(sections.adultResponse?.includes('offered') || sections.adultResponse?.includes('sat'))
    assert.ok(sections.missingInformation.length)
  })

  it('exposes conversational voice style instructions', () => {
    assert.match(ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS, /one question at a time/i)
    assert.match(ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS, /British English/i)
    assert.match(ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS, /professional judgement/i)
    assert.match(ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS, /safeguarding/i)
  })

  it('browser speaking fallback when barge-in unsupported', () => {
    const out = evaluateOrbVoiceConversation({
      turns: [userTurn('Hello')],
      voiceState: 'speaking',
      bargeInSupported: false
    })
    assert.equal(out.bargeInFallback, 'Tap to speak again')
  })
})
