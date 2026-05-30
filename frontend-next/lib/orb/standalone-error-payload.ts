export const ORB_SAFETY_ACCEPTANCE_MESSAGE = 'Accept ORB Residential safety statements before use.'
export const ORB_SAFETY_ONBOARDING_PATH = '/orb/onboarding'

export function extractOrbErrorPayload(payload: unknown): { code?: string; message?: string } {
  if (!payload || typeof payload !== 'object') return {}
  const record = payload as Record<string, unknown>
  const topCode =
    typeof record.code === 'string'
      ? record.code
      : typeof record.error === 'string'
        ? record.error
        : undefined
  const topMessage = typeof record.message === 'string' ? record.message : undefined
  const detail = record.detail
  if (typeof detail === 'string') {
    return { code: topCode, message: detail || topMessage }
  }
  if (detail && typeof detail === 'object') {
    const nested = detail as Record<string, unknown>
    const nestedCode =
      typeof nested.code === 'string'
        ? nested.code
        : typeof nested.error === 'string'
          ? nested.error
          : topCode
    const nestedMessage = typeof nested.message === 'string' ? nested.message : topMessage
    return { code: nestedCode, message: nestedMessage }
  }
  return { code: topCode, message: topMessage }
}

export function isStandaloneOrbSafetyAcceptanceCode(code?: string | null): boolean {
  const normalized = (code || '').toLowerCase()
  return normalized === 'safety_acceptance_required' || normalized.includes('safety_acceptance')
}
