/**
 * Unified persistence facade for IndiCare Lab evidence and governance.
 * Uses in-memory repository in development/test; database-backed write-through in production
 * when INDICARE_LAB_STORAGE_MODE=database and founder persistence is available.
 */
import type {
  FounderActionLog,
  LabAuditEvent
} from '@/lib/indicare-lab/governance/types'
import type { EvaluationRun } from '@/lib/indicare-lab/evaluations/types'
import type { CreateReviewEventInput } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type { ReviewEvent, ReviewStatus } from '@/lib/indicare-lab/review-events/types'
import { createLabDatabaseStorageRepository } from '@/lib/indicare-lab/storage/lab-storage-db-adapter'
import { isLabDatabaseStorageEnabled } from '@/lib/indicare-lab/storage/lab-storage-config'
import { labMemoryStorageRepository } from '@/lib/indicare-lab/storage/lab-memory-storage-repository'
import type { LabStorageRepository } from '@/lib/indicare-lab/storage/lab-storage-repository'
import type {
  CreateAuditEventInput,
  CreateBuildBriefInput,
  CreateFounderActionLogInput,
  CreateSuggestionInput
} from '@/lib/indicare-lab/storage/lab-storage-repository'
import type {
  AuditEventFilter,
  BuildBriefFilter,
  EvidenceTimelineEntry,
  EvidenceTimelineFilter,
  FounderActionLogFilter,
  LabStorageBackend,
  LabStorageStats,
  ReviewEventFilter,
  StoredBuildBrief,
  StoredReviewEvent,
  StoredSuggestion,
  SuggestionFilter
} from '@/lib/indicare-lab/storage/lab-storage-types'
import type { CreateEvaluationRunInput } from '@/lib/indicare-lab/evaluations/evaluation-repository'
import { resetLabStorageWriteHealthForTests } from '@/lib/indicare-lab/storage/lab-storage-write-health'

const activeRepository: LabStorageRepository = isLabDatabaseStorageEnabled()
  ? createLabDatabaseStorageRepository()
  : labMemoryStorageRepository

export function getLabStorageBackend(): LabStorageBackend {
  return activeRepository.getStorageStats().backend
}

export function createReviewEvent(input: CreateReviewEventInput): StoredReviewEvent {
  return activeRepository.createReviewEvent(input)
}

export function listReviewEvents(filter?: ReviewEventFilter): StoredReviewEvent[] {
  return activeRepository.listReviewEvents(filter)
}

export function updateReviewEventStatus(
  id: string,
  status: ReviewStatus
): StoredReviewEvent | undefined {
  return activeRepository.updateReviewEventStatus(id, status)
}

export function storeShadowReviewEvent(event: ReviewEvent): StoredReviewEvent {
  return activeRepository.storeShadowReviewEvent(event)
}

export function createSuggestion(input: CreateSuggestionInput): StoredSuggestion {
  return activeRepository.createSuggestion(input)
}

export function listSuggestions(filter?: SuggestionFilter): StoredSuggestion[] {
  return activeRepository.listSuggestions(filter)
}

export function createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun {
  return activeRepository.createEvaluationRun(input)
}

export function listEvaluationRuns(): EvaluationRun[] {
  return activeRepository.listEvaluationRuns()
}

export function createBuildBrief(input: CreateBuildBriefInput): StoredBuildBrief {
  return activeRepository.createBuildBrief(input)
}

export function listBuildBriefs(filter?: BuildBriefFilter): StoredBuildBrief[] {
  return activeRepository.listBuildBriefs(filter)
}

export function createFounderActionLog(input: CreateFounderActionLogInput): FounderActionLog {
  return activeRepository.createFounderActionLog(input)
}

export function listFounderActionLogs(filter?: FounderActionLogFilter): FounderActionLog[] {
  return activeRepository.listFounderActionLogs(filter)
}

export function createAuditEvent(input: CreateAuditEventInput): LabAuditEvent {
  return activeRepository.createAuditEvent(input)
}

export function listAuditEvents(filter?: AuditEventFilter): LabAuditEvent[] {
  return activeRepository.listAuditEvents(filter)
}

export function getEvidenceTimeline(filter?: EvidenceTimelineFilter): EvidenceTimelineEntry[] {
  return activeRepository.getEvidenceTimeline(filter)
}

export function getLabStorageStats(): LabStorageStats {
  return activeRepository.getStorageStats()
}

export function recordPatternDetection(patternId: string, title: string, detectedAt: string): void {
  if ('recordPatternDetection' in activeRepository) {
    ;(
      activeRepository as LabStorageRepository & {
        recordPatternDetection(patternId: string, title: string, detectedAt: string): void
      }
    ).recordPatternDetection(patternId, title, detectedAt)
  }
}

export function resetLabStorageForTests(): void {
  activeRepository.resetForTests()
  resetLabStorageWriteHealthForTests()
}

export type {
  StoredReviewEvent,
  StoredSuggestion,
  StoredBuildBrief,
  EvidenceTimelineEntry,
  LabStorageStats,
  LabStorageBackend
}
