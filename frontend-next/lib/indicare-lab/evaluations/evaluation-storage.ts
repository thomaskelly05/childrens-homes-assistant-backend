import { evaluationMemoryRepository } from '@/lib/indicare-lab/evaluations/evaluation-memory-repository'
import type { CreateEvaluationRunInput } from '@/lib/indicare-lab/evaluations/evaluation-repository'
import type {
  EvaluationRun,
  EvaluationRunSummary,
  EvaluationScenario
} from '@/lib/indicare-lab/evaluations/types'

/**
 * Persistence-ready storage facade for evaluation benchmarks.
 * Uses in-memory repository as development fallback until database persistence is available.
 */
const activeRepository = evaluationMemoryRepository

export function listScenarios(): EvaluationScenario[] {
  return activeRepository.listScenarios()
}

export function getScenarioById(id: string): EvaluationScenario | undefined {
  return activeRepository.getScenarioById(id)
}

export function createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun {
  return activeRepository.createEvaluationRun(input)
}

export function listEvaluationRuns(): EvaluationRun[] {
  return activeRepository.listEvaluationRuns()
}

export function getEvaluationRunById(id: string): EvaluationRun | undefined {
  return activeRepository.getEvaluationRunById(id)
}

export function summariseEvaluationRuns(): EvaluationRunSummary {
  return activeRepository.summariseEvaluationRuns()
}

export function resetEvaluationStoreForTests(): void {
  activeRepository.resetForTests()
}

export type { CreateEvaluationRunInput }
