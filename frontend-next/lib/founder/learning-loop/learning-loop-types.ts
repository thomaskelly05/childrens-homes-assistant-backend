import type { FounderCoverageAreaId } from '../agents/autonomous/founder-agent-types.ts'

export const LEARNING_LOOP_ENVIRONMENT = 'thomaskelly05/childrens-homes-assistant-backend'

export const LEARNING_LOOP_DISCLAIMER =
  'IndiCare Learning Loop helps ORB improve from synthetic evaluation evidence. It does not use real child records and cannot change safeguarding behaviour without founder approval.'

export type LearningLoopTriggerType =
  | 'evaluation_failure'
  | 'critical_failure'
  | 'repeated_weak_marker'
  | 'coverage_gap'
  | 'low_pass_rate'
  | 'gold_verification_gap'
  | 'safeguarding_review_gap'
  | 'manual_founder_trigger'
  | 'post_deploy_retest'
  | 'nightly_synthetic_review'

export type LearningLoopStatus =
  | 'pending'
  | 'analysing'
  | 'generating_scenarios'
  | 'testing'
  | 'proposing_improvement'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'completed'

export type LearningWeaknessSeverity = 'critical' | 'high' | 'medium' | 'low'

export type LearningWeaknessArea =
  | 'safeguarding'
  | 'scoring'
  | 'coverage'
  | 'fallback'
  | 'prompt_scaffold'
  | 'routing'
  | 'product_practice'
  | 'governance'

export type DetectedWeakness = {
  id: string
  area: LearningWeaknessArea
  category: string
  coverageAreaId?: FounderCoverageAreaId
  severity: LearningWeaknessSeverity
  evidence: string[]
  affectedScenarios: string[]
  likelyRootCause: string
  recommendedAction: string
  approvalRequired: boolean
}

export type SyntheticScenarioType =
  | 'normal_practice_question'
  | 'high_risk_safeguarding_question'
  | 'adversarial_unsafe_request'
  | 'record_writing_request'
  | 'manager_oversight_request'
  | 'ofsted_evidence_request'
  | 'child_voice_request'
  | 'local_policy_conflict_request'
  | 'ambiguous_real_world_scenario'
  | 'poor_staff_wording_prompt'

export type SyntheticScenario = {
  id: string
  area: string
  coverageAreaId: FounderCoverageAreaId
  category: string
  scenarioType: SyntheticScenarioType
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  prompt: string
  expectedMarkers: string[]
  prohibitedUnsafeOutputs: string[]
  scoringFocus: string[]
  addToBenchmarkBank: boolean
  syntheticDataOnly: true
  generatedAt: string
  generatedBy?: string
  generationReason?: string
}

export type BenchmarkScenarioStatus =
  | 'generated'
  | 'under_review'
  | 'approved_for_testing'
  | 'active_benchmark'
  | 'retired'
  | 'rejected'

export type BenchmarkScenario = SyntheticScenario & {
  status: BenchmarkScenarioStatus
  whyGenerated: string
  recommendedByAgent?: string
  passHistory: { runId: string; passed: boolean; testedAt: string }[]
  foundGenuineWeakness: boolean
  ledToImprovementPr: boolean
  founderApprovedAt?: string
  founderApprovedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}

export type LearningProposalChangeType =
  | 'required_safeguard_marker_update'
  | 'prompt_scaffold_update'
  | 'deterministic_fallback_update'
  | 'scorer_calibration'
  | 'internal_brain_routing_update'
  | 'coverage_map_update'
  | 'benchmark_scenario_addition'
  | 'ui_audit_evidence_improvement'
  | 'governance_blocker_update'

export type LearningProposalSafetyRisk = 'critical' | 'high' | 'medium' | 'low'

export type LearningProposalStatus = 'draft' | 'awaiting_approval' | 'approved' | 'rejected' | 'changes_requested'

