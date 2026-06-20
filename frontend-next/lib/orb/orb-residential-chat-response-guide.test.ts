import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildResidentialGuidedChatFallback,
  detectResidentialChatSupportType,
  isGenericResidentialSafeguardingEssay,
  reshapeGenericResidentialChatAnswer
} from './orb-residential-chat-response-guide.ts'

describe('ORB Residential guided chat response guide', () => {
  it('detects safeguarding concern support type', () => {
    assert.equal(
      detectResidentialChatSupportType('A child disclosed something worrying yesterday', 'Safeguarding'),
      'safeguarding_concern'
    )
  })

  it('safeguarding query returns guided structured response rather than generic essay', () => {
    const message = 'I need help with a safeguarding concern after a disclosure'
    const fallback = buildResidentialGuidedChatFallback(message, 'Safeguarding')
    assert.match(fallback, /safeguarding concern/i)
    assert.match(fallback, /\?\s/)
    assert.match(fallback, /daily record|incident reflection|supervision note|safeguarding reflection/i)
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
    const reshaped = reshapeGenericResidentialChatAnswer(genericEssay, message, 'Safeguarding')
    assert.match(reshaped, /To move forward/)
    assert.match(reshaped, /Safeguarding boundaries/)
  })

  it('prompts for child voice and observation vs interpretation', () => {
    const fallback = buildResidentialGuidedChatFallback(
      'Help me word what happened during restraint',
      'General'
    )
    assert.match(fallback, /child/i)
    assert.match(fallback, /observed|observation|exact words/i)
    assert.match(fallback, /interpret/i)
  })

  it('keeps local policy and professional judgement boundary', () => {
    const fallback = buildResidentialGuidedChatFallback(
      'Should I call the police about this?',
      'Safeguarding'
    )
    assert.match(fallback, /local|emergency|safeguarding procedures/i)
    assert.match(fallback, /does not investigate|professional judgement|manager|safeguarding lead/i)
  })
})
