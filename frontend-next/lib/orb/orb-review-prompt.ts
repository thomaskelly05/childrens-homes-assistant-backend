export const ORB_REVIEW_THERAPEUTIC_PROMPTS = [
  'What might the young person have been communicating through their behaviour?',
  'What helped them feel safe?',
  'What language should staff avoid?',
  'What strengths or progress should be recognised?',
  'What would a trauma-informed response sound like?'
] as const

export const ORB_REVIEW_THERAPEUTIC_CHIPS = [
  { id: 'therapeutic', label: 'Make more therapeutic' },
  { id: 'child_centred', label: 'Make more child-centred' },
  { id: 'trauma_informed', label: 'Add trauma-informed wording' },
  { id: 'autism_aware', label: 'Add autism-aware wording' },
  { id: 'strengths_based', label: 'Add strengths-based wording' },
  { id: 'ofsted_lens', label: 'Add Ofsted lens' }
] as const

export type OrbReviewTherapeuticChipId = (typeof ORB_REVIEW_THERAPEUTIC_CHIPS)[number]['id']

export function buildOrbReviewPrompt(input: {
  text: string
  therapeuticContext?: string
  chips?: OrbReviewTherapeuticChipId[]
  professionalTone?: 'therapeutic' | 'compliance' | 'balanced'
}): string {
  const chips = input.chips ?? []
  const chipLabels = ORB_REVIEW_THERAPEUTIC_CHIPS.filter((c) => chips.includes(c.id)).map((c) => c.label)
  const toneLine =
    input.professionalTone === 'therapeutic'
      ? 'Prioritise therapeutic, trauma-informed and child-centred interpretation.'
      : input.professionalTone === 'compliance'
        ? 'Prioritise regulatory compliance, recording standards and inspection readiness.'
        : 'Balance therapeutic insight with safeguarding and regulatory clarity.'

  const sections = [
    'Review this written practice for a children\'s residential setting. Structure your response with clear sections:',
    '1. Professional summary',
    '2. Therapeutic interpretation',
    '3. Safeguarding considerations',
    '4. Staff reflection',
    '5. Follow-up actions',
    '',
    toneLine,
    'ORB supports professional judgement — adults must review and approve all wording before use in records.',
    chipLabels.length ? `Apply these lenses where relevant: ${chipLabels.join('; ')}.` : null,
    input.therapeuticContext?.trim()
      ? `Therapeutic context from the author:\n${input.therapeuticContext.trim()}`
      : null,
    '',
    'Text to review:',
    input.text.trim()
  ].filter(Boolean)

  return sections.join('\n')
}
