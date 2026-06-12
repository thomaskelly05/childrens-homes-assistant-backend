import type { FounderAgentEvent, FounderAgentRecommendation } from './founder-agent-event-types'

let eventCounter = 0
let recommendationCounter = 0
let events: FounderAgentEvent[] = []
let recommendations: FounderAgentRecommendation[] = []

function nextEventId(): string {
  eventCounter += 1
  return `agent-event-${Date.now()}-${eventCounter}`
}

function nextRecommendationId(): string {
  recommendationCounter += 1
  return `agent-rec-${Date.now()}-${recommendationCounter}`
}

export function createEventId(): string {
  return nextEventId()
}

export function createRecommendationId(): string {
  return nextRecommendationId()
}

export function addFounderAgentEvent(
  input: Omit<FounderAgentEvent, 'id' | 'processed' | 'processedAt'>
): FounderAgentEvent {
  const event: FounderAgentEvent = {
    ...input,
    id: nextEventId(),
    processed: false
  }
  events = [event, ...events].slice(0, 500)
  return event
}

export function updateFounderAgentEvent(
  eventId: string,
  patch: Partial<Pick<FounderAgentEvent, 'processed' | 'processedAt' | 'resultingRecommendations' | 'auditRecordId' | 'affectedAgents'>>
): FounderAgentEvent | undefined {
  const index = events.findIndex((e) => e.id === eventId)
  if (index === -1) return undefined
  const updated = { ...events[index], ...patch }
  events = [...events.slice(0, index), updated, ...events.slice(index + 1)]
  return updated
}

export function getFounderAgentEvents(limit = 50): FounderAgentEvent[] {
  return events.slice(0, limit)
}

export function getFounderAgentEvent(eventId: string): FounderAgentEvent | undefined {
  return events.find((e) => e.id === eventId)
}

export function addFounderAgentRecommendation(
  input: Omit<FounderAgentRecommendation, 'id'>
): FounderAgentRecommendation {
  const rec: FounderAgentRecommendation = {
    ...input,
    id: nextRecommendationId()
  }
  recommendations = [rec, ...recommendations].slice(0, 500)
  return rec
}

export function getFounderAgentRecommendations(agentId?: string): FounderAgentRecommendation[] {
  if (agentId) return recommendations.filter((r) => r.agentId === agentId)
  return [...recommendations]
}

export function getRecommendationsForEvent(eventId: string): FounderAgentRecommendation[] {
  return recommendations.filter((r) => r.eventId === eventId)
}

export function clearFounderAgentEventStore(): void {
  events = []
  recommendations = []
}
