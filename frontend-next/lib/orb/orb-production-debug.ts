/**
 * Production gate for ORB engineering/debug surfaces on /orb.
 * Debug panels must not appear in production unless explicitly enabled.
 */

export function isOrbDevBuild(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function isOrbProductionDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ORB_DEBUG === '1'
}

/** Whether dev-only ORB debug components may mount at all (before query-param gates). */
export function canMountOrbDevTools(): boolean {
  return isOrbDevBuild() || isOrbProductionDebugEnabled()
}
