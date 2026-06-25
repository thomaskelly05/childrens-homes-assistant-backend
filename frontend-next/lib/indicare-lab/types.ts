export type RiskLevel = 'critical' | 'high' | 'medium' | 'low'
export type Priority = 'p0' | 'p1' | 'p2' | 'p3'
export type ReviewAgentStatus = 'attention' | 'stable' | 'reviewing' | 'offline'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-evidence' | 'expert-review'
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

export type LabGap = {
  id: string
  title: string
  area: string
  issue: string
  whyItMatters: string
  recommendation: string
  riskLevel: RiskLevel
  priority: Priority
  suggestedAction: string
  category: 'brain' | 'knowledge' | 'ui-ux' | 'technology' | 'commercial' | 'product'
}

export type ReviewBoardAgent = {
  id: string
  name: string
  status: ReviewAgentStatus
  score: number
  lastCheck: string
  commonIssue: string
  recommendation: string
  riskLevel: RiskLevel
}

export type LabExperiment = {
  id: string
  title: string
  hypothesis: string
  status: ExperimentStatus
  riskLevel: RiskLevel
  startedAt: string
  owner: string
  outcome?: string
}

export type ApprovalQueueItem = {
  id: string
  title: string
  type: string
  submittedAt: string
  riskLevel: RiskLevel
  status: ApprovalStatus
  summary: string
  evidence: string[]
}

export type RoadmapItem = {
  id: string
  quarter: string
  title: string
  theme: string
  status: 'planned' | 'in-progress' | 'blocked' | 'done'
  dependencies: string[]
  riskLevel: RiskLevel
}

export type TechnologyWatchItem = {
  id: string
  title: string
  category: string
  signal: string
  relevance: string
  recommendation: string
  riskLevel: RiskLevel
  priority: Priority
}

export type BuildBrief = {
  id: string
  createdAt: string
  title: string
  gaps: LabGap[]
  objective: string
  scope: string[]
  constraints: string[]
  acceptanceCriteria: string[]
  riskNotes: string
}

export type LabOverviewMetric = {
  id: string
  label: string
  value: string
  hint: string
  tone: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose'
}

export type LabSectionId =
  | 'overview'
  | 'brain'
  | 'knowledge'
  | 'ui-ux'
  | 'technology'
  | 'review-board'
  | 'shadow-review'
  | 'review-events'
  | 'real-suggestions'
  | 'evidence-of-improvement'
  | 'pattern-intelligence'
  | 'evaluation-benchmarks'
  | 'review-test'
  | 'experiments'
  | 'approvals'
  | 'roadmap'
  | 'build-briefs'
