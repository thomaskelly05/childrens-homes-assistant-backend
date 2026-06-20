import { convergedChatStarters } from '@/lib/orb/orb-converged-actions'
import {
  ORB_CHAT_EMPTY_HEADING,
  ORB_CHAT_EMPTY_SUBLINE,
  ORB_DICTATE_CAPTURE_GUIDANCE,
  ORB_DICTATE_CAPTURE_PROMPT,
  ORB_DICTATE_RESPONSIBILITY,
  ORB_DICTATE_REVIEW_HINT,
  ORB_DICTATE_SUBTITLE,
  ORB_DICTATE_TITLE,
  ORB_STARTER_RECORD_PROPERLY_PROMPT
} from '@/lib/orb/orb-user-facing-names'
import {
  ORB_RESIDENTIAL_DICTATE_RESPONSIBILITY_STRIP,
  ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS,
  ORB_RESIDENTIAL_PRIVACY_STRIP,
  ORB_RESIDENTIAL_SAFETY_STRIP,
  ORB_RESIDENTIAL_VOICE_PRIVACY_STRIP,
  ORB_RESIDENTIAL_VOICE_SAFETY_STRIP
} from '@/lib/orb/orb-residential-safety-copy'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export {
  ORB_RESIDENTIAL_DICTATE_RESPONSIBILITY_STRIP,
  ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS,
  ORB_RESIDENTIAL_PRIVACY_STRIP,
  ORB_RESIDENTIAL_SAFETY_STRIP,
  ORB_RESIDENTIAL_VOICE_PRIVACY_STRIP,
  ORB_RESIDENTIAL_VOICE_SAFETY_STRIP
}

const ORB_CONVERGED_CHAT_STARTERS = convergedChatStarters()

/** British typography apostrophe for user-facing copy. */
const APOS = '\u2019'

/** Maximum visible prompt pills on Chat home desktop — extras live behind “More examples”. */
export const ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT = 6

/** Mobile first-view suggestion count — two light cards for a calmer phone home screen. */
export const ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT = 2

export type ResidentialStarter = {
  text: string
  mode?: StandaloneOrbMode
  /** Specialist prompt prefill when no dedicated chat mode exists. */
  prompt?: string
}

export type OrbResidentialStarterGroup = {
  id: string
  label: string
  starters: ResidentialStarter[]
}

/** Core ORB Review checks shown for every record type. */
export const ORB_CORE_REVIEW_CHECKS = [
  'Time, date and sequence',
  'Observable facts',
  `Child${APOS}s voice`,
  'Adult response',
  'Outcome',
  'Follow-up',
  'Management oversight where needed'
] as const

/** Record-type-specific supplemental checks for ORB Review empty state. */
export const ORB_RECORD_TYPE_REVIEW_CHECKS: Partial<Record<string, readonly string[]>> = {
  daily_record: [
    `Child${APOS}s presentation`,
    'Meaningful interactions',
    'Education, health or routines',
    'Wishes, feelings or voice',
    'Any changes or concerns'
  ],
  incident_report: [
    'What happened before the incident',
    'De-escalation attempted',
    'Harm, injury or damage',
    'Who was informed',
    'Debrief, repair or follow-up'
  ],
  handover: [
    'Key risks for next shift',
    'Emotional presentation',
    'Health, medication or appointments',
    'Practical tasks',
    'Management notes'
  ]
}

/** What ORB Review checks in Dictate — care-aware core list (record-type checks merged at runtime). */
export const ORB_DICTATE_REVIEW_CHECKS = ORB_CORE_REVIEW_CHECKS

