import type { FounderTelemetryEvent } from './founder-telemetry-types'

const MAX_EVENTS = 5000

let events: FounderTelemetryEvent[] = []
let eventIdCounter = 0

function nextEventId(): string {
  eventIdCounter += 1
  return `telemetry-${Date.now()}-${eventIdCounter}`
}

export function getFounderTelemetryEvents(): FounderTelemetryEvent[] {
  return [...events]
}

export function getFounderTelemetryEventsByCategory(
  category: FounderTelemetryEvent['category']
): FounderTelemetryEvent[] {
  return events.filter((e) => e.category === category)
}

export function getFounderTelemetryEventsByType(
  type: FounderTelemetryEvent['type']
): FounderTelemetryEvent[] {
  return events.filter((e) => e.type === type)
}

export function addFounderTelemetryEvent(
  event: Omit<FounderTelemetryEvent, 'id'> & { id?: string }
): FounderTelemetryEvent {
  const stored: FounderTelemetryEvent = {
    ...event,
    id: event.id ?? nextEventId()
  }
  events = [stored, ...events].slice(0, MAX_EVENTS)
  return stored
}

export function clearFounderTelemetryEvents(): void {
  events = []
}

export function setFounderTelemetryEvents(newEvents: FounderTelemetryEvent[]): void {
  events = newEvents.slice(0, MAX_EVENTS)
}
