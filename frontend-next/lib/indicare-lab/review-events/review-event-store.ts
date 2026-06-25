/**
 * @deprecated Import from review-event-storage instead. Kept for backward compatibility.
 */
export {
  createReviewEvent,
  getLastReviewEventId,
  getReviewEventById,
  listReviewEvents,
  markReviewEventReviewed,
  resetReviewEventStoreForTests,
  storeShadowReviewEvent,
  summariseReviewEvents,
  type CreateReviewEventInput
} from '@/lib/indicare-lab/review-events/review-event-storage'
