import type {
  ReviewEvent,
  ReviewEventFilter,
  ReviewEventSummary,
  ReviewStatus
} from '@/lib/indicare-lab/review-events/types'
import type { CreateReviewEventInput } from '@/lib/indicare-lab/review-events/review-event-memory-repository'

export type ReviewEventFounderAction = {
  id: string
  action: string
  note?: string
  createdAt: string
}

export type ReviewEventPatternInputs = {
  agentFlags?: string[]
  sources?: ReviewEvent['source'][]
  taskTypes?: ReviewEvent['taskType'][]
  statuses?: ReviewStatus[]
  riskLevels?: ReviewEvent['riskLevel'][]
  minRiskLevel?: ReviewEvent['riskLevel']
}

export interface ReviewEventRepository {
  listReviewEvents(filter?: ReviewEventFilter): ReviewEvent[]
  getReviewEventById(id: string): ReviewEvent | undefined
  createReviewEvent(input: CreateReviewEventInput): ReviewEvent
  storeShadowReviewEvent(event: ReviewEvent): ReviewEvent
  updateReviewEventStatus(id: string, status: ReviewStatus): ReviewEvent | undefined
  markReviewEventReviewed(id: string): ReviewEvent | undefined
  addReviewEventFounderAction(
    id: string,
    action: Omit<ReviewEventFounderAction, 'id' | 'createdAt'>
  ): ReviewEvent | undefined
  summariseReviewEvents(filter?: ReviewEventFilter): ReviewEventSummary
  listReviewEventsByPatternInputs(inputs: ReviewEventPatternInputs): ReviewEvent[]
  resetForTests(): void
  getLastReviewEventId(): string | null
}
