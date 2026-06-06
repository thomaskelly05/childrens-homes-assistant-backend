/**
 * ORB front-door redirect loop breaker.
 * Stops repeated /orb ↔ /login bouncing within a short window.
 */

import {
  clearOrbRedirectTracking,
  recordOrbAuthDebugEvent,
  recordOrbRedirectAttempt
} from '@/lib/orb/orb-auth-debug-events'

const LOOP_WINDOW_MS = 10_000
const LOOP_THRESHOLD = 2

const GUARDED_PREFIXES = ['/orb', '/login', '/orb/login'] as const

const EXEMPT_PREFIXES = [
  '/orb/billing/success',
  '/orb/billing/cancel',
  '/api/',
  '/auth/oauth',
  '/orb/auth/oauth',
  '/mfa'
] as const

type RedirectRecord = {
  target: string
  at: number
}

let redirectHistory: RedirectRecord[] = []
let loopBroken = false
let loopBrokenAt: number | null = null

function normalizePath(target: string): string {
  try {
    const url = target.startsWith('/') ? target : `/${target}`
    const parsed = new URL(url, 'https://app.indicare.co.uk')
    return parsed.pathname
  } catch {
    return target.split('?')[0] || target
  }
}

function isGuardedTarget(target: string): boolean {
  const path = normalizePath(target)
  return GUARDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  )
}

function isExemptTarget(target: string): boolean {
  const path = normalizePath(target)
  return EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))
}

export function recordOrbRouteRedirect(target: string, reason: string, now: number = Date.now()): void {
  if (isExemptTarget(target)) return
  if (!isGuardedTarget(target)) return

  redirectHistory = [...redirectHistory.filter((r) => now - r.at < LOOP_WINDOW_MS), { target, at: now }]
  recordOrbRedirectAttempt(target, reason)

  if (redirectHistory.length > LOOP_THRESHOLD) {
    loopBroken = true
    loopBrokenAt = now
    recordOrbAuthDebugEvent('loop_guard', {
      action: 'break',
      target,
      reason,
      attempts: redirectHistory.length
    })
  }
}

export function isOrbRouteLoopBroken(now: number = Date.now()): boolean {
  if (!loopBroken) return false
  if (loopBrokenAt !== null && now - loopBrokenAt > LOOP_WINDOW_MS * 3) {
    clearOrbRouteLoopGuard()
    return false
  }
  return true
}

export function clearOrbRouteLoopGuard(): void {
  loopBroken = false
  loopBrokenAt = null
  redirectHistory = []
  clearOrbRedirectTracking()
  recordOrbAuthDebugEvent('loop_guard', { action: 'clear' })
}

export function shouldBlockOrbRouteRedirect(target: string): boolean {
  if (!isOrbRouteLoopBroken()) return false
  if (isExemptTarget(target)) return false
  return isGuardedTarget(target)
}

export function getOrbRouteRedirectAttempts(now: number = Date.now()): number {
  return redirectHistory.filter((r) => now - r.at < LOOP_WINDOW_MS).length
}

function isSamePathNavigation(target: string): boolean {
  if (typeof window === 'undefined') return false
  const currentPath = window.location.pathname
  const current = `${currentPath}${window.location.search}`
  if (target === current || target === currentPath) return true
  try {
    const parsed = new URL(target, window.location.origin)
    return parsed.pathname === currentPath && parsed.search === window.location.search
  } catch {
    return false
  }
}

export function wrapOrbRouter<T extends { replace: (url: string) => void; push: (url: string) => void }>(
  router: T,
  reason: string
): T {
  return {
    ...router,
    replace: (url: string) => {
      if (isSamePathNavigation(url)) return
      recordOrbRouteRedirect(url, reason)
      if (shouldBlockOrbRouteRedirect(url)) {
        recordOrbAuthDebugEvent('loop_guard', { action: 'blocked_replace', target: url, reason })
        return
      }
      router.replace(url)
    },
    push: (url: string) => {
      if (isSamePathNavigation(url)) return
      recordOrbRouteRedirect(url, reason)
      if (shouldBlockOrbRouteRedirect(url)) {
        recordOrbAuthDebugEvent('loop_guard', { action: 'blocked_push', target: url, reason })
        return
      }
      router.push(url)
    }
  }
}
