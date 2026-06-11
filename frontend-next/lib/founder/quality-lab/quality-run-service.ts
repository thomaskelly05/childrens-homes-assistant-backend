import { fetchOrbAdminFeedbackSummary } from '@/lib/orb/admin-quality-client'
import type { ExpertReview, QualityLabSummary, QualityRun, QualityRunMode } from './quality-lab-types'
import { addExpertReview, getExpertReviews } from './expert-review-store'
import { markHumanReviewDecision } from './human-review-store'
import {
  generateProposalsFromFeedbackSummary,
  generateProposalsFromRun
} from './quality-proposal-generator'
import { getOpenQualityProposals } from './quality-proposal-store'
import {
  evaluateQualityLabAnswer,
  fetchQualityLabOverview,
  runQualityLabPack
} from './quality-lab-client'
import {
  addQualityRun,
  getLatestLiveQualityRun,
  getLatestQualityRun,
  getQualityRun,
  getQualityRuns,
  mapApiRunItem
} from './quality-run-store'

export async function loadQualityLabOverview() {
  try {
    return await fetchQualityLabOverview()
  } catch {
    return null
  }
}

export async function executeQualityRun(input: {
  title?: string
  family?: string
  role?: string
  limit?: number
  triggeredBy?: string
  runMode?: QualityRunMode
}): Promise<QualityRun> {
  const runMode = input.runMode ?? 'live-llm'
  const apiResult = await runQualityLabPack({
    title: input.title,
    family: input.family,
    role: input.role,
    limit: input.limit ?? 20,
    runMode,
    useSampleAnswers: runMode === 'template' ? true : false
  })

  const run = addQualityRun({
    id: apiResult.run_id,
    title: apiResult.title,
    type: input.family ? 'family-sample' : 'gold-pack',
    runMode: apiResult.run_mode,
    familyFilter: input.family,
    roleFilter: input.role,
    limit: input.limit,
    results: apiResult.results.map(mapApiRunItem),
    dataSource: 'live',
    limitations: apiResult.limitations,
    triggeredBy: input.triggeredBy ?? 'founder',
    routeCallSkipped: apiResult.route_call_skipped,
    liveLlmAvailable: apiResult.live_llm_available,
    modelRouteUsed: apiResult.model_route_used ?? undefined,
    criticalFailures: apiResult.critical_failures,
    pendingHumanReviews: apiResult.pending_human_reviews,
    completedAt: new Date().toISOString()
  })

  generateProposalsFromRun(run)
  return run
}

export async function retestQualityScenario(input: {
  runId: string
  scenarioId: string
  triggeredBy?: string
}): Promise<QualityRun> {
  const originalRun = getQualityRun(input.runId)
  const originalItem = originalRun?.results.find((item) => item.scenarioId === input.scenarioId)
  if (!originalItem) {
    throw new Error('Original scenario result not found for retest')
  }

  const apiResult = await runQualityLabPack({
    title: `Retest — ${originalItem.scenarioTitle}`,
    scenarioIds: [input.scenarioId],
    limit: 1,
    runMode: originalRun?.runMode ?? 'live-llm',
    useSampleAnswers: (originalRun?.runMode ?? 'live-llm') === 'template'
  })

  const retestItem = apiResult.results[0]
  const mappedItem = mapApiRunItem({
    ...retestItem,
    retest_of_scenario_id: input.scenarioId
  })

  const run = addQualityRun({
    id: apiResult.run_id,
    title: apiResult.title,
    type: 'retest',
    runMode: apiResult.run_mode,
    results: [{ ...mappedItem, retestOfScenarioId: input.scenarioId }],
    dataSource: 'live',
    limitations: [
      ...apiResult.limitations,
      `Retest of scenario ${input.scenarioId} from run ${input.runId}. Original result preserved in history.`
    ],
    triggeredBy: input.triggeredBy ?? 'founder',
    routeCallSkipped: apiResult.route_call_skipped,
    liveLlmAvailable: apiResult.live_llm_available,
    criticalFailures: mappedItem.criticalFailure ? 1 : 0,
    pendingHumanReviews: mappedItem.requiresHumanReview ? 1 : 0,
    retestOfRunId: input.runId,
    completedAt: new Date().toISOString()
  })

  markHumanReviewDecision({
    runId: input.runId,
    scenarioId: input.scenarioId,
    reviewStatus: 'needs-retest',
    reviewer: input.triggeredBy ?? 'founder',
    reviewNotes: `Retest run ${run.id} created.`,
    reviewerDecision: 'retest-requested'
  })

  generateProposalsFromRun(run)
  return run
}

