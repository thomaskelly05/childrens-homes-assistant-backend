import { convergedChatStarters } from '@/lib/orb/orb-converged-actions'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

const ORB_CONVERGED_CHAT_STARTERS = convergedChatStarters()

/** Maximum visible prompt pills on Chat home — extras live behind “More examples”. */
export const ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT = 6

type ResidentialStarter = { text: string; mode?: StandaloneOrbMode }

/** Calm ChatGPT-style primary starters — six visible pills on empty Chat. */
export const ORB_RESIDENTIAL_PRIMARY_STARTERS: ResidentialStarter[] = [
  { text: 'Review written practice' },
  { text: 'Create a handover' },
  { text: 'Think through a safeguarding concern', mode: 'Safeguarding Thinking' },
  { text: 'Record this properly', mode: 'Record This Properly' },
  { text: 'Prepare for inspection', mode: 'Ofsted Lens' },
  { text: 'Build an action plan', mode: 'Reg 44 / Reg 45 Prep' }
]

const PRIMARY_STARTER_TEXTS = new Set(
  ORB_RESIDENTIAL_PRIMARY_STARTERS.map((s) => s.text.trim().toLowerCase())
)

/** Additional starters surfaced via “More examples” drawer. */
export const ORB_RESIDENTIAL_MORE_STARTERS: ResidentialStarter[] = ORB_CONVERGED_CHAT_STARTERS.filter(
  (starter) => !PRIMARY_STARTER_TEXTS.has(starter.text.trim().toLowerCase())
)

/** User-facing product copy for ORB Residential — safe, regulatory-aware language. */
export const ORB_RESIDENTIAL_PRODUCT_NAME = 'ORB Residential'
export const ORB_RESIDENTIAL_TAGLINE = 'Powered by IndiCare Intelligence'

/** Action-led empty heading — desktop and mobile share the same clear prompt. */
export const ORB_RESIDENTIAL_EMPTY_HEADING_DESKTOP = 'What do you need help with?'

/** Calm ChatGPT-style empty heading on phone (`/orb`). */
export const ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING = 'What do you need help with?'

/** Functional product line — hero / first-run only, not global chrome. */
export const ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE = 'IndiCare Intelligence'

/** Intentionally empty — keep the home screen calm; starters carry the guidance. */
export const ORB_RESIDENTIAL_EMPTY_SUBLINE = ''

/** Compact residential starters — same six primary pills on mobile and desktop. */
export const ORB_RESIDENTIAL_MOBILE_EMPTY_STARTERS = ORB_RESIDENTIAL_PRIMARY_STARTERS

export const ORB_RESIDENTIAL_EMPTY_STARTERS = ORB_RESIDENTIAL_PRIMARY_STARTERS

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
  'Safeguarding responsibilities',
  'Residential childcare practice',
  'Child-centred recording',
  'Professional accountability',
  'Therapeutic language',
  'Recording quality',
  'Relevant escalation boundaries'
] as const

export const ORB_KNOWLEDGE_CENTRE_TITLE = 'Knowledge Centre'

/** Purpose line for Knowledge Centre workspace. */
export const ORB_KNOWLEDGE_CENTRE_PURPOSE =
  'Sources, guidance and documents that support ORB Residential.'

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
