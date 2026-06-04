/** Staff-facing ORB copy — hides internal intelligence architecture from normal UI. */

export const ORB_RESPONSE_SUPPORT_PANEL_LABEL = 'Response support'

/** Raw backend field names / jargon that must not appear in normal staff UI. */
export const ORB_FORBIDDEN_UI_TERMS = [
  'indicare_intelligence_core',
  'expert_brain_9',
  'expert_depth',
  'care_relevance_score',
  'active_intelligence_layers',
  'registered_home_domains',
  'quality_standard_hits',
  'professional_lens_hits',
  'quality_gate',
  'missingness graph',
  'missingness_graph',
  'route finaliser',
  'route finalizer',
  'learning ledger',
  'learning_ledger',
  'backend brain',
  'intelligence core packet',
  'IndiCare Intelligence Core',
  'source convergence',
  'registered home domain scan',
  'professional lens hits'
] as const

const FORBIDDEN_RE = new RegExp(
  ORB_FORBIDDEN_UI_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
)

/** Strip or replace leaked backend labels in user-visible status lines. */
export function sanitiseOrbUserFacingStatus(message: string | null | undefined): string | null {
  const trimmed = (message || '').trim()
  if (!trimmed) return null
  if (FORBIDDEN_RE.test(trimmed)) return null
  return trimmed
}

export const ORB_MICRO_STATUS_BY_DEPTH: Record<string, readonly string[]> = {
  residential_light: ['Preparing guidance…'],
  residential_standard: ['Preparing guidance…', 'Preparing recording points…'],
  residential_deep: ['Checking the safest next steps…', 'Building the answer…'],
  safeguarding_critical: ['Checking the safest next steps…', 'Building the answer…']
}

export const ORB_GENERAL_DELAYED_THINKING = 'Thinking…'