export type LearningProposal = {
  id: string
  loopId: string
  createdAt: string
  status: LearningProposalStatus
  whatFailed: string
  whyItMatters: string
  whatBrainShouldLearn: string
  changeType: LearningProposalChangeType
  filesLikelyToChange: string[]
  testsRequired: string[]
  safetyRisk: LearningProposalSafetyRisk
  manualVerificationChecklist: string[]
  safeguardingReviewRequired: boolean
  governanceReviewRequired: boolean
  approvalRequired: true
  founderDecision?: 'approved' | 'rejected' | 'changes_requested'
  founderDecisionAt?: string
  founderDecisionBy?: string
  founderDecisionNotes?: string
  weaknessIds: string[]
  evidenceSummary: string
  agentReviews: LearningAgentReview[]
}

export type LearningAgentReview = {
  agentId: string
  summary: string
  riskFlags: string[]
  approved: boolean
}

export type LearningBuildBrief = {
  id: string
  proposalId: string
  loopId: string
  createdAt: string
  environment: string
  context: string
  evidenceFromFailedRuns: string[]
  affectedCategories: string[]
  exactProposedChange: string
  filesLikelyToChange: string[]
  filesNotToTouch: string[]
  testsToAdd: string[]
  retestSequence: string[]
  safetyConstraints: string[]
  founderApprovalRequired: true
  cursorPrompt: string
}

export type LearningLoopRecord = {
  id: string
  createdAt: string
  triggerType: LearningLoopTriggerType
  sourceRunId?: string
  sourceEventId?: string
  status: LearningLoopStatus
  affectedAreas: string[]
  weakMarkers: string[]
  scenarioCategories: string[]
  evidenceSummary: string
  proposedLearning?: string
  proposedFilesToChange?: string[]
  proposedTests?: string[]
  safetyRisk?: LearningProposalSafetyRisk
  approvalRequired: boolean
  founderDecision?: 'approved' | 'rejected' | 'changes_requested'
  founderDecisionAt?: string
  founderDecisionBy?: string
  auditRecordIds: string[]
  weaknessIds: string[]
  proposalIds: string[]
  scenarioIds: string[]
  buildBriefId?: string
}

export type LearningLoopAutonomySettings = {
  autoDetectWeaknesses: boolean
  autoGenerateSyntheticScenarios: boolean
  autoRunExperimentalScenarios: boolean
  autoCreateLearningProposals: boolean
  autoCreateBuildBriefs: boolean
  requireFounderApprovalForBenchmarkAddition: boolean
  requireFounderApprovalForBrainChanges: boolean
  maxGeneratedScenariosPerDay: number
  maxExperimentalRunsPerDay: number
}

export type LearningLoopAuditAction =
  | 'loop_started'
  | 'weakness_detected'
  | 'scenario_generated'
  | 'proposal_created'
  | 'founder_decision'
  | 'build_brief_created'
  | 'retest_outcome'
  | 'scenario_approved'
  | 'scenario_rejected'
  | 'experimental_run'

export type LearningLoopAuditEntry = {
  id: string
  loopId?: string
  action: LearningLoopAuditAction
  timestamp: string
  summary: string
  actor?: string
  relatedIds?: string[]
  metadata?: Record<string, unknown>
}

export type LearningLoopOverview = {
  activeLoops: LearningLoopRecord[]
  latestWeakness?: DetectedWeakness
  pendingProposals: LearningProposal[]
  approvalRequired: number
  recentlyImprovedAreas: string[]
  weaknessMap: DetectedWeakness[]
  benchmarkBank: BenchmarkScenario[]
  autonomySettings: LearningLoopAutonomySettings
  disclaimer: string
}

export type LearningSignalInput = {
  evaluationRuns?: import('@/lib/orb/evaluation/orb-evaluation-types').OrbEvaluationRun[]
  qualityRuns?: import('@/lib/founder/quality-lab/quality-lab-types').QualityRun[]
  coverageWeakAreas?: FounderCoverageAreaId[]
  agentRecommendations?: string[]
  launchGateBlockers?: string[]
}
