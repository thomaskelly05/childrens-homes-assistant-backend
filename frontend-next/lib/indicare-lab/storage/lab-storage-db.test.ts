import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { FounderPersistenceApiError } from '@/lib/founder/persistence/founder-api-client'
import { SEEDED_REVIEW_EVENTS } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import { resetReviewEventStoreForTests } from '@/lib/indicare-lab/review-events/review-event-storage'
import type { ReviewEvent } from '@/lib/indicare-lab/review-events/types'
import { guardReviewEventForStorage } from '@/lib/indicare-lab/storage/lab-storage-guard'
import {
  getLabStorageMode,
  isLabDatabaseStorageConfiguredSafely,
  isLabDatabaseStorageEnabled
} from '@/lib/indicare-lab/storage/lab-storage-config'
import {
  LAB_PERSISTENCE_ENTITY_SLUGS,
  type LabReviewEventRecord
} from '@/lib/indicare-lab/storage/lab-storage-persistence-types'
import {
  __setLabPersistenceApiForTests,
  persistLabRecord
} from '@/lib/indicare-lab/storage/lab-storage-persistence-client'
import {
  createLabDatabaseStorageRepository,
  getLabDatabaseAdapterStatus
} from '@/lib/indicare-lab/storage/lab-storage-db-adapter'
import {
  getLabStorageStats,
  resetLabStorageForTests
} from '@/lib/indicare-lab/storage/lab-storage'
import {
  getLabStorageWriteHealth,
  resetLabStorageWriteHealthForTests
} from '@/lib/indicare-lab/storage/lab-storage-write-health'

function makeShadowEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  const base = SEEDED_REVIEW_EVENTS[1]!
  return {
    ...base,
    id: `rev-shadow-db-${Date.now()}`,
    origin: 'shadow-review',
    prompt: 'Contact admin@example.com about Jay Smith incident.',
    draftAnswer:
      'Staff observed Jay Smith at 07123456789. The child was defiant and staff chose to sanction them. '.repeat(
        10
      ),
    isRedacted: false,
    fullTextStored: true,
    status: 'rewrite',
    riskLevel: 'high',
    createdAt: new Date().toISOString(),
    ...overrides
  }
}

