/** Lightweight composer document upload — avoids pulling standalone-client into upload-only paths. */

import { authFetch, AuthApiError } from '@/lib/auth/api'

export type OrbComposerDocumentUploadResult = {
  source_id: string
  title: string
  chunk_count: number
  source_type?: string
  status: string
}

function unwrapUploadPayload<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new AuthApiError(503, 'Unexpected document upload response')
  }
  const record = payload as Record<string, unknown>
  if (record.data !== undefined) return record.data as T
  return payload as T
}

/** POST FormData-equivalent JSON body to the standalone documents upload endpoint. */
export async function uploadOrbComposerDocument(body: {
  title: string
  text?: string
  content_base64?: string
  file_name?: string
  content_type?: string
  source_type?: string
}): Promise<OrbComposerDocumentUploadResult> {
  const payload = await authFetch('/orb/standalone/documents/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrapUploadPayload<OrbComposerDocumentUploadResult>(payload)
}
