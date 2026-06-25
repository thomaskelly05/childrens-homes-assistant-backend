import type {
  EvidenceLink,
  FounderActionType,
  GovernanceDecisionReason
} from '@/lib/indicare-lab/governance/types'
import { createFounderActionLog } from '@/lib/indicare-lab/storage/lab-storage'
import type { RiskLevel } from '@/lib/indicare-lab/types'

export type LogFounderActionInput = {
  actionType: FounderActionType
  targetType: string
  targetId: string
  riskLevel: RiskLevel
  reason?: GovernanceDecisionReason
  reasonNote?: string
  evidenceLinks?: EvidenceLink[]
}

/**
 * Record a founder governance action with audit trail.
 * Persists through the active lab storage backend (memory fallback by default).
 */
export function logFounderAction(input: LogFounderActionInput) {
  return createFounderActionLog({
    actionType: input.actionType,
    actorType: 'founder',
    targetType: input.targetType,
    targetId: input.targetId,
    riskLevel: input.riskLevel,
    reason: input.reason,
    reasonNote: input.reasonNote,
    evidenceLinks: input.evidenceLinks ?? [],
    status: 'recorded'
  })
}

export function evidenceLinkForReviewEvent(id: string, label?: string): EvidenceLink {
  return { type: 'review-event', id, label }
}

export function evidenceLinkForPattern(id: string, label?: string): EvidenceLink {
  return { type: 'pattern', id, label }
}

export function evidenceLinkForSuggestion(id: string, label?: string): EvidenceLink {
  return { type: 'suggestion', id, label }
}

export function evidenceLinkForBenchmarkRun(id: string, label?: string): EvidenceLink {
  return { type: 'benchmark-run', id, label }
}

export function evidenceLinkForBuildBrief(id: string, label?: string): EvidenceLink {
  return { type: 'build-brief', id, label }
}

export function evidenceLinkForApprovalItem(id: string, label?: string): EvidenceLink {
  return { type: 'approval-item', id, label }
}
