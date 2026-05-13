import type { OsTransitionPayload, OsTransitionResult } from './types'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ''
).replace(/\/+$/, '')

function url(path: string) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(url(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  const payload = await response.json()
  return (payload.data ?? payload) as T
}

export function transitionRecord(entityType: string, recordId: string, payload: OsTransitionPayload) {
  return postJson<OsTransitionResult>(`/os/workflows/records/${entityType}/${encodeURIComponent(recordId)}/transition`, payload)
}

export function addRecordComment(entityType: string, recordId: string, body: string) {
  return postJson('/os/collaboration/comments', { entity_type: entityType, record_id: recordId, body })
}

export function requestRecordReview(entityType: string, recordId: string, notes?: string) {
  return postJson('/os/collaboration/review-requests', { entity_type: entityType, record_id: recordId, notes })
}

export function attachEvidence(payload: Record<string, unknown>) {
  return postJson('/os/evidence/attach', payload)
}
