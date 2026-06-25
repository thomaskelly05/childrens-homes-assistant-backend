import { BENCHMARK_SCENARIOS } from '@/lib/indicare-lab/evaluations/benchmark-scenarios'
import {
  compareEvaluationAnswers,
  countFailedHighRiskScenarios,
  evaluateDraftAnswer,
  getWeakestDimension
} from '@/lib/indicare-lab/evaluations/evaluation-engine'
import type {
  CreateEvaluationRunInput,
  EvaluationRepository
} from '@/lib/indicare-lab/evaluations/evaluation-repository'
import type {
  EvaluationRun,
  EvaluationRunSummary,
  EvaluationScenario
} from '@/lib/indicare-lab/evaluations/types'

export class EvaluationMemoryRepository implements EvaluationRepository {
  private scenarios: EvaluationScenario[] = [...BENCHMARK_SCENARIOS]
  private runs: EvaluationRun[] = []

  listScenarios(): EvaluationScenario[] {
    return [...this.scenarios]
  }

  getScenarioById(id: string): EvaluationScenario | undefined {
    return this.scenarios.find((s) => s.id === id)
  }

  createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun {
    const scenario = this.getScenarioById(input.scenarioId)
    if (!scenario) {
      throw new Error(`Unknown evaluation scenario: ${input.scenarioId}`)
    }

    const runId = `erun-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const createdAt = new Date().toISOString()

    if (input.proposedAnswer?.trim()) {
      const comparison = compareEvaluationAnswers(
        scenario,
        input.draftAnswer,
        input.proposedAnswer
      )

      const run: EvaluationRun = {
        id: runId,
        scenarioId: input.scenarioId,
        status: 'completed',
        draftAnswer: input.draftAnswer,
        proposedAnswer: input.proposedAnswer,
        result: comparison.proposedResult,
        comparison,
        createdAt,
        completedAt: createdAt,
        isDevelopment: true,
        isInternalEvaluation: true
      }

      this.runs.unshift(run)
      return run
    }

    const result = evaluateDraftAnswer(scenario, input.draftAnswer)

    const run: EvaluationRun = {
      id: runId,
      scenarioId: input.scenarioId,
      status: 'completed',
      draftAnswer: input.draftAnswer,
      result,
      createdAt,
      completedAt: createdAt,
      isDevelopment: true,
      isInternalEvaluation: true
    }

    this.runs.unshift(run)
    return run
  }

  listEvaluationRuns(): EvaluationRun[] {
    return [...this.runs]
  }

  getEvaluationRunById(id: string): EvaluationRun | undefined {
    return this.runs.find((r) => r.id === id)
  }

  summariseEvaluationRuns(): EvaluationRunSummary {
    const completed = this.runs.filter((r) => r.status === 'completed' && r.result)
    const comparisonRuns = this.runs.filter((r) => r.comparison).length
    const results = completed.map((r) => r.result!)

    const passCount = results.filter((r) => r.scorecard.classification === 'pass').length
    const needsImprovementCount = results.filter(
      (r) => r.scorecard.classification === 'needs-improvement'
    ).length
    const failCount = results.filter((r) => r.scorecard.classification === 'fail').length

    const latestOverallScore =
      results.length > 0 ? results[0]!.scorecard.overallScore : null

    return {
      totalRuns: this.runs.length,
      completedRuns: completed.length,
      comparisonRuns,
      passCount,
      needsImprovementCount,
      failCount,
      latestOverallScore,
      failedHighRiskScenarios: countFailedHighRiskScenarios(this.runs, this.scenarios),
      commonWeakDimension: getWeakestDimension(results),
      scenarioCount: this.scenarios.length
    }
  }

  resetForTests(): void {
    this.runs = []
    this.scenarios = [...BENCHMARK_SCENARIOS]
  }
}

export const evaluationMemoryRepository = new EvaluationMemoryRepository()
