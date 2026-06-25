import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'

import {
  filterReviewEventsByDataMode,
  getDefaultPatternDetectionFilters,
  getLabDataModeConfig,
  getVisibleReviewEvents,
  isInvestorSafeView,
  normalizeReviewEventOrigin
} from '@/lib/indicare-lab/lab-data-mode'
import { buildLabOverviewMetrics } from '@/lib/indicare-lab/lab-overview-metrics'
import { detectPatternsFromReviewEvents } from '@/lib/indicare-lab/patterns/pattern-detection-engine'
import { SEEDED_REVIEW_EVENTS } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import { resetReviewEventStoreForTests } from '@/lib/indicare-lab/review-events/review-event-storage'
import type { ReviewEvent } from '@/lib/indicare-lab/review-events/types'
import { generateEvidenceSuggestions } from '@/lib/indicare-lab/suggestions/evidence-suggestion-engine'

function makeShadowEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  const base = SEEDED_REVIEW_EVENTS[1]!
  return {
    ...base,
    id: 'rev-shadow-test-001',
    origin: 'shadow-review',
    isRedacted: true,
    fullTextStored: false,
    status: 'rewrite',
    riskLevel: 'high',
    createdAt: '2026-06-25T12:00:00Z',
    ...overrides
  }
}

describe('IndiCare Lab Phase 6 — real data mode', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    resetReviewEventStoreForTests()
  })

  beforeEach(() => {
    resetReviewEventStoreForTests()
  })

  it('hides seeded demo events in real-shadow-review mode', () => {
    const config = {
      showDemoData: false,
      investorSafeView: true,
      mode: 'real-shadow-review' as const
    }

    const visible = filterReviewEventsByDataMode(SEEDED_REVIEW_EVENTS, config)
    assert.equal(visible.length, 0)
  })

  it('shows seeded demo events in development-demo mode', () => {
    const config = {
      showDemoData: true,
      investorSafeView: false,
      mode: 'development-demo' as const
    }

    const visible = filterReviewEventsByDataMode(SEEDED_REVIEW_EVENTS, config)
    assert.equal(visible.length, SEEDED_REVIEW_EVENTS.length)
  })

  it('returns empty visible shadow events when no real events exist', () => {
    const config = {
      showDemoData: false,
      investorSafeView: true,
      mode: 'real-shadow-review' as const
    }

    const visible = getVisibleReviewEvents(SEEDED_REVIEW_EVENTS, {
      originFilter: 'shadow-review',
      config
    })

    assert.equal(visible.length, 0)
  })

  it('does not generate suggestions from demo events when real evidence is required', () => {
    const result = generateEvidenceSuggestions({
      reviewEvents: SEEDED_REVIEW_EVENTS,
      patterns: [],
      evaluationRuns: [],
      approvalItems: [],
      requireRealEvidence: true
    })

    const shadowSuggestions = result.realSuggestions.filter((s) =>
      s.evidenceSources.some((e) => e.type === 'shadow-review-event')
    )
    assert.equal(shadowSuggestions.length, 0)
  })

  it('generates suggestions from real shadow review events', () => {
    const shadowEvent = makeShadowEvent()

    const result = generateEvidenceSuggestions({
      reviewEvents: [shadowEvent],
      patterns: [],
      evaluationRuns: [],
      approvalItems: [],
      requireRealEvidence: true
    })

    assert.ok(result.realSuggestions.length > 0)
    assert.ok(
      result.realSuggestions.some((s) =>
        s.evidenceSources.some((e) => e.type === 'shadow-review-event' && e.id === shadowEvent.id)
      )
    )
  })

  it('labels synthetic benchmark suggestions as synthetic evidence', () => {
    const result = generateEvidenceSuggestions({
      reviewEvents: [],
      patterns: [],
      evaluationRuns: [
        {
          id: 'erun-test-001',
          scenarioId: 'bench-safeguarding-escalation-001',
          status: 'completed',
          draftAnswer: 'Weak answer',
          createdAt: '2026-06-25T12:00:00Z',
          completedAt: '2026-06-25T12:00:00Z',
          isDevelopment: true,
          isInternalEvaluation: true,
          result: {
            id: 'eres-test-001',
            scenarioId: 'bench-safeguarding-escalation-001',
            draftAnswer: 'Weak answer',
            evaluatedAt: '2026-06-25T12:00:00Z',
            isDevelopment: true,
            isInternalEvaluation: true,
            scorecard: {
              overallScore: 1.5,
              overallScoreOutOf: 5,
              classification: 'fail',
              dimensionScores: [],
              findings: [],
              blockers: ['Safeguarding failure'],
              recommendedImprovements: ['Add escalation'],
              safetyConcerns: ['Missing escalation']
            }
          }
        }
      ],
      approvalItems: [],
      requireRealEvidence: true
    })

    const benchmarkSuggestions = result.suggestions.filter((s) => s.isSyntheticEvidence)
    assert.ok(benchmarkSuggestions.length > 0)
    assert.ok(benchmarkSuggestions.every((s) => s.evidenceSources.every((e) => e.isSynthetic)))
  })

  it('overview metrics do not show fake Brain Quality Index in real mode', () => {
    const metrics = buildLabOverviewMetrics({
      reviewSummary: {
        total: 0,
        byStatus: {
          pass: 0,
          rewrite: 0,
          blocked: 0,
          'needs-founder-review': 0,
          reviewed: 0
        },
        byRisk: { critical: 0, high: 0, medium: 0, low: 0 },
        bySource: {},
        needsFounderAttention: 0,
        developmentModeCount: 0
      },
      reviewEvents: [],
      patterns: [],
      pendingApprovals: 0,
      evaluationSummary: undefined,
      suggestions: [],
      investorSafeView: true
    })

    const brainQuality = metrics.find((m) => m.id === 'brain-quality')
    assert.ok(brainQuality)
    assert.equal(brainQuality.value, 'Awaiting real evidence')
    assert.ok(!brainQuality.value.includes('72'))
  })

  it('investor-safe view excludes demo data from visible events', () => {
    const events = [...SEEDED_REVIEW_EVENTS, makeShadowEvent({ id: 'rev-shadow-002' })]

    const visible = getVisibleReviewEvents(events, {
      config: {
        showDemoData: false,
        investorSafeView: true
      }
    })

    assert.equal(visible.length, 1)
    assert.equal(normalizeReviewEventOrigin(visible[0]!.origin), 'shadow-review')
  })

  it('pattern detection respects origin filters', () => {
    const shadowOnly = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS, {
      includeDemoEvents: false,
      includeInternalTests: false,
      includeShadowReviewEvents: true,
      includeBenchmarkGenerated: false
    })

    assert.equal(shadowOnly.analysedEventCount, 0)
    assert.equal(shadowOnly.patterns.length, 0)

    const demoIncluded = detectPatternsFromReviewEvents(SEEDED_REVIEW_EVENTS, {
      includeDemoEvents: true,
      includeInternalTests: false,
      includeShadowReviewEvents: true,
      includeBenchmarkGenerated: false
    })

    assert.equal(demoIncluded.analysedEventCount, 4)
    assert.ok(demoIncluded.patterns.length > 0)
  })

  it('normalizes legacy review event origins', () => {
    assert.equal(normalizeReviewEventOrigin('seeded'), 'seeded-demo')
    assert.equal(normalizeReviewEventOrigin('internal-test'), 'internal-review-test')
    assert.equal(normalizeReviewEventOrigin('shadow-review'), 'shadow-review')
  })

  it('defaults investor-safe view in real-shadow-review mode', () => {
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_INDICARE_LAB_DATA_MODE = 'real-shadow-review'

    assert.equal(isInvestorSafeView(), true)

    const config = getLabDataModeConfig()
    assert.equal(config.showDemoData, false)
  })

  it('getDefaultPatternDetectionFilters excludes demo in investor-safe view', () => {
    const filters = getDefaultPatternDetectionFilters({
      showDemoData: false,
      investorSafeView: true,
      mode: 'real-shadow-review'
    })

    assert.equal(filters.includeDemoEvents, false)
    assert.equal(filters.includeInternalTests, false)
    assert.equal(filters.includeShadowReviewEvents, true)
  })
})
