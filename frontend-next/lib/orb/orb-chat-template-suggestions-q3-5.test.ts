import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildHighRiskSafeguardingHandoffChips,
  filterVisibleChatChips,
  isHighRiskSafeguardingChipContext,
  mergeFollowUpsWithTemplateSuggestions
} from './orb-chat-chip-handoff.ts'

const C1_LIGATURE_PROMPT =
  "A young person said they wanted to die and tried to harm themselves using a ligature. Staff removed the ligature, stayed with them, called the manager and followed the home's safeguarding procedure. Help me write an incident reflection with escalation."

const C2_DISCLOSURE_PROMPT =
  'A young person disclosed that an adult hurt them during contact. Help me write a safe incident reflection and what staff should do next.'

const MISLEADING_TEMPLATE_CHIPS = [
  {
    action: 'use_template_in_write',
    label: 'Use damage to property reflection template',
    template_id: 'damage_property_reflection'
  },
  {
    action: 'use_template_in_write',
    label: 'Use de-escalation reflection template',
    template_id: 'de_escalation_reflection'
  },
  {
    action: 'use_template_in_write',
    label: 'Use incident record template',
    template_id: 'incident'
  }
] as const

describe('Q3.5 high-risk safeguarding chip handoff', () => {
  it('detects C1 and C2 as high-risk safeguarding chip contexts', () => {
    assert.ok(isHighRiskSafeguardingChipContext({ content: '', messageHint: C1_LIGATURE_PROMPT }))
    assert.ok(isHighRiskSafeguardingChipContext({ content: '', messageHint: C2_DISCLOSURE_PROMPT }))
  })

  it('prefers safeguarding, incident, manager oversight and save chips for C1', () => {
    const chips = filterVisibleChatChips(
      [...MISLEADING_TEMPLATE_CHIPS, ...buildHighRiskSafeguardingHandoffChips()],
      { content: 'Safeguarding reflection draft', messageHint: C1_LIGATURE_PROMPT }
    )
    const labels = chips.map((chip) => chip.label)
    assert.ok(labels.some((label) => /safeguarding concern record template/i.test(label)))
    assert.ok(labels.some((label) => /incident reflection template/i.test(label)))
    assert.ok(labels.some((label) => /manager oversight/i.test(label)))
    assert.ok(labels.some((label) => /save to records/i.test(label)))
    assert.ok(!labels.some((label) => /damage to property/i.test(label)))
    assert.ok(!labels.some((label) => /de-escalation reflection/i.test(label)))
  })

  it('filters misleading template chips for C2 disclosure prompt', () => {
    const merged = mergeFollowUpsWithTemplateSuggestions(
      [],
      [...MISLEADING_TEMPLATE_CHIPS],
      3,
      { content: 'Disclosure reflection', messageHint: C2_DISCLOSURE_PROMPT }
    )
    const labels = merged.map((chip) => chip.label)
    assert.ok(!labels.some((label) => /damage to property/i.test(label)))
    assert.ok(!labels.some((label) => /de-escalation reflection/i.test(label)))
    assert.ok(labels.some((label) => /safeguarding concern record template/i.test(label)))
  })
})
