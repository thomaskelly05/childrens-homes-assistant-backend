import { getAllBenchmarkScenarios } from '../learning-loop/learning-loop-store.ts'
import { getEvaluationRuns } from '../../orb/evaluation/orb-evaluation-store.ts'
import type { OrbEvaluationRun } from '../../orb/evaluation/orb-evaluation-types.ts'

import { BRAIN_AUDIT_DOMAIN_DEFINITIONS } from './brain-audit-domains.ts'
import { getLatestBrainAudit, setLatestBrainAudit } from './brain-audit-store.ts'
import type {
  BrainAuditAreaResult,
  BrainAuditBenchmarkStatus,
  BrainAuditConfidence,
  BrainAuditSummary,
  BrainAuditAreaId
} from './brain-audit-types.ts'

type ScenarioResult = { text: string; passed: boolean; critical: boolean; testedAt: string }

function matchesArea(text: string, keywords: string[]): boolean {
  const haystack = text.toLowerCase()
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()))
}

function collectScenarioResults(runs: OrbEvaluationRun[]): ScenarioResult[] {
  return runs.flatMap((run) => {
    if (!('results' in run) || !Array.isArray(run.results)) return []
    const testedAt = run.completedAt ?? run.startedAt
    return run.results.map((item) => ({
      text: `${item.question ?? ''} ${item.scenarioId ?? ''}`,
      passed: Boolean(item.pass),
      critical: Boolean(item.criticalFailure),
      testedAt
    }))
  })
}

function strengthFromMetrics(
  scenariosRun: number,
  passRate: number | null,
  criticalFailures: number
): BrainAuditAreaResult['coverageStrength'] {
  if (scenariosRun === 0) return 'untested'
  if (criticalFailures > 0 || (passRate !== null && passRate < 60)) return 'weak'
  if (passRate !== null && passRate >= 85) return 'strong'
  return 'moderate'
}

function benchmarkStatusForArea(
  areaId: string,
  label: string,
  keywords: string[],
  benchmarkTopics: Set<string>
): BrainAuditBenchmarkStatus {
  const hay = [areaId, label.toLowerCase(), ...keywords.map((k) => k.toLowerCase())]
  const hasActive = hay.some((h) => benchmarkTopics.has(h))
  if (hasActive) return 'active'
  const scenarios = getAllBenchmarkScenarios().filter(
    (s) =>
      s.status === 'under_review' &&
      matchesArea(`${s.area} ${s.prompt} ${s.category ?? ''}`, keywords)
  )
  if (scenarios.length > 0) return 'under_review'
  return 'missing'
}

function confidenceFromMetrics(
  scenariosRun: number,
  passRate: number | null,
  benchmarkStatus: BrainAuditBenchmarkStatus
): BrainAuditConfidence {
  if (scenariosRun === 0) return 'unknown'
  if (scenariosRun >= 5 && passRate !== null && passRate >= 80 && benchmarkStatus === 'active') return 'high'
  if (scenariosRun >= 2) return 'medium'
  return 'low'
}

