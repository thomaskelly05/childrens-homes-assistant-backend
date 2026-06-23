/** User-visible sanitization when AI provider is mock or unavailable — mirrors backend service. */

export const ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE =
  'ORB could not complete this response. Please try again or contact support if this continues.'

const MOCK_LEAKAGE_PATTERNS: RegExp[] = [
  /configure\s+openai_api_key/i,
  /orb\s+mock\s+engine\s+response/i,
  /\bmock\s+provider\b/i,
  /\bplaceholder\s+provider\b/i
]

const INDICARE_PRODUCT_LEAKAGE_RE =
  /IndiCare is a residential children's homes operating system and intelligence platform/i

const USER_ASKED_ABOUT_INDICARE_RE =
  /\b(?:what is indicare|tell me about indicare|about orb|what is orb|care companion|indicare os)\b/i

export function isMockProviderLeakage(text: string): boolean {
  const cleaned = (text || '').trim()
  if (!cleaned) return false
  return MOCK_LEAKAGE_PATTERNS.some((pattern) => pattern.test(cleaned))
}

export function isIndicareProductBoilerplateLeakage(text: string, sourceText = ''): boolean {
  if (USER_ASKED_ABOUT_INDICARE_RE.test(sourceText || '')) return false
  const cleaned = (text || '').trim()
  if (!cleaned) return false
  return INDICARE_PRODUCT_LEAKAGE_RE.test(cleaned)
}

export function sanitizeUserVisibleProviderAnswer(
  text: string,
  options?: {
    provider?: string | null
    errorDetail?: string | null
    signOffContext?: boolean
    sourceText?: string
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
    isMockProviderLeakage(cleaned) ||
    isIndicareProductBoilerplateLeakage(cleaned, options?.sourceText || '')

  if (!shouldSanitize) return text
  if (!signOff && process.env.NODE_ENV === 'development') return text
  return ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE
}
