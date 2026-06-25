import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  evidenceLinkForReviewEvent,
  logFounderAction
} from '@/lib/indicare-lab/governance/founder-action-service'
import {
  filterReviewEventsByDataMode,
  getVisibleReviewEvents
} from '@/lib/indicare-lab/lab-data-mode'
import { SEEDED_REVIEW_EVENTS } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import { resetReviewEventStoreForTests } from '@/lib/indicare-lab/review-events/review-event-storage'
import type { ReviewEvent } from '@/lib/indicare-lab/review-events/types'
import {
  guardReviewEventForStorage,
  guardSuggestionForStorage
} from '@/lib/indicare-lab/storage/lab-storage-guard'
import {
  createAuditEvent,
  createFounderActionLog,
  createSuggestion,
  getEvidenceTimeline,
  getLabStorageStats,
  listAuditEvents,
  listFounderActionLogs,
  resetLabStorageForTests,
  storeShadowReviewEvent
} from '@/lib/indicare-lab/storage/lab-storage'
import type { LabSuggestion } from '@/lib/indicare-lab/suggestions/types'

function makeShadowEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  const base = SEEDED_REVIEW_EVENTS[1]!
  return {
    ...base,
    id: `rev-shadow-storage-${Date.now()}`,
    origin: 'shadow-review',
    prompt: 'Contact admin@example.com about Jay Smith incident.',
    draftAnswer:
      'Staff observed Jay Smith at 07123456789. The child was defiant and staff chose to sanction them because they refused to behave. '.repeat(
        20
      ),
    isRedacted: false,
    fullTextStored: true,
    status: 'rewrite',
    riskLevel: 'high',
    createdAt: new Date().toISOString(),
    ...overrides
  }
}

function makeSuggestion(overrides: Partial<LabSuggestion> = {}): LabSuggestion {
  return {
    id: 'sug-test-001',
    title: 'Improve therapeutic language',
    category: 'safety',
    description: 'Email admin@example.com for details about judgemental language patterns.',
    whyItMatters: 'Labelling language increases risk in records.',
    evidenceSources: [
      {
        type: 'shadow-review-event',
        id: 'rev-shadow-test',
        label: 'Shadow review',
        isSynthetic: false
      }
    ],
    evidenceStrength: 'moderate',
    confidence: 'medium',
    riskLevel: 'high',
    affectedOrbStations: ['orb-chat'],
    affectedTaskTypes: ['chat-response'],
    recommendedAction: 'Review prompt guidance for trauma-informed phrasing.',
    approvalRequirement: 'Founder review',
    suggestedBenchmarkRetest: null,
    buildBriefTitle: 'Therapeutic language improvement',
    status: 'new',
    createdAt: new Date().toISOString(),
    isSyntheticEvidence: false,
    ...overrides
  }
}

