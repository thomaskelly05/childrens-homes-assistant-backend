import { founderGet, founderPost } from '@/lib/founder/api/founder-api-client'
import {
  EMPTY_FOUNDER_TELEMETRY_SUMMARY,
  type FounderTelemetryEventInput,
  type FounderTelemetrySummary
} from './founder-telemetry-types'
import { findBlockedTelemetryKeys, redactTelemetryMetadata } from './founder-telemetry-redaction'

function buildEventPayload(input: FounderTelemetryEventInput) {
  const metadata = redactTelemetryMetadata(input.metadata ?? {}) as Record<string, unknown>
  const blocked = findBlockedTelemetryKeys(input.metadata ?? {})
  if (blocked.length) {
    throw new Error(`Telemetry metadata contains blocked fields: ${blocked.slice(0, 3).join(', ')}`)
  }

  return {
    eventType: input.eventType,
    category: input.category,
    source: input.source,
    route: input.route ?? null,
    timestamp: input.timestamp ?? new Date().toISOString(),
    userRole: input.userRole ?? null,
    sessionId: input.sessionId ?? null,
    metadata
  }
}

export async function postFounderTelemetryEvent(input: FounderTelemetryEventInput): Promise<void> {
  const result = await founderPost('/telemetry/event', buildEventPayload(input))
  if (!result.ok) {
    throw new Error(result.error)
  }
}

export async function fetchFounderTelemetrySummary(
  days = 30
): Promise<FounderTelemetrySummary | null> {
  const result = await founderGet<{ data?: FounderTelemetrySummary } & FounderTelemetrySummary>(
    `/telemetry/summary?days=${days}`
  )

  if (!result.ok) {
    if (result.status === 403 || result.status === 401) return null
    return { ...EMPTY_FOUNDER_TELEMETRY_SUMMARY }
  }

  const payload = result.data
  const summary =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data?: FounderTelemetrySummary }).data
      : payload

  return (summary ?? EMPTY_FOUNDER_TELEMETRY_SUMMARY) as FounderTelemetrySummary
}

/** Fire-and-forget telemetry — never blocks UX. */
export function sendFounderTelemetryEvent(input: FounderTelemetryEventInput): void {
  void postFounderTelemetryEvent(input).catch(() => undefined)
}
