import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildDailyRecordHandoffChips,
  buildIncidentReflectionHandoffChips,
  filterVisibleChatChips,
  isDailyRecordHandoffChipContext,
  isQ1DailyRecordingContractAnswer,
  isQ1IncidentRecordingContractAnswer,
  mergeFollowUpsWithTemplateSuggestions
} from './orb-chat-chip-handoff.ts'

const REG_B_PROMPT =
  'A young person shouted at staff, pushed a chair over and went to their bedroom after being told they could not have extra screen time. Staff gave them space, checked they were safe, and later completed a restorative conversation. Help me write this as a safe, factual, therapeutic incident reflection that avoids blame and shows what adults did to support the young person.'

const REG_A_PROMPT =
  'A young person became upset after contact and refused to join the evening meal. Staff gave them space, checked in calmly, and later supported them to talk about what had happened. Help me write this as a therapeutic, child-centred daily record.'

const Q1_INCIDENT_ANSWER = `## Draft record

**Incident reflection**

After being told they could not have extra screen time, [Young Person] shouted at staff, pushed a chair over and went to their bedroom. Staff gave [Young Person] space. Staff checked they were safe. Later, staff offered [Young Person] the opportunity to talk about what had happened.

**[Young Person]'s words (if known):** [Add exact words if known.]

**Outcome / follow-up:** [Add outcome or follow-up.]

## What to add before sign-off

- Exact times and location
- Handover for the next shift if needed

## Why this wording is safer

This reflection records the screen-time boundary without blame.`

const Q1_DAILY_ANSWER = `## Draft record

**Daily record**

Following family contact, [Young Person] appeared upset and was not ready to join the evening meal at first. Staff gave [Young Person] space.

**[Young Person]'s words (if known):** [Add exact words if known.]

**Outcome / follow-up:** [Add outcome or follow-up.]

## What to add before sign-off

- Share with the manager or key worker if this links to a pattern, concern, or agreed support plan

## Why this wording is safer

This record stays factual and child-centred.`

describe('Q1.4 chat template routing', () => {
  it('detects Q1 incident recording contract answers', () => {
    assert.equal(isQ1IncidentRecordingContractAnswer(Q1_INCIDENT_ANSWER, REG_B_PROMPT), true)
    assert.equal(isQ1DailyRecordingContractAnswer(Q1_DAILY_ANSWER, REG_A_PROMPT), true)
    assert.equal(isQ1IncidentRecordingContractAnswer(Q1_DAILY_ANSWER, REG_A_PROMPT), false)
  })

  it('incident Q1 answer offers Incident Reflection template, not Daily Record', () => {
    const ctx = { content: Q1_INCIDENT_ANSWER, messageHint: REG_B_PROMPT }
    assert.equal(isDailyRecordHandoffChipContext(ctx), false)
    const chips = mergeFollowUpsWithTemplateSuggestions([], buildIncidentReflectionHandoffChips(), 3, ctx)
    assert.match(chips[0]?.label || '', /Incident Reflection template/)
    assert.ok(!chips.some((chip) => /Daily Record template/i.test(chip.label)))
  })

  it('daily Q1 answer still offers Daily Record template', () => {
    const ctx = { content: Q1_DAILY_ANSWER, messageHint: REG_A_PROMPT }
    assert.equal(isDailyRecordHandoffChipContext(ctx), true)
    const chips = filterVisibleChatChips(buildDailyRecordHandoffChips(), ctx, 3)
    assert.match(chips[0]?.label || '', /Daily Record template/)
  })

  it('incident handoff uses incident template id', () => {
    const [primary] = buildIncidentReflectionHandoffChips()
    assert.equal(primary.template_id, 'incident')
    assert.match(primary.label, /Incident Reflection template/)
  })
})
