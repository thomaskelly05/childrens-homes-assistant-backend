export type OrbWorkspaceMode =
  | 'general'
  | 'reflective'
  | 'safeguarding'
  | 'ofsted'
  | 'recording'
  | 'manager'

export type OrbContextSignal = {
  id: string
  type:
    | 'safeguarding'
    | 'evidence_gap'
    | 'therapeutic'
    | 'regulation'
    | 'emotional_climate'
    | 'oversight'
  title: string
  summary: string
  severity?: 'low' | 'moderate' | 'high'
}

export const ORB_PREMIUM_WORKSPACE_MODES: Array<{
  id: OrbWorkspaceMode
  label: string
  description: string
}> = [
  {
    id: 'general',
    label: 'Ask ORB',
    description: 'General intelligence with residential cognition available when needed.',
  },
  {
    id: 'reflective',
    label: 'Reflect',
    description: 'Reflective supervision-style therapeutic support.',
  },
  {
    id: 'safeguarding',
    label: 'Safeguarding Thinking',
    description: 'Evidence-aware safeguarding reflection and escalation support.',
  },
  {
    id: 'ofsted',
    label: 'Ofsted Lens',
    description: 'SCCIF, regulations and evidence expectation cognition.',
  },
  {
    id: 'recording',
    label: 'Record Properly',
    description: 'Child-centred recording and chronology-aware writing support.',
  },
  {
    id: 'manager',
    label: 'Manager Copilot',
    description: 'Leadership oversight, reflection and governance support.',
  },
]

export const ORB_CONTEXT_DOCK_SECTIONS = [
  {
    id: 'safeguarding',
    label: 'Safeguarding Lens',
  },
  {
    id: 'evidence',
    label: 'Evidence & Confidence',
  },
  {
    id: 'therapeutic',
    label: 'Therapeutic Framing',
  },
  {
    id: 'regulatory',
    label: 'Regulations & SCCIF',
  },
  {
    id: 'reflection',
    label: 'Reflective Questions',
  },
  {
    id: 'climate',
    label: 'Emotional Climate',
  },
]

export const ORB_COMMAND_PALETTE_ACTIONS = [
  'Start new reflective chat',
  'Rewrite a record professionally',
  'Open Ofsted lens',
  'Create supervision reflection',
  'Summarise chronology themes',
  'Generate safeguarding prompts',
  'Search regulations',
  'Create action plan',
  'Open emotional climate overview',
  'Switch to general intelligence mode',
]

export const OS_AMBIENT_ORB_BEHAVIOUR = {
  default_state: 'collapsed',
  philosophy: 'quiet_until_needed',
  behaviours: [
    'Subtle floating presence in OS.',
    'Expand only when cognition is contextually useful.',
    'Avoid interrupting operational workflows.',
    'Provide calm guidance instead of alert overload.',
    'Fade back into ambient mode after interaction.',
  ],
  contextual_triggers: [
    'Weak safeguarding wording detected.',
    'Missing evidence identified.',
    'Repeated incident patterns emerging.',
    'Potential therapeutic reframe available.',
    'Ofsted-relevant evidence gap identified.',
  ],
}

export const ORB_PREMIUM_UI_PRINCIPLES = [
  'Whitespace-first interface architecture.',
  'Calm emotionally regulating interaction design.',
  'Intelligence appears contextually, not constantly.',
  'Operational sharpness without visual overload.',
  'Accessibility-first interaction patterns.',
  'Residential cognition layered over general intelligence.',
  'ChatGPT-grade simplicity with institutional cognition underneath.',
]
