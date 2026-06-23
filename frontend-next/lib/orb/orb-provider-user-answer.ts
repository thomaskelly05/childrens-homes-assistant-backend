/** User-visible sanitization when AI provider is mock or unavailable — mirrors backend service. */

export const ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE =
  'ORB could not complete this response. Please try again or contact support if this continues.'

const MOCK_LEAKAGE_PATTERNS: RegExp[] = [
  /configure\s+openai_api_key/i,
  /orb\s+mock\s+engine\s+response/i,
  /\bmock\s+provider\b/i,
  /\bplaceholder\s+provider\b/i
]

export function isMockProviderLeakage(text: string): boolean {
  const cleaned = (text || '').trim()
  if (!cleaned) return false
  return MOCK_LEAKAGE_PATTERNS.some((pattern) => pattern.test(cleaned))
}

export function sanitizeUserVisibleProviderAnswer(
  text: string,
  options?: {
    provider?: string | null
    errorDetail?: string | null
    signOffContext?: boolean
  }
): string {
  const cleaned = (text || '').trim()
  if (!cleaned) return text

  const provider = (options?.provider || '').trim().toLowerCase()
  const signOff =
    options?.signOffContext ??
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ||
        process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging'))

  const shouldSanitize =
    provider === 'mock' ||
    options?.errorDetail === 'provider_unavailable' ||
    isMockProviderLeakage(cleaned)

  if (!shouldSanitize) return text
  if (!signOff && process.env.NODE_ENV === 'development') return text
  return ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE
}