export function submitHumanReview(input: {
  runId: string
  scenarioId: string
  reviewStatus: 'reviewed-pass' | 'reviewed-concern' | 'reviewed-fail'
  reviewer: string
  reviewNotes?: string
  reviewerDecision?: string
  requiredFix?: string
  createProposal?: boolean
}) {
  const updated = markHumanReviewDecision(input)
  if (input.createProposal && input.reviewStatus !== 'reviewed-pass' && updated) {
    generateProposalsFromRun(updated)
  }
  return updated
}

export async function syncFeedbackGapProposals(): Promise<number> {
  try {
    const summary = await fetchOrbAdminFeedbackSummary(30)
    const created = generateProposalsFromFeedbackSummary(summary)
    return created.length
  } catch {
    return 0
  }
}

export async function evaluateManualAnswer(scenarioId: string, answer: string) {
  const result = await evaluateQualityLabAnswer(scenarioId, answer)
  const run = addQualityRun({
    title: `Manual eval — ${result.title}`,
    type: 'manual-eval',
    results: [
      {
        scenarioId: result.scenario_id,
        scenarioTitle: result.title,
        family: result.family,
        role: result.role,
        riskLevel: result.risk_level,
        passed: result.evaluation.passed && !result.critical_failure,
        score: result.evaluation.score,
        missingMarkers: result.evaluation.missing_required_markers,
        unsafePhrases: result.evaluation.unsafe_phrases_found,
        overclaims: result.evaluation.overclaiming_found,
        notes: result.evaluation.notes,
        answerSource: 'manual-paste',
        answerExcerpt: answer.slice(0, 280),
        criticalFailure: result.critical_failure,
        criticalFailureReasons: result.critical_failure_reasons,
        requiresHumanReview: Boolean(result.critical_failure) || result.risk_level === 'high' || result.risk_level === 'critical'
      }
    ],
    dataSource: 'live',
    limitations: ['Single manual evaluation — not a full regression pack.'],
    triggeredBy: 'founder'
  })
  generateProposalsFromRun(run)
  return { run, evaluation: result.evaluation }
}

export function submitExpertReview(input: Omit<ExpertReview, 'id' | 'createdAt'>): ExpertReview {
  const review = addExpertReview(input)
  if (input.missedMarkers.length > 0 || input.unsafePhrases.length > 0) {
    generateProposalsFromRun({
      id: input.runId ?? `review-${review.id}`,
      title: `Expert review — ${input.scenarioId}`,
      type: 'manual-eval',
      status: 'complete',
      startedAt: review.createdAt,
      passCount: 0,
      failCount: 1,
      totalCount: 1,
      passRate: 0,
      results: [
        {
          scenarioId: input.scenarioId,
          scenarioTitle: input.scenarioId,
          family: '',
          role: input.reviewerRole,
          riskLevel: input.safetyScore <= 2 ? 'high' : 'medium',
          passed: false,
          score: Math.round((input.helpfulScore + input.safetyScore + input.expertiseScore) / 3) * 20,
          missingMarkers: input.missedMarkers,
          unsafePhrases: input.unsafePhrases,
          overclaims: input.overclaims,
          notes: input.notes ? [input.notes] : [],
          answerSource: 'manual-paste'
        }
      ],
      dataSource: 'local',
      limitations: ['Generated from human expert review submission.'],
      triggeredBy: 'founder'
    })
  }
  return review
}

export function getQualityLabSummary(goldScenarioCount = 100): QualityLabSummary {
  const runs = getQualityRuns()
  const open = getOpenQualityProposals()
  const latestLive = getLatestLiveQualityRun()
  return {
    totalRuns: runs.length,
    latestRun: getLatestQualityRun(),
    openProposals: open.length,
    criticalProposals: open.filter((p) => p.priority === 'critical').length,
    expertReviewCount: getExpertReviews().length,
    goldScenarioCount,
    liveRunCompleted: Boolean(latestLive),
    pendingHumanReviews: latestLive?.pendingHumanReviews ?? 0,
    criticalFailures: latestLive?.criticalFailures ?? 0
  }
}
