/**
 * Stable auth-loading deadline for ORB front door.
 * Survives OrbAuthLoadingScreen remounts so mobile Safari cannot reset the timer forever.
 */

let orbAuthLoadingStartedAt: number | null = null

export function markOrbAuthLoadingStart(now: number = Date.now()) {
  if (orbAuthLoadingStartedAt === null) {
    orbAuthLoadingStartedAt = now
  }
}

export function resetOrbAuthLoadingDeadline() {
  orbAuthLoadingStartedAt = null
}

export function getOrbAuthLoadingElapsedMs(now: number = Date.now()): number {
  if (orbAuthLoadingStartedAt === null) return 0
  return Math.max(0, now - orbAuthLoadingStartedAt)
}

export function getOrbAuthLoadingRemainingMs(deadlineMs: number, now: number = Date.now()): number {
  markOrbAuthLoadingStart(now)
  return Math.max(0, deadlineMs - getOrbAuthLoadingElapsedMs(now))
}

export function hasOrbAuthLoadingDeadlinePassed(deadlineMs: number, now: number = Date.now()): boolean {
  return getOrbAuthLoadingRemainingMs(deadlineMs, now) === 0
}
