import { getLearningLoopAutonomySettings } from './learning-loop-autonomy.ts'
import {
  addBenchmarkScenario,
  getAllBenchmarkScenarios,
  getBenchmarkScenario,
  updateBenchmarkScenario
} from './learning-loop-store.ts'
import type { BenchmarkScenario, SyntheticScenario } from './learning-loop-types.ts'

export function addScenarioToBenchmarkBank(
  scenario: SyntheticScenario,
  input: {
    whyGenerated: string
    recommendedByAgent?: string
    status?: BenchmarkScenario['status']
  }
): BenchmarkScenario {
  const settings = getLearningLoopAutonomySettings()
  const status: BenchmarkScenario['status'] =
    input.status ??
    (settings.requireFounderApprovalForBenchmarkAddition ? 'generated' : 'approved_for_testing')

  const benchmark: BenchmarkScenario = {
    ...scenario,
    status,
    whyGenerated: input.whyGenerated,
    recommendedByAgent: input.recommendedByAgent,
    passHistory: [],
    foundGenuineWeakness: false,
    ledToImprovementPr: false
  }

  return addBenchmarkScenario(benchmark)
}

export function approveBenchmarkScenario(
  scenarioId: string,
  actor: string,
  targetStatus: 'approved_for_testing' | 'active_benchmark' = 'approved_for_testing'
): BenchmarkScenario | null {
  const settings = getLearningLoopAutonomySettings()
  if (settings.requireFounderApprovalForBenchmarkAddition && !actor) {
    return null
  }

  const scenario = getBenchmarkScenario(scenarioId)
  if (!scenario) return null
  if (scenario.status === 'rejected' || scenario.status === 'retired') return null

  return updateBenchmarkScenario(scenarioId, {
    status: targetStatus,
    founderApprovedAt: new Date().toISOString(),
    founderApprovedBy: actor
  })
}

export function rejectBenchmarkScenario(
  scenarioId: string,
  actor: string,
  reason?: string
): BenchmarkScenario | null {
  const scenario = getBenchmarkScenario(scenarioId)
  if (!scenario) return null

  return updateBenchmarkScenario(scenarioId, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectedBy: actor,
    rejectionReason: reason ?? 'Founder rejected scenario.'
  })
}

export function recordBenchmarkPassOutcome(
  scenarioId: string,
  runId: string,
  passed: boolean,
  foundWeakness = false
): BenchmarkScenario | null {
  const scenario = getBenchmarkScenario(scenarioId)
  if (!scenario) return null

  return updateBenchmarkScenario(scenarioId, {
    passHistory: [
      ...scenario.passHistory,
      { runId, passed, testedAt: new Date().toISOString() }
    ],
    foundGenuineWeakness: scenario.foundGenuineWeakness || foundWeakness
  })
}

export function markBenchmarkLedToImprovementPr(scenarioId: string): BenchmarkScenario | null {
  return updateBenchmarkScenario(scenarioId, { ledToImprovementPr: true })
}

export function getActiveBenchmarkScenarios(): BenchmarkScenario[] {
  return getAllBenchmarkScenarios().filter((s) => s.status === 'active_benchmark')
}

export function getAwaitingApprovalScenarios(): BenchmarkScenario[] {
  return getAllBenchmarkScenarios().filter((s) =>
    ['generated', 'under_review'].includes(s.status)
  )
}

export function benchmarkAdditionRequiresFounderApproval(): boolean {
  return getLearningLoopAutonomySettings().requireFounderApprovalForBenchmarkAddition
}
