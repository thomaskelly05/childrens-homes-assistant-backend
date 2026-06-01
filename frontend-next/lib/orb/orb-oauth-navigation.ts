import { orbOAuthStartUrl } from './orb-billing-client'

export type OrbOAuthProvider = 'google' | 'microsoft' | 'apple'

/** Full browser navigation to backend OAuth start — never fetch() external auth. */
export function navigateOrbOAuthStart(
  provider: OrbOAuthProvider,
  returnUrl = '/orb'
): void {
  if (typeof window === 'undefined') return
  const url = orbOAuthStartUrl(provider, returnUrl)
  window.location.assign(url)
}

export function isOrbOAuthStartPath(href: string | undefined): boolean {
  if (!href) return false
  return /\/orb\/standalone\/auth\/oauth\/(google|microsoft|apple)\/start/i.test(href)
}
