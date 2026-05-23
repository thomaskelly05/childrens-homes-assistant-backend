/**
 * Client-side detection for intents that must not run in standalone /orb.
 * Mirrors backend `services/indicare_intelligence_surface_router.py`.
 */

const CHILD_LIVE_PATTERNS: RegExp[] = [
  /\btell me about\b.+\b(child|young person|yp)\b/i,
  /\b(child|young person|yp)\b.+\b(chronology|timeline|records?)\b/i,
  /\buse\b.+\b(chronology|care record|file)\b/i,
  /\bwhat happened with\b.+\b(last week|yesterday|recently)\b/i,
  /\b(live|current)\b.+\b(record|evidence|placement)\b/i,
  /\bthis child'?s\b/i,
  /\bopen\b.+\b(child|young person)\b.+\b(profile|file)\b/i
]

export function detectStandaloneOsContextRequest(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return CHILD_LIVE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

export const STANDALONE_OS_BOUNDARY_MESSAGE =
  'This needs permissioned IndiCare OS context. Use OS ORB at /assistant/orb. Standalone ORB does not access live child records, chronology or placement data.'

export function standaloneOsBoundaryReply(text: string): string | null {
  if (!detectStandaloneOsContextRequest(text)) return null
  return STANDALONE_OS_BOUNDARY_MESSAGE
}
