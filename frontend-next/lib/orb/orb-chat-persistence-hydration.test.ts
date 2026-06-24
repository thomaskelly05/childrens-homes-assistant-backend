import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildDailyRecordHandoffChips,
  filterVisibleChatChips,
  isDailyRecordHandoffChipContext,
  mergeFollowUpsWithTemplateSuggestions
} from './orb-chat-chip-handoff.ts'
import {
  buildDailyRecordChatMetadata,
  repairHydratedAssistantAnswer,
  repairHydratedChatMessages
} from './orb-chat-persistence-hydration.ts'
import { contextualResidentialCalmFollowUps } from './orb-residential-active-chat-follow-ups.ts'
import {
  buildResidentialGuidedChatFallback,
  detectResidentialChatSupportType,
  isResidentialReflectiveChatFallback,
  reshapeResidentialChatAnswer
} from './orb-residential-chat-response-guide.ts'
import {
  buildSimpleDailyRecordDraft,
  isStructuredDailyRecordDraft
} from './recording/orb-adult-identity-language.ts'
import { sanitizeVisibleFinalAnswer } from './orb-visible-final-answer.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const BREAKFAST_DAILY_PROMPT =
  'Help me write a daily record — calm breakfast, chose toast, watched TV before handover.'

const REFLECTIVE_SUPERVISION_FALLBACK = `I can help you think this through.

**To move forward, it would help to know:**
- What do you want to take to supervision?
- What felt difficult or unresolved?
- What might need follow-up for the child or the team?

**I can turn this into:** a supervision note, reflective summary or handover note — for your review before use.`

function breakfastStructuredDraft() {
  return sanitizeVisibleFinalAnswer(buildSimpleDailyRecordDraft(BREAKFAST_DAILY_PROMPT), BREAKFAST_DAILY_PROMPT)
}

describe('Flow 1 daily record persistence and hydration', () => {
  it('daily record prompt routes to prepare_record not supervision_prep', () => {
    assert.equal(detectResidentialChatSupportType(BREAKFAST_DAILY_PROMPT), 'prepare_record')
    const fallback = buildResidentialGuidedChatFallback(BREAKFAST_DAILY_PROMPT)
    assert.doesNotMatch(fallback, /What do you want to take to supervision/i)
  })

  it('first render finalisation keeps structured Daily Record Draft', () => {
    const draft = buildSimpleDailyRecordDraft(BREAKFAST_DAILY_PROMPT)
    const finalised = reshapeResidentialChatAnswer(draft, BREAKFAST_DAILY_PROMPT, 'Ask ORB')
    assert.ok(isStructuredDailyRecordDraft(finalised))
    assert.match(finalised, /Daily Record Draft|Context \/ routine|What happened/i)
    assert.doesNotMatch(finalised, /What do you want to take to supervision/i)
  })

  it('empty daily record finalisation rebuilds structured draft instead of reflective fallback', () => {
    const finalised = reshapeResidentialChatAnswer('', BREAKFAST_DAILY_PROMPT, 'Ask ORB')
    assert.ok(isStructuredDailyRecordDraft(finalised))
    assert.doesNotMatch(finalised, /What do you want to take to supervision/i)
  })

  it('hydration repairs reflective fallback back to structured Daily Record Draft', () => {
    const repaired = repairHydratedAssistantAnswer(REFLECTIVE_SUPERVISION_FALLBACK, BREAKFAST_DAILY_PROMPT)
    assert.ok(isStructuredDailyRecordDraft(repaired))
    assert.doesNotMatch(repaired, /What do you want to take to supervision/i)
    assert.match(repaired, /Context \/ routine|What happened|Staff response/i)
  })

  it('repairHydratedChatMessages hydrates stored chats with repaired assistant answers', () => {
    const messages = repairHydratedChatMessages([
      { id: 'u1', role: 'user', content: BREAKFAST_DAILY_PROMPT, createdAt: 1 },
      {
        id: 'a1',
        role: 'assistant',
        content: REFLECTIVE_SUPERVISION_FALLBACK,
        status: 'complete',
        createdAt: 2
      }
    ])
    const assistant = messages[1]
    assert.equal(assistant?.chatIntent, 'daily_record')
    assert.equal(assistant?.templateId, 'daily_record')
    assert.equal(assistant?.workingDocumentAvailable, true)
    assert.equal(assistant?.source, 'chat_daily_record')
    assert.ok(isStructuredDailyRecordDraft(String(assistant?.content)))
  })

  it('recent chat metadata keeps daily record handoff chips after hydration', () => {
    const content = breakfastStructuredDraft()
    const metadata = buildDailyRecordChatMetadata()
    const ctx = { content, messageHint: BREAKFAST_DAILY_PROMPT, ...metadata }
    assert.equal(isDailyRecordHandoffChipContext(ctx), true)
    const merged = mergeFollowUpsWithTemplateSuggestions(
      contextualResidentialCalmFollowUps({
        mode: 'record',
        messageHint: BREAKFAST_DAILY_PROMPT,
        content
      }),
      [
        { action: 'save_to_records', label: 'Save to Records & Drafts' },
        {
          action: 'use_template_in_write',
          label: 'Use child voice note template',
          template_id: 'child_voice_note'
        }
      ],
      3,
      ctx
    )
    assert.deepEqual(
      merged.map((chip) => chip.label),
      ['Open in ORB Write using Daily Record template', 'Save to Records & Drafts']
    )
    assert.equal(merged.filter((chip) => chip.action === 'save_to_records').length, 1)
  })

  it('suppresses child voice note template for routine daily record hydration', () => {
    const ctx = {
      content: breakfastStructuredDraft(),
      messageHint: BREAKFAST_DAILY_PROMPT
    }
    const filtered = filterVisibleChatChips(
      [
        {
          action: 'use_template_in_write',
          label: 'Use child voice note template',
          template_id: 'child_voice_note'
        },
        ...buildDailyRecordHandoffChips()
      ],
      ctx,
      3
    )
    assert.ok(!filtered.some((chip) => /child voice note template/i.test(chip.label)))
  })

  it('repairHydratedChatMessages does not mutate non-daily chats', () => {
    const messages = repairHydratedChatMessages([
      { id: 'u1', role: 'user', content: 'What should I do after a restraint?', createdAt: 1 },
      {
        id: 'a1',
        role: 'assistant',
        content: 'Record facts in order and escalate to your manager.',
        status: 'complete',
        createdAt: 2
      }
    ])
    assert.equal(messages[1]?.content, 'Record facts in order and escalate to your manager.')
    assert.equal(messages[1]?.chatIntent, undefined)
  })

  it('selectChat closes workspace panels so recent chat opens the thread', () => {
    const companion = readFileSync(join(root, 'components/orb-standalone/orb-care-companion.tsx'), 'utf8')
    assert.match(companion, /function selectChat\(chatId: string\)[\s\S]*closePanel\(\)/)
  })

  it('detects persisted reflective fallback shape', () => {
    assert.equal(isResidentialReflectiveChatFallback(REFLECTIVE_SUPERVISION_FALLBACK), true)
    assert.equal(isResidentialReflectiveChatFallback(breakfastStructuredDraft()), false)
  })
})

describe('Flow 1 ORB Write handoff preservation', () => {
  it('companion still wires ORB Write handoff from chat chips', () => {
    const companion = readFileSync(join(root, 'components/orb-standalone/orb-care-companion.tsx'), 'utf8')
    assert.match(companion, /openChatTemplateInWrite|use_template_in_write/)
    assert.match(companion, /buildDailyRecordChatMetadata/)
  })
})