export function buildBrainCoverageAudit(input?: {
  evaluationRuns?: OrbEvaluationRun[]
  triggerType?: BrainAuditSummary['triggerType']
}): BrainAuditSummary {
  const runs = input?.evaluationRuns ?? getEvaluationRuns().filter((r) => r.mode === 'internal-brain')
  const scenarioResults = collectScenarioResults(runs)
  const benchmarkScenarios = getAllBenchmarkScenarios()
  const benchmarkTopics = new Set(
    benchmarkScenarios
      .filter((s) => s.status === 'active_benchmark' || s.status === 'approved_for_testing')
      .flatMap((s) => [s.area.toLowerCase(), s.category?.toLowerCase() ?? '', s.prompt.slice(0, 40).toLowerCase()])
  )

  const areas: BrainAuditAreaResult[] = BRAIN_AUDIT_DOMAIN_DEFINITIONS.map((def) => {
    const matched = scenarioResults.filter((s) => matchesArea(s.text, def.keywords))
    const scenariosRun = matched.length
    const passed = matched.filter((s) => s.passed).length
    const passRate = scenariosRun > 0 ? Math.round((passed / scenariosRun) * 1000) / 10 : null
    const criticalFailures = matched.filter((s) => s.critical).length
    const lastTested =
      matched.length > 0
        ? matched
            .map((s) => s.testedAt)
            .sort()
            .reverse()[0] ?? null
        : null

    const availableFromBenchmark = benchmarkScenarios.filter((s) =>
      matchesArea(`${s.area} ${s.prompt}`, def.keywords)
    ).length

    const weakMarkers: string[] = []
    if (criticalFailures > 0) weakMarkers.push(`${criticalFailures} critical failure(s)`)
    if (passRate !== null && passRate < 70) weakMarkers.push(`Pass rate ${passRate}%`)

    const missingMarkers: string[] = []
    if (scenariosRun === 0) missingMarkers.push('No synthetic scenarios run')
    if (availableFromBenchmark === 0) missingMarkers.push('No benchmark scenarios available')

    const benchmarkStatus = benchmarkStatusForArea(def.id, def.label, def.keywords, benchmarkTopics)

    const recommendedNewScenarios: string[] = []
    if (scenariosRun === 0) {
      recommendedNewScenarios.push(`Synthetic ${def.label.toLowerCase()} — baseline scenario`)
      recommendedNewScenarios.push(`Synthetic ${def.label.toLowerCase()} — Ofsted inspector-style question`)
    } else if (passRate !== null && passRate < 80) {
      recommendedNewScenarios.push(`Adversarial variant for ${def.label.toLowerCase()}`)
    }

    const recommendedLearningProposal =
      weakMarkers.length > 0 || scenariosRun === 0
        ? `Strengthen internal brain coverage for ${def.label}: ${weakMarkers.join('; ') || 'untested area'}`
        : null

    return {
      id: def.id,
      label: def.label,
      category: def.category,
      scenariosAvailable: availableFromBenchmark,
      scenariosRun,
      passRate,
      criticalFailures,
      lastTested,
      coverageStrength: strengthFromMetrics(scenariosRun, passRate, criticalFailures),
      weakMarkers,
      missingMarkers,
      benchmarkStatus,
      recommendedNewScenarios,
      recommendedLearningProposal,
      confidenceLevel: confidenceFromMetrics(scenariosRun, passRate, benchmarkStatus)
    }
  })

  const weakAreas = areas.filter((a) => a.coverageStrength === 'weak').map((a) => a.id)
  const untestedAreas = areas.filter((a) => a.coverageStrength === 'untested').map((a) => a.id)
  const testedCount = areas.filter((a) => a.scenariosRun > 0).length
  const overallCoveragePercent = Math.round((testedCount / areas.length) * 1000) / 10

  const topMissingWeakAreas = [...areas]
    .filter((a) => a.coverageStrength === 'untested' || a.coverageStrength === 'weak')
    .sort((a, b) => {
      const score = (x: BrainAuditAreaResult) =>
        (x.coverageStrength === 'untested' ? 2 : 1) + x.criticalFailures + (x.weakMarkers.length > 0 ? 1 : 0)
      return score(b) - score(a)
    })
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      label: a.label,
      reason:
        a.coverageStrength === 'untested'
          ? 'Untested — no synthetic scenarios run'
          : a.weakMarkers.join('; ') || 'Weak coverage'
    }))

  const audit: BrainAuditSummary = {
    id: `brain-audit-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    triggerType: input?.triggerType ?? 'manual',
    overallCoveragePercent,
    areas,
    weakAreas,
    untestedAreas,
    topMissingWeakAreas,
    criticalFailureCount: areas.reduce((sum, a) => sum + a.criticalFailures, 0),
    recommendedScenarioCount: areas.reduce((sum, a) => sum + a.recommendedNewScenarios.length, 0),
    recommendedLearningProposalCount: areas.filter((a) => a.recommendedLearningProposal).length
  }

  setLatestBrainAudit(audit)
  return audit
}

export function getBrainAuditWeakAreaIds(): BrainAuditAreaId[] {
  const audit = getLatestBrainAudit() ?? buildBrainCoverageAudit()
  return [...audit.weakAreas, ...audit.untestedAreas]
}

export function identifyCoverageGaps(): BrainAuditAreaId[] {
  const audit = getLatestBrainAudit() ?? buildBrainCoverageAudit()
  return audit.untestedAreas
}

export { getLatestBrainAudit }
