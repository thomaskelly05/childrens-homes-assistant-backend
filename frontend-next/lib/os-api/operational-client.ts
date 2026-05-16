import type { OsTransitionPayload, OsTransitionResult } from './types'
import { authFetch } from '@/lib/auth/api'
import { emitOperationalEvent } from './events'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const payload = await authFetch<any>(path.startsWith('/') ? path : `/${path}`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return (payload.data ?? payload) as T
}

export async function transitionRecord(entityType: string, recordId: string, payload: OsTransitionPayload) {
  const result = await postJson<OsTransitionResult>(`/os/workflows/records/${entityType}/${encodeURIComponent(recordId)}/transition`, payload)
  emitOperationalEvent('record:updated', { entityType, recordId, result })
  emitOperationalEvent('chronology:refresh', { entityType, recordId })
  emitOperationalEvent('assistant-context:refresh', { entityType, recordId })
  emitOperationalEvent('command-centre:refresh', { entityType, recordId })
  return result
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
