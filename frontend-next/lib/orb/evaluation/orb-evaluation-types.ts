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

export type OrbEvaluationRunMode = 'template' | 'live-llm'

export type OrbEvaluationRunStatus = 'queued' | 'running' | 'completed' | 'failed'

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
  answerSource?: 'template' | 'live-llm' | 'live-orb'
  liveCallError?: string
  modelRoute?: Record<string, string | null | undefined>
  retestOfResultId?: string
}

export type OrbEvaluationRun = {
  id: string
  mode: OrbEvaluationRunMode
  status: OrbEvaluationRunStatus
  scenarioCount: number
  completedCount: number
  passRate: number
  averageScore: number
  criticalFailures: number
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
