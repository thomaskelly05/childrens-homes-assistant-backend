/**
 * Writing style prompts for ORB recording templates and ORB Write.
 * Extends canonical recording framework — not a duplicate template system.
 */

import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'

export type OrbTemplateWritingStyleId =
  | 'balanced'
  | 'concise'
  | 'therapeutic'
  | 'inspection_ready'
  | 'manager_summary'
  | 'easy_read_briefing'
  | 'child_centred'
  | 'factual'
  | 'professional'
  | 'safeguarding_aware'
  | 'ofsted_ready'

export type OrbTemplateWritingStyle = {
  id: OrbTemplateWritingStyleId
  label: string
  chipLabel: string
  description: string
  editMode?: OrbDictateEditMode
  instruction?: string
  surfaces: Array<'templates' | 'orb_write'>
}

/** Chips shown on Templates page — "ORB will help you write this in a…" */
export const ORB_TEMPLATE_WRITING_STYLE_CHIPS: OrbTemplateWritingStyle[] = [
  {
    id: 'child_centred',
    label: 'Child-centred',
    chipLabel: 'Child-centred',
    description: 'Child voice, impact and perspective visible in the record',
    editMode: 'child_voice',
    instruction: 'Rewrite with a child-centred perspective while keeping facts accurate',
    surfaces: ['templates', 'orb_write']
  },
  {
    id: 'therapeutic',
    label: 'Therapeutic',
    chipLabel: 'Therapeutic',
    description: 'Trauma-informed, emotionally literate, non-blaming language',
    editMode: 'therapeutic_rewrite',
    instruction:
      'Rewrite with therapeutic, trauma-informed language — behaviour as communication, strengths-based, non-blaming',
    surfaces: ['templates', 'orb_write']
  },
  {
    id: 'factual',
    label: 'Factual',
    chipLabel: 'Factual',
    description: 'Observable facts before interpretation',
    editMode: 'factual_tone',
    instruction: 'Use neutral, observable facts — record what was seen and heard before interpretation',
    surfaces: ['templates', 'orb_write']
  },
  {
    id: 'professional',
    label: 'Professional',
    chipLabel: 'Professional',
    description: 'Concise professional residential wording',
    editMode: 'professional_language',
    instruction: 'Improve professional tone suitable for residential records',
    surfaces: ['templates', 'orb_write']
  },
  {
    id: 'safeguarding_aware',
    label: 'Safeguarding-aware',
    chipLabel: 'Safeguarding-aware',
    description: 'Safeguarding meaning and escalation prompts',
    editMode: 'safeguarding_lens',
    instruction: 'Add safeguarding considerations and escalation prompts — adult reviews before applying',
    surfaces: ['templates', 'orb_write']
  },
  {
    id: 'ofsted_ready',
    label: 'Inspection evidence support',
    chipLabel: 'Inspection evidence support',
    description: 'inspection evidence preparation without regulatory judgements',
    editMode: 'ofsted_ready',
    instruction: 'Review for Inspection evidence preparation without making regulatory judgements',
    surfaces: ['templates', 'orb_write']
  },
  {
    id: 'concise',
    label: 'Concise',
    chipLabel: 'Concise',
    description: 'Shorter, clear professional summary',
    editMode: 'concise_summary',
    instruction: 'Make this more concise while keeping essential facts and child voice',
    surfaces: ['templates', 'orb_write']
  }
]

/** Adult-selectable styles inside ORB Write side panel */
export const ORB_WRITE_WRITING_STYLE_OPTIONS: OrbTemplateWritingStyle[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    chipLabel: 'Balanced',
    description: 'Professional, child-centred and factual — default residential tone',
    surfaces: ['orb_write']
  },
  ...ORB_TEMPLATE_WRITING_STYLE_CHIPS.filter((s) => s.id !== 'concise'),
  {
    id: 'inspection_ready',
    label: 'inspection evidence preparation',
    chipLabel: 'inspection evidence preparation',
    description: 'Evidence-focused, impact clear, audit-ready structure',
    editMode: 'ofsted_ready',
    instruction: 'Polish for inspection evidence — impact on child clear, structure audit-ready',
    surfaces: ['orb_write']
  },
  {
    id: 'manager_summary',
    label: 'Manager summary',
    chipLabel: 'Manager summary',
    description: 'Concise oversight summary with actions and accountability',
    editMode: 'manager_note',
    instruction: 'Create a concise manager summary suitable for oversight',
    surfaces: ['orb_write']
  },
  {
    id: 'easy_read_briefing',
    label: 'Easy-read briefing',
    chipLabel: 'Easy-read briefing',
    description: 'Plain-English briefing for staff handover or team meeting',
    editMode: 'parent_friendly',
    instruction: 'Turn this into a plain-English staff briefing — short sentences, practical steps',
    surfaces: ['orb_write']
  }
]

export const ORB_SPELLING_GRAMMAR_REMINDER =
  'Before finalising, ORB will help check spelling, grammar, names, times and dates.'

export function writingStyleById(id: OrbTemplateWritingStyleId): OrbTemplateWritingStyle | undefined {
  return (
    ORB_WRITE_WRITING_STYLE_OPTIONS.find((s) => s.id === id) ??
    ORB_TEMPLATE_WRITING_STYLE_CHIPS.find((s) => s.id === id)
  )
}

export function templateWritingStylesForSurface(surface: 'templates' | 'orb_write'): OrbTemplateWritingStyle[] {
  if (surface === 'templates') return ORB_TEMPLATE_WRITING_STYLE_CHIPS
  return ORB_WRITE_WRITING_STYLE_OPTIONS
}
