export type OrbSkillCategory =
  | 'safeguarding'
  | 'inspection'
  | 'recording'
  | 'management'
  | 'documents'
  | 'reflection'

export type OrbSkillDefinition = {
  id: string
  title: string
  description: string
  category: OrbSkillCategory
  categoryLabel: string
  starterPrompt: string
  mode?: string
}

export const ORB_SKILL_CATEGORY_LABELS: Record<OrbSkillCategory, string> = {
  safeguarding: 'Safeguarding',
  inspection: 'Inspection',
  recording: 'Recording',
  management: 'Management',
  documents: 'Documents',
  reflection: 'Reflection'
}

export const ORB_RESIDENTIAL_SKILLS: OrbSkillDefinition[] = [
  {
    id: 'safeguarding-reviewer',
    title: 'Safeguarding reviewer',
    description: 'Review concerns, escalation and recording proportionality.',
    category: 'safeguarding',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.safeguarding,
    starterPrompt:
      'Act as a safeguarding reviewer. I will describe a concern. Help me check facts, risks, escalation and recording without deciding outcomes.\n\n',
    mode: 'Safeguarding Thinking'
  },
  {
    id: 'inspection evidence preparation',
    title: 'Inspection evidence preparation',
    description: 'Inspection themes, evidence and manager narrative.',
    category: 'inspection',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.inspection,
    starterPrompt: 'Help me prepare for Inspection evidence preparation. I will share context about practice and records.\n\n',
    mode: 'Ofsted Lens'
  },
  {
    id: 'incident-reviewer',
    title: 'Incident reviewer',
    description: 'Structured review of incidents with child voice and chronology.',
    category: 'safeguarding',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.safeguarding,
    starterPrompt:
      'Review this incident for safeguarding, child voice, chronology gaps and objective wording. I will paste details below:\n\n',
    mode: 'Safeguarding Thinking'
  },
  {
    id: 'handover-writer',
    title: 'Handover writer',
    description: 'Clear handover with risks, actions and follow-up.',
    category: 'recording',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.recording,
    starterPrompt: 'Help me write a professional handover for the next shift. Key information:\n\n'
  },
  {
    id: 'risk-assessment-helper',
    title: 'Risk assessment helper',
    description: 'Risk wording, mitigations and review prompts.',
    category: 'management',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.management,
    starterPrompt: 'Help me draft or review a risk assessment for a child in residential care.\n\n'
  },
  {
    id: 'supervision-reflector',
    title: 'Supervision reflector',
    description: 'Supervision themes, learning and accountability.',
    category: 'reflection',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.reflection,
    starterPrompt: 'Help me reflect on supervision themes and professional accountability.\n\n',
    mode: 'Staff Coach'
  },
  {
    id: 'policy-analyser',
    title: 'Policy / document analyser',
    description: 'Summarise policies, guidance and inspection letters.',
    category: 'documents',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.documents,
    starterPrompt:
      'Analyse this policy or guidance document for summary, compliance gaps and questions to ask. Document text:\n\n'
  },
  {
    id: 'template-builder',
    title: 'Template builder',
    description: 'Draft templates for recording, plans and briefings.',
    category: 'recording',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.recording,
    starterPrompt: 'Help me build a reusable template for residential childcare recording.\n\n'
  },
  {
    id: 'reflective-coach',
    title: 'Reflective practice coach',
    description: 'Structured reflection without replacing supervision.',
    category: 'reflection',
    categoryLabel: ORB_SKILL_CATEGORY_LABELS.reflection,
    starterPrompt: 'Coach me through reflective practice on a situation I will describe.\n\n',
    mode: 'Staff Coach'
  }
]
