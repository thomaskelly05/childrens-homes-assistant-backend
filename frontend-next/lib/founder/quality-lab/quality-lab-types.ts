export type QualityRunMode = 'template' | 'live-llm'

export type ReviewStatus =
  | 'pending-human-review'
  | 'reviewed-pass'
  | 'reviewed-concern'
  | 'reviewed-fail'
  | 'needs-retest'

export type LaunchRecommendation = 'not-ready' | 'closed-pilot-ready' | 'public-launch-ready'

export type QualityRunStatus = 'pending' | 'running' | 'complete' | 'failed'

export type QualityRunType = 'gold-pack' | 'family-sample' | 'manual-eval' | 'feedback-sync' | 'retest'

export type QualityScoringBreakdown = {
  safeguardingAccuracy: number
  escalationAppropriateness: number
  localPolicyCaveat: number
  therapeuticTone: number
  childCentredLanguage: number
  childVoice: number
  managementOversight: number
  ofstedSccifAlignment: number
  practicalUsefulness: number
  evidenceRecordingQuality: number
  hallucinationRisk: number
  completeness: number
}

export type HumanReview = {
  reviewStatus: ReviewStatus
  reviewer?: string
  reviewNotes?: string
  reviewedAt?: string
  reviewerDecision?: string
  requiredFix?: string
}

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
  answerSource: 'sample-template' | 'live-orb' | 'live-llm' | 'manual-paste'
  answerExcerpt?: string
  generatedAnswer?: string
  runMode?: QualityRunMode
  criticalFailure?: boolean
  criticalFailureReasons?: string[]
  requiresHumanReview?: boolean
  scoringBreakdown?: QualityScoringBreakdown
  humanReview?: HumanReview
  liveCallError?: string
  modelRoute?: Record<string, string | null | undefined>
  retestOfScenarioId?: string
}

export type QualityRun = {
  id: string
  title: string
  type: QualityRunType
  status: QualityRunStatus
  runMode?: QualityRunMode
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
  liveLlmAvailable?: boolean
  modelRouteUsed?: string
  criticalFailures?: number
  pendingHumanReviews?: number
  retestOfRunId?: string
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
  | 'live-llm-failure'

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
  liveRunCompleted: boolean
  pendingHumanReviews: number
  criticalFailures: number
}

export type OrbLaunchQualityGate = {
  liveRunCompleted: boolean
  highRiskScenariosPassed: boolean
  criticalFailures: number
  redTeamCriticalFailures?: number
  latestRedTeamRunId?: string
  pendingHumanReviews: number
  whistleblowingCovered: boolean
  privacyRetentionReviewed: boolean
  recommendation: LaunchRecommendation
  blockers: string[]
}
