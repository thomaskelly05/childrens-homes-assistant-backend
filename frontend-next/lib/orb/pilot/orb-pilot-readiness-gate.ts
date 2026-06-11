import type { QualityRun, ReviewStatus } from '@/lib/founder/quality-lab/quality-lab-types'

export type OrbPilotReadinessRecommendation = 'not-ready' | 'closed-pilot-ready' | 'needs-review'

export type OrbPilotReadinessGate = {
  qualityLabLiveRunCompleted: boolean
  highRiskScenariosReviewed: boolean
  criticalFailuresOpen: number
  whistleblowingCovered: boolean
  privacyUxCompleted: boolean
  privacyNoticeAvailable: boolean
  buildPassing: boolean | null
  recommendation: OrbPilotReadinessRecommendation
  blockers: string[]
  warnings: string[]
}

export type OrbPilotReadinessInput = {
  runs: QualityRun[]
  whistleblowingCovered?: boolean
  privacyUxCompleted?: boolean
  privacyNoticeAvailable?: boolean
  buildPassing?: boolean | null
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

function allHighRiskScenariosReviewed(run: QualityRun): boolean {
  const highRiskItems = run.results.filter(
    (item) => item.riskLevel === 'high' || item.riskLevel === 'critical'
  )
  if (highRiskItems.length === 0) return true
  return highRiskItems.every(
    (item) =>
      item.humanReview?.reviewStatus && REVIEWED_STATUSES.includes(item.humanReview.reviewStatus)
  )
}

function pendingHighRiskReviews(run: QualityRun): number {
  return run.results.filter(
    (item) =>
      (item.riskLevel === 'high' || item.riskLevel === 'critical') &&
      item.requiresHumanReview &&
      (!item.humanReview?.reviewStatus || item.humanReview.reviewStatus === 'pending-human-review')
  ).length
}

export function computeOrbPilotReadinessGate(input: OrbPilotReadinessInput): OrbPilotReadinessGate {
  const liveRun = latestLiveRun(input.runs)
  const criticalFailuresOpen =
    liveRun?.criticalFailures ?? liveRun?.results.filter((r) => r.criticalFailure).length ?? 0
  const qualityLabLiveRunCompleted = Boolean(liveRun && liveRun.runMode === 'live-llm')
  const whistleblowingCovered = input.whistleblowingCovered ?? false
  const privacyUxCompleted = input.privacyUxCompleted ?? false
  const privacyNoticeAvailable = input.privacyNoticeAvailable ?? false
  const buildPassing = input.buildPassing ?? null
  const highRiskScenariosReviewed = liveRun ? allHighRiskScenariosReviewed(liveRun) : false
  const pendingHighRisk = liveRun ? pendingHighRiskReviews(liveRun) : 0

  const blockers: string[] = []
  const warnings: string[] = []

  if (buildPassing === false) {
    blockers.push('Production build is failing')
  }
  if (!privacyUxCompleted) {
    blockers.push('Privacy UX is not complete for closed pilot')
  }
  if (!privacyNoticeAvailable) {
    blockers.push('Closed-pilot privacy notice is not available')
  }
  if (!qualityLabLiveRunCompleted) {
    blockers.push('No completed live-llm Quality Lab GOLD verification run')
  }
  if (criticalFailuresOpen > 0) {
    blockers.push(`${criticalFailuresOpen} critical failure(s) open in latest live Quality Lab run`)
  }
  if (!whistleblowingCovered) {
    blockers.push('Whistleblowing scenario not covered in GOLD bank')
  }

  if (pendingHighRisk > 0) {
    warnings.push(`${pendingHighRisk} high-risk scenario(s) pending human review`)
  }
  if (!highRiskScenariosReviewed) {
    warnings.push('High-risk scenarios have not all been human-reviewed')
  }
  if (buildPassing === null) {
    warnings.push('Build passing status unavailable — treating as not passed')
  }

  let recommendation: OrbPilotReadinessRecommendation = 'not-ready'

  const buildOk = buildPassing !== false
  const coreGatesMet =
    buildOk &&
    privacyUxCompleted &&
    privacyNoticeAvailable &&
    qualityLabLiveRunCompleted &&
    criticalFailuresOpen === 0 &&
    whistleblowingCovered

  if (coreGatesMet && highRiskScenariosReviewed && pendingHighRisk === 0) {
    recommendation = 'closed-pilot-ready'
  } else if (coreGatesMet && (!highRiskScenariosReviewed || pendingHighRisk > 0)) {
    recommendation = 'needs-review'
  }

  return {
    qualityLabLiveRunCompleted,
    highRiskScenariosReviewed,
    criticalFailuresOpen,
    whistleblowingCovered,
    privacyUxCompleted,
    privacyNoticeAvailable,
    buildPassing,
    recommendation,
    blockers,
    warnings
  }
}
