import type { RiskLevel } from '@/lib/indicare-lab/types'

export type ActorType = 'founder' | 'system' | 'review-engine'

export type FounderActionType =
  | 'approve'
  | 'reject'
  | 'needs-more-evidence'
  | 'send-to-expert-review'
  | 'dismiss'
  | 'mark-reviewed'
  | 'create-build-brief'
  | 'accept-pattern'
  | 'accept-suggestion'
  | 'add-to-approval-queue'

export type FounderActionStatus = 'recorded' | 'applied' | 'superseded'

export type EvidenceLinkType =
  | 'review-event'
  | 'pattern'
  | 'suggestion'
  | 'benchmark-run'
  | 'build-brief'
  | 'approval-item'

export type EvidenceLink = {
  type: EvidenceLinkType
  id: string
  label?: string
}

export type GovernanceDecisionReason =
  | 'insufficient-evidence'
  | 'high-risk-change'
  | 'founder-reviewed'
  | 'expert-review-required'
  | 'pattern-accepted'
  | 'suggestion-accepted'
  | 'dismissed-by-founder'
  | 'approved-for-build'
  | 'rejected-by-founder'
  | 'other'

export type GovernanceDecision = {
  id: string
  actionType: FounderActionType
  status: FounderActionStatus
  targetType: string
  targetId: string
  riskLevel: RiskLevel
  reason?: GovernanceDecisionReason
  reasonNote?: string
  evidenceLinks: EvidenceLink[]
  actorType: ActorType
  createdAt: string
}

export type FounderActionLog = GovernanceDecision & {
  actionType: FounderActionType
}

export type LabAuditEventType =
  | 'review-event-captured'
  | 'suggestion-created'
  | 'pattern-detected'
  | 'build-brief-created'
  | 'benchmark-run-completed'
  | 'founder-action'
  | 'governance-decision'
  | 'storage-guard-applied'

export type LabAuditEvent = {
  id: string
  eventType: LabAuditEventType
  actorType: ActorType
  targetType: string
  targetId: string
  summary: string
  storageClassification?: StorageClassification
  evidenceLinks?: EvidenceLink[]
  metadata?: Record<string, string | number | boolean>
  createdAt: string
}

export type StorageClassification =
  | 'redacted'
  | 'synthetic'
  | 'metadata-only'
  | 'full-text-enabled'

export const FOUNDER_ACTION_TYPE_LABELS: Record<FounderActionType, string> = {
  approve: 'Approve',
  reject: 'Reject',
  'needs-more-evidence': 'Needs more evidence',
  'send-to-expert-review': 'Send to expert review',
  dismiss: 'Dismiss',
  'mark-reviewed': 'Mark as reviewed',
  'create-build-brief': 'Create build brief',
  'accept-pattern': 'Accept pattern',
  'accept-suggestion': 'Accept suggestion',
  'add-to-approval-queue': 'Add to approval queue'
}

export const EVIDENCE_LINK_TYPE_LABELS: Record<EvidenceLinkType, string> = {
  'review-event': 'Review event',
  pattern: 'Pattern',
  suggestion: 'Suggestion',
  'benchmark-run': 'Benchmark run',
  'build-brief': 'Build brief',
  'approval-item': 'Approval item'
}

export const STORAGE_CLASSIFICATION_LABELS: Record<StorageClassification, string> = {
  redacted: 'Redacted',
  synthetic: 'Synthetic',
  'metadata-only': 'Metadata only',
  'full-text-enabled': 'Full text enabled'
}

export const LAB_AUDIT_EVENT_TYPE_LABELS: Record<LabAuditEventType, string> = {
  'review-event-captured': 'Review event captured',
  'suggestion-created': 'Suggestion created',
  'pattern-detected': 'Pattern detected',
  'build-brief-created': 'Build brief created',
  'benchmark-run-completed': 'Benchmark run completed',
  'founder-action': 'Founder action',
  'governance-decision': 'Governance decision',
  'storage-guard-applied': 'Storage guard applied'
}
