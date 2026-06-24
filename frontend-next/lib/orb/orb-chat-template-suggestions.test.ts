import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildDailyRecordHandoffChips,
  filterVisibleChatChips,
  isDailyRecordHandoffChipContext,
  mergeFollowUpsWithTemplateSuggestions,
  suggestionKey
} from './orb-chat-chip-handoff.ts'
import { contextualResidentialCalmFollowUps } from './orb-residential-active-chat-follow-ups.ts'
import { sanitizeVisibleFinalAnswer } from './orb-visible-final-answer.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const BREAKFAST_DAILY_PROMPT =
  'Help me write a daily record — calm breakfast, chose toast, watched TV before handover.'

const STRUCTURED_DAILY_DRAFT = `Daily Record Draft

Context / routine:
The record relates to the young person's morning routine before handover.

What happened:
The young person had breakfast. They chose toast. They then watched television before handover.

Young person's presentation:
The young person appeared calm during this period.

Young person's voice or communication:
No direct words from the young person were provided in the note. Add anything they said, asked for or communicated before saving.

Staff response:
Staff supported the routine, offered choice around breakfast and maintained a calm environment.

Outcome:
The morning period appears to have remained settled based on the information provided.

To complete before saving:

* Add the time.
* Add who was present.
* Add anything the young person said or communicated.
* Add any relevant follow-up, if needed.`

function breakfastChipContext() {
  const content = sanitizeVisibleFinalAnswer(STRUCTURED_DAILY_DRAFT, BREAKFAST_DAILY_PROMPT)
  return { content, messageHint: BREAKFAST_DAILY_PROMPT }
}

function taxonomyNoiseChips() {
  return [
    { action: 'save_to_records' as const, label: 'Save to Records & Drafts' },
    {
      action: 'use_template_in_write' as const,
      label: 'Use activity record template',
      template_id: 'activity_record'
    },
    {
      action: 'use_template_in_write' as const,
      label: 'Use bedtime routine record template',
      template_id: 'bedtime_routine_record'
    }
  ]
}

