import type { ReviewEventFounderAction, ReviewEventPatternInputs } from '@/lib/indicare-lab/review-events/review-event-repository'
import { reviewEventMemoryRepository } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type { CreateReviewEventInput } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import {
  createReviewEvent as labCreateReviewEvent,
  listReviewEvents as labListReviewEvents,
  resetLabStorageForTests,
  storeShadowReviewEvent as labStoreShadowReviewEvent,
  updateReviewEventStatus as labUpdateReviewEventStatus
} from '@/lib/indicare-lab/storage/lab-storage'
import type {
  ReviewEvent,
  ReviewEventFilter,
  ReviewEventSummary,
  ReviewStatus
} from '@/lib/indicare-lab/review-events/types'

/**
 * Persistence-ready storage facade for review events.
 * Writes route through lab-storage guard; reads delegate to active repository.
 */
const activeRepository = reviewEventMemoryRepository

export function listReviewEvents(filter?: ReviewEventFilter): ReviewEvent[] {
  return labListReviewEvents(filter)
}

export function getReviewEventById(id: string): ReviewEvent | undefined {
  return activeRepository.getReviewEventById(id)
}

export function createReviewEvent(input: CreateReviewEventInput): ReviewEvent {
  return labCreateReviewEvent(input)
}

export function storeShadowReviewEvent(event: ReviewEvent): ReviewEvent {
  return labStoreShadowReviewEvent(event)
}

export function updateReviewEventStatus(id: string, status: ReviewStatus): ReviewEvent | undefined {
  return labUpdateReviewEventStatus(id, status)
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
  resetLabStorageForTests()
}

export function getLastReviewEventId(): string | null {
  return activeRepository.getLastReviewEventId()
}

export type { CreateReviewEventInput, ReviewEventFounderAction, ReviewEventPatternInputs }
