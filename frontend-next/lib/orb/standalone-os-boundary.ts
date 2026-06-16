/**
 * Client-side detection for intents that must not run in standalone /orb.
 * Mirrors backend `services/indicare_intelligence_surface_router.py`.
 */

const GENERAL_PRACTICE_PATTERNS: RegExp[] = [
  /\bwhat would (ofsted|an inspector|a reviewer)\b/i,
  /\bif ofsted looked at\b/i,
  /\bhow should (staff|we|i|a manager)\b.+\b(record|respond|respond to)\b/i,
  /\bhelp me understand\b/i,
  /\bwhat should a (manager|registered manager|ri|responsible individual)\b/i,
  /\bwhat would (a|an) (strong )?(registered manager|rm|dsl|ri)\b/i,
  /\bwhat does ofsted expect\b/i,
  /\bone child'?s chronology\b/i,
  /\ba young person\b/i,
  /\bscenario\b/i,
  /\bfor example\b/i,
  /\bin general\b/i,
  /\bgenerally\b/i
]

const LIVE_RECORD_ACCESS_PATTERNS: RegExp[] = [
  /\b(inspect|summarise|summarize|retrieve|pull up|fetch|analyse|analyze|review)\b.+\b(our|the|this)\b.+\b(care record|chronology|file|placement|records)\b/i,
  /\b(use|access|look at|read|open|show me)\b.+\b(this|our)\b.+\b(child|young person)'?s?\b.+\b(chronology|care record|file)\b/i,
  /\btell me about\b.+\b(child|young person)\b.+\b(in our home|on placement|in placement)\b/i,
  /\bwhat happened with\b.+\b(child|young person)\b.+\b(last week|yesterday|recently|today)\b/i,
  /\b(live|current)\b.+\b(record|evidence|placement|chronology)\b/i,
  /\bthis child'?s\b.+\b(chronology|care record|file|placement|records)\b/i,
  /\bopen\b.+\b(child|young person)\b.+\b(profile|file)\b/i,
  /\bour\b.+\b(live |current )?(records?|chronology|evidence|children'?s? data)\b/i,
  /\bfrom (the )?(system|indicare os|indicare)\b/i,
  /\bin (the )?os\b.+\b(record|chronology|file)\b/i
]

const MANAGER_LIVE_PATTERNS: RegExp[] = [
  /\bour\b.+\b(record quality|recording quality)\b/i,
  /\b(record quality|recording quality)\b.+\b(picture|dashboard|across the home)\b/i,
  /\bintelligence spine\b/i,
  /\bincident trend\b.+\b(across|in) (the |our )?home\b/i,
  /\bburnout pattern\b/i,
  /\bworkforce intelligence\b/i,
  /\bevidence graph\b/i,
  /\blive evidence\b.+\b(ofsted|inspection)\b/i,
  /\baction board\b/i
]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function isGeneralPracticeQuestion(text: string): boolean {
  return matchesAny(text, GENERAL_PRACTICE_PATTERNS)
}

export function requiresLiveOsRecords(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (isGeneralPracticeQuestion(trimmed)) return false
  return matchesAny(trimmed, LIVE_RECORD_ACCESS_PATTERNS)
}

export function detectStandaloneOsContextRequest(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (isGeneralPracticeQuestion(trimmed)) return false
  return requiresLiveOsRecords(trimmed) || matchesAny(trimmed, MANAGER_LIVE_PATTERNS)
}

export const STANDALONE_OS_BOUNDARY_MESSAGE =
  'This needs permissioned IndiCare OS context. Use OS ORB at /assistant/orb. ORB Residential does not access IndiCare OS records.'

const MANAGER_ROUTE_HINTS: Array<{ pattern: RegExp; route: string }> = [
  { pattern: /\bour\b.+\b(record quality|recording quality|weak record)\b/i, route: '/assistant/orb?mode=record_quality_review' },
  { pattern: /\b(ofsted|Inspection evidence preparation|inspection evidence)\b/i, route: '/assistant/orb?mode=ofsted_evidence_review' },
  { pattern: /\b(prioritise|prioritize|action board|what actions)\b/i, route: '/assistant/orb?mode=action_priority' },
  { pattern: /\bsafeguarding\b/i, route: '/assistant/orb?mode=safeguarding_themes' },
  { pattern: /\b(staff support|supervision|workforce)\b/i, route: '/assistant/orb?mode=staff_support' },
  {
    pattern: /\b(attention today|needs my attention)\b/i,
    route: '/assistant/orb?mode=manager_daily_brief'
  }
]

export function suggestedOperationalOrbRoute(text: string): string {
  const trimmed = text.trim()
  for (const hint of MANAGER_ROUTE_HINTS) {
    if (hint.pattern.test(trimmed)) return hint.route
  }
  if (requiresLiveOsRecords(trimmed)) {
    return '/assistant/orb?mode=child_journey_summary'
  }
  return '/assistant/orb?mode=manager_daily_brief'
}

export function standaloneOsBoundaryReply(text: string): string | null {
  if (!detectStandaloneOsContextRequest(text)) {
    return null
  }
  return `This needs permissioned IndiCare OS context. Use OS ORB (${suggestedOperationalOrbRoute(text)}). ORB Residential does not access IndiCare OS records.`
}
