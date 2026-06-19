/**
 * Canonical ORB Residential mode registry — single frontend source of truth.
 * Backend mirror: routers/orb_standalone_routes.py STANDALONE_ORB_MODES
 */

export type OrbModeSafetyLevel = 'standard' | 'elevated' | 'safeguarding'

export type OrbModeId =
  | 'ask_orb'
  | 'safeguarding_thinking'
  | 'ofsted_lens'
  | 'record_this_properly'
  | 'therapeutic_reframe'
  | 'manager_copilot'
  | 'staff_coach'
  | 'reg_44_45_prep'
  | 'reflect_with_orb'
  | 'behaviour_support'
  | 'policy_explainer'
  | 'scenario_simulator'

/** Backend conversation `mode` string (display label sent to API). */
export type StandaloneOrbModeLabel =
  | 'Ask ORB'
  | 'Safeguarding Thinking'
  | 'Ofsted Lens'
  | 'Record This Properly'
  | 'Therapeutic Reframe'
  | 'Manager Copilot'
  | 'Staff Coach'
  | 'Reg 44 / Reg 45 Prep'
  | 'Reflect with ORB'
  | 'Behaviour Support'
  | 'Policy Explainer'
  | 'Scenario Simulator'

export type OrbModeDefinition = {
  id: OrbModeId
  /** Value sent to POST /orb/standalone/conversation */
  label: StandaloneOrbModeLabel
  description: string
  safetyLevel: OrbModeSafetyLevel
  /** Whether SSE streaming is allowed for this mode (server may still buffer when guardrails active). */
  canStream: boolean
  requiresSafeguardingCaution: boolean
  /** Short UI hint — not a promise of compliance or approval. */
  suggestedUiCopy: string
}

export const ORB_MODE_REGISTRY: readonly OrbModeDefinition[] = [
  {
    id: 'ask_orb',
    label: 'Ask ORB',
    description: 'General professional support for residential childcare practice.',
    safetyLevel: 'standard',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Ask ORB to think something through with you.'
  },
  {
    id: 'safeguarding_thinking',
    label: 'Safeguarding Thinking',
    description: 'Structured reflection on safeguarding concerns, escalation and follow-up.',
    safetyLevel: 'safeguarding',
    canStream: false,
    requiresSafeguardingCaution: true,
    suggestedUiCopy: 'Think through safeguarding carefully — follow local procedures and escalate where needed.'
  },
  {
    id: 'ofsted_lens',
    label: 'Ofsted Lens',
    description: 'Inspection evidence preparation — not a grade prediction or compliance guarantee.',
    safetyLevel: 'elevated',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Explore what evidence might support inspection preparation — adult review required.'
  },
  {
    id: 'record_this_properly',
    label: 'Record This Properly',
    description: 'Safer, clearer recording with observable facts and the child’s voice central.',
    safetyLevel: 'elevated',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Turn rough notes into clearer, child-centred wording — review before saving.'
  },
  {
    id: 'therapeutic_reframe',
    label: 'Therapeutic Reframe',
    description: 'Therapeutic reflection and dignity-preserving language.',
    safetyLevel: 'elevated',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Explore therapeutic wording — interpretation stays with the adult.'
  },
  {
    id: 'manager_copilot',
    label: 'Manager Copilot',
    description: 'Management oversight, briefing and follow-up thinking — not a decision-maker.',
    safetyLevel: 'elevated',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Support management reflection — you remain accountable for decisions.'
  },
  {
    id: 'staff_coach',
    label: 'Staff Coach',
    description: 'Staff development, supervision prep and reflective practice.',
    safetyLevel: 'standard',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Prepare for supervision or staff reflection — not a replacement for line management.'
  },
  {
    id: 'reg_44_45_prep',
    label: 'Reg 44 / Reg 45 Prep',
    description: 'Regulation 44 and 45 visit preparation — evidence support, not a grade prediction.',
    safetyLevel: 'elevated',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Prepare for Reg 44 or Reg 45 — supports evidence preparation only.'
  },
  {
    id: 'reflect_with_orb',
    label: 'Reflect with ORB',
    description: 'Open reflective practice with professional curiosity.',
    safetyLevel: 'standard',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Reflect on practice with ORB — you remain responsible for conclusions.'
  },
  {
    id: 'behaviour_support',
    label: 'Behaviour Support',
    description: 'Trauma-informed behaviour support thinking — no punitive labels.',
    safetyLevel: 'elevated',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Explore behaviour support ideas — avoid labels; keep the child central.'
  },
  {
    id: 'policy_explainer',
    label: 'Policy Explainer',
    description: 'Explain guidance and policy concepts — not legal advice.',
    safetyLevel: 'standard',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Clarify policy or guidance — follow your home’s approved policies.'
  },
  {
    id: 'scenario_simulator',
    label: 'Scenario Simulator',
    description: 'Practice scenarios for training and reflection — not real children or records.',
    safetyLevel: 'elevated',
    canStream: true,
    requiresSafeguardingCaution: false,
    suggestedUiCopy: 'Walk through a practice scenario — for learning, not live decision-making.'
  }
] as const

export const STANDALONE_ORB_MODES: readonly StandaloneOrbModeLabel[] = ORB_MODE_REGISTRY.map(
  (mode) => mode.label
)

export type StandaloneOrbMode = (typeof STANDALONE_ORB_MODES)[number]

const BY_ID = new Map(ORB_MODE_REGISTRY.map((mode) => [mode.id, mode]))
const BY_LABEL = new Map(ORB_MODE_REGISTRY.map((mode) => [mode.label, mode]))

export function getOrbModeById(id: OrbModeId): OrbModeDefinition {
  return BY_ID.get(id)!
}

export function getOrbModeByLabel(label: string): OrbModeDefinition | undefined {
  return BY_LABEL.get(label as StandaloneOrbModeLabel)
}

export function modeChipLabel(mode: string): string {
  const entry = BY_LABEL.get(mode as StandaloneOrbModeLabel)
  if (!entry) return mode
  switch (entry.id) {
    case 'safeguarding_thinking':
      return 'Safeguarding'
    case 'ofsted_lens':
      return 'Inspection'
    case 'record_this_properly':
      return 'Record'
    case 'therapeutic_reframe':
      return 'Therapeutic'
    case 'manager_copilot':
      return 'Manager'
    case 'staff_coach':
      return 'Staff'
    case 'reg_44_45_prep':
      return 'Reg 44/45'
    default:
      return entry.label
  }
}

export const PRIMARY_MODE_CHIP_ORDER: StandaloneOrbMode[] = [
  'Ask ORB',
  'Safeguarding Thinking',
  'Ofsted Lens',
  'Record This Properly',
  'Therapeutic Reframe',
  'Manager Copilot',
  'Staff Coach',
  'Reg 44 / Reg 45 Prep'
]

export function modeRequiresGuardedStream(mode: string): boolean {
  const entry = getOrbModeByLabel(mode)
  if (!entry) return false
  return entry.requiresSafeguardingCaution || entry.safetyLevel === 'safeguarding'
}
