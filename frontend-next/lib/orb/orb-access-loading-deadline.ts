/**
 * Stable access-loading deadline for ORB front door.
 * Survives OrbAuthLoadingScreen remounts so mobile Safari cannot reset the timer forever.
 */

let orbAccessLoadingStartedAt: number | null = null

export function markOrbAccessLoadingStart(now: number = Date.now()) {
  if (orbAccessLoadingStartedAt === null) {
    orbAccessLoadingStartedAt = now
  }
}

export function resetOrbAccessLoadingDeadline() {
  orbAccessLoadingStartedAt = null
}

export function getOrbAccessLoadingElapsedMs(now: number = Date.now()): number {
  if (orbAccessLoadingStartedAt === null) return 0
  return Math.max(0, now - orbAccessLoadingStartedAt)
}

export function getOrbAccessLoadingRemainingMs(deadlineMs: number, now: number = Date.now()): number {
  markOrbAccessLoadingStart(now)
  return Math.max(0, deadlineMs - getOrbAccessLoadingElapsedMs(now))
}

export function hasOrbAccessLoadingDeadlinePassed(deadlineMs: number, now: number = Date.now()): boolean {
  return getOrbAccessLoadingRemainingMs(deadlineMs, now) === 0
}
