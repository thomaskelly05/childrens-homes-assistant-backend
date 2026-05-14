import { AssistantClientError } from '@/lib/assistant-core/client'
import { authFetchResponse } from '@/lib/auth/api'
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
  return path
}

const ORB_REQUEST_TIMEOUT_MS = 20000

function requestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `orb-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function orbFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), ORB_REQUEST_TIMEOUT_MS)
  const externalSignal = init.signal
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    return await authFetchResponse(orbUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        'X-Request-ID': requestId(),
        ...init.headers
      }
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

async function parseOrbResponse<T>(response: Response): Promise<T> {
  let payload: OrbApiResponse<T> | null = null
  try {
    payload = await response.json() as OrbApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok || !payload) {
    const developerSuffix = process.env.NODE_ENV === 'development' ? ` (${response.status})` : ''
    const message = response.status === 401
      ? 'Your session has expired. Please sign in again before using Orb.'
      : response.status === 403
        ? 'Orb could not verify your secure session. Refresh the page and try again.'
        : response.status === 404
          ? `That workspace isn't available yet.${developerSuffix}`
          : `I couldn't load Orb just now.${developerSuffix}`
    throw new AssistantClientError(message, 'orb_backend_unavailable', payload, response.status)
  }

  if (!payload.success || !payload.data) {
    const detail = process.env.NODE_ENV === 'development' ? payload.error?.details : undefined
    throw new AssistantClientError(payload.error?.message || "I couldn't load that just now.", payload.error?.code || 'orb_request_failed', detail, response.status)
  }

  return payload.data
}

export async function startOrbSession(request: OrbSessionStartRequest, signal?: AbortSignal): Promise<OrbSessionStartData> {
  const response = await orbFetch('/orb/realtime/session', {
    method: 'POST',
    signal,
    body: JSON.stringify(request)
  })
  return parseOrbResponse<OrbSessionStartData>(response)
}

export async function sendOrbEvent(sessionId: string, request: OrbSessionEventRequest, signal?: AbortSignal): Promise<OrbSessionEventData> {
  const response = await orbFetch(`/orb/session/${encodeURIComponent(sessionId)}/event`, {
    method: 'POST',
    signal,
    body: JSON.stringify(request)
  })
  return parseOrbResponse<OrbSessionEventData>(response)
}

export async function interruptOrbSession(sessionId: string): Promise<{ session_id: string; state: string; message: string }> {
  const response = await orbFetch(`/orb/realtime/session/${encodeURIComponent(sessionId)}/interrupt`, {
    method: 'POST'
  })
  return parseOrbResponse<{ session_id: string; state: string; message: string }>(response)
}

export async function endOrbSession(sessionId: string): Promise<OrbSessionSummary> {
  const response = await orbFetch(`/orb/realtime/session/${encodeURIComponent(sessionId)}/end`, {
    method: 'POST'
  })
  return parseOrbResponse<OrbSessionSummary>(response)
}

export async function fetchOrbTranscript(sessionId: string): Promise<{ session_id: string; transcript: OrbTranscriptEntry[]; storage_policy: Record<string, unknown> }> {
  const response = await orbFetch(`/orb/realtime/session/${encodeURIComponent(sessionId)}/transcript`)
  return parseOrbResponse<{ session_id: string; transcript: OrbTranscriptEntry[]; storage_policy: Record<string, unknown> }>(response)
}

export async function fetchOrbSummary(sessionId: string): Promise<OrbSessionSummary> {
  const response = await orbFetch(`/orb/session/${encodeURIComponent(sessionId)}/summary`)
  return parseOrbResponse<OrbSessionSummary>(response)
}

