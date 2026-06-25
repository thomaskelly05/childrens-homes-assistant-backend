import { evaluationMemoryRepository } from '@/lib/indicare-lab/evaluations/evaluation-memory-repository'
import type { CreateEvaluationRunInput } from '@/lib/indicare-lab/evaluations/evaluation-repository'
import type {
  EvaluationRun,
  EvaluationRunSummary,
  EvaluationScenario
} from '@/lib/indicare-lab/evaluations/types'
import {
  createEvaluationRun as labCreateEvaluationRun,
  listEvaluationRuns as labListEvaluationRuns
} from '@/lib/indicare-lab/storage/lab-storage'

/**
 * Persistence-ready storage facade for evaluation benchmarks.
 * Writes route through lab-storage for audit trail; reads delegate to active repository.
 */
const activeRepository = evaluationMemoryRepository

export function listScenarios(): EvaluationScenario[] {
  return activeRepository.listScenarios()
}

export function getScenarioById(id: string): EvaluationScenario | undefined {
  return activeRepository.getScenarioById(id)
}

export function createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun {
  return labCreateEvaluationRun(input)
}

export function listEvaluationRuns(): EvaluationRun[] {
  return labListEvaluationRuns()
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
