import { getCsrfToken } from '@/lib/auth/api'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import {
  EMPTY_FOUNDER_TELEMETRY_SUMMARY,
  type FounderTelemetryEventInput,
  type FounderTelemetrySummary
} from './founder-telemetry-types'
import { findBlockedTelemetryKeys, redactTelemetryMetadata } from './founder-telemetry-redaction'

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string; detail?: string }

const TELEMETRY_API_BASE = '/api/founder/telemetry'

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
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const csrf = getCsrfToken()
  if (csrf) headers.set('x-csrf-token', csrf)

  const response = await fetch(`${TELEMETRY_API_BASE}/event`, {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify(buildEventPayload(input)),
    cache: 'no-store'
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<unknown>
    throw new Error(payload.detail || payload.error || 'Telemetry event rejected')
  }
}

export async function fetchFounderTelemetrySummary(
  days = 30
): Promise<FounderTelemetrySummary | null> {
  const response = await fetch(`${TELEMETRY_API_BASE}/summary?days=${days}`, {
    credentials: 'same-origin',
    cache: 'no-store'
  })

  if (response.status === 403 || response.status === 401) {
    return null
  }

  if (response.status === 404) {
    return { ...EMPTY_FOUNDER_TELEMETRY_SUMMARY }
  }

  if (!response.ok) {
    throw new Error('Failed to load founder telemetry summary')
  }

  const payload = (await response.json()) as ApiEnvelope<FounderTelemetrySummary>
  return sanitiseFounderPayload(payload.data ?? null) as FounderTelemetrySummary | null
}

/** Fire-and-forget telemetry — never blocks UX. */
export function sendFounderTelemetryEvent(input: FounderTelemetryEventInput): void {
  void postFounderTelemetryEvent(input).catch(() => undefined)
}
