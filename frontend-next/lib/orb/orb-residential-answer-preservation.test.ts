import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  answerLooksGuidedResidentialChat,
  buildResidentialGuidedChatFallback,
  isEmptyResidentialChatAnswer,
  isGenericResidentialSafeguardingEssay,
  isResidentialSafetyFallbackAnswer,
  isStrongResidentialBackendAnswer,
  reshapeResidentialChatAnswer
} from './orb-residential-chat-response-guide.ts'

const REGRESSION_PROMPTS = [
  {
    id: 'school_refusal',
    prompt: 'A young person refused school today. How should staff record this?',
    mode: 'Ask ORB',
    strongAnswer: `## What happened

The young person refused to attend school today. Staff observed their presentation and response.

## Child voice

Record the young person's words where known. Note what they communicated through behaviour or affect.

## Staff response

What adults did to support, de-escalate and restore safety. Who was informed.

## Follow-up

Whether manager review, school liaison or additional support is needed.`
  },
  {
    id: 'upset_after_contact',
    prompt: 'A young person was upset after contact. How should staff record this?',
    mode: 'Ask ORB',
    strongAnswer: `## What happened

The young person was observed to be upset following contact. Staff offered calm reassurance and space.

## Child voice

Record the young person's words where known. Note what they communicated through behaviour or affect.

## Staff response

What adults did to support, de-escalate and restore safety. Who was informed.

## Follow-up

Whether manager review, contact review or additional support is needed.`
  },
  {
    id: 'allegation_grabbed',
    prompt: 'A young person alleged a member of staff grabbed them.',
    mode: 'Safeguarding',
    strongAnswer: `## Immediate safety and boundaries

Listen calmly. Do not promise secrecy. Separate the accused staff member from direct contact with the child where policy requires it.

## What to do now

- Preserve safety and evidence — do not investigate beyond immediate safety steps.
- Escalate to the manager, designated safeguarding lead and LADO where threshold is met.
- The accused person must not manage the concern or contact witnesses alone.
- Record facts, not opinions — protect child and staff rights.

## Recording guidance

Contemporaneous chronology: who said what, when, visible injuries, immediate actions taken.
Record the child's exact words where known — do not invent quotes.

## Manager oversight

Inform the registered manager promptly. Follow local allegation protocol and preserve evidence.`
  },
  {
    id: 'missing_from_care',
    prompt: 'A young person has not returned home and is now missing. What should staff do?',
    mode: 'Safeguarding',
    strongAnswer: `## Immediate steps

First, confirm whether the young person is safe and follow your missing-from-care procedure.

## Actions now

- Notify the manager and on-call safeguarding lead.
- Contact police if required by policy or risk level.
- Record last known whereabouts, clothing, associates and risk factors.
- Arrange return-home interview and welfare check when they return.

## Recording

Use observable facts. Record what was known at each stage and who was informed.
Do not speculate about motives.`
  },
  {
    id: 'falsifying_records',
    prompt: 'A member of staff told me they are worried another staff member is falsifying records.',
    mode: 'Safeguarding',
    strongAnswer: `## Whistleblowing route

Protected disclosure must not be suppressed. Follow your whistleblowing policy and governance route.

## Immediate priorities

- If children may be at risk, escalate safeguarding immediately.
- Record what was observed or reported, when, and who has been informed.
- Do not retaliate or advise silence.
- Use the appropriate senior person, safeguarding route or external body where policy allows.

## Recording

Factual chronology only. Separate observation from interpretation.`
  },
  {
    id: 'child_voice_gestures',
    prompt:
      "How can I evidence a young person's voice in a daily record when they communicate mainly through gestures and symbols?",
    mode: 'Record',
    strongAnswer: `## SEND session recording

Record how the young person communicated (AAC, symbols, gestures, device) — not only what adults inferred.

## Session structure

- Communication method used and how adults checked understanding.
- What the young person showed, selected or indicated.
- Adult support, pacing and environmental adjustments.
- Outcomes and follow-up for education/health partners.

## Boundaries

Do not invent quotes. Use '[communicated via widget/symbol]' where exact words are unknown.`
  }
] as const

