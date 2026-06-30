import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  answerLooksGuidedResidentialChat,
  buildResidentialGuidedChatFallback,
  detectResidentialChatSupportType,
  isGenericResidentialSafeguardingEssay,
  isQ1RecordingContractAnswer,
  reshapeResidentialChatAnswer,
  shouldApplyResidentialChatGuidance
} from './orb-residential-chat-response-guide.ts'

const BREAKFAST_DAILY_PROMPT =
  'Help me write a daily record — calm breakfast, chose toast, watched TV before handover.'

describe('ORB Residential guided chat response guide', () => {
  it('detects safeguarding concern support type', () => {
    assert.equal(
      detectResidentialChatSupportType('A child disclosed something worrying yesterday', 'Safeguarding'),
      'safeguarding_concern'
    )
    assert.equal(detectResidentialChatSupportType('There was a restraint and injury', 'General'), 'incident_reflection')
    assert.ok(shouldApplyResidentialChatGuidance('We have a safeguarding concern about an allegation', 'General'))
  })

  it('safeguarding query returns guided structured response rather than generic essay', () => {
    const message = 'I need help with a safeguarding concern after a disclosure'
    const fallback = buildResidentialGuidedChatFallback(message, 'Safeguarding')
    assert.match(fallback, /I can help you think this through/i)
    assert.match(fallback, /immediate safety and local safeguarding procedures/i)
    assert.match(fallback, /1\. What happened/)
    assert.match(fallback, /child say, show or communicate/i)
    assert.match(fallback, /factual, child-centred record/i)
    assert.doesNotMatch(fallback, /it is important to note that safeguarding is everyone's responsibility/i)

    const genericEssay = `# Safeguarding overview

It is important to note that in any safeguarding situation, safeguarding is everyone's responsibility.

## Best practice
${'Generic guidance paragraph without questions here. '.repeat(60)}

## Further reading
${'More generic content continues. '.repeat(40)}

## Additional sections
${'## Section\nMore text. '.repeat(20)}`

    assert.ok(isGenericResidentialSafeguardingEssay(genericEssay))
    const reshaped = reshapeResidentialChatAnswer(genericEssay, message, 'Safeguarding')
    assert.match(reshaped, /immediate safety|I can help you think this through/i)
    assert.match(reshaped, /local policy|professional judgement/i)
    assert.doesNotMatch(reshaped, /safeguarding is everyone's responsibility/)
  })

  it('prompts for child voice and observation vs interpretation', () => {
    const fallback = buildResidentialGuidedChatFallback(
      'Help me word what happened during restraint',
      'General'
    )
    assert.match(fallback, /child say, show or communicate/i)
    assert.match(fallback, /adults observe/i)
    assert.match(fallback, /observation from interpretation/i)
  })

  it('keeps local policy and professional judgement boundary', () => {
    const fallback = buildResidentialGuidedChatFallback(
      'Should I call the police about this?',
      'Safeguarding'
    )
    assert.match(fallback, /local|emergency|safeguarding procedures/i)
    assert.match(fallback, /does not investigate|professional judgement|management oversight/i)
  })

  it('recognises already-guided answers and avoids double-shaping', () => {
    const guided = `Let's think this through safely.

First, is anyone at immediate risk right now?

1. What happened?
2. What was observed?

I can help shape this into a safeguarding reflection for adult review.

Separate observation from interpretation. Follow local policy.`
    assert.ok(answerLooksGuidedResidentialChat(guided))
    const kept = reshapeResidentialChatAnswer(guided, 'safeguarding concern after disclosure', 'Safeguarding')
    assert.equal(kept, guided)
  })

  it('daily record with handover cue stays on prepare_record support type', () => {
    const prompt =
      'Help me write a daily record — calm breakfast, chose toast, watched TV before handover.'
    assert.equal(detectResidentialChatSupportType(prompt), 'prepare_record')
    const fallback = buildResidentialGuidedChatFallback(prompt)
    assert.doesNotMatch(fallback, /What do you want to take to supervision/i)
  })

  it('reshapeResidentialChatAnswer never replaces structured daily record draft with reflective fallback', () => {
    const draft = `Daily Record Draft

Context / routine:
Morning routine before handover.

What happened:
Breakfast and television before handover.

Young person's presentation:
Calm.

Young person's voice or communication:
No direct words provided.

Staff response:
Staff supported the routine.

Outcome:
Settled morning.

To complete before saving:

* Add the time.
* Add who was present.`
    const reshaped = reshapeResidentialChatAnswer(draft, BREAKFAST_DAILY_PROMPT, 'Ask ORB')
    assert.doesNotMatch(reshaped, /What do you want to take to supervision/i)
    assert.match(reshaped, /Context \/ routine|What happened/i)
  })

  it('preserves Q1 three-section recording contract without appending support text', () => {
    const q1Answer = `## Draft record

**Incident reflection**

After being told they could not have extra screen time, [Young Person] shouted at staff.

## What to add before sign-off

- Exact times and location

## Why this wording is safer

This reflection records the boundary or trigger described without blame.`
    assert.ok(isQ1RecordingContractAnswer(q1Answer))
    const reshaped = reshapeResidentialChatAnswer(
      q1Answer,
      'Help me write an incident reflection after a screen time boundary.',
      'Ask ORB'
    )
    assert.doesNotMatch(reshaped, /Before you use this/i)
    assert.match(reshaped, /Draft record/i)
    assert.match(reshaped, /What to add before sign-off/i)
  })
})
