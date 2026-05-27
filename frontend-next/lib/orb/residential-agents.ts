import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export type ResidentialAgentId =
  | 'ask_orb'
  | 'safeguarding_thinking'
  | 'ofsted_lens'
  | 'record_properly'
  | 'therapeutic_reframe'
  | 'manager_copilot'
  | 'staff_coach'
  | 'reg44_reg45_prep'

export type ResidentialAgentDefinition = {
  id: ResidentialAgentId
  mode: StandaloneOrbMode
  title: string
  subtitle: string
  cognitionLabel: string
  placeholder: string
  atmosphereClass: string
  suggestions: string[]
}

/** Canonical residential cognition agents for standalone /orb. */
export const RESIDENTIAL_AGENTS: ResidentialAgentDefinition[] = [
  {
    id: 'ask_orb',
    mode: 'Ask ORB',
    title: 'Ask ORB',
    subtitle: 'General institutional intelligence',
    cognitionLabel: 'General cognition',
    placeholder: 'Ask anything',
    atmosphereClass: 'orb-atmosphere-ask',
    suggestions: [
      'Help me think through a difficult shift',
      'What should I prioritise on shift today?',
      'Explain this regulation in plain English'
    ]
  },
  {
    id: 'safeguarding_thinking',
    mode: 'Safeguarding Thinking',
    title: 'Safeguarding Thinking',
    subtitle: 'Structured reflection · evidence · escalation awareness',
    cognitionLabel: 'Safeguarding reflection',
    placeholder: 'Describe the concern and ORB will help you think it through',
    atmosphereClass: 'orb-atmosphere-safeguarding',
    suggestions: [
      'Help me separate facts from concerns',
      'What evidence might be missing?',
      'Does this need manager review now?'
    ]
  },
  {
    id: 'ofsted_lens',
    mode: 'Ofsted Lens',
    title: 'Ofsted Lens',
    subtitle: 'SCCIF · Quality Standards · inspection expectations',
    cognitionLabel: 'Ofsted Lens',
    placeholder: 'Ask about SCCIF, evidence, leadership or inspection',
    atmosphereClass: 'orb-atmosphere-ofsted',
    suggestions: [
      'What evidence would Ofsted expect here?',
      'How do I show child voice in records?',
      'What might leadership need to demonstrate?'
    ]
  },
  {
    id: 'record_properly',
    mode: 'Record This Properly',
    title: 'Record This Properly',
    subtitle: 'Professional recording · child-centred wording',
    cognitionLabel: 'Recording cognition',
    placeholder: 'Paste rough notes and ORB will help rewrite them',
    atmosphereClass: 'orb-atmosphere-recording',
    suggestions: [
      'Rewrite this professionally',
      'Help me record an incident calmly',
      'Make this wording more child-centred'
    ]
  },
  {
    id: 'therapeutic_reframe',
    mode: 'Therapeutic Reframe',
    title: 'Therapeutic Reframe',
    subtitle: 'Trauma-informed reflection · behaviour meaning · repair',
    cognitionLabel: 'Therapeutic reflection',
    placeholder: 'Describe the situation and ORB will help reframe it',
    atmosphereClass: 'orb-atmosphere-therapeutic',
    suggestions: [
      'Explore the behaviour meaning',
      'Help me think about repair after conflict',
      'What might this behaviour be communicating?'
    ]
  },
  {
    id: 'manager_copilot',
    mode: 'Manager Copilot',
    title: 'Manager Copilot',
    subtitle: 'Governance · oversight · audits · operational leadership',
    cognitionLabel: 'Leadership cognition',
    placeholder: 'Ask about oversight, evidence gaps, actions or management focus…',
    atmosphereClass: 'orb-atmosphere-manager',
    suggestions: [
      'What needs my attention this week?',
      'Where might evidence be thin?',
      'Help me prepare a governance briefing'
    ]
  },
  {
    id: 'staff_coach',
    mode: 'Staff Coach',
    title: 'Staff Coach',
    subtitle: 'Reflective practice · confidence · supervision preparation',
    cognitionLabel: 'Staff support cognition',
    placeholder: 'Reflect on practice, confidence or supervision preparation…',
    atmosphereClass: 'orb-atmosphere-staff',
    suggestions: [
      'Help me prepare for supervision',
      'Reflect after a difficult shift',
      'Build confidence for a challenging conversation'
    ]
  },
  {
    id: 'reg44_reg45_prep',
    mode: 'Reg 44 / Reg 45 Prep',
    title: 'Reg 44 / Reg 45 Prep',
    subtitle: 'Provider governance · evidence sufficiency · improvement planning',
    cognitionLabel: 'Governance cognition',
    placeholder: 'Ask about Reg 44 visits, Reg 45 improvement planning or provider evidence…',
    atmosphereClass: 'orb-atmosphere-governance',
    suggestions: [
      'What evidence would support a Reg 45 plan?',
      'Help me think about improvement priorities',
      'What might a Reg 44 visitor look for?'
    ]
  }
]

