import type { RiskLevel } from '@/lib/indicare-lab/types'
import type { ReviewAgentName } from '@/lib/indicare-lab/review-events/types'

export type EvaluationScenarioCategory =
  | 'daily-record'
  | 'incident-reflection'
  | 'missing-from-care'
  | 'physical-intervention'
  | 'reg44'
  | 'reg45'
  | 'supervision'
  | 'care-plan'
  | 'send-communication'
  | 'safeguarding-escalation'
  | 'child-voice'
  | 'judgemental-language'
  | 'general-recording-quality'

export type EvaluationRubricDimension =
  | 'safeguarding'
  | 'child-centredness'
  | 'therapeutic-language'
  | 'evidence-quality'
  | 'ofsted-readiness'
  | 'professional-boundaries'
  | 'observation-interpretation-action'
  | 'clarity'
  | 'dignity'
  | 'management-oversight'

export type EvaluationRunStatus = 'pending' | 'running' | 'completed' | 'failed'

export type EvaluationResultClassification = 'pass' | 'needs-improvement' | 'fail'

export type EvaluationComparisonRecommendation =
  | 'approve-test'
  | 'needs-more-work'
  | 'reject'

export type EvaluationScenario = {
  id: string
  title: string
  category: EvaluationScenarioCategory
  scenarioPrompt: string
  expectedStrengths: string[]
  knownRisks: string[]
  requiredElements: string[]
  disallowedElements: string[]
  riskLevel: RiskLevel
  relevantAgents: ReviewAgentName[]
}

export type EvaluationRubric = {
  dimensions: EvaluationRubricDimension[]
  weights: Partial<Record<EvaluationRubricDimension, number>>
}

export type EvaluationRubricDimensionScore = {
  dimension: EvaluationRubricDimension
  label: string
  score: number
  weight: number
  weightedScore: number
  notes: string[]
}

export type EvaluationFinding = {
  id: string
  dimension: EvaluationRubricDimension
  severity: RiskLevel
  message: string
  recommendation: string
}

export type EvaluationScorecard = {
  overallScore: number
  overallScoreOutOf: 5
  classification: EvaluationResultClassification
  dimensionScores: EvaluationRubricDimensionScore[]
  findings: EvaluationFinding[]
  blockers: string[]
  recommendedImprovements: string[]
  safetyConcerns: string[]
}

export type EvaluationResult = {
  id: string
  scenarioId: string
  draftAnswer: string
  scorecard: EvaluationScorecard
  evaluatedAt: string
  isDevelopment: boolean
  isInternalEvaluation: boolean
}

export type EvaluationRun = {
  id: string
  scenarioId: string
  status: EvaluationRunStatus
  draftAnswer: string
  proposedAnswer?: string
  result?: EvaluationResult
  comparison?: EvaluationComparison
  createdAt: string
  completedAt?: string
  isDevelopment: boolean
  isInternalEvaluation: boolean
}

export type EvaluationComparison = {
  id: string
  scenarioId: string
  currentAnswer: string
  proposedAnswer: string
  currentResult: EvaluationResult
  proposedResult: EvaluationResult
  currentScore: number
  proposedScore: number
  scoreDelta: number
  dimensionsImproved: EvaluationRubricDimension[]
  dimensionsWorsened: EvaluationRubricDimension[]
  safeguardingRegression: boolean
  recommendation: EvaluationComparisonRecommendation
  comparedAt: string
}

export type EvaluationRunSummary = {
  totalRuns: number
  completedRuns: number
  comparisonRuns: number
  passCount: number
  needsImprovementCount: number
  failCount: number
  latestOverallScore: number | null
  failedHighRiskScenarios: number
  commonWeakDimension: EvaluationRubricDimension | null
  scenarioCount: number
}

export const EVALUATION_SCENARIO_CATEGORY_LABELS: Record<EvaluationScenarioCategory, string> = {
  'daily-record': 'Daily record',
  'incident-reflection': 'Incident reflection',
  'missing-from-care': 'Missing from care',
  'physical-intervention': 'Physical intervention',
  reg44: 'Regulation 44',
  reg45: 'Regulation 45',
  supervision: 'Supervision',
  'care-plan': 'Care plan',
  'send-communication': 'SEND communication',
  'safeguarding-escalation': 'Safeguarding escalation',
  'child-voice': 'Child voice',
  'judgemental-language': 'Judgemental language',
  'general-recording-quality': 'General recording quality'
}

export const EVALUATION_RUBRIC_DIMENSION_LABELS: Record<EvaluationRubricDimension, string> = {
  safeguarding: 'Safeguarding',
  'child-centredness': 'Child-centredness',
  'therapeutic-language': 'Therapeutic language',
  'evidence-quality': 'Evidence quality',
  'ofsted-readiness': 'Ofsted readiness',
  'professional-boundaries': 'Professional boundaries',
  'observation-interpretation-action': 'Observation / interpretation / action',
  clarity: 'Clarity',
  dignity: 'Dignity',
  'management-oversight': 'Management oversight'
}

export const EVALUATION_RESULT_CLASSIFICATION_LABELS: Record<EvaluationResultClassification, string> = {
  pass: 'Pass',
  'needs-improvement': 'Needs improvement',
  fail: 'Fail'
}

export const EVALUATION_COMPARISON_RECOMMENDATION_LABELS: Record<
  EvaluationComparisonRecommendation,
  string
> = {
  'approve-test': 'Approve test',
  'needs-more-work': 'Needs more work',
  reject: 'Reject'
}

export const DEFAULT_EVALUATION_RUBRIC: EvaluationRubric = {
  dimensions: [
    'safeguarding',
    'child-centredness',
    'therapeutic-language',
    'evidence-quality',
    'ofsted-readiness',
    'professional-boundaries',
    'observation-interpretation-action',
    'clarity',
    'dignity',
    'management-oversight'
  ],
  weights: {
    safeguarding: 2,
    'child-centredness': 1.5,
    'therapeutic-language': 1.5,
    'evidence-quality': 1.2,
    'ofsted-readiness': 1.2,
    'professional-boundaries': 1.3,
    'observation-interpretation-action': 1.2,
    clarity: 1,
    dignity: 1.2,
    'management-oversight': 1.1
  }
}
