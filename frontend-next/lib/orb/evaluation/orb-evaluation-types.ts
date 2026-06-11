export type OrbEvaluationRolePerspective =
  | 'residential-worker'
  | 'senior-worker'
  | 'registered-manager'
  | 'responsible-individual'
  | 'reg-44-visitor'
  | 'ofsted-inspector'
  | 'safeguarding-lead'
  | 'child-rights-advocate'
  | 'data-protection-lead'
  | 'journalist'
  | 'parent'
  | 'social-worker'
  | 'adversarial-user'

export type OrbEvaluationRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type OrbEvaluationRunMode = 'template' | 'internal-brain' | 'live-llm'

export type OrbEvaluationRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted'

export type RedTeamFindingType =
  | 'unsafe-safeguarding'
  | 'missed-escalation'
  | 'invented-law'
  | 'diagnosis'
  | 'punitive-language'
  | 'missing-child-voice'
  | 'privacy-risk'
  | 'weak-ofsted-alignment'
  | 'unhelpful-practicality'
  | 'hallucination'

export type RedTeamFindingSeverity = 'critical' | 'high' | 'medium' | 'low'

export type MissingRequirementSeverity = 'critical' | 'high' | 'medium' | 'low' | 'improvement'

export type MissingRequirement = {
  id: string
  label: string
  severity: MissingRequirementSeverity
  whyItMatters: string
  detectedRelatedWording: boolean
  matchedPhrases: string[]
  recommendedImprovement: string
  shouldBlockPass: boolean
}

export type OrbEvaluationDomain =
  | 'safeguarding'
  | 'daily-practice'
  | 'management'
  | 'adversarial'

export type OrbEvaluationScenario = {
  id: string
  domain: OrbEvaluationDomain
  rolePerspective: OrbEvaluationRolePerspective
  category: string
  question: string
  expectedResponseFocus: string[]
  requiredSafeguards: string[]
  requiredRegulatoryAnchors: string[]
  requiredTone: string[]
  riskLevel: OrbEvaluationRiskLevel
  adversarialFlags: string[]
  createdAt: string
}

export type OrbEvaluationScores = {
  safeguarding: number
  escalation: number
  localPolicyCaveat: number
  therapeuticTone: number
  childCentredLanguage: number
  childVoice: number
  ofstedAlignment: number
  practicalUsefulness: number
  evidenceQuality: number
  hallucinationRisk: number
  dataProtection: number
  completeness: number
  overall: number
}

export type RedTeamFinding = {
  id: string
  type: RedTeamFindingType
  severity: RedTeamFindingSeverity
  summary: string
  recommendation: string
  agentId?: string
}

export type OrbInternalBrainEvaluationResult = {
  scenarioId: string
  detectedDomain: string
  detectedCategory: string
  detectedRiskLevel: string
  detectedRolePerspective: string
  detectedOrbMode?: string
  requiredEscalation: boolean
  requiredSafeguards: string[]
  regulatoryAnchors: string[]
  childVoicePrompts: string[]
  therapeuticPrompts: string[]
  localPolicyCaveats: string[]
  dataProtectionWarnings: string[]
  recommendedTemplate?: string | null
  fallbackAnswer: string
  missingRequirements: string[]
  missingRequirementDetails?: MissingRequirement[]
  scoringVersion?: string
  internalBrainScore: number
  criticalFailure: boolean
  issues: string[]
  routing?: Record<string, string | boolean | null | undefined>
  safeguardingDetected?: boolean
  punitiveRequestFlagged?: boolean
  diagnosisRequestFlagged?: boolean
  identifiableDataFlagged?: boolean
}

export type OrbInternalBrainScoreBreakdown = {
  scenarioClassification: number
  riskDetection: number
  safeguardingTrigger: number
  escalationRequirement: number
  localPolicyCaveat: number
  childVoiceRequirement: number
  therapeuticFraming: number
  regulatoryAnchoring: number
  dataProtectionHandling: number
  templateMatch: number
  fallbackUsefulness: number
  completeness: number
  overall: number
}

export type OrbLiveGuardrailCheck = {
  passed: boolean
  missingSafeguards: string[]
  forbiddenViolations?: string[]
  repairAttempted: boolean
  fallbackUsed: boolean
  scaffoldCategory: string
  promptTier?: string | null
  expertDepth?: string | null
}

export type OrbEvaluationResult = {
  id: string
  runId: string
  scenarioId: string
  question: string
  orbAnswer: string
  scores: OrbEvaluationScores
  pass: boolean
  criticalFailure: boolean
  issues: string[]
  redTeamFindings: RedTeamFinding[]
  recommendedFix?: string
  createdAt: string
  answerSource?: 'template' | 'internal-brain' | 'live-llm' | 'live-orb'
  liveCallError?: string
  modelRoute?: Record<string, string | null | undefined>
  retestOfResultId?: string
  internalBrain?: OrbInternalBrainEvaluationResult
  internalBrainScores?: OrbInternalBrainScoreBreakdown
  missingRequirementDetails?: MissingRequirement[]
  improvementOpportunities?: MissingRequirement[]
  liveGuardrail?: OrbLiveGuardrailCheck
  safetyScaffoldCategory?: string
}

export const INTERNAL_BRAIN_SCORING_VERSION_V2 = 'internal-brain-v2'

export type OrbEvaluationRun = {
  id: string
  mode: OrbEvaluationRunMode
  status: OrbEvaluationRunStatus
  scenarioCount: number
  completedCount: number
  passRate: number
  averageScore: number
  criticalFailures: number
  missingRequirementsCount?: number
  improvementOpportunitiesCount?: number
  scoringVersion?: string
  supersededByScoringFix?: boolean
  startedAt: string
  completedAt?: string
  createdBy: string
  summary: string
  title?: string
  packType?: 'standard' | 'high-risk' | 'adversarial' | 'custom' | 'retest'
  results?: OrbEvaluationResult[]
  limitations?: string[]
  liveLlmAvailable?: boolean
}

export type OrbEvaluationFixProposal = {
  id: string
  resultId: string
  runId: string
  scenarioId: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  suggestedChange: string
  acceptanceCriteria: string[]
  createdAt: string
  createdBy: string
  linkedBuildBriefId?: string
  linkedQualityLabScenarioId?: string
}

export type EvaluationRunsPayload = {
  overview: unknown
  runs: OrbEvaluationRun[]
  count: number
}

export type EvaluationScenariosPayload = {
  scenarios: OrbEvaluationScenario[]
  count: number
}
