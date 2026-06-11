import { authFetch } from '@/lib/auth/api'

import type { OrbPilotFeedback, OrbPilotFeedbackCreatePayload, OrbPilotSummary } from './orb-pilot-types'
import type { OrbPilotSummaryEngineResult } from './orb-pilot-summary-engine'

type ApiEnvelope<T> = { success?: boolean; data?: T; detail?: string | { message?: string }; error?: string }

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T
  }
  return payload as T
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as ApiEnvelope<unknown>
  if (typeof record.error === 'string') return record.error
  const detail = record.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message?: string }).message)
  }
  return fallback
}

export async function submitOrbPilotFeedback(
  payload: OrbPilotFeedbackCreatePayload
): Promise<OrbPilotFeedback> {
  const json = await authFetch<ApiEnvelope<OrbPilotFeedback>>('/api/orb/pilot/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return unwrapData<OrbPilotFeedback>(json)
}

export async function fetchFounderOrbPilotFeedback(): Promise<OrbPilotFeedback[]> {
  const json = await authFetch<ApiEnvelope<OrbPilotFeedback[]>>('/api/founder/orb-pilot/feedback')
  return unwrapData<OrbPilotFeedback[]>(json)
}

export async function fetchFounderOrbPilotSummary(): Promise<OrbPilotSummaryEngineResult> {
  const json = await authFetch<ApiEnvelope<OrbPilotSummaryEngineResult>>('/api/founder/orb-pilot/summary')
  return unwrapData<OrbPilotSummaryEngineResult>(json)
}

export type { OrbPilotSummary }
