import type {
  FounderActionLog,
  LabAuditEvent
} from '@/lib/indicare-lab/governance/types'
import type { CreateEvaluationRunInput } from '@/lib/indicare-lab/evaluations/evaluation-repository'
import type { EvaluationRun } from '@/lib/indicare-lab/evaluations/types'
import type { CreateReviewEventInput } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type { ReviewEvent, ReviewStatus } from '@/lib/indicare-lab/review-events/types'
import { labMemoryStorageRepository } from '@/lib/indicare-lab/storage/lab-memory-storage-repository'
import type {
  CreateAuditEventInput,
  CreateBuildBriefInput,
  CreateFounderActionLogInput,
  CreateSuggestionInput,
  LabStorageRepository
} from '@/lib/indicare-lab/storage/lab-storage-repository'
import {
  LAB_PERSISTENCE_ENTITY_SLUGS,
  type LabAuditEventRecord,
  type LabBuildBriefRecord,
  type LabEvaluationRunRecord,
  type LabFounderActionRecord,
  type LabReviewEventRecord,
  type LabSuggestionRecord
} from '@/lib/indicare-lab/storage/lab-storage-persistence-types'
import {
  persistLabRecord,
  updateLabRecord,
  upsertLabRecord
} from '@/lib/indicare-lab/storage/lab-storage-persistence-client'
import type {
  AuditEventFilter,
  BuildBriefFilter,
  EvidenceTimelineEntry,
  EvidenceTimelineFilter,
  FounderActionLogFilter,
  LabStorageStats,
  ReviewEventFilter,
  StoredBuildBrief,
  StoredReviewEvent,
  StoredSuggestion,
  SuggestionFilter
} from '@/lib/indicare-lab/storage/lab-storage-types'
import { getLabStorageWriteHealth } from '@/lib/indicare-lab/storage/lab-storage-write-health'

function labTimestamps(createdAt?: string) {
  const now = createdAt ?? new Date().toISOString()
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: 'indicare-lab',
    source: 'indicare-lab' as const
  }
}

function toReviewEventRecord(stored: StoredReviewEvent): LabReviewEventRecord {
  return {
    id: stored.id,
    status: stored.status,
    ...labTimestamps(stored.createdAt),
    event: stored,
    storageClassification: stored.storageClassification
  }
}

function toSuggestionRecord(stored: StoredSuggestion): LabSuggestionRecord {
  return {
    id: stored.id,
    status: stored.status,
    ...labTimestamps(stored.createdAt),
    suggestion: stored,
    storageClassification: stored.storageClassification
  }
}

function toEvaluationRunRecord(run: EvaluationRun): LabEvaluationRunRecord {
  return {
    id: run.id,
    status: run.status,
    ...labTimestamps(run.createdAt),
    run,
    storageClassification: 'synthetic'
  }
}

function toBuildBriefRecord(stored: StoredBuildBrief): LabBuildBriefRecord {
  return {
    id: stored.id,
    status: 'draft',
    ...labTimestamps(stored.createdAt),
    brief: stored,
    storageClassification: stored.storageClassification
  }
}

function toFounderActionRecord(log: FounderActionLog): LabFounderActionRecord {
  return {
    id: log.id,
    status: log.status,
    ...labTimestamps(log.createdAt),
    action: log
  }
}

function toAuditEventRecord(event: LabAuditEvent): LabAuditEventRecord {
  return {
    id: event.id,
    ...labTimestamps(event.createdAt),
    auditEvent: event
  }
}

/**
 * Database-backed storage adapter.
 * Writes synchronously to the in-memory repository (guards applied there),
 * then persists minimised records to founder persistence asynchronously.
 * Storage failures never propagate to callers.
 */
export class LabDatabaseStorageRepository implements LabStorageRepository {
  private memory = labMemoryStorageRepository

