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

const MANAGER_ROUTE_HINTS: Array<{ pattern: RegExp; route: string }> = [
  { pattern: /\b(record quality|recording quality|weak record)\b/i, route: '/assistant/orb?mode=record_quality_review' },
  { pattern: /\b(ofsted|inspection readiness|inspection evidence)\b/i, route: '/assistant/orb?mode=ofsted_evidence_review' },
  { pattern: /\b(prioritise|prioritize|action board|what actions)\b/i, route: '/assistant/orb?mode=action_priority' },
  { pattern: /\bsafeguarding\b/i, route: '/assistant/orb?mode=safeguarding_themes' },
  { pattern: /\b(staff support|supervision|workforce)\b/i, route: '/assistant/orb?mode=staff_support' },
  { pattern: /\b(child journey|young person|handover)\b/i, route: '/assistant/orb?mode=child_journey_summary' },
  {
    pattern: /\b(manager review|attention today|daily brief|needs my attention)\b/i,
    route: '/assistant/orb?mode=manager_daily_brief'
  }
]

export function suggestedOperationalOrbRoute(text: string): string {
  const trimmed = text.trim()
  for (const hint of MANAGER_ROUTE_HINTS) {
    if (hint.pattern.test(trimmed)) return hint.route
  }
  if (detectStandaloneOsContextRequest(trimmed)) {
    return '/assistant/orb?mode=child_journey_summary'
  }
  return '/assistant/orb?mode=manager_daily_brief'
}

export function standaloneOsBoundaryReply(text: string): string | null {
  if (!detectStandaloneOsContextRequest(text)) {
    const trimmed = text.trim()
    if (/\b(manager review|attention today|needs my attention)\b/i.test(trimmed)) {
      return `This needs permissioned IndiCare OS context. Use OS ORB (${suggestedOperationalOrbRoute(trimmed)}). Standalone ORB does not access live OS records.`
    }
    return null
  }
  return `This needs permissioned IndiCare OS context. Use OS ORB (${suggestedOperationalOrbRoute(text)}). Standalone ORB does not access live child records, chronology or placement data.`
}
