import type { ReviewEventFounderAction, ReviewEventPatternInputs } from '@/lib/indicare-lab/review-events/review-event-repository'
import { reviewEventMemoryRepository } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type { CreateReviewEventInput } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type {
  ReviewEvent,
  ReviewEventFilter,
  ReviewEventSummary,
  ReviewStatus
} from '@/lib/indicare-lab/review-events/types'

/**
 * Persistence-ready storage facade for review events.
 * Uses in-memory repository as development fallback until database persistence is available.
 */
const activeRepository = reviewEventMemoryRepository

export function listReviewEvents(filter?: ReviewEventFilter): ReviewEvent[] {
  return activeRepository.listReviewEvents(filter)
}

export function getReviewEventById(id: string): ReviewEvent | undefined {
  return activeRepository.getReviewEventById(id)
}

export function createReviewEvent(input: CreateReviewEventInput): ReviewEvent {
  return activeRepository.createReviewEvent(input)
}

export function storeShadowReviewEvent(event: ReviewEvent): ReviewEvent {
  return activeRepository.storeShadowReviewEvent(event)
}

export function updateReviewEventStatus(id: string, status: ReviewStatus): ReviewEvent | undefined {
  return activeRepository.updateReviewEventStatus(id, status)
}

export function markReviewEventReviewed(id: string): ReviewEvent | undefined {
  return activeRepository.markReviewEventReviewed(id)
}

export function addReviewEventFounderAction(
  id: string,
  action: Omit<ReviewEventFounderAction, 'id' | 'createdAt'>
): ReviewEvent | undefined {
  return activeRepository.addReviewEventFounderAction(id, action)
}

export function summariseReviewEvents(filter?: ReviewEventFilter): ReviewEventSummary {
  return activeRepository.summariseReviewEvents(filter)
}

export function listReviewEventsByPatternInputs(inputs: ReviewEventPatternInputs): ReviewEvent[] {
  return activeRepository.listReviewEventsByPatternInputs(inputs)
}

export function resetReviewEventStoreForTests(): void {
  activeRepository.resetForTests()
}

export function getLastReviewEventId(): string | null {
  return activeRepository.getLastReviewEventId()
}

export type { CreateReviewEventInput, ReviewEventFounderAction, ReviewEventPatternInputs }
