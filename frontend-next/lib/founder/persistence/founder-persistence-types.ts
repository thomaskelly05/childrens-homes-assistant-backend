/**
 * Founder Persistence V1 — persisted record contracts.
 * Quality Lab shapes align with quality-lab-types.ts (source of truth).
 */

import type {
  ExpertReview,
  QualityProposal,
  QualityProposalStatus,
  QualityProposalType,
  QualityRun,
  QualityRunItemResult,
  QualityRunStatus,
  QualityRunType
} from '@/lib/founder/quality-lab/quality-lab-types'
import type { FounderAction, FounderActionStatus } from '@/lib/founder/actions/founder-action-types'
import type { ApprovalItem, ApprovalStatus, ApprovalType } from '@/lib/founder/approvals/approval-types'
import type { BuildBrief } from '@/lib/founder/build-briefs/build-brief-types'
import type { ContentDraft, ContentDraftStatus } from '@/lib/founder/content/founder-content-types'
import type {
  FounderOperatingLoopRun,
  OperatingLoopResult
} from '@/lib/founder/operating-loop/operating-loop-types'
import type { EvidencePack } from '@/lib/founder/evidence/evidence-types'
import type { FounderMemoryItem } from '@/lib/founder/memory/founder-memory-types'
import type { FounderStaffAgentId } from '@/lib/founder/team/founder-team-types'

export type FounderPersistenceSource =
  | 'founder-ui'
  | 'staff-team'
  | 'operating-loop'
  | 'quality-lab'
  | 'brand-ambassador'
  | 'approval-centre'
  | 'system'

export type FounderPersistedBase = {
  id: string
  createdAt: string
  updatedAt: string
  createdBy: string
  source: FounderPersistenceSource
}

export type FounderEntityType =
  | 'action'
  | 'approval'
  | 'content'
  | 'build_brief'
  | 'staff_team_run'
  | 'agent_run'
  | 'operating_loop_run'
  | 'quality_run'
  | 'quality_result'
  | 'quality_proposal'
  | 'expert_review'
  | 'safety_review'
  | 'founder_memory'
  | 'evidence_pack'
  | 'audit_log'

export type FounderActionRecord = FounderPersistedBase & {
  status: FounderActionStatus
  action: FounderAction
}

export type FounderApprovalRecord = FounderPersistedBase & {
  status: ApprovalStatus
  item: ApprovalItem
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  founderNote?: string
  linkedContentId?: string
  linkedBuildBriefId?: string
  linkedQualityProposalId?: string
  linkedEvidencePackId?: string
}

export type FounderContentDraftRecord = FounderPersistedBase & {
  status: ContentDraftStatus
  draft: ContentDraft
  linkedApprovalId?: string
  safetyReviewId?: string
}

export type FounderBuildBriefStatus =
  | 'draft'
  | 'approved'
  | 'sent-to-cursor'
  | 'in-progress'
  | 'completed'
  | 'dismissed'

export type FounderBuildBriefRecord = FounderPersistedBase & {
  status: FounderBuildBriefStatus
  brief: BuildBrief
  linkedApprovalId?: string
  sentToCursorAt?: string
  completedAt?: string
}

export type FounderStaffTeamRunStatus = 'running' | 'complete' | 'failed'

export type FounderStaffTeamRunRecord = FounderPersistedBase & {
  status: FounderStaffTeamRunStatus
  startedAt: string
  completedAt?: string
  agentRunIds: string[]
  actionsGenerated: number
  draftsGenerated: number
  briefsGenerated: number
  approvalsQueued: number
  safetyReviewIds: string[]
  errorSummary?: string
  summary?: string
}

export type FounderAgentRunStatus = 'running' | 'complete' | 'failed'

export type FounderAgentRunRecord = FounderPersistedBase & {
  status: FounderAgentRunStatus
  staffTeamRunId?: string
  agentId: FounderStaffAgentId
  outputSummary: string
  findings: string[]
  recommendations: string[]
  actions: string[]
  risks: string[]
  requiresApproval: boolean
  completedAt?: string
  errorSummary?: string
}

export type FounderOperatingLoopRunRecord = FounderPersistedBase & {
  status: 'queued' | 'running' | 'complete' | 'failed'
  run: FounderOperatingLoopRun
  /** @deprecated Legacy shape — prefer `run` */
  result?: OperatingLoopResult
  staffTeamRunId?: string
  errorSummary?: string
}

/** Mirrors QualityRun from quality-lab-types.ts */
export type FounderQualityRunRecord = FounderPersistedBase & {
  status: QualityRunStatus
  run: QualityRun
}

/** Individual scenario result — denormalised for audit queries */
export type FounderQualityResultRecord = FounderPersistedBase & {
  qualityRunId: string
  result: QualityRunItemResult
}

/** Mirrors QualityProposal from quality-lab-types.ts */
export type FounderQualityProposalRecord = FounderPersistedBase & {
  status: QualityProposalStatus
  proposal: QualityProposal
  linkedApprovalId?: string
  linkedActionId?: string
}

/** Mirrors ExpertReview from quality-lab-types.ts */
export type FounderExpertReviewRecord = FounderPersistedBase & {
  review: ExpertReview
  qualityRunId?: string
}

export type FounderSafetyReviewStatus = 'passed' | 'flagged' | 'blocked'

export type FounderSafetyReviewRecord = FounderPersistedBase & {
  status: FounderSafetyReviewStatus
  targetEntityType: FounderEntityType
  targetEntityId: string
  issues: Array<{ code: string; message: string; severity: string }>
  safe: boolean
  requiresReview: boolean
  redactedExcerpt?: string
}

export type FounderMemoryRecord = FounderPersistedBase & {
  status: FounderMemoryItem['status']
  item: FounderMemoryItem
}

export type FounderEvidencePackStatus = EvidencePack['status']

export type FounderEvidencePackRecord = FounderPersistedBase & {
  status: FounderEvidencePackStatus
  pack: EvidencePack
  linkedApprovalId?: string
}

export type FounderAuditEventType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'approved'
  | 'rejected'
  | 'needs_changes'
  | 'posted'
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'safety_review'

export type FounderAuditLogRecord = {
  id: string
  createdAt: string
  actor: string
  eventType: FounderAuditEventType
  entityType: FounderEntityType
  entityId: string
  summary: string
  status?: string
  metadata?: Record<string, unknown>
  linkedEntityId?: string
  linkedEntityType?: FounderEntityType
}

export type FounderPersistenceListFilters = {
  status?: string
  entityType?: FounderEntityType
  limit?: number
  offset?: number
}

export type QualityRunTypeExport = QualityRunType
export type QualityProposalTypeExport = QualityProposalType
