import type { OrbOAuthProvider } from '@/lib/orb/orb-oauth-navigation'

const PROVIDER_KEY = 'orb_oauth_redirect_provider'
const STARTED_AT_KEY = 'orb_oauth_redirect_started_at'
const REDIRECT_TTL_MS = 5 * 60 * 1000

export function markOrbOAuthRedirect(provider: OrbOAuthProvider): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PROVIDER_KEY, provider)
    sessionStorage.setItem(STARTED_AT_KEY, String(Date.now()))
  } catch {
    // ignore storage failures
  }
}

export function peekOrbOAuthRedirect(): OrbOAuthProvider | null {
  if (typeof window === 'undefined') return null
  try {
    const provider = sessionStorage.getItem(PROVIDER_KEY)
    const startedAt = Number(sessionStorage.getItem(STARTED_AT_KEY) || 0)
    if (!provider) return null
    if (!startedAt || Date.now() - startedAt > REDIRECT_TTL_MS) {
      clearOrbOAuthRedirect()
      return null
    }
    if (provider === 'google' || provider === 'microsoft') return provider
    return null
  } catch {
    return null
  }
}

export function clearOrbOAuthRedirect(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PROVIDER_KEY)
    sessionStorage.removeItem(STARTED_AT_KEY)
  } catch {
    // ignore
  }
}

export function consumeOrbOAuthRedirect(): OrbOAuthProvider | null {
  const provider = peekOrbOAuthRedirect()
  clearOrbOAuthRedirect()
  return provider
}

export function orbOAuthRedirectMessage(provider: OrbOAuthProvider | null): string | null {
  if (provider === 'google') return 'Redirecting to Google…'
  if (provider === 'microsoft') return 'Redirecting to Microsoft…'
  return null
}
