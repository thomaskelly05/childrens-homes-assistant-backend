import type { OsApiResult, OsEnvelope } from './types'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'https://api.indicare.co.uk'
).replace(/\/+$/, '')

const OS_GET_CACHE_TTL_MS = Number(process.env.OS_GET_CACHE_TTL_MS || process.env.NEXT_PUBLIC_OS_GET_CACHE_TTL_MS || 12000)
const OS_FETCH_TIMEOUT_MS = Number(process.env.OS_FETCH_TIMEOUT_MS || process.env.NEXT_PUBLIC_OS_FETCH_TIMEOUT_MS || 9000)
const OS_CACHE_MAX_ENTRIES = Number(process.env.OS_GET_CACHE_MAX_ENTRIES || 300)

type CacheEntry<T> = {
  expiresAt: number
  promise: Promise<OsApiResult<T>>
}

const osGetCache = new Map<string, CacheEntry<unknown>>()

function resolveOsUrl(path: string) {
  if (typeof window !== 'undefined') return path.startsWith('/') ? path : `/${path}`
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
  if (example === null) return null as T
  if (example && typeof example === 'object') return example
  return undefined as T
}

function cacheKey(path: string) {
  return `shared:${path}`
}

function pruneCache() {
  const now = Date.now()
  for (const [key, entry] of osGetCache) {
    if (entry.expiresAt <= now) osGetCache.delete(key)
  }
  while (osGetCache.size > OS_CACHE_MAX_ENTRIES) {
    const first = osGetCache.keys().next().value
    if (!first) break
    osGetCache.delete(first)
  }
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OS_FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function doOsGet<T>(path: string, fallback: T): Promise<OsApiResult<T>> {
  try {
    const response = await fetchWithTimeout(resolveOsUrl(path), {
      cache: 'no-store',
      credentials: 'include',
      headers: { 'x-indicare-rsc': '1' }
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

export async function osGet<T>(path: string, fallback: T): Promise<OsApiResult<T>> {
  const key = cacheKey(path)
  const now = Date.now()
  const existing = osGetCache.get(key) as CacheEntry<T> | undefined
  if (existing && existing.expiresAt > now) return existing.promise

  pruneCache()
  const promise = doOsGet(path, fallback)
  osGetCache.set(key, { expiresAt: now + OS_GET_CACHE_TTL_MS, promise })
  return promise
}

export async function osPost<T>(path: string, body: unknown, fallback: T): Promise<OsApiResult<T>> {
  try {
    const response = await fetchWithTimeout(resolveOsUrl(path), {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
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