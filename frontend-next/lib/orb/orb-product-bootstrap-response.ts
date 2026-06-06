/**
 * Handle blocked ORB product bootstrap API responses without route bounce.
 */

import { AuthApiError } from '@/lib/auth/api'
import { recordOrbAuthDebugEvent } from '@/lib/orb/orb-auth-debug-events'

export type OrbBootstrapBlockedKind = 'unauthorized' | 'payment_required' | 'safety_required' | 'retry' | 'unavailable'

export function classifyOrbBootstrapBlockedResponse(status: number, code?: string): OrbBootstrapBlockedKind | null {
  if (status === 401) return 'unauthorized'
  if (status === 402) return 'payment_required'
  if (status === 403) {
    const normalized = (code || '').toLowerCase()
    if (normalized.includes('safety')) return 'safety_required'
    return 'payment_required'
  }
  if (status === 429) return 'retry'
  if (status >= 500) return 'unavailable'
  return null
}

export function handleOrbProductBootstrapBlockedResponse(
  feature: string,
  error: unknown
): OrbBootstrapBlockedKind | null {
  if (!(error instanceof AuthApiError)) return null
  const kind = classifyOrbBootstrapBlockedResponse(error.status, error.code)
  if (!kind) return null

  recordOrbAuthDebugEvent('bootstrap_api_blocked', {
    feature,
    status: error.status,
    code: error.code,
    kind
  })

  return kind
}
