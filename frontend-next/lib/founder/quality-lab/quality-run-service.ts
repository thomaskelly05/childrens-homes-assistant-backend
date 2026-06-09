import { fetchOrbAdminFeedbackSummary } from '@/lib/orb/admin-quality-client'
import type { ExpertReview, QualityLabSummary, QualityRun } from './quality-lab-types'
import { addExpertReview, getExpertReviews } from './expert-review-store'
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
import { addQualityRun, getLatestQualityRun, getQualityRuns, mapApiRunItem } from './quality-run-store'

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
}): Promise<QualityRun> {
  const apiResult = await runQualityLabPack({
    title: input.title,
    family: input.family,
    role: input.role,
    limit: input.limit ?? 20,
    useSampleAnswers: true
  })

  const run = addQualityRun({
    id: apiResult.run_id,
    title: apiResult.title,
    type: input.family ? 'family-sample' : 'gold-pack',
    familyFilter: input.family,
    roleFilter: input.role,
    limit: input.limit,
    results: apiResult.results.map(mapApiRunItem),
    dataSource: 'live',
    limitations: apiResult.limitations,
    triggeredBy: input.triggeredBy ?? 'founder',
    routeCallSkipped: apiResult.route_call_skipped,
    completedAt: new Date().toISOString()
  })

  generateProposalsFromRun(run)
  return run
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
        passed: result.evaluation.passed,
        score: result.evaluation.score,
        missingMarkers: result.evaluation.missing_required_markers,
        unsafePhrases: result.evaluation.unsafe_phrases_found,
        overclaims: result.evaluation.overclaiming_found,
        notes: result.evaluation.notes,
        answerSource: 'manual-paste',
        answerExcerpt: answer.slice(0, 280)
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
  return {
    totalRuns: runs.length,
    latestRun: getLatestQualityRun(),
    openProposals: open.length,
    criticalProposals: open.filter((p) => p.priority === 'critical').length,
    expertReviewCount: getExpertReviews().length,
    goldScenarioCount
  }
}
