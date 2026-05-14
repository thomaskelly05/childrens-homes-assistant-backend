import { routeOrbIntent } from './intent-router'
import type { OrbContext, OrbModeDecision, OrbSelectedMode } from './types'

export function routeOrbMode(options: {
  message?: string | null
  role?: string | null
  selectedMode?: OrbSelectedMode
  context?: OrbContext
}): OrbModeDecision {
  return routeOrbIntent(options)
}

