import { cookies } from 'next/headers'

import type { OsApiResult, OsEnvelope } from './types'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '')

function calmOsWarning(status?: number) {
  if (status === 404) return "That workspace isn't available yet."
  if (status === 401 || status === 403) return "I couldn't verify access to that just now."
  return "I couldn't load that just now."
}

function emptyData<T>(example: T): T {
  if (Array.isArray(example)) return [] as T
  if (example === null) return null as T
  if (example && typeof example === 'object') return example
  return undefined as T
}

export async function osServerGet<T>(path: string, fallback: T): Promise<OsApiResult<T>> {
  try {
    const cookieHeader = (await cookies()).toString()
    const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      cache: 'no-store',
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        'x-indicare-rsc': '1'
      }
    })
    if (!response.ok) {
      return { data: emptyData(fallback), source: 'unavailable', warning: calmOsWarning(response.status), error: process.env.NODE_ENV === 'development' ? `${response.status} ${response.statusText}` : undefined }
    }
    const payload = (await response.json()) as OsEnvelope<T> | T
    const envelope = payload as OsEnvelope<T>
    return {
      data: envelope && 'data' in envelope ? (envelope.data as T) : (payload as T),
      meta: envelope && 'meta' in envelope ? envelope.meta : undefined,
      source: 'live'
    }
  } catch (error) {
    return { data: emptyData(fallback), source: 'unavailable', warning: "I couldn't load that just now.", error: process.env.NODE_ENV === 'development' ? String(error) : undefined }
  }
}