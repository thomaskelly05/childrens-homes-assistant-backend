import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'

import {
  generateBuildBriefFromPattern,
  patternToApprovalItem
} from '@/lib/indicare-lab/patterns/pattern-actions'
import {
  detectPatternsFromReviewEvents,
  getMostCommonRewriteReason
} from '@/lib/indicare-lab/patterns/pattern-detection-engine'
import { isPatternApprovalEligible } from '@/lib/indicare-lab/patterns/types'
import { SEEDED_REVIEW_EVENTS } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import { resetReviewEventStoreForTests } from '@/lib/indicare-lab/review-events/review-event-storage'
import type { ReviewEvent } from '@/lib/indicare-lab/review-events/types'

describe('IndiCare Lab pattern detection', () => {
  beforeEach(() => {
    resetReviewEventStoreForTests()
  })

  it('detects patterns from seeded review events', () => {
    const result = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS)

    assert.ok(result.patterns.length > 0, 'should detect at least one pattern from seeded events')
    assert.equal(result.analysedEventCount, 4)
    assert.ok(result.detectedAt)
  })

  it('detects missing child voice pattern', () => {
    const result = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS)
    const childVoicePattern = result.patterns.find((p) =>
      p.title.toLowerCase().includes('child voice')
    )

    assert.ok(childVoicePattern, 'should detect missing child voice pattern')
    assert.equal(childVoicePattern.area, 'brain')
    assert.ok(childVoicePattern.relatedEventIds.includes('rev-seed-001'))
    assert.ok(childVoicePattern.frequency >= 1)
  })

  it('detects weak safeguarding escalation pattern', () => {
    const result = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS)
    const safeguardingPattern = result.patterns.find((p) =>
      p.title.toLowerCase().includes('safeguarding escalation')
    )

    assert.ok(safeguardingPattern, 'should detect weak safeguarding escalation pattern')
    assert.equal(safeguardingPattern.area, 'safety')
    assert.equal(safeguardingPattern.riskLevel, 'critical')
    assert.ok(safeguardingPattern.relatedEventIds.includes('rev-seed-001'))
  })

  it('detects judgemental language pattern', () => {
    const result = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS)
    const judgementalPattern = result.patterns.find((p) =>
      p.title.toLowerCase().includes('judgemental')
    )

    assert.ok(judgementalPattern, 'should detect judgemental language pattern')
    assert.ok(judgementalPattern.relatedEventIds.includes('rev-seed-002'))
    assert.equal(judgementalPattern.riskLevel, 'high')
  })

  it('groups station and task type frequency patterns', () => {
    const extraEvents: ReviewEvent[] = [
      ...SEEDED_REVIEW_EVENTS,
      {
        ...SEEDED_REVIEW_EVENTS[1]!,
        id: 'rev-extra-chat-001',
        source: 'orb-chat',
        taskType: 'chat-response',
        status: 'rewrite',
        riskLevel: 'high',
        createdAt: '2026-06-25T10:00:00Z'
      },
      {
        ...SEEDED_REVIEW_EVENTS[1]!,
        id: 'rev-extra-chat-002',
        source: 'orb-chat',
        taskType: 'chat-response',
        status: 'rewrite',
        riskLevel: 'high',
        createdAt: '2026-06-25T11:00:00Z'
      }
    ]

    const result = detectPatternsFromReviewEvents(extraEvents)

    const stationPattern = result.patterns.find((p) =>
      p.title.toLowerCase().includes('repeated high-risk events')
    )
    const taskPattern = result.patterns.find((p) =>
      p.title.toLowerCase().includes('repeated rewrite recommendations')
    )

    assert.ok(stationPattern || taskPattern, 'should detect station or task frequency grouping')
    if (stationPattern) {
      assert.ok(stationPattern.affectedSources.includes('orb-chat'))
      assert.ok(stationPattern.frequency >= 2)
    }
    if (taskPattern) {
      assert.ok(taskPattern.affectedTaskTypes.includes('chat-response'))
      assert.ok(taskPattern.frequency >= 2)
    }
  })

  it('generates build brief from a detected pattern', () => {
    const result = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS)
    const pattern = result.patterns[0]!

    const brief = generateBuildBriefFromPattern(pattern)

    assert.ok(brief.id.startsWith('brief-pattern-'))
    assert.equal(brief.title, pattern.suggestedBuildBriefTitle)
    assert.ok(brief.objective.includes('Problem:'))
    assert.ok(brief.scope.some((s) => s.includes('Affected ORB stations')))
    assert.ok(brief.scope.some((s) => s.includes('residential childcare')))
    assert.ok(brief.scope.some((s) => s.startsWith('Evidence:')))
    assert.ok(brief.constraints.some((c) => c.includes('founder approval')))
    assert.ok(brief.acceptanceCriteria.some((c) => c.includes('Founder sign-off')))
    assert.ok(brief.riskNotes.includes(pattern.riskLevel))
  })

  it('high-risk or repeated patterns are approval-eligible', () => {
    const result = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS)
    const criticalPattern = result.patterns.find((p) => p.riskLevel === 'critical')

    assert.ok(criticalPattern, 'should have a critical risk pattern')
    assert.equal(isPatternApprovalEligible(criticalPattern), true)

    const approvalItem = patternToApprovalItem(criticalPattern)
    assert.ok(approvalItem.id.startsWith('appr-pattern-'))
    assert.equal(approvalItem.status, 'pending')
    assert.ok(approvalItem.evidence.length > 0)
  })

  it('identifies most common rewrite reason from review events', () => {
    const reason = getMostCommonRewriteReason(SEEDED_REVIEW_EVENTS)
    assert.ok(reason, 'should find a rewrite reason in seeded events')
    assert.ok(reason.length > 0)
  })
})

describe('IndiCare Lab review event repository', () => {
  beforeEach(() => {
    resetReviewEventStoreForTests()
  })

  it('supports listReviewEventsByPatternInputs via storage', async () => {
    const { listReviewEventsByPatternInputs } = await import(
      '@/lib/indicare-lab/review-events/review-event-storage'
    )

    const events = listReviewEventsByPatternInputs({
      agentFlags: ['escalation'],
      minRiskLevel: 'high'
    })

    assert.ok(events.length >= 1)
    assert.ok(events.some((e) => e.id === 'rev-seed-001'))
  })
})