export const DEFAULT_PROJECT_TEMPLATES = [
  { name: 'Inspection Readiness', icon: '◎', color: '#a78bfa', description: 'Evidence, SCCIF and leadership oversight' },
  { name: 'Reflective Supervision', icon: '◈', color: '#fbbf24', description: 'Staff reflection and supervision prep' },
  { name: 'Placement Stability', icon: '◇', color: '#34d399', description: 'Transitions, relationships and plans' },
  { name: 'Team Development', icon: '▣', color: '#22d3ee', description: 'Workforce practice and culture' },
  { name: 'Regulation 45 Review', icon: '⬡', color: '#fb7185', description: 'Improvement planning and governance evidence' }
] as const

export function agentForMode(mode: string): ResidentialAgentDefinition | undefined {
  const key = mode.trim().toLowerCase()
  return (
    RESIDENTIAL_AGENTS.find((a) => a.mode.toLowerCase() === key) ||
    RESIDENTIAL_AGENTS.find((a) => a.title.toLowerCase() === key)
  )
}

export function agentById(id: ResidentialAgentId): ResidentialAgentDefinition {
  return RESIDENTIAL_AGENTS.find((a) => a.id === id) ?? RESIDENTIAL_AGENTS[0]
}

export function suggestionsForMode(mode: string): string[] {
  return agentForMode(mode)?.suggestions ?? RESIDENTIAL_AGENTS[0].suggestions
}

export function placeholderForMode(mode: string): string {
  return agentForMode(mode)?.placeholder ?? 'Ask anything'
}

export function atmosphereClassForMode(mode: string): string {
  return agentForMode(mode)?.atmosphereClass ?? 'orb-atmosphere-ask'
}

export function cognitionLabelForMode(mode: string): string {
  return agentForMode(mode)?.cognitionLabel ?? 'ORB cognition'
}

const AUTO_ROUTE_MODES = new Set(['ask orb', 'general cognition', ''])

