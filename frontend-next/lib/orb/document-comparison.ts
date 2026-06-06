/**
 * Document comparison workflow — two-document diff via governed `/compare` route.
 * Reuses policy_comparison understanding mode; does not create a new AI brain.
 */

import type { OrbDocumentUnderstanding } from '@/lib/orb/standalone-client'
import type { OrbIntelligenceOutputView } from '@/components/orb-standalone/orb-intelligence-output'
import { ORB_DOCUMENT_BOUNDARY_LINES } from '@/lib/orb/document-intelligence'

export type OrbDocumentComparisonLens =
  | 'recent_changes'
  | 'action_plan'
  | 'easy_read_briefing'
  | 'safeguarding_implications'
  | 'inspection_readiness'
  | 'recording_requirements'
  | 'quality_standards_check'

export type OrbDocumentComparisonLensMeta = {
  id: OrbDocumentComparisonLens
  label: string
  description: string
  hero?: boolean
  outputType: 'comparison_summary' | 'action_plan' | 'staff_briefing' | 'easy_read_summary'
  recordTypeId?: string
}

export const ORB_DOCUMENT_COMPARISON_LENSES: OrbDocumentComparisonLensMeta[] = [
  {
    id: 'recent_changes',
    label: 'Recent changes',
    description: 'Summarise what changed between versions',
    hero: true,
    outputType: 'comparison_summary'
  },
  {
    id: 'action_plan',
    label: 'Action plan',
    description: 'New or changed actions with owners',
    hero: true,
    outputType: 'action_plan',
    recordTypeId: 'manager_summary'
  },
  {
    id: 'easy_read_briefing',
    label: 'Easy-read staff briefing',
    description: 'Plain-English briefing for the team',
    hero: true,
    outputType: 'easy_read_summary'
  },
  {
    id: 'safeguarding_implications',
    label: 'Safeguarding implications',
    description: 'Safeguarding meaning and escalation prompts',
    outputType: 'comparison_summary'
  },
  {
    id: 'inspection_readiness',
    label: 'Inspection readiness',
    description: 'Evidence and practice implications for inspection',
    outputType: 'comparison_summary'
  },
  {
    id: 'recording_requirements',
    label: 'Recording requirements',
    description: 'Child-centred recording implications',
    outputType: 'comparison_summary'
  },
  {
    id: 'quality_standards_check',
    label: 'Quality Standards check',
    description: 'Compare against residential quality standards thinking',
    outputType: 'comparison_summary'
  }
]

export type OrbDocumentComparisonInput = {
  documentATitle: string
  documentAText: string
  documentBTitle: string
  documentBText: string
  lens: OrbDocumentComparisonLens
}

const LENS_INSTRUCTIONS: Record<OrbDocumentComparisonLens, string> = {
  recent_changes:
    'Compare Document A (older or previous version) with Document B (newer or updated version). Summarise key changes, what stayed the same, and what this means in practice. Identify new or repeated concerns. Do not claim changes unless both texts support them.',
  action_plan:
    'Compare the two documents and produce a practical manager action plan: new actions, changed actions, owners, timescales and review points. Highlight repeated concerns that need sustained attention.',
  easy_read_briefing:
    'Compare the two documents and create an easy-read staff briefing: plain English, short sections, what changed, what staff should do differently, and what to watch for on shift.',
  safeguarding_implications:
    'Compare the two documents with a safeguarding lens. Note safeguarding implications, escalation prompts, and gaps — adult review required before acting.',
  inspection_readiness:
    'Compare the two documents for inspection readiness. Note evidence implications, practice changes, and areas to prepare — without predicting grades.',
  recording_requirements:
    'Compare the two documents for recording requirements. What must staff record differently? Child-centred recording implications only.',
  quality_standards_check:
    'Compare the two documents against residential quality standards thinking. Note alignment, gaps, and practice implications — based only on provided text.'
}

export function buildDocumentComparisonPayload(input: OrbDocumentComparisonInput): {
  title: string
  text: string
  question: string
  mode: 'policy_comparison'
} {
  const titleA = input.documentATitle.trim() || 'Document A'
  const titleB = input.documentBTitle.trim() || 'Document B'
  const textA = input.documentAText.trim()
  const textB = input.documentBText.trim()
  const lensMeta = ORB_DOCUMENT_COMPARISON_LENSES.find((l) => l.id === input.lens)

  const combined = [
    '=== DOCUMENT A (previous / baseline) ===',
    `Title: ${titleA}`,
    '',
    textA,
    '',
    '=== DOCUMENT B (new / comparison) ===',
    `Title: ${titleB}`,
    '',
    textB
  ].join('\n')

  const instruction = LENS_INSTRUCTIONS[input.lens]
  const question = [
    instruction,
    `Comparison lens: ${lensMeta?.label ?? input.lens}.`,
    'Based only on the two documents provided above.',
    'Mark output as draft — adult review required before sharing or relying on it.',
    'Do not invent content not present in either document.'
  ].join(' ')

  return {
    mode: 'policy_comparison',
    title: `Compare — ${titleA} vs ${titleB}`,
    text: combined,
    question
  }
}