describe('IndiCare Lab Phase 8 — database-backed storage', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    resetLabStorageForTests()
    resetLabStorageWriteHealthForTests()
    __setLabPersistenceApiForTests(null)
    process.env.INDICARE_LAB_STORE_FULL_TEXT = 'false'
    process.env.INDICARE_LAB_REDACT_NAMES = 'true'
    process.env.INDICARE_LAB_MAX_REVIEW_TEXT_LENGTH = '200'
    process.env.NODE_ENV = 'test'
    delete process.env.INDICARE_LAB_STORAGE_MODE
    delete process.env.FOUNDER_PERSISTENCE_DEV_FALLBACK
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    resetReviewEventStoreForTests()
    __setLabPersistenceApiForTests(null)
  })

  it('defaults to memory mode in test environment', () => {
    assert.equal(getLabStorageMode(), 'memory')
    assert.equal(isLabDatabaseStorageEnabled(), false)
  })

  it('respects explicit INDICARE_LAB_STORAGE_MODE=database only when configured safely', () => {
    process.env.INDICARE_LAB_STORAGE_MODE = 'database'
    process.env.FOUNDER_PERSISTENCE_DEV_FALLBACK = 'true'
    assert.equal(getLabStorageMode(), 'database')
    assert.equal(isLabDatabaseStorageConfiguredSafely(), false)
    assert.equal(isLabDatabaseStorageEnabled(), false)

    process.env.FOUNDER_PERSISTENCE_DEV_FALLBACK = 'false'
    process.env.NODE_ENV = 'production'
    assert.equal(isLabDatabaseStorageConfiguredSafely(), true)
    assert.equal(isLabDatabaseStorageEnabled(), true)
  })

  it('database adapter is ready and maps review events to lab-review-events slug', async () => {
    assert.equal(getLabDatabaseAdapterStatus(), 'ready')

    const createCalls: Array<{ slug: string; record: Record<string, unknown> }> = []
    __setLabPersistenceApiForTests({
      create: async (slug, record) => {
        createCalls.push({ slug, record })
        return record
      },
      update: async () => ({}),
      list: async () => ({ items: [], count: 0 })
    })

    const repo = createLabDatabaseStorageRepository()
    const stored = repo.storeShadowReviewEvent(makeShadowEvent())

    await new Promise((resolve) => setTimeout(resolve, 10))

    const reviewPersist = createCalls.find((call) => call.slug === LAB_PERSISTENCE_ENTITY_SLUGS.reviewEvent)
    assert.ok(reviewPersist)
    const payload = reviewPersist!.record as LabReviewEventRecord
    assert.equal(payload.id, stored.id)
    assert.equal(payload.event.id, stored.id)
    assert.equal(payload.storageClassification, 'redacted')
    assert.equal(payload.event.fullTextStored, false)
  })

  it('applies storage guard before database persistence', async () => {
    const createCalls: Array<Record<string, unknown>> = []
    __setLabPersistenceApiForTests({
      create: async (_slug, record) => {
        createCalls.push(record)
        return record
      },
      update: async () => ({}),
      list: async () => ({ items: [], count: 0 })
    })

    const repo = createLabDatabaseStorageRepository()
    repo.storeShadowReviewEvent(makeShadowEvent())

    await new Promise((resolve) => setTimeout(resolve, 10))

    const reviewRecord = createCalls.find((record) => record.event) as LabReviewEventRecord | undefined
    assert.ok(reviewRecord)
    assert.equal(reviewRecord!.event.fullTextStored, false)
    assert.ok(reviewRecord!.event.draftAnswer.includes('[contact removed]'))
    assert.equal(reviewRecord!.storageClassification, 'redacted')
  })

  it('does not persist full text unless explicitly enabled', async () => {
    process.env.INDICARE_LAB_STORE_FULL_TEXT = 'true'
    const createCalls: Array<Record<string, unknown>> = []
    __setLabPersistenceApiForTests({
      create: async (_slug, record) => {
        createCalls.push(record)
        return record
      },
      update: async () => ({}),
      list: async () => ({ items: [], count: 0 })
    })

    const repo = createLabDatabaseStorageRepository()
    repo.storeShadowReviewEvent(makeShadowEvent())

    await new Promise((resolve) => setTimeout(resolve, 10))

    const reviewRecord = createCalls.find((record) => record.event) as LabReviewEventRecord | undefined
    assert.ok(reviewRecord)
    assert.equal(reviewRecord!.event.fullTextStored, true)
    assert.equal(reviewRecord!.storageClassification, 'full-text-enabled')
  })

  it('falls back gracefully when database writes fail', async () => {
    __setLabPersistenceApiForTests({
      create: async () => {
        throw new FounderPersistenceApiError(503, 'Founder API unavailable')
      },
      update: async () => {
        throw new FounderPersistenceApiError(503, 'Founder API unavailable')
      },
      list: async () => ({ items: [], count: 0 })
    })

    const repo = createLabDatabaseStorageRepository()
    const stored = repo.storeShadowReviewEvent(makeShadowEvent())

    await new Promise((resolve) => setTimeout(resolve, 10))

    assert.ok(stored.id)
    const stats = repo.getStorageStats()
    assert.equal(stats.backend, 'database-backed')
    assert.ok((stats.failedWriteCount ?? 0) >= 1)
    assert.ok(stats.reviewEventCount >= 1)
    assert.ok(repo.listReviewEvents().some((event) => event.id === stored.id))
  })

  it('memory fallback stats remain available when database mode is off', () => {
    const stats = getLabStorageStats()
    assert.equal(stats.backend, 'memory-fallback')
    assert.equal(stats.failedWriteCount, 0)
    assert.equal(stats.lastSuccessfulWriteAt, null)
  })

  it('storage guard blocks full text by default', () => {
    const guarded = guardReviewEventForStorage(makeShadowEvent())
    assert.equal(guarded.data.fullTextStored, false)
    assert.equal(guarded.fullTextBlocked, true)
  })

  it('records successful database writes in health stats', async () => {
    __setLabPersistenceApiForTests({
      create: async (_slug, record) => record,
      update: async () => ({}),
      list: async () => ({ items: [], count: 0 })
    })

    await persistLabRecord(LAB_PERSISTENCE_ENTITY_SLUGS.auditEvent, {
      id: 'lae-test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'indicare-lab',
      source: 'indicare-lab',
      auditEvent: {
        id: 'lae-test',
        eventType: 'storage-guard-applied',
        actorType: 'system',
        targetType: 'review-event',
        targetId: 'rev-test',
        summary: 'test',
        createdAt: new Date().toISOString()
      }
    })

    const health = getLabStorageWriteHealth()
    assert.ok(health.lastSuccessfulWriteAt)
    assert.equal(health.failedWriteCount, 0)
  })
})
