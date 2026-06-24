import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

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

describe('orb chat template suggestions contracts', () => {
  it('daily_record intent ranks Daily Record template first for routine draft answers', () => {
    const suggestions = read('lib/orb/orb-chat-template-suggestions.ts')
    assert.match(suggestions, /isRoutineDailyRecordDraftContext/)
    assert.match(suggestions, /dailyRecordTemplateChip\(\)/)
    assert.match(suggestions, /dailyRecordSaveChip\(\)/)
    assert.match(suggestions, /ROUTINE_DAILY_UNRELATED_TEMPLATES/)
    assert.match(suggestions, /shouldSuggestTemplateForRoutineDailyRecord/)
  })

  it('activity_record and bedtime_routine are filtered for routine daily record drafts', () => {
    const suggestions = read('lib/orb/orb-chat-template-suggestions.ts')
    assert.match(suggestions, /activity_record/)
    assert.match(suggestions, /bedtime_routine_record/)
    assert.match(suggestions, /ACTIVITY_PROMPT_RE/)
    assert.match(suggestions, /BEDTIME_PROMPT_RE/)
  })

  it('duplicate Save to Records & Drafts chip is deduped by action and label', () => {
    const suggestions = read('lib/orb/orb-chat-template-suggestions.ts')
    assert.match(suggestions, /function suggestionKey/)
    assert.match(suggestions, /\$\{item\.action\}:\$\{item\.label/)
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
