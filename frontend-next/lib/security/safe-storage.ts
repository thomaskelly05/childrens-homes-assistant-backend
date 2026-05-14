type StoredDraft<T> = {
  value: T
  savedAt: string
  expiresAt: string
  classification?: string
}

const DEFAULT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000

function now() {
  return Date.now()
}

export function setSafeDraft<T>(key: string, value: T, ttlMs = DEFAULT_DRAFT_TTL_MS, classification?: string) {
  if (typeof window === 'undefined') return
  const payload: StoredDraft<T> = {
    value,
    savedAt: new Date().toISOString(),
    expiresAt: new Date(now() + ttlMs).toISOString(),
    classification
  }
  window.localStorage.setItem(key, JSON.stringify(payload))
}

export function getSafeDraft<T>(key: string): StoredDraft<T> | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T>
    if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= now()) {
      window.localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

export function removeSafeDraft(key: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

export function hasLocalDraft(key: string) {
  return Boolean(getSafeDraft<unknown>(key))
}
