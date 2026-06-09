import type { FounderTelemetryEvent } from './founder-telemetry-types'

const MAX_EVENTS = 5000

let events: FounderTelemetryEvent[] = []

export function appendLocalTelemetryEvent(event: FounderTelemetryEvent): void {
  events = [event, ...events].slice(0, MAX_EVENTS)
}

export function setLocalTelemetryEvents(next: FounderTelemetryEvent[]): void {
  events = next.slice(0, MAX_EVENTS)
}

export function getLocalTelemetryEvents(): FounderTelemetryEvent[] {
  return events
}

export function clearLocalTelemetryEvents(): void {
  events = []
}
