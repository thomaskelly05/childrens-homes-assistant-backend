import type { StorageClassification } from '@/lib/indicare-lab/governance/types'
import type { EvaluationRun } from '@/lib/indicare-lab/evaluations/types'
import type { FounderActionLog, LabAuditEvent } from '@/lib/indicare-lab/governance/types'
import type {
  StoredBuildBrief,
  StoredReviewEvent,
  StoredSuggestion
} from '@/lib/indicare-lab/storage/lab-storage-types'

export const LAB_PERSISTENCE_ENTITY_SLUGS = {
  reviewEvent: 'lab-review-events',
  suggestion: 'lab-suggestions',
  evaluationRun: 'lab-evaluation-runs',
  buildBrief: 'lab-build-briefs',
  founderAction: 'lab-founder-actions',
  auditEvent: 'lab-audit-events'
} as const

export type LabPersistenceEntitySlug =
  (typeof LAB_PERSISTENCE_ENTITY_SLUGS)[keyof typeof LAB_PERSISTENCE_ENTITY_SLUGS]

export type LabPersistedBase = {
  id: string
  createdAt: string
  updatedAt: string
  createdBy: string
  source: 'indicare-lab'
  status?: string
}

export type LabReviewEventRecord = LabPersistedBase & {
  event: StoredReviewEvent
  storageClassification: StorageClassification
}

export type LabSuggestionRecord = LabPersistedBase & {
  suggestion: StoredSuggestion
  storageClassification: StorageClassification
}

export type LabEvaluationRunRecord = LabPersistedBase & {
  run: EvaluationRun
  storageClassification: StorageClassification
}

export type LabBuildBriefRecord = LabPersistedBase & {
  brief: StoredBuildBrief
  storageClassification: StorageClassification
}

export type LabFounderActionRecord = LabPersistedBase & {
  action: FounderActionLog
}

export type LabAuditEventRecord = LabPersistedBase & {
  auditEvent: LabAuditEvent
}