describe('IndiCare Lab Phase 7 — persistent storage and governance', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    resetLabStorageForTests()
    process.env.INDICARE_LAB_STORE_FULL_TEXT = 'false'
    process.env.INDICARE_LAB_REDACT_NAMES = 'true'
    process.env.INDICARE_LAB_MAX_REVIEW_TEXT_LENGTH = '200'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    resetReviewEventStoreForTests()
  })

  it('storage guard redacts and trims review events', () => {
    const guarded = guardReviewEventForStorage(makeShadowEvent())

    assert.equal(guarded.fullTextBlocked, true)
    assert.equal(guarded.data.fullTextStored, false)
    assert.equal(guarded.wasRedacted, true)
    assert.ok(guarded.data.draftAnswer.includes('[contact removed]'))
    assert.ok(guarded.data.draftAnswer.length <= 220)
    assert.equal(guarded.storageClassification, 'redacted')
  })

  it('storage guard blocks accidental full-text storage unless enabled', () => {
    process.env.INDICARE_LAB_STORE_FULL_TEXT = 'false'
    const blocked = guardReviewEventForStorage(makeShadowEvent())
    assert.equal(blocked.data.fullTextStored, false)
    assert.equal(blocked.fullTextBlocked, true)

    process.env.INDICARE_LAB_STORE_FULL_TEXT = 'true'
    const allowed = guardReviewEventForStorage(makeShadowEvent())
    assert.equal(allowed.data.fullTextStored, true)
    assert.equal(allowed.fullTextBlocked, false)
    assert.equal(allowed.storageClassification, 'full-text-enabled')
  })

  it('storage guard redacts and trims suggestions', () => {
    const guarded = guardSuggestionForStorage(makeSuggestion())

    assert.ok(guarded.data.description.includes('[contact removed]'))
    assert.ok(guarded.data.description.length <= 220)
    assert.equal(guarded.storageClassification, 'redacted')
  })

  it('creates founder action logs with evidence links', () => {
    const log = createFounderActionLog({
      actionType: 'approve',
      actorType: 'founder',
      targetType: 'approval-item',
      targetId: 'approval-test-001',
      riskLevel: 'high',
      evidenceLinks: [{ type: 'approval-item', id: 'approval-test-001' }]
    })

    assert.equal(log.actionType, 'approve')
    assert.equal(log.actorType, 'founder')
    assert.equal(listFounderActionLogs().length, 1)
  })

  it('creates audit events when storing shadow review events', () => {
    storeShadowReviewEvent(makeShadowEvent())

    const audits = listAuditEvents({ eventType: 'review-event-captured' })
    assert.ok(audits.length >= 1)
    assert.equal(audits[0]!.actorType, 'system')
  })

  it('orders evidence timeline chronologically', () => {
    const older = makeShadowEvent({
      id: 'rev-older',
      createdAt: '2026-06-20T10:00:00Z'
    })
    const newer = makeShadowEvent({
      id: 'rev-newer',
      createdAt: '2026-06-25T14:00:00Z'
    })

    storeShadowReviewEvent(older)
    storeShadowReviewEvent(newer)

    logFounderAction({
      actionType: 'mark-reviewed',
      targetType: 'review-event',
      targetId: newer.id,
      riskLevel: 'high',
      evidenceLinks: [evidenceLinkForReviewEvent(newer.id)]
    })

    const timeline = getEvidenceTimeline({ includeDemo: true, includeSynthetic: true })
    assert.ok(timeline.length >= 2)

    for (let i = 1; i < timeline.length; i++) {
      const prev = new Date(timeline[i - 1]!.createdAt).getTime()
      const curr = new Date(timeline[i]!.createdAt).getTime()
      assert.ok(prev >= curr, 'Timeline should be newest first')
    }
  })

  it('uses memory repository fallback by default', () => {
    const stats = getLabStorageStats()
    assert.equal(stats.backend, 'memory-fallback')
  })

  it('persists suggestions through storage repository', () => {
    createSuggestion(makeSuggestion())
    const stats = getLabStorageStats()
    assert.equal(stats.suggestionCount, 1)
  })

  it('investor-safe mode still hides demo data in timeline', () => {
    const timeline = getEvidenceTimeline({
      includeDemo: false,
      includeSynthetic: false
    })

    const demoEntries = timeline.filter((entry) => entry.isDemo)
    assert.equal(demoEntries.length, 0)
  })

  it('real mode shows honest empty states when no shadow events exist', () => {
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

    const filtered = filterReviewEventsByDataMode(SEEDED_REVIEW_EVENTS, config)
    assert.equal(filtered.length, 0)

    const timeline = getEvidenceTimeline({
      includeDemo: false,
      includeSynthetic: false
    })
    const shadowEntries = timeline.filter((e) => e.entryType === 'review-event' && !e.isDemo)
    assert.equal(shadowEntries.length, 0)
  })

  it('logFounderAction service creates governance and audit records', () => {
    logFounderAction({
      actionType: 'dismiss',
      targetType: 'suggestion',
      targetId: 'sug-dismiss-001',
      riskLevel: 'medium'
    })

    assert.equal(listFounderActionLogs().length, 1)
    const audits = listAuditEvents()
    assert.ok(audits.some((e) => e.eventType === 'founder-action'))
    assert.ok(audits.some((e) => e.eventType === 'governance-decision'))
  })

  it('createAuditEvent records standalone audit entries', () => {
    createAuditEvent({
      eventType: 'storage-guard-applied',
      actorType: 'system',
      targetType: 'review-event',
      targetId: 'rev-guard-test',
      summary: 'Storage guard applied minimisation rules'
    })

    assert.ok(listAuditEvents({ eventType: 'storage-guard-applied' }).length >= 1)
  })
})
