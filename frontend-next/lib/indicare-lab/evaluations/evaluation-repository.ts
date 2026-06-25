import type {
  EvaluationComparison,
  EvaluationResult,
  EvaluationRun,
  EvaluationRunSummary,
  EvaluationScenario
} from '@/lib/indicare-lab/evaluations/types'

export type CreateEvaluationRunInput = {
  scenarioId: string
  draftAnswer: string
  proposedAnswer?: string
}

export interface EvaluationRepository {
  listScenarios(): EvaluationScenario[]
  getScenarioById(id: string): EvaluationScenario | undefined
  createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun
  listEvaluationRuns(): EvaluationRun[]
  getEvaluationRunById(id: string): EvaluationRun | undefined
  summariseEvaluationRuns(): EvaluationRunSummary
  resetForTests(): void
}

export type { EvaluationComparison, EvaluationResult, EvaluationRun, EvaluationRunSummary }
