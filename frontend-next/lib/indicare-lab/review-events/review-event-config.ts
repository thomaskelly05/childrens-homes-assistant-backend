/**
 * IndiCare Lab shadow review configuration.
 *
 * Browser-visible flags use NEXT_PUBLIC_INDICARE_LAB_* (preferred in client code).
 * Server-only INDICARE_LAB_* names are accepted when read during SSR/build.
 */

const DEFAULT_MAX_REVIEW_TEXT_LENGTH = 2_000

function readEnv(name: string): string | undefined {
  const publicName = `NEXT_PUBLIC_${name}`
  return (
    (typeof process !== 'undefined' ? process.env[publicName] : undefined) ??
    (typeof process !== 'undefined' ? process.env[name] : undefined)
  )?.trim()
}

function readEnvBool(name: string): boolean | undefined {
  const raw = readEnv(name)
  if (raw === undefined || raw === '') return undefined
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes'
}

function readEnvInt(name: string, fallback: number): number {
  const raw = readEnv(name)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** True when running a local / non-production Next.js build. */
export function isIndicareLabDevelopmentMode(): boolean {
  if (typeof process === 'undefined') return false
  if (process.env.NODE_ENV === 'development') return true
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT?.toLowerCase()
  return env === 'development' || env === 'local'
}

/**
 * Shadow review is off in production unless explicitly enabled.
 * Defaults to on in development mode only.
 */
export function isShadowReviewEnabled(): boolean {
  const explicit = readEnvBool('INDICARE_LAB_SHADOW_REVIEW_ENABLED')
  if (explicit !== undefined) return explicit
  return isIndicareLabDevelopmentMode()
}

/** When false, prompt/answer/context are redacted and truncated before storing. */
export function shouldStoreFullReviewText(): boolean {
  const explicit = readEnvBool('INDICARE_LAB_STORE_FULL_TEXT')
  if (explicit !== undefined) return explicit
  return false
}

/** When true, likely personal names are replaced with [name]. */
export function shouldRedactReviewNames(): boolean {
  const explicit = readEnvBool('INDICARE_LAB_REDACT_NAMES')
  if (explicit !== undefined) return explicit
  return true
}

export function getMaxReviewTextLength(): number {
  return readEnvInt('INDICARE_LAB_MAX_REVIEW_TEXT_LENGTH', DEFAULT_MAX_REVIEW_TEXT_LENGTH)
}

export type ShadowReviewConfigSnapshot = {
  enabled: boolean
  developmentMode: boolean
  storeFullText: boolean
  redactNames: boolean
  maxTextLength: number
  liveBlocking: false
  liveRewriting: false
  mode: 'shadow-only'
}

export function getShadowReviewConfigSnapshot(): ShadowReviewConfigSnapshot {
  return {
    enabled: isShadowReviewEnabled(),
    developmentMode: isIndicareLabDevelopmentMode(),
    storeFullText: shouldStoreFullReviewText(),
    redactNames: shouldRedactReviewNames(),
    maxTextLength: getMaxReviewTextLength(),
    liveBlocking: false,
    liveRewriting: false,
    mode: 'shadow-only'
  }
}