/** Home prompt groups — organised around children's home workflows. */
export const ORB_RESIDENTIAL_STARTER_GROUPS: OrbResidentialStarterGroup[] = [
  {
    id: 'recording',
    label: 'Recording',
    starters: [
      {
        text: 'Daily record',
        mode: 'Record This Properly',
        prompt: `Help me write a daily record for today${APOS}s shift. I will share what happened — keep the child central and help me record observable facts clearly.`
      },
      {
        text: 'Incident reflection',
        prompt:
          'Help me reflect on an incident and prepare safer wording. I will describe what happened — support me with sequence, de-escalation, harm, notifications and follow-up.'
      },
      {
        text: 'Key-work summary',
        prompt: `Help me summarise key-work with the child${APOS}s voice, what was explored, agreements and next steps for adults.`
      },
      {
        text: 'Handover note',
        prompt:
          'Help me prepare a handover note for the next shift — key risks, presentation, health or medication, practical tasks and anything management should know.'
      },
      {
        text: 'Chronology entry',
        prompt:
          'Help me turn rough notes into a clear chronology entry — times, sequence, who was involved and what changed for the child.'
      }
    ]
  },
  {
    id: 'thinking',
    label: 'Thinking',
    starters: [
      {
        text: 'Safeguarding reflection',
        mode: 'Safeguarding Thinking',
        prompt: `Help me think through a safeguarding concern step by step — facts, risks, child${APOS}s voice, adult response and escalation.`
      },
      {
        text: 'Understand behaviour',
        prompt:
          'Help me understand behaviour in context — triggers, presentation, what the child may be communicating and how adults responded.'
      },
      {
        text: 'Prepare for supervision',
        prompt: `Help me prepare for supervision — key cases, recording gaps, risks, child${APOS}s voice and what I need from my manager.`
      },
      {
        text: 'Manager oversight',
        prompt:
          'Help me draft manager oversight thinking — facts, risks, actions taken, notifications and what review is needed.'
      },
      {
        text: 'Build an action plan',
        prompt:
          'Help me build a practical action plan from what I describe — clear steps, owners, timescales and how we will know progress for the child.'
      }
    ]
  },
  {
    id: 'evidence',
    label: 'Evidence',
    starters: [
      {
        text: 'Prepare for inspection',
        mode: 'Ofsted Lens',
        prompt:
          'Help me prepare inspection evidence thinking — what happened, impact on the child, adult actions and follow-up.'
      },
      {
        text: 'Regulation 44 support',
        mode: 'Reg 44 / Reg 45 Prep',
        prompt: `Help me prepare Regulation 44 thinking — themes, evidence, child${APOS}s experience and questions for the independent visitor.`
      },
      {
        text: 'Regulation 45 reflection',
        mode: 'Reg 44 / Reg 45 Prep',
        prompt: `Help me reflect for Regulation 45 — quality of care, child${APOS}s experience, practice strengths and improvement areas.`
      },
      {
        text: 'Review written practice',
        prompt:
          'Help me review written practice — clarity, child-centred wording, safeguarding boundaries and what could be stronger before I finalise.'
      }
    ]
  }
]

/** Flat primary starters — first chips shown before “More examples” on desktop. */
export const ORB_RESIDENTIAL_PRIMARY_STARTERS: ResidentialStarter[] = [
  {
    text: 'Daily record',
    mode: 'Record This Properly',
    prompt: `Help me write a daily record for today${APOS}s shift. I will share what happened — keep the child central and help me record observable facts clearly.`
  },
  {
    text: 'Incident reflection',
    prompt:
      'Help me reflect on an incident and prepare safer wording. I will describe what happened — support me with sequence, de-escalation, harm, notifications and follow-up.'
  },
  {
    text: 'Key-work summary',
    prompt: `Help me summarise key-work with the child${APOS}s voice, what was explored, agreements and next steps for adults.`
  },
  {
    text: 'Handover note',
    prompt:
      'Help me prepare a handover note for the next shift — key risks, presentation, health or medication, practical tasks and anything management should know.'
  },
  {
    text: 'Safeguarding reflection',
    mode: 'Safeguarding Thinking',
    prompt: `Help me think through a safeguarding concern step by step — facts, risks, child${APOS}s voice, adult response and escalation.`
  },
  {
    text: 'Prepare for supervision',
    prompt: `Help me prepare for supervision — key cases, recording gaps, risks, child${APOS}s voice and what I need from my manager.`
  }
]

/** Dictate station copy — single visible name (Dictate). */
export const ORB_RESIDENTIAL_DICTATE_COPY = {
  title: ORB_DICTATE_TITLE,
  subtitle: ORB_DICTATE_SUBTITLE,
  capturePrompt: ORB_DICTATE_CAPTURE_PROMPT,
  captureGuidance: ORB_DICTATE_CAPTURE_GUIDANCE,
  reviewHint: ORB_DICTATE_REVIEW_HINT,
  responsibility: ORB_DICTATE_RESPONSIBILITY
} as const

