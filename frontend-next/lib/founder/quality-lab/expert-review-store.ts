import type { ExpertReview } from './quality-lab-types'
import { persistExpertReview } from './persistence-bridge'
import { getExpertReviewsCache, prependExpertReview } from './quality-persistence-cache'

let reviewCounter = 0

function nextReviewId(): string {
  reviewCounter += 1
  return `ql-review-${Date.now()}-${reviewCounter}`
}

export function getExpertReviews(): ExpertReview[] {
  return getExpertReviewsCache()
}

export function getExpertReviewsForScenario(scenarioId: string): ExpertReview[] {
  return getExpertReviewsCache().filter((r) => r.scenarioId === scenarioId)
}

export function addExpertReview(
  partial: Omit<ExpertReview, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): ExpertReview {
  const stored: ExpertReview = {
    ...partial,
    id: partial.id ?? nextReviewId(),
    createdAt: partial.createdAt ?? new Date().toISOString()
  }
  prependExpertReview(stored)
  void persistExpertReview(stored, 'founder', partial.runId).catch(() => undefined)
  return stored
}

export function resetExpertReviewStore(): void {
  reviewCounter = 0
}
