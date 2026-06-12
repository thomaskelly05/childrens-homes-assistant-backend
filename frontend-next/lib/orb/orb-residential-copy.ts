import { convergedChatStarters } from '@/lib/orb/orb-converged-actions'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

const ORB_CONVERGED_CHAT_STARTERS = convergedChatStarters()

/** Maximum visible prompt pills on Chat home — extras live behind “More examples”. */
export const ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT = 6

type ResidentialStarter = { text: string; mode?: StandaloneOrbMode }

export type OrbResidentialStarterGroup = {
  id: string
  label: string
  starters: ResidentialStarter[]
}

/** Home prompt groups — organised around children’s home workflows. */
export const ORB_RESIDENTIAL_STARTER_GROUPS: OrbResidentialStarterGroup[] = [
  {
    id: 'recording',
    label: 'Recording',
    starters: [
      { text: 'Daily record', mode: 'Record This Properly' },
      { text: 'Incident reflection' },
      { text: 'Key-work summary' },
      { text: 'Handover note' },
      { text: 'Chronology entry' }
    ]
  },
  {
    id: 'thinking',
    label: 'Thinking',
    starters: [
      { text: 'Safeguarding reflection', mode: 'Safeguarding Thinking' },
      { text: 'Understand behaviour' },
      { text: 'Prepare for supervision' },
      { text: 'Manager oversight' },
      { text: 'Build an action plan', mode: 'Reg 44 / Reg 45 Prep' }
    ]
  },
  {
    id: 'evidence',
    label: 'Evidence',
    starters: [
      { text: 'Prepare for inspection', mode: 'Ofsted Lens' },
      { text: 'Regulation 44 support', mode: 'Reg 44 / Reg 45 Prep' },
      { text: 'Regulation 45 reflection', mode: 'Reg 44 / Reg 45 Prep' },
      { text: 'Review written practice' }
    ]
  }
]

/** Flat primary starters — first chips shown before “More examples”. */
export const ORB_RESIDENTIAL_PRIMARY_STARTERS: ResidentialStarter[] = [
  { text: 'Daily record', mode: 'Record This Properly' },
  { text: 'Incident reflection' },
  { text: 'Safeguarding reflection', mode: 'Safeguarding Thinking' },
  { text: 'Handover note' },
  { text: 'Prepare for inspection', mode: 'Ofsted Lens' },
  { text: 'Review written practice' }
]

const PRIMARY_STARTER_TEXTS = new Set(
  [
    ...ORB_RESIDENTIAL_PRIMARY_STARTERS,
    ...ORB_RESIDENTIAL_STARTER_GROUPS.flatMap((group) => group.starters)
  ].map((s) => s.text.trim().toLowerCase())
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

/** Specialist residential childcare positioning on the home screen. */
export const ORB_RESIDENTIAL_EMPTY_SUBLINE =
  'Built for safer recording, stronger reflection and clearer evidence.'

/** Compact residential starters — same six primary pills on mobile and desktop. */
export const ORB_RESIDENTIAL_MOBILE_EMPTY_STARTERS = ORB_RESIDENTIAL_PRIMARY_STARTERS

export const ORB_RESIDENTIAL_EMPTY_STARTERS = ORB_RESIDENTIAL_PRIMARY_STARTERS

/** Calm adult-responsibility strip used across ORB Residential surfaces. */
export const ORB_RESIDENTIAL_SAFETY_STRIP =
  'ORB can help you reflect and improve wording. You remain responsible for accuracy, escalation and final approval.'

export const ORB_RESIDENTIAL_PRIVACY_STRIP =
  'Use anonymised or minimal identifiable information where possible. Follow your organisation’s policy and local safeguarding procedures.'

export const ORB_RESIDENTIAL_VOICE_PRIVACY_STRIP =
  'Voice sessions may create transcripts for drafting and support purposes. Do not use ORB for emergencies — follow local safeguarding and emergency procedures.'

export const ORB_RESIDENTIAL_VOICE_SAFETY_STRIP =
  'ORB can support your thinking, but it does not replace safeguarding procedures, management oversight or professional judgement.'

export const ORB_RESIDENTIAL_DICTATE_RESPONSIBILITY_STRIP =
  'ORB can help structure and improve wording. You remain responsible for accuracy, escalation and final approval.'

/** What ORB Review checks in Dictate — care-aware, not generic “analysis”. */
export const ORB_DICTATE_REVIEW_CHECKS = [
  'Time, date and sequence',
  'What was seen or heard',
  'Who was present',
  'Child’s voice, wishes or feelings',
  'Actions taken by adults',
  'Any safeguarding indicators',
  'Who was informed',
  'Whether management oversight is needed',
  'Follow-up or review required'
] as const

export const ORB_RESIDENTIAL_BILLING_VALUE_ITEMS = [
  'Chat with ORB',
  'Dictate rough notes into records',
  'Use Voice support',
  'Create documents in ORB Write',
  'Review wording before final approval',
  'Safety and privacy reminders',
  'Residential childcare-specific guidance'
] as const

export const ORB_RESIDENTIAL_BILLING_TRUST_COPY =
  'ORB Residential does not replace your organisation’s recording system. It helps you prepare clearer, safer wording before you copy, export or save records where appropriate.'

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
