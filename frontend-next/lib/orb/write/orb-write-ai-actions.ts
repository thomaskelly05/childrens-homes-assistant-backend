import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'

export type OrbWriteAiAction = {
  id: string
  label: string
  mode: OrbDictateEditMode
  instruction: string
  group: 'quality' | 'safeguarding' | 'outputs' | 'converged'
}

/** Child-centred, professional ORB Write suggestions — routes through governed edit API. */
export const ORB_WRITE_AI_ACTIONS: OrbWriteAiAction[] = [
  {
    id: 'review_record',
    label: 'Review this record',
    mode: 'recording_quality_review',
    instruction:
      'Review this record for safeguarding, child voice, recording quality and professional tone — suggest improvements only',
    group: 'converged'
  },
  {
    id: 'record_properly',
    label: 'Record this properly',
    mode: 'professional_language',
    instruction:
      'Turn rough notes into a professional residential record with observable facts and child-centred language',
    group: 'converged'
  },
  {
    id: 'safeguarding_lens',
    label: 'Add safeguarding lens',
    mode: 'safeguarding_lens',
    instruction: 'Add safeguarding considerations and escalation prompts — adult reviews before applying',
    group: 'converged'
  },
  {
    id: 'ofsted_lens',
    label: 'Add Ofsted/inspection lens',
    mode: 'ofsted_ready',
    instruction: 'Review for inspection readiness without making regulatory judgements',
    group: 'converged'
  },
  {
    id: 'handover',
    label: 'Create handover',
    mode: 'handover_conversion',
    instruction: 'Turn this into a safe shift handover with priorities, risks and manager attention points',
    group: 'converged'
  },
  {
    id: 'manager_summary',
    label: 'Create manager summary',
    mode: 'manager_note',
    instruction: 'Create a concise manager summary suitable for oversight',
    group: 'converged'
  },
  {
    id: 'chronology',
    label: 'Create chronology entry',
    mode: 'chronology_conversion',
    instruction: 'Turn this into a chronology entry suitable for a safeguarding file',
    group: 'converged'
  },
  {
    id: 'action_plan',
    label: 'Create action plan',
    mode: 'action_plan',
    instruction: 'Create a practical action plan with owners and follow-up from this record',
    group: 'converged'
  },
  {
    id: 'missing',
    label: 'What am I missing?',
    mode: 'missing_information',
    instruction: 'What important information might be missing from this record?',
    group: 'converged'
  },
  {
    id: 'guidance_check',
    label: 'Check against selected guidance',
    mode: 'sccif_lens',
    instruction:
      'Check this record against residential guidance and quality standards — highlight gaps without regulatory judgements',
    group: 'converged'
  },
  {
    id: 'child_centred',
    label: 'Make more child-centred',
    mode: 'child_voice',
    instruction: 'Rewrite with a child-centred perspective while keeping facts accurate',
    group: 'quality'
  },
  {
    id: 'grammar',
    label: 'Improve grammar',
    mode: 'spelling_grammar',
    instruction: 'Improve grammar and clarity without changing meaning',
    group: 'quality'
  },
  {
    id: 'professional',
    label: 'More professional tone',
    mode: 'professional_language',
    instruction: 'Improve professional tone suitable for residential records',
    group: 'quality'
  },
  {
    id: 'safeguarding_gaps',
    label: 'Check safeguarding gaps',
    mode: 'safeguarding_lens',
    instruction: 'Identify safeguarding gaps and suggest additions — adult reviews before applying',
    group: 'safeguarding'
  },
  {
    id: 'ofsted_ready',
    label: 'Check Ofsted readiness',
    mode: 'ofsted_ready',
    instruction: 'Review for inspection readiness without making regulatory judgements',
    group: 'safeguarding'
  },
  {
    id: 'prepare_pdf',
    label: 'Prepare for PDF',
    mode: 'professional_language',
    instruction: 'Polish formatting and headings so this is ready to export as PDF',
    group: 'outputs'
  }
]

export const ORB_WRITE_AI_GROUPS: Array<{ id: OrbWriteAiAction['group']; title: string }> = [
  { id: 'converged', title: 'Practice workflows' },
  { id: 'quality', title: 'Improve quality' },
  { id: 'safeguarding', title: 'Safeguarding & inspection' },
  { id: 'outputs', title: 'Export & polish' }
]
