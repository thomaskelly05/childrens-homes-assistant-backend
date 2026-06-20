import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  answerLooksGuidedResidentialChat,
  buildResidentialGuidedChatFallback,
  detectResidentialChatSupportType,
  isGenericResidentialSafeguardingEssay,
  reshapeResidentialChatAnswer,
  shouldApplyResidentialChatGuidance
} from './orb-residential-chat-response-guide.ts'

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
    assert.match(fallback, /think this through safely/i)
    assert.match(fallback, /immediate risk/i)
    assert.match(fallback, /local safeguarding and emergency procedures/i)
    assert.match(fallback, /1\. What happened/)
    assert.match(fallback, /child say, show or communicate/i)
    assert.match(fallback, /safeguarding reflection|incident record|handover note/i)
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
    assert.match(reshaped, /immediate risk|think this through safely/i)
    assert.match(reshaped, /local policy|professional judgement/i)
    assert.doesNotMatch(reshaped, /safeguarding is everyone's responsibility/)
  })

  it('prompts for child voice and observation vs interpretation', () => {
    const fallback = buildResidentialGuidedChatFallback(
      'Help me word what happened during restraint',
      'General'
    )
    assert.match(fallback, /child say, show or communicate/i)
    assert.match(fallback, /observed, heard or shared/i)
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
})
