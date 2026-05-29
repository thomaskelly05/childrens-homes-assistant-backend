import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { contextualSuggestedRepliesForOutput } from './orb-output-reuse.ts'

// Re-export name matches assistant wrapper; tests target pure helper.
import { documentIntelligenceDisplayTitle, inferDocumentTitleFromText } from './document-intelligence.ts'
import { generateOrbChatTitle } from './orb-chat-title.ts'
import { stripMarkdownForSpeech } from './orb-speech-text.ts'

describe('document intelligence titles', () => {
  it('builds policy card title with document name', () => {
    assert.equal(
      documentIntelligenceDisplayTitle('policy_card', 'Safer Caring Policy'),
      'Policy Card — Safer Caring Policy'
    )
  })

  it('infers title from first meaningful line', () => {
    assert.equal(
      inferDocumentTitleFromText('\n\n\nMonthly safeguarding policy review\n\nSection 1'),
      'Monthly safeguarding policy review'
    )
  })

  it('maps reg44 lens in chat title helper', () => {
    assert.equal(
      generateOrbChatTitle('Review', { documentLens: 'reg44', documentTitle: 'March visit' }),
      'Reg 44 Review — March visit'
    )
  })
})

describe('contextual output reuse chips', () => {
  it('offers policy card follow-ups', () => {
    const chips = contextualSuggestedRepliesForOutput({ outputKind: 'policy_card' })
    assert.ok(chips.some((c) => c.label === 'Staff briefing'))
    assert.ok(chips.some((c) => c.label === 'What is missing?'))
  })

  it('offers safeguarding lens follow-ups', () => {
    const chips = contextualSuggestedRepliesForOutput({ outputKind: 'safeguarding' })
    assert.ok(chips.some((c) => /immediate action/i.test(c.label)))
  })
})

describe('speech text stripping', () => {
  it('removes markdown headings before speech', () => {
    const spoken = stripMarkdownForSpeech('## Policy Card\n\nStaff must escalate concerns.')
    assert.doesNotMatch(spoken, /##/)
    assert.match(spoken, /Staff must escalate/)
  })
})
