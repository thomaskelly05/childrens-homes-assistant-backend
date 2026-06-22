/** Phase 5O — non-blocking ORB startup fetches (UX speed, not backend speed). */

export const ORB_DEFERRED_SUMMARY_PANELS = ['saved_outputs', 'memory'] as const

export type OrbDeferredSummaryPanel = (typeof ORB_DEFERRED_SUMMARY_PANELS)[number]

export function shouldFetchOrbSavedOutputsSummaryImmediately(
  activePanel: string | null | undefined
): boolean {
  if (!activePanel) return false
  return (ORB_DEFERRED_SUMMARY_PANELS as readonly string[]).includes(activePanel)
}

export function scheduleOrbDeferredLoad(callback: () => void, delayMs = 1500): () => void {
  const timer = setTimeout(callback, delayMs)
  return () => clearTimeout(timer)
}
