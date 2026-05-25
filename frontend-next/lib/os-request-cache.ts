/**
 * Short-lived in-memory dedupe for AppShell / menu badge fetches (client-only).
 * Reduces duplicate parallel calls to operational-feed and recording badge endpoints.
 */

type CacheEntry<T> = {
  value: T
  expiresAt: number
  promise?: Promise<T>
}

const store = new Map<string, CacheEntry<unknown>>()

export function osRequestCacheKey(parts: Record<string, string | number | boolean | undefined>) {
  return Object.entries(parts)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

export async function fetchWithOsCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 15000
): Promise<T> {
  const now = Date.now()
  const existing = store.get(key) as CacheEntry<T> | undefined
  if (existing?.promise) return existing.promise
  if (existing && existing.expiresAt > now) return existing.value

  const promise = fetcher()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      const entry = store.get(key) as CacheEntry<T> | undefined
      if (entry?.promise) {
        store.set(key, { value: entry.value, expiresAt: entry.expiresAt })
      }
    })

  store.set(key, {
    value: existing?.value as T,
    expiresAt: existing?.expiresAt ?? 0,
    promise,
  })
  return promise
}

export function invalidateOsRequestCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

/** Stable cache key for high-churn AppShell / menu endpoints. */
export function osRequestDedupeKey(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const normalised = path.startsWith('/') ? path : `/${path}`
  if (!params || !Object.keys(params).length) return `dedupe:${normalised}`
  return `dedupe:${normalised}?${osRequestCacheKey(params)}`
}