function assertStrongAnswerPreserved(prompt: string, mode: string, strongAnswer: string) {
  assert.ok(isStrongResidentialBackendAnswer(strongAnswer), 'fixture should classify as strong backend answer')
  assert.ok(
    answerLooksGuidedResidentialChat(strongAnswer),
    'strong backend answer should count as guided without requiring a question mark in first 900 chars'
  )

  const finalised = reshapeResidentialChatAnswer(strongAnswer, prompt, mode)
  assert.equal(finalised, strongAnswer, 'strong backend answer must remain unchanged after finalisation')
  assert.doesNotMatch(finalised, /Additional context from ORB/i)
  assert.doesNotMatch(finalised, /^I can help you think this through\.\s*\n\nFirst, make sure immediate safety/m)
}

describe('ORB Residential answer preservation after stream finalisation', () => {
  for (const fixture of REGRESSION_PROMPTS) {
    it(`preserves strong backend answer for ${fixture.id}`, () => {
      assertStrongAnswerPreserved(fixture.prompt, fixture.mode, fixture.strongAnswer)
    })
  }

  it('does not require a question mark in the first 900 chars for strong answers', () => {
    const answerWithoutEarlyQuestion = REGRESSION_PROMPTS[0].strongAnswer
    assert.doesNotMatch(answerWithoutEarlyQuestion.slice(0, 900), /\?/)
    assert.ok(answerLooksGuidedResidentialChat(answerWithoutEarlyQuestion))
    assert.ok(isStrongResidentialBackendAnswer(answerWithoutEarlyQuestion))
  })

  it('replaces generic guided fallback only for empty answers', () => {
    const prompt = REGRESSION_PROMPTS[0].prompt
    const mode = REGRESSION_PROMPTS[0].mode
    const empty = "I'm here, but I could not generate a full response. Please try again."
    assert.ok(isEmptyResidentialChatAnswer(empty))
    const reshaped = reshapeResidentialChatAnswer(empty, prompt, mode)
    assert.notEqual(reshaped, empty)
    assert.match(reshaped, /I can help you think this through/i)
  })

  it('replaces generic guided fallback for generic safeguarding essays', () => {
    const prompt = 'I need help with a safeguarding concern after a disclosure'
    const genericEssay = `# Safeguarding overview

It is important to note that in any safeguarding situation, safeguarding is everyone's responsibility.

## Best practice
${'Generic guidance paragraph without questions here. '.repeat(60)}

## Further reading
${'More generic content continues. '.repeat(40)}

## Additional sections
${'## Section\nMore text. '.repeat(20)}`

    assert.ok(isGenericResidentialSafeguardingEssay(genericEssay))
    assert.ok(!isStrongResidentialBackendAnswer(genericEssay))
    const reshaped = reshapeResidentialChatAnswer(genericEssay, prompt, 'Safeguarding')
    assert.match(reshaped, /I can help you think this through/i)
    assert.doesNotMatch(reshaped, /safeguarding is everyone's responsibility/)
    assert.doesNotMatch(reshaped, /Additional context from ORB/i)
  })

  it('preserves safety fallback answers without reshaping', () => {
    const safetyAnswer = `1. Safety position
Immediate risk must be managed first.

9. Boundary caveat
ORB does not investigate or make findings.`
    assert.ok(isResidentialSafetyFallbackAnswer(safetyAnswer))
    const reshaped = reshapeResidentialChatAnswer(
      safetyAnswer,
      'A young person alleged a member of staff grabbed them.',
      'Safeguarding'
    )
    assert.equal(reshaped, safetyAnswer)
  })

  it('streaming final answer and finalised rendered answer match substantively for benchmarks', () => {
    for (const fixture of REGRESSION_PROMPTS) {
      const streamed = fixture.strongAnswer
      const finalised = reshapeResidentialChatAnswer(streamed, fixture.prompt, fixture.mode)
      assert.equal(finalised, streamed)
      const streamedMarkers = streamed.match(/\b(child voice|immediate|escalat|manager|record|observ|communicat)\b/gi) ?? []
      const finalisedMarkers =
        finalised.match(/\b(child voice|immediate|escalat|manager|record|observ|communicat)\b/gi) ?? []
      assert.deepEqual(finalisedMarkers, streamedMarkers)
    }
  })

  it('does not prepend generic guided fallback ahead of strong scenario answers', () => {
    const fallback = buildResidentialGuidedChatFallback(
      REGRESSION_PROMPTS[3].prompt,
      REGRESSION_PROMPTS[3].mode
    )
    const finalised = reshapeResidentialChatAnswer(
      REGRESSION_PROMPTS[3].strongAnswer,
      REGRESSION_PROMPTS[3].prompt,
      REGRESSION_PROMPTS[3].mode
    )
    assert.doesNotMatch(finalised, new RegExp(fallback.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  })
})
