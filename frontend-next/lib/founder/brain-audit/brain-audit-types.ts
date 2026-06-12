/**
 * Internal Brain Coverage Audit — Ofsted-regulated children's home domains.
 * Synthetic testing only; no real child data.
 */

export type BrainAuditCategory =
  | 'safeguarding'
  | 'residential_practice'
  | 'care_planning'
  | 'management_oversight'
  | 'communication_inclusion'
  | 'data_privacy_recording'
  | 'product_use_cases'

export type BrainAuditConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type BrainAuditBenchmarkStatus = 'active' | 'partial' | 'missing' | 'under_review'

export type BrainAuditAreaId = string

export type BrainAuditAreaDefinition = {
  id: BrainAuditAreaId
  label: string
  category: BrainAuditCategory
  keywords: string[]
}

export type BrainAuditAreaResult = {
  id: BrainAuditAreaId
  label: string
  category: BrainAuditCategory
  scenariosAvailable: number
  scenariosRun: number
  passRate: number | null
  criticalFailures: number
  lastTested: string | null
  coverageStrength: 'untested' | 'weak' | 'moderate' | 'strong'
  weakMarkers: string[]
  missingMarkers: string[]
  benchmarkStatus: BrainAuditBenchmarkStatus
  recommendedNewScenarios: string[]
  recommendedLearningProposal: string | null
  confidenceLevel: BrainAuditConfidence
}

export type BrainAuditSummary = {
  id: string
  generatedAt: string
  triggerType: 'manual' | 'nightly_benchmark' | 'weekly_deep_audit' | 'coverage_gap_scan' | 'micro_check'
  overallCoveragePercent: number
  areas: BrainAuditAreaResult[]
  weakAreas: BrainAuditAreaId[]
  untestedAreas: BrainAuditAreaId[]
  topMissingWeakAreas: Array<{ id: BrainAuditAreaId; label: string; reason: string }>
  criticalFailureCount: number
  recommendedScenarioCount: number
  recommendedLearningProposalCount: number
}

export type MicroCheckRunRecord = {
  id: string
  startedAt: string
  completedAt: string
  areasTested: BrainAuditAreaId[]
  scenarioCount: number
  passed: number
  failed: number
  criticalFailures: number
  weakMarkers: string[]
  learningProposalRecommended: boolean
  approvalItemCreated: boolean
  syntheticOnly: true
  mode: 'internal-brain'
}

export type MicroCheckRotationState = {
  lastAreaIds: BrainAuditAreaId[]
  lastRunAt: string | null
}
