/**
 * Server-side CSRF resolution for Next.js founder/evaluation proxies.
 * Mirrors browser helpers in lib/auth/api.ts but reads from Request cookies / Cookie header.
 */

export const CSRF_COOKIE_NAMES = ['__Host-indicare_csrf', 'indicare_csrf'] as const

/** Header names accepted by FastAPI CsrfProtectionMiddleware (case-insensitive). */
export const CSRF_HEADER_NAMES = [
  'x-csrf-token',
  'X-CSRF-Token',
  'X-CSRFToken',
  'x-csrftoken',
  'X-XSRF-TOKEN'
] as const

export const SESSION_COOKIE_NAMES = ['__Host-indicare_session', 'indicare_session'] as const

type CookieReader = {
  get: (name: string) => { value: string } | undefined
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getCsrfTokenFromCookieString(cookieHeader: string): string | null {
  if (!cookieHeader) return null
  for (const name of CSRF_COOKIE_NAMES) {
    const pattern = new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=([^;]*)`)
    const match = cookieHeader.match(pattern)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return null
}

export function getCsrfTokenFromCookieStore(cookieStore: CookieReader): string | null {
  for (const name of CSRF_COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value
    if (value) return value
  }
  return null
}

export function hasSessionCookie(cookieStore: CookieReader): boolean {
  return SESSION_COOKIE_NAMES.some((name) => Boolean(cookieStore.get(name)?.value))
}

export function getIncomingCsrfHeader(request: Request): string | null {
  for (const name of CSRF_HEADER_NAMES) {
    const value = request.headers.get(name)
    if (value?.trim()) return value.trim()
  }
  return null
}

/**
 * Resolve the CSRF token to forward upstream.
 * Prefer the browser header; fall back to server-readable CSRF cookies.
 */
export function resolveProxyCsrfToken(
  request: Request,
  cookieHeader: string,
  cookieStore?: CookieReader
): string | null {
  const fromHeader = getIncomingCsrfHeader(request)
  if (fromHeader) return fromHeader
  if (cookieStore) {
    const fromStore = getCsrfTokenFromCookieStore(cookieStore)
    if (fromStore) return fromStore
  }
  return getCsrfTokenFromCookieString(cookieHeader)
}

export function csrfTokenPrefix(token: string | null | undefined): string | null {
  if (!token) return null
  return token.slice(0, 6)
}

export function visibleCookieNames(cookieHeader: string): string[] {
  if (!cookieHeader) return []
  return cookieHeader
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter(Boolean)
}
