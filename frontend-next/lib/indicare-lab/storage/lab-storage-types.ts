import type { StorageClassification } from '@/lib/indicare-lab/governance/types'
import type { EvaluationRun } from '@/lib/indicare-lab/evaluations/types'
import type { ReviewEvent, ReviewEventFilter } from '@/lib/indicare-lab/review-events/types'
import type { LabSuggestion } from '@/lib/indicare-lab/suggestions/types'
import type { BuildBrief } from '@/lib/indicare-lab/types'

export type LabStorageBackend = 'memory-fallback' | 'database-backed'

export type StoredReviewEvent = ReviewEvent & {
  storageClassification: StorageClassification
}

export type StoredSuggestion = LabSuggestion & {
  storageClassification: StorageClassification
}

export type StoredBuildBrief = BuildBrief & {
  storageClassification: StorageClassification
  sourceType?: string
  sourceId?: string
}

export type StoredEvaluationRun = EvaluationRun & {
  storageClassification: StorageClassification
}

export type EvidenceTimelineEntryType =
  | 'audit-event'
  | 'review-event'
  | 'pattern'
  | 'suggestion'
  | 'build-brief'
  | 'founder-decision'
  | 'benchmark-run'

export type EvidenceTimelineEntry = {
  id: string
  entryType: EvidenceTimelineEntryType
  title: string
  summary: string
  storageClassification?: StorageClassification
  targetType: string
  targetId: string
  createdAt: string
  isDemo?: boolean
  isSynthetic?: boolean
}

export type LabStorageStats = {
  backend: LabStorageBackend
  reviewEventCount: number
  suggestionCount: number
  buildBriefCount: number
  evaluationRunCount: number
  founderActionCount: number
  auditEventCount: number
  redactedStoragePercentage: number
  lastSuccessfulWriteAt?: string | null
  failedWriteCount?: number
}

export type SuggestionFilter = {
  status?: LabSuggestion['status']
  isSynthetic?: boolean
  limit?: number
}

export type BuildBriefFilter = {
  sourceType?: string
  limit?: number
}

export type AuditEventFilter = {
  eventType?: string
  limit?: number
}

export type FounderActionLogFilter = {
  actionType?: string
  targetType?: string
  limit?: number
}

export type EvidenceTimelineFilter = {
  includeDemo?: boolean
  includeSynthetic?: boolean
  limit?: number
}

export type { ReviewEventFilter }
