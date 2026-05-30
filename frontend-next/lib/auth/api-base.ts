/**
 * Resolves where authenticated browser API calls should go.
 * Production browsers must use same-origin `/backend` (Next proxy), not a cross-origin Render URL.
 */

const DEFAULT_DEV_BACKEND = 'http://127.0.0.1:8000'
const DEFAULT_PROD_BACKEND = 'https://api.indicare.co.uk'
export const AUTH_API_PROXY_PREFIX = '/backend'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function configuredPublicBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').trim()
}

/** Server-side / build-time upstream for the Next.js backend proxy. */
export function getInternalBackendOrigin(): string {
  const candidates = [
    process.env.INTERNAL_API_BASE_URL,
    process.env.API_BASE_URL,
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL
  ]
  for (const candidate of candidates) {
    const trimmed = (candidate || '').trim()
    if (trimmed && isAbsoluteHttpUrl(trimmed)) {
      return trimTrailingSlash(trimmed)
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PROD_BACKEND
  }
  return DEFAULT_DEV_BACKEND
}

/**
 * Base path or origin for auth-sensitive fetches.
 * Browser production: `/backend` (same-origin proxy).
 * Browser dev: `/backend` when NEXT_PUBLIC_* points cross-origin; else empty (legacy rewrites).
 */
export function getAuthApiBase(): string {
  if (typeof window === 'undefined') {
    return getInternalBackendOrigin()
  }

  const configured = configuredPublicBase()
  if (configured && isAbsoluteHttpUrl(configured)) {
    return AUTH_API_PROXY_PREFIX
  }
  if (configured.startsWith('/')) {
    return trimTrailingSlash(configured)
  }
  return AUTH_API_PROXY_PREFIX
}

export function resolveAuthApiPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = getAuthApiBase()
  if (!base) return normalized
  if (normalized === base || normalized.startsWith(`${base}/`)) {
    return normalized
  }
  if (isAbsoluteHttpUrl(base)) {
    return `${trimTrailingSlash(base)}${normalized}`
  }
  return `${base}${normalized}`
}

export function isCrossOriginPublicApiMisconfiguration(): boolean {
  if (typeof window === 'undefined') return false
  const configured = configuredPublicBase()
  return Boolean(configured && isAbsoluteHttpUrl(configured))
}