export function documentComparisonDisplayTitle(
  lens: OrbDocumentComparisonLens,
  titleA: string,
  titleB: string
): string {
  const meta = ORB_DOCUMENT_COMPARISON_LENSES.find((l) => l.id === lens)
  const prefix = meta?.label ?? 'Document comparison'
  return `${prefix} — ${titleA.trim() || 'Document A'} vs ${titleB.trim() || 'Document B'}`
}

export function understandingToComparisonOutputView(
  understanding: OrbDocumentUnderstanding,
  opts: {
    lens: OrbDocumentComparisonLens
    displayTitle: string
    documentATitle: string
    documentBTitle: string
  }
): OrbIntelligenceOutputView {
  const lensMeta = ORB_DOCUMENT_COMPARISON_LENSES.find((l) => l.id === opts.lens)
  const sections: OrbIntelligenceOutputView['sections'] = []

  if (understanding.key_themes?.length) {
    sections.push({
      id: 'key-changes',
      title: 'Summary of key changes',
      body: understanding.key_themes.join('\n')
    })
  }

  if (understanding.practice_implications?.length) {
    sections.push({
      id: 'practice',
      title: 'What this means in practice',
      body: understanding.practice_implications
        .map((p) => (p.for_role ? `${p.implication} (${p.for_role})` : p.implication))
        .join('\n')
    })
  }

  if (understanding.action_plan?.actions?.length) {
    sections.push({
      id: 'actions',
      title: 'New or changed actions',
      body: understanding.action_plan.actions.map((a) => a.action).join('\n')
    })
  }

  const gaps =
    understanding.gaps_or_missing_information?.map((g) => g.gap) ??
    understanding.risks_or_concerns?.map((r) => r.risk) ??
    []

  if (understanding.risks_or_concerns?.length) {
    sections.push({
      id: 'risks',
      title: 'Risks / gaps to check',
      body: understanding.risks_or_concerns.map((r) => r.risk).join('\n')
    })
  }

  if (opts.lens === 'easy_read_briefing' || opts.lens === 'action_plan') {
    sections.push({
      id: 'briefing',
      title:
        opts.lens === 'action_plan' ? 'Suggested manager action plan' : 'Suggested staff briefing',
      body: understanding.plain_english_summary
    })
  }

  return {
    title: opts.displayTitle,
    summary: understanding.plain_english_summary,
    type: lensMeta?.outputType ?? 'comparison_summary',
    sections,
    actions: understanding.action_plan?.actions?.map((a) => ({
      action: a.action,
      priority: a.priority === 'urgent' || a.priority === 'high' || a.priority === 'low' ? a.priority : 'medium',
      why_it_matters: a.why_it_matters ?? undefined,
      suggested_owner_label: a.suggested_owner_label ?? undefined,
      timescale: a.timescale ?? undefined
    })),
    gaps,
    questions: understanding.suggested_questions?.map((q) => q.question),
    safety_notice: understanding.safety_notice ?? ORB_DOCUMENT_BOUNDARY_LINES.join(' '),
    boundaries: {
      notice: `${ORB_DOCUMENT_BOUNDARY_LINES.join(' ')} Draft — adult review required.`
    }
  }
}

export function comparisonOutputToMarkdown(view: OrbIntelligenceOutputView): string {
  const lines: string[] = [
    `# ${view.title}`,
    '',
    view.summary,
    '',
    `_${ORB_DOCUMENT_BOUNDARY_LINES.join(' ')}_`,
    '',
    '_Draft — adult review required before sharing._',
    ''
  ]
  for (const section of view.sections ?? []) {
    lines.push(`## ${section.title}`)
    lines.push(section.body)
    lines.push('')
  }
  if (view.actions?.length) {
    lines.push('## Actions')
    for (const action of view.actions) {
      lines.push(`- **${action.action}**${action.suggested_owner_label ? ` (${action.suggested_owner_label})` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

export function comparisonSavedOutputType(
  lens: OrbDocumentComparisonLens
): 'policy_comparison' | 'action_plan' | 'staff_briefing' {
  const meta = ORB_DOCUMENT_COMPARISON_LENSES.find((l) => l.id === lens)
  if (meta?.outputType === 'action_plan') return 'action_plan'
  if (meta?.outputType === 'easy_read_summary' || meta?.outputType === 'staff_briefing') {
    return 'staff_briefing'
  }
  return 'policy_comparison'
}
