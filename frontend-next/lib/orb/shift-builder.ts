/** Standalone ORB Shift Builder — focus modes and export helpers. */

import type { OrbBrainMetadata } from '@/lib/orb/orb-brain-metadata'
import type { OrbIntelligenceOutputView } from '@/components/orb-standalone/orb-intelligence-output'

export const ORB_SHIFT_BUILDER_BOUNDARY_LINES = [
  'Based only on the shift notes you provide.',
  'Review before handing over or saving.',
  'Standalone ORB does not access live care records.'
] as const

export type OrbShiftBuilderFocus =
  | 'full_shift_plan'
  | 'handover_only'
  | 'manager_review'
  | 'safeguarding_review'
  | 'recording_quality'
  | 'end_of_shift_reflection'
  | 'what_am_i_missing'

export const SHIFT_BUILDER_FOCUS_MODES: Array<{
  focus: OrbShiftBuilderFocus
  label: string
  description: string
}> = [
  {
    focus: 'full_shift_plan',
    label: 'Full shift plan',
    description: 'Priorities, risks, handover, reflection and gaps.'
  },
  {
    focus: 'handover_only',
    label: 'Handover only',
    description: 'Concise handover for the next shift.'
  },
  {
    focus: 'manager_review',
    label: 'Manager review',
    description: 'Oversight, evidence and manager attention.'
  },
  {
    focus: 'safeguarding_review',
    label: 'Safeguarding review',
    description: 'Facts, concerns and escalation prompts.'
  },
  {
    focus: 'recording_quality',
    label: 'Recording quality',
    description: 'Child-centred recording reminders.'
  },
  {
    focus: 'end_of_shift_reflection',
    label: 'End-of-shift reflection',
    description: 'Reflective close and learning points.'
  },
  {
    focus: 'what_am_i_missing',
    label: 'What am I missing?',
    description: 'Evidence gaps before you sign off.'
  }
]

export const SHIFT_BUILDER_CONTEXT_TAGS: Array<{ id: string; label: string }> = [
  { id: 'evening_shift', label: 'Evening shift' },
  { id: 'night_shift', label: 'Night shift' },
  { id: 'wake_up', label: 'Wake-up / morning' },
  { id: 'education', label: 'Education / school' },
  { id: 'contact', label: 'Family contact' },
  { id: 'community', label: 'Community / off-site' },
  { id: 'health', label: 'Health / medication' },
  { id: 'behaviour', label: 'Behaviour / crisis' },
  { id: 'safeguarding', label: 'Safeguarding concern' },
  { id: 'new_placement', label: 'New placement / admission' }
]

export type OrbShiftBuilderSection = {
  id: string
  heading: string
  body: string
  items?: string[]
}

export type OrbShiftBuilderResult = {
  title: string
  focus: OrbShiftBuilderFocus
  summary: string
  sections: OrbShiftBuilderSection[]
  checklist?: string[]
  risks_or_gaps?: string[]
  suggested_next_actions?: Array<{ action: string; label: string }>
  answer?: string
  standalone?: boolean
  os_records_accessed?: boolean
  live_record_access?: boolean
  brain_metadata?: OrbBrainMetadata | Record<string, unknown>
  guardrails?: string[]
}

export function shiftBuilderDisplayTitle(focus: OrbShiftBuilderFocus, custom?: string): string {
  if (custom?.trim()) return custom.trim()
  const mode = SHIFT_BUILDER_FOCUS_MODES.find((m) => m.focus === focus)
  return mode ? `Shift Builder — ${mode.label}` : 'Shift Builder'
}

export function formatShiftBuilderMarkdown(result: OrbShiftBuilderResult, title?: string): string {
  const lines: string[] = [
    `# ${title || result.title}`,
    '',
    ...ORB_SHIFT_BUILDER_BOUNDARY_LINES.map((line) => `> ${line}`),
    '',
    result.summary ? `${result.summary}\n` : ''
  ]
  for (const section of result.sections) {
    lines.push(`## ${section.heading}`, '', section.body, '')
    if (section.items?.length) {
      for (const item of section.items) lines.push(`- ${item}`)
      lines.push('')
    }
  }
  if (result.checklist?.length) {
    lines.push('## Checklist', '')
    for (const item of result.checklist) lines.push(`- [ ] ${item}`)
    lines.push('')
  }
  if (result.risks_or_gaps?.length) {
    lines.push('## Risks / gaps', '')
    for (const item of result.risks_or_gaps) lines.push(`- ${item}`)
    lines.push('')
  }
  lines.push('---', '_ORB Residential — Powered by IndiCare Intelligence. Based only on notes you provided._')
  return lines.join('\n').trim()
}

export function shiftBuilderToOutputView(
  result: OrbShiftBuilderResult,
  displayTitle: string
): OrbIntelligenceOutputView {
  return {
    title: displayTitle,
    summary: result.summary,
    type: 'shift_builder',
    sections: result.sections.map((section) => ({
      id: section.id,
      title: section.heading,
      body: section.body
    })),
    gaps: result.risks_or_gaps,
    risks: result.risks_or_gaps,
    key_points: result.checklist,
    boundaries: { notice: ORB_SHIFT_BUILDER_BOUNDARY_LINES.join(' ') }
  }
}
