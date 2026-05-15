import { cookies } from 'next/headers'

import type { OsApiResult, OsEnvelope } from './types'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '')

function resolveOsUrl(path: string) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

function calmOsWarning(status?: number) {
  if (status === 404) return "That workspace isn't available yet."
  if (status === 401 || status === 403) return "I couldn't verify access to that just now."
  return "I couldn't load that just now."
}

function developerDetail(error: unknown) {
  return process.env.NODE_ENV === 'development' ? String(error) : undefined
}

function emptyData<T>(example: T): T {
  if (Array.isArray(example)) return [] as T
  if (example && typeof example === 'object') return {} as T
  return undefined as T
}

export async function osGet<T>(path: string, fallback: T): Promise<OsApiResult<T>> {
  try {
    const cookieHeader = (await cookies()).toString()
    const response = await fetch(resolveOsUrl(path), {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    })
    if (!response.ok) {
      return { data: emptyData(fallback), source: 'unavailable', warning: calmOsWarning(response.status), error: developerDetail(`${response.status} ${response.statusText}`) }
    }
    const payload = (await response.json()) as OsEnvelope<T> | T
    const envelope = payload as OsEnvelope<T>
    return {
      data: envelope && 'data' in envelope ? (envelope.data as T) : (payload as T),
      meta: envelope && 'meta' in envelope ? envelope.meta : undefined,
      source: 'live'
    }
  } catch (error) {
    return { data: emptyData(fallback), source: 'unavailable', warning: "I couldn't load that just now.", error: developerDetail(error) }
  }
}

export async function osPost<T>(path: string, body: unknown, fallback: T): Promise<OsApiResult<T>> {
  try {
    const cookieHeader = (await cookies()).toString()
    const response = await fetch(resolveOsUrl(path), {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {})
      },
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      return { data: emptyData(fallback), source: 'unavailable', warning: calmOsWarning(response.status), error: developerDetail(`${response.status} ${response.statusText}`) }
    }
    const payload = (await response.json()) as OsEnvelope<T> | T
    const envelope = payload as OsEnvelope<T>
    return {
      data: envelope && 'data' in envelope ? (envelope.data as T) : (payload as T),
      meta: envelope && 'meta' in envelope ? envelope.meta : undefined,
      source: 'live'
    }
  } catch (error) {
    return { data: emptyData(fallback), source: 'unavailable', warning: "I couldn't load that just now.", error: developerDetail(error) }
  }
}

export function queryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}