  createReviewEvent(input: CreateReviewEventInput): StoredReviewEvent {
    const stored = this.memory.createReviewEvent(input)
    void persistLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.reviewEvent,
      toReviewEventRecord(stored) as unknown as Record<string, unknown>
    )
    return stored
  }

  listReviewEvents(filter?: ReviewEventFilter): StoredReviewEvent[] {
    return this.memory.listReviewEvents(filter)
  }

  updateReviewEventStatus(id: string, status: ReviewStatus): StoredReviewEvent | undefined {
    const updated = this.memory.updateReviewEventStatus(id, status)
    if (!updated) return undefined
    void updateLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.reviewEvent,
      id,
      toReviewEventRecord(updated) as unknown as Record<string, unknown>,
      status
    )
    return updated
  }

  storeShadowReviewEvent(event: ReviewEvent): StoredReviewEvent {
    const stored = this.memory.storeShadowReviewEvent(event)
    void persistLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.reviewEvent,
      toReviewEventRecord(stored) as unknown as Record<string, unknown>
    )
    return stored
  }

  createSuggestion(input: CreateSuggestionInput): StoredSuggestion {
    const stored = this.memory.createSuggestion(input)
    void upsertLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.suggestion,
      toSuggestionRecord(stored) as unknown as Record<string, unknown>,
      stored.status
    )
    return stored
  }

  listSuggestions(filter?: SuggestionFilter): StoredSuggestion[] {
    return this.memory.listSuggestions(filter)
  }

  createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun {
    const run = this.memory.createEvaluationRun(input)
    void persistLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.evaluationRun,
      toEvaluationRunRecord(run) as unknown as Record<string, unknown>
    )
    return run
  }

  listEvaluationRuns(): EvaluationRun[] {
    return this.memory.listEvaluationRuns()
  }

  createBuildBrief(input: CreateBuildBriefInput): StoredBuildBrief {
    const stored = this.memory.createBuildBrief(input)
    void persistLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.buildBrief,
      toBuildBriefRecord(stored) as unknown as Record<string, unknown>
    )
    return stored
  }

  listBuildBriefs(filter?: BuildBriefFilter): StoredBuildBrief[] {
    return this.memory.listBuildBriefs(filter)
  }

  createFounderActionLog(input: CreateFounderActionLogInput): FounderActionLog {
    const log = this.memory.createFounderActionLog(input)
    void persistLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.founderAction,
      toFounderActionRecord(log) as unknown as Record<string, unknown>
    )
    return log
  }

  listFounderActionLogs(filter?: FounderActionLogFilter): FounderActionLog[] {
    return this.memory.listFounderActionLogs(filter)
  }

  createAuditEvent(input: CreateAuditEventInput): LabAuditEvent {
    const event = this.memory.createAuditEvent(input)
    void persistLabRecord(
      LAB_PERSISTENCE_ENTITY_SLUGS.auditEvent,
      toAuditEventRecord(event) as unknown as Record<string, unknown>
    )
    return event
  }

  listAuditEvents(filter?: AuditEventFilter): LabAuditEvent[] {
    return this.memory.listAuditEvents(filter)
  }

  recordPatternDetection(patternId: string, title: string, detectedAt: string): void {
    this.memory.recordPatternDetection(patternId, title, detectedAt)
  }

  getEvidenceTimeline(filter?: EvidenceTimelineFilter): EvidenceTimelineEntry[] {
    return this.memory.getEvidenceTimeline(filter)
  }

  getStorageStats(): LabStorageStats {
    const base = this.memory.getStorageStats()
    const health = getLabStorageWriteHealth()
    return {
      ...base,
      backend: 'database-backed',
      lastSuccessfulWriteAt: health.lastSuccessfulWriteAt,
      failedWriteCount: health.failedWriteCount
    }
  }

  resetForTests(): void {
    this.memory.resetForTests()
  }
}

export type LabDatabaseAdapterStatus = 'ready' | 'not-implemented'

export function getLabDatabaseAdapterStatus(): LabDatabaseAdapterStatus {
  return 'ready'
}

export function createLabDatabaseStorageRepository(): LabStorageRepository {
  return new LabDatabaseStorageRepository()
}
