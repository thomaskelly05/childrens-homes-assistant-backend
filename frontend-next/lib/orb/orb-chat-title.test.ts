import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { generateOrbChatTitle } from './orb-chat-title.ts'

describe('generateOrbChatTitle', () => {
  it('maps restraint recording prompt', () => {
    assert.equal(
      generateOrbChatTitle('What do I record after a restraint?'),
      'Recording after restraint'
    )
  })

  it('maps abuse disclosure', () => {
    assert.equal(
      generateOrbChatTitle('A young person has disclosed abuse to me tonight'),
      'Safeguarding disclosure'
    )
  })

  it('maps reg44 document lens', () => {
    assert.equal(generateOrbChatTitle('Review this', { documentLens: 'reg44' }), 'Reg 44 Review')
  })

  it('maps policy card with title', () => {
    assert.equal(
      generateOrbChatTitle('Upload policy', { documentLens: 'policy', documentTitle: 'Safer caring' }),
      'Policy Card — Safer caring'
    )
  })

  it('keeps ORB title for greetings', () => {
    assert.equal(generateOrbChatTitle('hello'), 'ORB')
    assert.equal(generateOrbChatTitle('thank you'), 'ORB')
  })
})
