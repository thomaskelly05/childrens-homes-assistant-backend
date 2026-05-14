import { ASSISTANT_API_BASE, AssistantClientError } from '@/lib/assistant-core/client'
import type {
  OrbApiResponse,
  OrbSessionEventData,
  OrbSessionEventRequest,
  OrbSessionStartData,
  OrbSessionStartRequest,
  OrbSessionSummary,
  OrbTranscriptEntry
} from './types'

function orbUrl(path: string) {
  return `${ASSISTANT_API_BASE}${path}`
}

async function parseOrbResponse<T>(response: Response): Promise<T> {
  let payload: OrbApiResponse<T> | null = null
  try {
    payload = await response.json() as OrbApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok || !payload) {
    throw new AssistantClientError(`Orb backend unavailable (${response.status})`, 'orb_backend_unavailable', payload, response.status)
  }

  if (!payload.success || !payload.data) {
    throw new AssistantClientError(payload.error?.message || 'Orb request failed.', payload.error?.code || 'orb_request_failed', payload.error?.details, response.status)
  }

  return payload.data
}

export async function startOrbSession(request: OrbSessionStartRequest, signal?: AbortSignal): Promise<OrbSessionStartData> {
  const response = await fetch(orbUrl('/orb/realtime/session'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return parseOrbResponse<OrbSessionStartData>(response)
}

export async function sendOrbEvent(sessionId: string, request: OrbSessionEventRequest, signal?: AbortSignal): Promise<OrbSessionEventData> {
  const response = await fetch(orbUrl(`/orb/session/${encodeURIComponent(sessionId)}/event`), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return parseOrbResponse<OrbSessionEventData>(response)
}

export async function interruptOrbSession(sessionId: string): Promise<{ session_id: string; state: string; message: string }> {
  const response = await fetch(orbUrl(`/orb/realtime/session/${encodeURIComponent(sessionId)}/interrupt`), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store'
  })
  return parseOrbResponse<{ session_id: string; state: string; message: string }>(response)
}

export async function endOrbSession(sessionId: string): Promise<OrbSessionSummary> {
  const response = await fetch(orbUrl(`/orb/realtime/session/${encodeURIComponent(sessionId)}/end`), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store'
  })
  return parseOrbResponse<OrbSessionSummary>(response)
}

export async function fetchOrbTranscript(sessionId: string): Promise<{ session_id: string; transcript: OrbTranscriptEntry[]; storage_policy: Record<string, unknown> }> {
  const response = await fetch(orbUrl(`/orb/realtime/session/${encodeURIComponent(sessionId)}/transcript`), {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseOrbResponse<{ session_id: string; transcript: OrbTranscriptEntry[]; storage_policy: Record<string, unknown> }>(response)
}

export async function fetchOrbSummary(sessionId: string): Promise<OrbSessionSummary> {
  const response = await fetch(orbUrl(`/orb/session/${encodeURIComponent(sessionId)}/summary`), {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseOrbResponse<OrbSessionSummary>(response)
}