describe('orb chat template suggestions contracts', () => {
  it('daily_record intent ranks Daily Record template first for routine draft answers', () => {
    const suggestions = read('lib/orb/orb-chat-template-suggestions.ts')
    const handoff = read('lib/orb/orb-chat-chip-handoff.ts')
    assert.match(suggestions, /isDailyRecordHandoffChipContext/)
    assert.match(handoff, /buildDailyRecordHandoffChips/)
    assert.match(handoff, /filterVisibleChatChips/)
    assert.match(handoff, /ROUTINE_DAILY_UNRELATED_TEMPLATE_IDS/)
    assert.match(handoff, /shouldSuggestTemplateForRoutineDailyRecord/)
  })

  it('activity_record and bedtime_routine are filtered for routine daily record drafts', () => {
    const handoff = read('lib/orb/orb-chat-chip-handoff.ts')
    assert.match(handoff, /activity_record/)
    assert.match(handoff, /bedtime_routine_record/)
    assert.match(handoff, /ACTIVITY_PROMPT_RE/)
    assert.match(handoff, /BEDTIME_PROMPT_RE/)
  })

  it('duplicate Save to Records & Drafts chip is deduped by action and label', () => {
    const handoff = read('lib/orb/orb-chat-chip-handoff.ts')
    assert.match(handoff, /function suggestionKey/)
    assert.match(handoff, /\$\{item\.action\}:\$\{item\.label/)
  })
})

describe('Flow 1 breakfast daily record visible chips', () => {
  it('detects structured daily record handoff from prompt and answer', () => {
    const ctx = breakfastChipContext()
    assert.equal(isDailyRecordHandoffChipContext(ctx), true)
  })

  it('browser-visible chip list equals ORB Write then Save for breakfast/handover prompt', () => {
    const ctx = breakfastChipContext()
    const merged = mergeFollowUpsWithTemplateSuggestions(
      contextualResidentialCalmFollowUps({
        mode: 'record',
        messageHint: ctx.messageHint,
        content: ctx.content
      }),
      taxonomyNoiseChips(),
      3,
      ctx
    )
    assert.deepEqual(
      merged.map((chip) => chip.label),
      ['Open in ORB Write using Daily Record template', 'Save to Records & Drafts']
    )
  })

  it('suppresses activity and bedtime routine template chips for breakfast prompt', () => {
    const ctx = breakfastChipContext()
    const filtered = filterVisibleChatChips(taxonomyNoiseChips(), ctx, 3)
    assert.ok(!filtered.some((chip) => /activity record template/i.test(chip.label)))
    assert.ok(!filtered.some((chip) => /bedtime routine record template/i.test(chip.label)))
  })

  it('keeps Open in ORB Write action with daily_record template id', () => {
    const [primary] = buildDailyRecordHandoffChips()
    assert.equal(primary.action, 'use_template_in_write')
    assert.equal(primary.template_id, 'daily_record')
    assert.match(primary.label, /Open in ORB Write using Daily Record template/)
  })

  it('shows Save to Records & Drafts exactly once after merge and filter', () => {
    const ctx = breakfastChipContext()
    const merged = mergeFollowUpsWithTemplateSuggestions(
      [
        { action: 'save_to_records', label: 'Save to Records & Drafts' },
        { action: 'what_missing', label: 'What may be missing?' }
      ],
      buildDailyRecordHandoffChips(),
      3,
      ctx
    )
    const saveChips = merged.filter((chip) => chip.action === 'save_to_records')
    assert.equal(saveChips.length, 1)
    assert.equal(saveChips[0]?.label, 'Save to Records & Drafts')
  })

  it('final visible chip dedupe runs after all sources merge', () => {
    const ctx = breakfastChipContext()
    const duplicateSave = [
      { action: 'save_to_records' as const, label: 'Save to Records & Drafts' },
      { action: 'save_to_records' as const, label: 'Save to Records & Drafts' },
      ...taxonomyNoiseChips().slice(1)
    ]
    const keys = new Set<string>()
    const filtered = filterVisibleChatChips(duplicateSave, ctx, 3)
    for (const chip of filtered) {
      const key = suggestionKey(chip)
      assert.equal(keys.has(key), false)
      keys.add(key)
    }
    assert.equal(filtered.length, 2)
  })

  it('calm residential follow-ups stay empty for structured daily record drafts', () => {
    const ctx = breakfastChipContext()
    const followUps = contextualResidentialCalmFollowUps({
      mode: 'record',
      messageHint: ctx.messageHint,
      content: ctx.content
    })
    assert.deepEqual(followUps, [])
  })
})

describe('visible final answer daily record draft formatting', () => {
  it('preserves punctuation, headings and bullet lines for browser rendering', () => {
    const cleaned = sanitizeVisibleFinalAnswer(STRUCTURED_DAILY_DRAFT, BREAKFAST_DAILY_PROMPT)
    assert.match(cleaned, /### Staff response/)
    assert.match(cleaned, /breakfast\. They chose toast\./)
    assert.match(cleaned, /- Add the time\./)
    assert.match(cleaned, /- Add who was present\./)
    assert.match(cleaned, /- Add anything the young person said or communicated\./)
    assert.match(cleaned, /- Add any relevant follow-up, if needed\./)
    assert.doesNotMatch(cleaned, /staff response:/i)
  })

  it('To complete before saving bullets remain separate markdown list items', () => {
    const cleaned = sanitizeVisibleFinalAnswer(STRUCTURED_DAILY_DRAFT, BREAKFAST_DAILY_PROMPT)
    const bulletLines = cleaned
      .split('\n')
      .filter((line) => line.trim().startsWith('- '))
      .map((line) => line.trim())
    assert.deepEqual(bulletLines, [
      '- Add the time.',
      '- Add who was present.',
      '- Add anything the young person said or communicated.',
      '- Add any relevant follow-up, if needed.'
    ])
  })
})
