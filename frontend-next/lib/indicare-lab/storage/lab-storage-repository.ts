import type {
  FounderActionLog,
  LabAuditEvent
} from '@/lib/indicare-lab/governance/types'
import type { CreateEvaluationRunInput } from '@/lib/indicare-lab/evaluations/evaluation-repository'
import type { EvaluationRun } from '@/lib/indicare-lab/evaluations/types'
import type { CreateReviewEventInput } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type { ReviewEvent, ReviewStatus } from '@/lib/indicare-lab/review-events/types'
import type { LabSuggestion } from '@/lib/indicare-lab/suggestions/types'
import type { BuildBrief } from '@/lib/indicare-lab/types'
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

export type CreateFounderActionLogInput = Omit<FounderActionLog, 'id' | 'createdAt' | 'status'> & {
  status?: FounderActionLog['status']
}

export type CreateAuditEventInput = Omit<LabAuditEvent, 'id' | 'createdAt'>

export type CreateSuggestionInput = LabSuggestion

export type CreateBuildBriefInput = BuildBrief & {
  sourceType?: string
  sourceId?: string
}

export interface LabStorageRepository {
  createReviewEvent(input: CreateReviewEventInput): StoredReviewEvent
  listReviewEvents(filter?: ReviewEventFilter): StoredReviewEvent[]
  updateReviewEventStatus(id: string, status: ReviewStatus): StoredReviewEvent | undefined
  storeShadowReviewEvent(event: ReviewEvent): StoredReviewEvent

  createSuggestion(input: CreateSuggestionInput): StoredSuggestion
  listSuggestions(filter?: SuggestionFilter): StoredSuggestion[]

  createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun
  listEvaluationRuns(): EvaluationRun[]

  createBuildBrief(input: CreateBuildBriefInput): StoredBuildBrief
  listBuildBriefs(filter?: BuildBriefFilter): StoredBuildBrief[]

  createFounderActionLog(input: CreateFounderActionLogInput): FounderActionLog
  listFounderActionLogs(filter?: FounderActionLogFilter): FounderActionLog[]

  createAuditEvent(input: CreateAuditEventInput): LabAuditEvent
  listAuditEvents(filter?: AuditEventFilter): LabAuditEvent[]

  getEvidenceTimeline(filter?: EvidenceTimelineFilter): EvidenceTimelineEntry[]
  getStorageStats(): LabStorageStats

  resetForTests(): void
}
