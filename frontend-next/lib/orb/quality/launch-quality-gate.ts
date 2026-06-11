import type {
  OrbLaunchQualityGate,
  QualityRun,
  ReviewStatus
} from '@/lib/founder/quality-lab/quality-lab-types'

export type LaunchGateInput = {
  runs: QualityRun[]
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
  const liveRun = latestLiveRun(input.runs)
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
  const whistleblowingCovered = input.whistleblowingCovered ?? true
  const privacyRetentionReviewed = input.privacyRetentionReviewed ?? false
  const highRiskPassed = liveRun ? highRiskScenariosPassed(liveRun) : false
  const highRiskReviewed = liveRun ? highRiskScenariosReviewed(liveRun) : false

  if (!liveRunCompleted) blockers.push('No completed live-llm GOLD verification run')
  if (!whistleblowingCovered) blockers.push('Whistleblowing scenario not covered in GOLD bank')
  if (!privacyRetentionReviewed) blockers.push('Privacy and retention review not recorded')
  if (criticalFailures > 0) blockers.push(`${criticalFailures} critical failure(s) in latest live run`)
  if (pendingHumanReviews > 0) blockers.push(`${pendingHumanReviews} result(s) pending human review`)

  let recommendation: OrbLaunchQualityGate['recommendation'] = 'not-ready'

  if (
    liveRunCompleted &&
    criticalFailures === 0 &&
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
    whistleblowingCovered &&
    highRiskReviewed
  ) {
    recommendation = 'closed-pilot-ready'
  }

  if (criticalFailures > 0 || pendingHumanReviews > 0 || !whistleblowingCovered) {
    recommendation = 'not-ready'
  }

  return {
    liveRunCompleted,
    highRiskScenariosPassed: highRiskPassed,
    criticalFailures,
    pendingHumanReviews,
    whistleblowingCovered,
    privacyRetentionReviewed,
    recommendation,
    blockers
  }
}
