/** Founder persistence mode — production must never use in-memory fallback. */

export const FOUNDER_PERSISTENCE_DEV_FALLBACK_WARNING =
  'Using local founder store. Production persistence unavailable.'

export function isFounderPersistenceDevFallback(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.FOUNDER_PERSISTENCE_DEV_FALLBACK === 'true'
}

export function isFounderPersistenceProduction(): boolean {
  return !isFounderPersistenceDevFallback()
}

export function getFounderPersistenceApiBase(): string {
  if (typeof window === 'undefined') {
    return '/api/founder'
  }
  return '/api/founder'
}