/** @deprecated Use ORB_RESIDENTIAL_DICTATE_COPY */
export const ORB_RESIDENTIAL_DICTATE_MAGIC_NOTES_COPY = ORB_RESIDENTIAL_DICTATE_COPY

/** Calm IndiCare Intelligence product language — one line per station, not over-branded. */
export const ORB_RESIDENTIAL_STATION_PRODUCT_COPY = {
  voice: 'Talk it through with ORB before you write.',
  dictate: ORB_DICTATE_SUBTITLE,
  write: 'Draft, review and finalise adult-led records with ORB.',
  documents: 'Use authorised documents as sources. ORB shows what it used.',
  templates: 'Choose a structure that keeps the child central.'
} as const

/** Mobile first-view starters — three most useful actions on phone. */
export const ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTERS: ResidentialStarter[] = ORB_RESIDENTIAL_PRIMARY_STARTERS.slice(
  0,
  ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT
)

/** Short billing value bullets for mobile default view. */
export const ORB_RESIDENTIAL_BILLING_VALUE_SUMMARY = [
  'Chat, Dictate and Voice support',
  'ORB Write documents and review',
  'Built-in safety and privacy prompts'
] as const

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

/** Resolve the prompt text for a residential starter chip. */
export function residentialStarterPrompt(starter: ResidentialStarter): string {
  return starter.prompt?.trim() || starter.text.trim()
}

/** User-facing product copy for ORB Residential — safe, regulatory-aware language. */
export const ORB_RESIDENTIAL_PRODUCT_NAME = 'ORB Residential'
export const ORB_RESIDENTIAL_TAGLINE = 'Powered by IndiCare'

/** Visible ORB Write studio review prompts — adult-led checks before finalising. */
export const ORB_WRITE_STUDIO_REVIEW_CHECKS = [
  'What am I missing?',
  `Is the child${APOS}s voice visible?`,
  'Have I separated observation from interpretation?',
  'Is the adult response clear?',
  'Is follow-up or management oversight needed?',
  'Does this wording preserve dignity?',
  'Is the record factual, balanced and child-centred?'
] as const

/** Action-led empty heading — child-centred, ORB-specific. */
export const ORB_RESIDENTIAL_EMPTY_HEADING_DESKTOP = ORB_CHAT_EMPTY_HEADING

export const ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING = ORB_CHAT_EMPTY_HEADING

export const ORB_RESIDENTIAL_MOBILE_EMPTY_SUBLINE = ORB_CHAT_EMPTY_SUBLINE

export const ORB_RESIDENTIAL_EMPTY_SUBLINE = ORB_CHAT_EMPTY_SUBLINE

/** Functional product line — hero / first-run only, not global chrome. */
export const ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE = 'IndiCare Intelligence'

/** Compact residential starters — primary pills on desktop / mobile subsets. */
export const ORB_RESIDENTIAL_MOBILE_EMPTY_STARTERS = ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTERS

export const ORB_RESIDENTIAL_EMPTY_STARTERS = ORB_RESIDENTIAL_PRIMARY_STARTERS

export const ORB_RESIDENTIAL_BILLING_VALUE_ITEMS = [
  'Chat with ORB',
  'Dictate rough notes into records',
  'Use Voice support',
  'Create documents in ORB Write',
  'Review wording before final approval',
  'Built-in safety and privacy prompts',
  'Residential childcare-specific guidance'
] as const

export const ORB_RESIDENTIAL_BILLING_TRUST_COPY =
  `ORB Residential does not replace your organisation${APOS}s recording system. It helps you prepare clearer, safer wording before you copy, export or save records where appropriate.`

/** Visible mode labels — internal mode ids may still use legacy names for API compatibility. */
export const ORB_RESIDENTIAL_MODE_DISPLAY: Partial<Record<StandaloneOrbMode, string>> = {
  'Ofsted Lens': 'Inspection evidence preparation',
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

/** Merge core and record-type-specific ORB Review checks for display. */
export function orbResidentialReviewChecks(recordTypeId: string): string[] {
  const specific = ORB_RECORD_TYPE_REVIEW_CHECKS[recordTypeId] ?? []
  const seen = new Set<string>()
  const merged: string[] = []
  for (const check of [...ORB_CORE_REVIEW_CHECKS, ...specific]) {
    const key = check.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(check)
  }
  return merged
}
