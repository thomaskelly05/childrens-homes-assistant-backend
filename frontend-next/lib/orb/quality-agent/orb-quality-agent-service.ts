import type { OrbEvaluationResult, OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'
import { classifyOrbFailure, FAILURE_CLASSIFICATION_LABELS, groupClassifiedFailures } from './orb-failure-classifier.ts'
import { buildClassifierInputFromResult } from './orb-failure-classifier-input.ts'
import { formatBuildBriefForCursor, generateOrbQualityBuildBrief } from './orb-quality-build-brief-generator.ts'
import { prepareQualityPrWorkflow } from './orb-quality-pr-workflow.ts'
import { generateRemediationPlan } from './orb-remediation-plan-generator.ts'
import type {
  OrbFailureClassification,
  OrbFailureGroup,
  OrbQualityAgentAnalysis,
  OrbQualityBuildBrief,
  OrbQualityPrSummary,
  OrbRemediationPlan
} from './orb-quality-agent-types.ts'
export const ORB_QUALITY_AGENT_DISCLAIMER =
  'This agent prepares quality improvement work. It does not approve, merge, or override safeguarding judgement.'

export function resolveRunType(run: OrbEvaluationRun): string {
  const pack = run.packType ?? 'standard'
  if (run.title?.toUpperCase().includes('GOLD')) return 'live-llm GOLD'
  return `${run.mode} ${pack}`
}

export function isSupportedRunType(runType: string): boolean {
  const supported: readonly string[] = [
    'internal-brain adversarial',
    'internal-brain high-risk',
    'internal-brain full',
    'live-llm adversarial',
    'live-llm high-risk',
    'live-llm GOLD'
  ]
  return supported.some((s) => runType.includes(s.split(' ')[0]!) && runType.includes(s.split(' ').slice(1).join(' ')))
    || runType.includes('synthetic')
}

export function getFailedResults(run: OrbEvaluationRun): OrbEvaluationResult[] {
  return (run.results ?? []).filter((r) => !r.pass || r.criticalFailure || r.infrastructureError)
}

export function analyzeOrbEvaluationRun(
  run: OrbEvaluationRun,
  options?: { launchGateBlockers?: string[] }
): OrbQualityAgentAnalysis {
  const runType = resolveRunType(run)
  const failedResults = getFailedResults(run)

  const blockers = options?.launchGateBlockers ?? []

  const classified = failedResults.map((result) => {
    const input = buildClassifierInputFromResult(run, result, {
      launchGateBlockers: blockers,
      displayScoringVersion: result.scoringVersion,
      persistedScoringVersion: run.scoringVersion
    })
    return classifyOrbFailure(result.id, input)
  })

  const grouped = groupClassifiedFailures(classified)
  const failureGroups: OrbFailureGroup[] = []

  for (const [classification, failures] of grouped) {
    const first = failures[0]!
    failureGroups.push({
      classification,
      label: FAILURE_CLASSIFICATION_LABELS[classification],
      confidence: first.confidence,
      reason: first.reason,
      safetyRisk: first.safetyRisk,
      recommendedAction: first.recommendedAction,
      affectedScenarioCategories: [...new Set(failures.map((f) => f.scenarioCategory))],
      failures
    })
  }

  const remediationPlans = {} as Record<OrbFailureClassification, OrbRemediationPlan>
  for (const group of failureGroups) {
    remediationPlans[group.classification] = generateRemediationPlan(group.classification, group.failures)
  }

  const suggestedNextAction =
    failureGroups.length === 0
      ? 'No failures detected — continue monitoring ORB evaluation runs.'
      : failureGroups[0]!.recommendedAction

  return {
    run,
    runType,
    failedResults,
    failureGroups,
    remediationPlans,
    suggestedNextAction,
    approvalRequired: true,
    disclaimer: ORB_QUALITY_AGENT_DISCLAIMER
  }
}

export function generateBuildBriefFromAnalysis(
  analysis: OrbQualityAgentAnalysis
): { brief: OrbQualityBuildBrief; formatted: string } {
  const brief = generateOrbQualityBuildBrief({
    run: analysis.run,
    runType: analysis.runType,
    failureGroups: analysis.failureGroups,
    remediationPlans: analysis.remediationPlans
  })

  return { brief, formatted: formatBuildBriefForCursor(brief) }
}

export function prepareDraftPrFromAnalysis(
  analysis: OrbQualityAgentAnalysis,
  classification?: OrbFailureClassification
): OrbQualityPrSummary | null {
  const group = classification
    ? analysis.failureGroups.find((g) => g.classification === classification)
    : analysis.failureGroups[0]

  if (!group) return null

  const plan = analysis.remediationPlans[group.classification]
  return prepareQualityPrWorkflow({
    run: analysis.run,
    failureGroup: group,
    remediationPlan: plan
  })
}

export function findLatestFailedRun(runs: OrbEvaluationRun[]): OrbEvaluationRun | undefined {
  return [...runs]
    .filter((r) => r.status === 'completed' || r.status === 'failed' || r.status === 'interrupted')
    .filter((r) => getFailedResults(r).length > 0 || r.criticalFailures > 0)
    .sort((a, b) => {
      const aTime = a.completedAt ?? a.startedAt
      const bTime = b.completedAt ?? b.startedAt
      return bTime.localeCompare(aTime)
    })[0]
}
