import type { HumanReview, QualityRun, ReviewStatus } from './quality-lab-types'
import { getQualityRun, getQualityRuns } from './quality-run-store'
import { getQualityRunsCache, setQualityRunsCache } from './quality-persistence-cache'

export function updateRunItemHumanReview(
  runId: string,
  scenarioId: string,
  review: Partial<HumanReview> & { reviewStatus: ReviewStatus }
): QualityRun | undefined {
  const runs = getQualityRunsCache()
  const runIndex = runs.findIndex((r) => r.id === runId)
  if (runIndex < 0) return undefined

  const run = runs[runIndex]
  const itemIndex = run.results.findIndex((item) => item.scenarioId === scenarioId)
  if (itemIndex < 0) return undefined

  const updatedItem = {
    ...run.results[itemIndex],
    humanReview: {
      ...run.results[itemIndex].humanReview,
      ...review,
      reviewedAt: review.reviewedAt ?? new Date().toISOString()
    }
  }

  const updatedResults = [...run.results]
  updatedResults[itemIndex] = updatedItem

  const updatedRun: QualityRun = {
    ...run,
    results: updatedResults,
    pendingHumanReviews: updatedResults.filter(
      (item) =>
        item.requiresHumanReview &&
        (!item.humanReview?.reviewStatus || item.humanReview.reviewStatus === 'pending-human-review')
    ).length
  }

  const nextRuns = [...runs]
  nextRuns[runIndex] = updatedRun
  setQualityRunsCache(nextRuns)
  return updatedRun
}

export function markHumanReviewDecision(input: {
  runId: string
  scenarioId: string
  reviewStatus: ReviewStatus
  reviewer: string
  reviewNotes?: string
  reviewerDecision?: string
  requiredFix?: string
}): QualityRun | undefined {
  return updateRunItemHumanReview(input.runId, input.scenarioId, {
    reviewStatus: input.reviewStatus,
    reviewer: input.reviewer,
    reviewNotes: input.reviewNotes,
    reviewerDecision: input.reviewerDecision,
    requiredFix: input.requiredFix
  })
}

export function getPendingHumanReviewCount(run?: QualityRun): number {
  if (!run) return 0
  return run.results.filter(
    (item) =>
      item.requiresHumanReview &&
      (!item.humanReview?.reviewStatus || item.humanReview.reviewStatus === 'pending-human-review')
  ).length
}

export function getRunForScenario(scenarioId: string): QualityRun | undefined {
  return getQualityRuns().find((run) => run.results.some((item) => item.scenarioId === scenarioId))
}

export function getQualityRunById(runId: string): QualityRun | undefined {
  return getQualityRun(runId)
}
