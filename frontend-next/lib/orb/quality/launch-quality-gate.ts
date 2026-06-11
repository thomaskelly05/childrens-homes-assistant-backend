import type {
  OrbLaunchQualityGate,
  QualityRun,
  ReviewStatus
} from '@/lib/founder/quality-lab/quality-lab-types'
import type { OrbEvaluationRun } from '@/lib/orb/evaluation/orb-evaluation-types'

export type LaunchGateInput = {
  runs: QualityRun[]
  evaluationRuns?: OrbEvaluationRun[]
  whistleblowingCovered?: boolean
  privacyRetentionReviewed?: boolean
}

const REVIEWED_STATUSES: ReviewStatus[] = [
  'reviewed-pass',
  'reviewed-concern',
  'reviewed-fail',
  'needs-retest'
]

function latestLiveRun(runs: QualityRun[]): QualityRun | undefined {
  return runs.find((run) => run.runMode === 'live-llm' && run.status === 'complete')
}

function latestHighRiskEvaluationRun(evaluationRuns: OrbEvaluationRun[]): OrbEvaluationRun | undefined {
  return evaluationRuns.find(
    (run) =>
      run.status === 'completed' &&
      run.mode === 'live-llm' &&
      (run.packType === 'high-risk' || run.packType === 'adversarial')
  )
}

function latestInternalBrainRun(
  evaluationRuns: OrbEvaluationRun[],
  packType: 'high-risk' | 'adversarial'
): OrbEvaluationRun | undefined {
  return evaluationRuns.find(
    (run) => run.status === 'completed' && run.mode === 'internal-brain' && run.packType === packType
  )
}

function latestGoldLiveRun(runs: QualityRun[]): QualityRun | undefined {
  return latestLiveRun(runs)
}

function highRiskScenariosReviewed(run: QualityRun): boolean {
  const highRiskItems = run.results.filter(
    (item) => item.riskLevel === 'high' || item.riskLevel === 'critical'
  )
  if (highRiskItems.length === 0) return true
  return highRiskItems.every(
    (item) =>
      item.humanReview?.reviewStatus &&
      REVIEWED_STATUSES.includes(item.humanReview.reviewStatus)
  )
}

function highRiskScenariosPassed(run: QualityRun): boolean {
  const highRiskItems = run.results.filter(
    (item) => item.riskLevel === 'high' || item.riskLevel === 'critical'
  )
  if (highRiskItems.length === 0) return true
  return highRiskItems.every((item) => item.passed && !item.criticalFailure)
}

export function computeOrbLaunchQualityGate(input: LaunchGateInput): OrbLaunchQualityGate {
  const liveRun = latestGoldLiveRun(input.runs)
  const evaluationRuns = input.evaluationRuns ?? []
  const redTeamRun = latestHighRiskEvaluationRun(evaluationRuns)
  const redTeamCriticalFailures = redTeamRun?.criticalFailures ?? 0

  const internalBrainHighRiskRun = latestInternalBrainRun(evaluationRuns, 'high-risk')
  const internalBrainAdversarialRun = latestInternalBrainRun(evaluationRuns, 'adversarial')
  const internalBrainHighRiskFailures = internalBrainHighRiskRun?.criticalFailures ?? 0
  const internalBrainAdversarialFailures = internalBrainAdversarialRun?.criticalFailures ?? 0
  const internalBrainCriticalFailures = Math.max(
    internalBrainHighRiskFailures,
    internalBrainAdversarialFailures
  )

  const criticalFailures = liveRun?.criticalFailures ?? liveRun?.results.filter((r) => r.criticalFailure).length ?? 0
  const pendingHumanReviews =
    liveRun?.pendingHumanReviews ??
    liveRun?.results.filter(
      (r) =>
        r.requiresHumanReview &&
        (!r.humanReview?.reviewStatus || r.humanReview.reviewStatus === 'pending-human-review')
    ).length ??
    0

  const blockers: string[] = []
  const liveRunCompleted = Boolean(liveRun && liveRun.runMode === 'live-llm')
  const internalBrainHighRiskCompleted = Boolean(internalBrainHighRiskRun)
  const internalBrainAdversarialCompleted = Boolean(internalBrainAdversarialRun)
  const whistleblowingCovered = input.whistleblowingCovered ?? true
  const privacyRetentionReviewed = input.privacyRetentionReviewed ?? false
  const highRiskPassed = liveRun ? highRiskScenariosPassed(liveRun) : false
  const highRiskReviewed = liveRun ? highRiskScenariosReviewed(liveRun) : false

  if (!liveRunCompleted) blockers.push('No completed live-llm GOLD verification run')
  if (!whistleblowingCovered) blockers.push('Whistleblowing scenario not covered in GOLD bank')
  if (!privacyRetentionReviewed) blockers.push('Privacy and retention review not recorded')
  if (criticalFailures > 0) blockers.push(`${criticalFailures} critical failure(s) in latest GOLD live run`)
  if (redTeamCriticalFailures > 0) {
    blockers.push(`${redTeamCriticalFailures} critical failure(s) in latest high-risk red team run`)
  }
  if (pendingHumanReviews > 0) blockers.push(`${pendingHumanReviews} result(s) pending human review`)

  if (!internalBrainHighRiskCompleted) {
    blockers.push('No completed internal-brain high-risk run (required for closed pilot pre-check)')
  }
  if (internalBrainHighRiskFailures > 0) {
    blockers.push(
      `${internalBrainHighRiskFailures} critical failure(s) in latest internal-brain high-risk run`
    )
  }
  if (internalBrainAdversarialFailures > 0) {
    blockers.push(
      `${internalBrainAdversarialFailures} critical failure(s) in latest internal-brain adversarial run`
    )
  }

  let recommendation: OrbLaunchQualityGate['recommendation'] = 'not-ready'

  if (
    liveRunCompleted &&
    criticalFailures === 0 &&
    redTeamCriticalFailures === 0 &&
    pendingHumanReviews === 0 &&
    whistleblowingCovered &&
    privacyRetentionReviewed &&
    highRiskPassed &&
    highRiskReviewed
  ) {
    recommendation = 'public-launch-ready'
  } else if (
    liveRunCompleted &&
    criticalFailures === 0 &&
    redTeamCriticalFailures === 0 &&
    whistleblowingCovered &&
    highRiskReviewed &&
    internalBrainHighRiskCompleted &&
    internalBrainCriticalFailures === 0
  ) {
    recommendation = 'closed-pilot-ready'
  }

  if (
    criticalFailures > 0 ||
    redTeamCriticalFailures > 0 ||
    pendingHumanReviews > 0 ||
    !whistleblowingCovered ||
    !internalBrainHighRiskCompleted ||
    internalBrainCriticalFailures > 0
  ) {
    recommendation = 'not-ready'
  }

  return {
    liveRunCompleted,
    internalBrainHighRiskCompleted,
    internalBrainAdversarialCompleted,
    internalBrainCriticalFailures,
    latestInternalBrainRunId: internalBrainHighRiskRun?.id ?? internalBrainAdversarialRun?.id,
    highRiskScenariosPassed: highRiskPassed,
    criticalFailures,
    redTeamCriticalFailures,
    latestRedTeamRunId: redTeamRun?.id,
    pendingHumanReviews,
    whistleblowingCovered,
    privacyRetentionReviewed,
    recommendation,
    blockers
  }
}
