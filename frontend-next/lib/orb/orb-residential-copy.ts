import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

/** User-facing product copy for ORB Residential — safe, regulatory-aware language. */
export const ORB_RESIDENTIAL_PRODUCT_NAME = 'ORB Residential'
export const ORB_RESIDENTIAL_TAGLINE = 'Powered by IndiCare Intelligence'

/** Action-led empty heading — desktop and mobile share the same clear prompt. */
export const ORB_RESIDENTIAL_EMPTY_HEADING_DESKTOP = 'What do you need help with?'

/** Calm ChatGPT-style empty heading on phone (`/orb`). */
export const ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING = 'What do you need help with?'

/** Optional emotional brand line — hero / first-run only, not global chrome. */
export const ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE = 'Care. Connect. Empower.'

/** Intentionally empty — keep the home screen calm; starters carry the guidance. */
export const ORB_RESIDENTIAL_EMPTY_SUBLINE = ''

/** Compact residential starters shown above the mobile composer on an empty chat. */
export const ORB_RESIDENTIAL_MOBILE_EMPTY_STARTERS: Array<{ text: string; mode?: StandaloneOrbMode }> = [
  { text: 'Write a daily log' },
  { text: 'Turn rough notes into a record', mode: 'Record This Properly' },
  { text: 'Review an incident', mode: 'Safeguarding Thinking' },
  { text: 'Ask a safeguarding question', mode: 'Safeguarding Thinking' }
]

export const ORB_RESIDENTIAL_EMPTY_STARTERS: Array<{ text: string; mode?: StandaloneOrbMode }> = [
  { text: 'Write a daily log' },
  { text: 'Turn rough notes into a record', mode: 'Record This Properly' },
  { text: 'Review an incident', mode: 'Safeguarding Thinking' },
  { text: 'Ask a safeguarding question', mode: 'Safeguarding Thinking' }
]

/** Visible mode labels — internal mode ids may still use legacy names for API compatibility. */
export const ORB_RESIDENTIAL_MODE_DISPLAY: Partial<Record<StandaloneOrbMode, string>> = {
  'Ofsted Lens': 'Inspection Readiness',
  'Reg 44 / Reg 45 Prep': 'Regulation 44 preparation'
}

export function residentialModeDisplayLabel(mode: string): string {
  return ORB_RESIDENTIAL_MODE_DISPLAY[mode as StandaloneOrbMode] ?? mode
}

/** Simplified “why ORB answered this way” — no internal architecture labels. */
export const ORB_USER_EXPLAINABILITY_CONSIDERATIONS = [
  'Residential childcare practice',
  'Safeguarding responsibilities',
  'Regulatory expectations',
  'Child-centred recording',
  'Reflective practice',
  'Professional accountability'
] as const

export const ORB_KNOWLEDGE_CENTRE_TITLE = 'Residential Knowledge Centre'

export const ORB_KNOWLEDGE_TOPICS = [
  'SCCIF',
  "Children's Homes Regulations",
  'Quality Standards',
  'Working Together',
  'Safeguarding guidance',
  'Recording standards',
  'Safer recruitment',
  'Regulation 44',
  'Regulation 45',
  'Residential care practice guidance'
] as const