const RESIDENTIAL_COGNITION_HINT =
  /\b(young person|child|children'?s home|looked after|medication|missing|safeguard|restraint|family time|ofsted|sccif|mar\b|therapeutic)\b/i

export type CognitionPillExplainability = {
  cognition_display_labels?: string[]
  active_brains?: string[]
  depth_topic?: string
  cognition_mode?: string
}

export type CognitionPillContext = {
  context_used?: {
    cognition_display_labels?: string[]
    active_brains?: string[]
    depth_topic?: string
    explainability?: CognitionPillExplainability
  }
  cognition_display_labels?: string[]
}

function labelsFromBrains(activeBrains: string[] | undefined, topicLabels: string[] | null): string[] | null {
  if (!activeBrains?.length) return topicLabels
  const brainLabels: string[] = []
  const map: Record<string, string> = {
    health_medication_cognition: 'Medication / health',
    missing_from_home_cognition: 'Missing from home',
    safeguarding_cognition: 'Safeguarding',
    recording_quality_cognition: 'Recording quality',
    governance_cognition: 'Leadership oversight',
    therapeutic_reflective_cognition: 'Therapeutic reflection',
    regulatory_cognition: 'Ofsted evidence',
    professional_curiosity_cognition: 'Professional curiosity',
    child_journey_cognition: 'Child experience'
  }
  for (const brain of activeBrains) {
    const label = map[brain]
    if (label && !brainLabels.includes(label)) brainLabels.push(label)
  }
  if (!brainLabels.length) return topicLabels
  if (topicLabels?.length) {
    const ordered = topicLabels.filter((label) => brainLabels.includes(label))
    const rest = brainLabels.filter((label) => !ordered.includes(label))
    return [...ordered, ...rest].slice(0, 5)
  }
  return brainLabels.slice(0, 5)
}

export function inferResidentialCognitionLabels(messageHint?: string): string[] | null {
  const text = (messageHint || '').trim().toLowerCase()
  if (!text) return null
  if (/\b(medication|mar\b|dose|pharmacy|missed)\b/.test(text)) {
    return ['Medication / health', 'Recording quality', 'Leadership oversight']
  }
  if (/\b(missing|abscond|run away|overnight)\b/.test(text)) {
    return ['Missing from home', 'Safeguarding', 'Recording quality', 'Ofsted evidence']
  }
  if (/\b(family time|therapeutic|smashed|cup|reframe|behaviour meaning)\b/.test(text)) {
    return ['Therapeutic reflection', 'Recording quality', 'Child experience']
  }
  if (
    /\b(three allegations|two missing|four restraint|not right|pattern|cumulative)\b/.test(text) ||
    (/\ballegation/.test(text) && /\bmissing/.test(text))
  ) {
    return ['Safeguarding', 'Professional curiosity', 'Leadership oversight', 'Ofsted evidence']
  }
  if (/\b(rewrite|rough note|sign off|record properly)\b/.test(text)) {
    return ['Recording quality', 'Therapeutic reflection']
  }
  if (RESIDENTIAL_COGNITION_HINT.test(text)) {
    return ['Residential practice']
  }
  return null
}

export function collectCognitionDisplayLabels(
  explainability?: CognitionPillExplainability,
  context?: CognitionPillContext,
  messageHint?: string
): string[] {
  const ctx = context?.context_used
  const fromContext =
    ctx?.cognition_display_labels ??
    context?.cognition_display_labels ??
    ctx?.explainability?.cognition_display_labels ??
    explainability?.cognition_display_labels ??
    []
  if (fromContext.length) {
    return fromContext.filter(Boolean) as string[]
  }
  const inferred = inferResidentialCognitionLabels(messageHint)
  if (inferred?.length) return inferred
  const brainDerived = labelsFromBrains(
    ctx?.active_brains ?? explainability?.active_brains,
    inferResidentialCognitionLabels(messageHint)
  )
  return brainDerived ?? []
}

function filterAutoRouteLabels(labels: string[], mode: string): string[] {
  const modeLower = mode.trim().toLowerCase()
  if (modeLower !== 'ask orb') {
    return labels
  }
  return labels.filter((label) => {
    const lower = label.trim().toLowerCase()
    return lower !== 'ofsted lens' && lower !== 'automatic routing'
  })
}

export function cognitionPillLabel(
  mode: string,
  explainability?: CognitionPillExplainability,
  messageHint?: string,
  context?: CognitionPillContext
): string {
  const modeLower = mode.trim().toLowerCase()
  const resolvedLabels = collectCognitionDisplayLabels(explainability, context, messageHint)
  const autoLabels = filterAutoRouteLabels(resolvedLabels, mode)
  if (autoLabels.length) {
    return autoLabels.join(' · ')
  }
  if (modeLower === 'ofsted lens') {
    return 'Ofsted Lens'
  }
  if (!AUTO_ROUTE_MODES.has(modeLower) && modeLower) {
    return cognitionLabelForMode(mode)
  }
  const depthTopic = String(explainability?.depth_topic || context?.context_used?.depth_topic || '').trim()
  if (depthTopic && depthTopic.toLowerCase() !== 'general intelligence') {
    return depthTopic.replace(/_/g, ' ')
  }
  const inferred = inferResidentialCognitionLabels(messageHint)
  if (inferred?.length) {
    return filterAutoRouteLabels(inferred, mode).join(' · ') || inferred.join(' · ')
  }
  if (messageHint && RESIDENTIAL_COGNITION_HINT.test(messageHint)) {
    return 'Residential practice'
  }
  return 'Automatic routing'
}

export function isAutomaticRoutingOnlyLabel(label: string): boolean {
  const trimmed = label.trim().toLowerCase()
  return trimmed === 'automatic routing' || trimmed === 'using · automatic routing'
}
