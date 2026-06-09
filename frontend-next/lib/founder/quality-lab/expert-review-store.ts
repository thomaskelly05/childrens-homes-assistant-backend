import type { ExpertReview } from './quality-lab-types'

let reviews: ExpertReview[] = []
let reviewCounter = 0

function nextReviewId(): string {
  reviewCounter += 1
  return `ql-review-${Date.now()}-${reviewCounter}`
}

export function getExpertReviews(): ExpertReview[] {
  return [...reviews]
}

export function getExpertReviewsForScenario(scenarioId: string): ExpertReview[] {
  return reviews.filter((r) => r.scenarioId === scenarioId)
}

export function addExpertReview(
  partial: Omit<ExpertReview, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): ExpertReview {
  const stored: ExpertReview = {
    ...partial,
    id: partial.id ?? nextReviewId(),
    createdAt: partial.createdAt ?? new Date().toISOString()
  }
  reviews = [stored, ...reviews]
  return stored
}

export function resetExpertReviewStore(): void {
  reviews = []
  reviewCounter = 0
}
