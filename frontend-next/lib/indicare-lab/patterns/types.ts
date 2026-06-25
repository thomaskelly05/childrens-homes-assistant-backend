import type { ReviewSource, ReviewTaskType } from '@/lib/indicare-lab/review-events/types'
import type { Priority, RiskLevel } from '@/lib/indicare-lab/types'

export type LabPatternArea =
  | 'brain'
  | 'knowledge'
  | 'safety'
  | 'ui-ux'
  | 'workflow'
  | 'technology'
  | 'commercial'

export type LabPatternRiskLevel = RiskLevel

export type LabPatternPriority = Priority

export type LabPatternStatus =
  | 'detected'
  | 'build-brief-created'
  | 'in-approval-queue'
  | 'accepted'
  | 'dismissed'
  | 'needs-expert-review'

export type LabPatternEvidence = {
  eventId: string
  source: ReviewSource
  taskType: ReviewTaskType
  flag: string
  agentLabel: string
  createdAt: string
  isRedacted: boolean
}

export type LabPattern = {
  id: string
  title: string
  area: LabPatternArea
  description: string
  evidenceSummary: string
  relatedEventIds: string[]
  affectedSources: ReviewSource[]
  affectedTaskTypes: ReviewTaskType[]
  frequency: number
  riskLevel: LabPatternRiskLevel
  priority: LabPatternPriority
  recommendedAction: string
  suggestedBuildBriefTitle: string
  founderDecisionStatus: LabPatternStatus
  evidence: LabPatternEvidence[]
  detectedAt: string
  isDevelopment: boolean
  isInternalEvaluation: boolean
}

export const LAB_PATTERN_AREA_LABELS: Record<LabPatternArea, string> = {
  brain: 'Brain',
  knowledge: 'Knowledge',
  safety: 'Safety',
  'ui-ux': 'UI / UX',
  workflow: 'Workflow',
  technology: 'Technology',
  commercial: 'Commercial'
}

export const LAB_PATTERN_STATUS_LABELS: Record<LabPatternStatus, string> = {
  detected: 'Detected',
  'build-brief-created': 'Build brief created',
  'in-approval-queue': 'In approval queue',
  accepted: 'Accepted',
  dismissed: 'Dismissed',
  'needs-expert-review': 'Needs expert review'
}

export const APPROVAL_ELIGIBLE_PATTERN_RISK_LEVELS: LabPatternRiskLevel[] = ['critical', 'high']

export function isPatternApprovalEligible(pattern: LabPattern): boolean {
  return (
    APPROVAL_ELIGIBLE_PATTERN_RISK_LEVELS.includes(pattern.riskLevel) ||
    pattern.frequency >= 2
  )
}
