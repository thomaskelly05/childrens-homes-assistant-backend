/** Canonical ORB Residential front-door routing helpers. */

export const ORB_CANONICAL_FRONT_DOOR = '/orb'

const ORB_RETURN_PREFIXES = ['/orb'] as const

/** Reject external URLs and normalise legacy root return targets to /orb. */
export function sanitizeOrbReturnUrl(
  returnUrl: string | null | undefined,
  fallback: string = ORB_CANONICAL_FRONT_DOOR
): string {
  const raw = String(returnUrl ?? '').trim()
  if (!raw) return fallback

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
    return fallback
  }

  let path = raw
  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  if (path === '/' || path === '/home' || path === '/dashboard') {
    return ORB_CANONICAL_FRONT_DOOR
  }

  const isOrbPath = ORB_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  )
  if (!isOrbPath) {
    return fallback
  }

  return path
}

/** Build a /orb URL preserving a safe returnUrl query when needed. */
export function buildOrbFrontDoorUrl(returnUrl?: string | null): string {
  const safe = sanitizeOrbReturnUrl(returnUrl, ORB_CANONICAL_FRONT_DOOR)
  if (safe === ORB_CANONICAL_FRONT_DOOR) {
    return ORB_CANONICAL_FRONT_DOOR
  }
  const params = new URLSearchParams({ returnUrl: safe })
  return `${ORB_CANONICAL_FRONT_DOOR}?${params.toString()}`
}

export function isOrbSurfacePath(pathname: string): boolean {
  return pathname === '/orb' || pathname.startsWith('/orb/')
}

export function isOrbPublicAuthPath(pathname: string): boolean {
  return (
    pathname === '/orb/signup' ||
    pathname.startsWith('/orb/signup/') ||
    pathname === '/orb/billing' ||
    pathname.startsWith('/orb/billing/') ||
    pathname === '/orb/access' ||
    pathname.startsWith('/orb/access/') ||
    pathname === '/orb/onboarding' ||
    pathname.startsWith('/orb/onboarding/')
  )
}

export const ORB_AUTH_LOADING_TIMEOUT_MS = 12_000
