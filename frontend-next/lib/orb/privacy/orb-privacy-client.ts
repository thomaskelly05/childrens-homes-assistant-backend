import { authFetch } from '@/lib/auth/api'

import type { OrbPrivacyRequest, OrbPrivacyRequestType } from './orb-privacy-types'

export type OrbPrivacyRequestCreatePayload = {
  requestType: OrbPrivacyRequestType
  summary: string
}

type ApiEnvelope<T> = { success?: boolean; data?: T; detail?: string | { message?: string } }

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T
  }
  return payload as T
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as ApiEnvelope<unknown>
  const detail = record.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message?: string }).message)
  }
  return fallback
}

export async function submitOrbPrivacyRequest(
  payload: OrbPrivacyRequestCreatePayload
): Promise<OrbPrivacyRequest> {
  try {
    const json = await authFetch<ApiEnvelope<OrbPrivacyRequest>>('/orb/privacy/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return unwrapData<OrbPrivacyRequest>(json)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit privacy request.'
    throw new Error(message)
  }
}

export async function fetchMyOrbPrivacyRequests(): Promise<OrbPrivacyRequest[]> {
  const json = await authFetch<ApiEnvelope<OrbPrivacyRequest[]>>('/orb/privacy/requests/mine')
  return unwrapData<OrbPrivacyRequest[]>(json)
}
