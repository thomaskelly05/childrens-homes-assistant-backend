import type {
  OrbEvaluationResult,
  OrbEvaluationRun,
  OrbEvaluationRunMode,
  OrbLiveGuardrailAnswerSource,
  RedTeamFinding
} from '../evaluation/orb-evaluation-types.ts'

export const ORB_QUALITY_AGENT_ENVIRONMENT = 'thomaskelly05/childrens-homes-assistant-backend'

export const SUPPORTED_RUN_TYPES = [
  'internal-brain adversarial',
  'internal-brain high-risk',
  'internal-brain full',
  'live-llm adversarial',
  'live-llm high-risk',
  'live-llm GOLD',
  'future 100 / 1,000 synthetic scenario packs'
] as const

export type OrbFailureClassification =
  | 'adversarial_firewall_gap'
  | 'firewall_scorer_false_positive'
  | 'high_risk_scaffold_gap'
  | 'high_risk_repair_gap'
  | 'deterministic_fallback_gap'
  | 'infrastructure_provider_error'
  | 'frontend_display_or_persistence_issue'
  | 'scorer_threshold_or_context_issue'
  | 'genuine_answer_quality_issue'
  | 'launch_gate_blocker'

export type OrbFailureConfidence = 'high' | 'medium' | 'low'

export type OrbFailureSafetyRisk = 'critical' | 'high' | 'medium' | 'low'

export type OrbFailureClassifierInput = {
  runId: string
  pack: string
  mode: OrbEvaluationRunMode
  scenarioId: string
  scenarioCategory: string
  scoringVersion?: string
  answerSource?: OrbLiveGuardrailAnswerSource | string
  safetyFirewallUsed?: boolean
  scorerUsed?: string
  criticalFailure: boolean
  redTeamFindings: RedTeamFinding[]
  missingSafeguards: string[]
  failReasons: string[]
  infrastructureError?: boolean
  finalAnswer?: string
  scoringAnswer?: string
  repairAttempted?: boolean
  fallbackUsed?: boolean
  pass?: boolean
  issues?: string[]
  runStatus?: string
  displayScoringVersion?: string
  persistedScoringVersion?: string
  launchGateBlockers?: string[]
}

export type OrbClassifiedFailure = {
  resultId: string
  scenarioId: string
  scenarioCategory: string
  classification: OrbFailureClassification
  confidence: OrbFailureConfidence
  reason: string
  safetyRisk: OrbFailureSafetyRisk
  recommendedAction: string
  input: OrbFailureClassifierInput
}

export type OrbFailureGroup = {
  classification: OrbFailureClassification
  label: string
  confidence: OrbFailureConfidence
  reason: string
  safetyRisk: OrbFailureSafetyRisk
  recommendedAction: string
  affectedScenarioCategories: string[]
  failures: OrbClassifiedFailure[]
}

export type OrbRemediationPlan = {
  failureSummary: string
  affectedScenarios: string[]
  likelyRootCause: string
  filesLikelyToChange: string[]
  filesMustNotChange: string[]
  testsToAdd: string[]
  manualRetestChecklist: string[]
  rollbackRisk: string
  launchImpact: string
}

export type OrbQualityBuildBrief = {
  environment: string
  context: string
  observedFailures: string[]
  phases: string[]
  constraints: string[]
  tests: string[]
  manualRetestChecklist: string[]
  cursorPrompt: string
}

export type OrbQualityPrSummary = {
  title: string
  body: string
  branchName: string
  founderApprovalRequired: true
  autoMergeAllowed: false
}

export type OrbQualityAgentAction =
  | 'analyze_run'
  | 'classify_failures'
  | 'generate_remediation_plan'
  | 'generate_build_brief'
  | 'prepare_pr'
  | 'create_draft_pr'

export type OrbQualityAgentApprovalStatus = 'pending' | 'approved' | 'rejected'

export type OrbQualityAgentAuditRecord = {
  id: string
  timestamp: string
  user: string
  runId: string
  action: OrbQualityAgentAction
  failureClassification?: OrbFailureClassification
  generatedPlan?: string
  prUrl?: string
  testsRequested: string[]
  approvalStatus: OrbQualityAgentApprovalStatus
  metadata?: Record<string, unknown>
}

export type OrbQualityAgentAnalysis = {
  run: OrbEvaluationRun
  runType: string
  failedResults: OrbEvaluationResult[]
  failureGroups: OrbFailureGroup[]
  remediationPlans: Record<OrbFailureClassification, OrbRemediationPlan>
  suggestedNextAction: string
  approvalRequired: true
  disclaimer: string
}

export type OrbQualityAgentSafetyViolation = {
  code: string
  message: string
}
