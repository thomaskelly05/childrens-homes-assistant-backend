export type QualityRunStatus = 'pending' | 'running' | 'complete' | 'failed'

export type QualityRunType = 'gold-pack' | 'family-sample' | 'manual-eval' | 'feedback-sync'

export type QualityRunItemResult = {
  scenarioId: string
  scenarioTitle: string
  family: string
  role: string
  riskLevel: string
  passed: boolean
  score: number
  missingMarkers: string[]
  unsafePhrases: string[]
  overclaims: string[]
  notes: string[]
  answerSource: 'sample-template' | 'live-orb' | 'manual-paste'
  answerExcerpt?: string
}

export type QualityRun = {
  id: string
  title: string
  type: QualityRunType
  status: QualityRunStatus
  familyFilter?: string
  roleFilter?: string
  limit?: number
  startedAt: string
  completedAt?: string
  passCount: number
  failCount: number
  totalCount: number
  passRate: number
  results: QualityRunItemResult[]
  dataSource: 'live' | 'local'
  limitations: string[]
  triggeredBy: string
  routeCallSkipped?: boolean
}

export type QualityProposalStatus =
  | 'draft'
  | 'approved'
  | 'rejected'
  | 'sent-to-cursor'
  | 'implemented'

export type QualityProposalType =
  | 'marker-gap'
  | 'unsafe-pattern'
  | 'feedback-gap'
  | 'expert-review'
  | 'regression'

export type QualityProposal = {
  id: string
  title: string
  description: string
  type: QualityProposalType
  status: QualityProposalStatus
  priority: 'critical' | 'high' | 'medium' | 'low'
  sourceRunId?: string
  sourceScenarioId?: string
  affectedFamily?: string
  suggestedChange: string
  acceptanceCriteria: string[]
  createdBy: string
  createdAt: string
  linkedBuildBriefId?: string
  linkedApprovalId?: string
}

export type ExpertReview = {
  id: string
  runId?: string
  scenarioId: string
  answerId?: string
  reviewerRole: string
  helpfulScore: number
  safetyScore: number
  expertiseScore: number
  missedMarkers: string[]
  overclaims: string[]
  unsafePhrases: string[]
  suggestedMarkers: string[]
  notes: string
  createdAt: string
}

export type QualityLabSummary = {
  totalRuns: number
  latestRun?: QualityRun
  openProposals: number
  criticalProposals: number
  expertReviewCount: number
  goldScenarioCount: number
}
