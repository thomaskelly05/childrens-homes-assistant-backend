/** Adapters for standalone ORB saved outputs — metadata, export and re-run hints. */

import type { OrbBrainMetadata } from '@/lib/orb/orb-brain-metadata'
import {
  buildOutputReviewMetadata,
  displayLabelForSavedOutput,
  type OrbOutputReviewStatusLabel
} from '@/lib/orb/orb-output-types'
import {
  normalizeOrbBrainMetadata,
  orbBrainIndicatorLabel,
  ORB_BRAIN_ID,
  ORB_BRAIN_POWERED_BY,
  ORB_BRAIN_PRODUCT
} from '@/lib/orb/orb-brain-metadata'
import type { OrbSavedOutputRecord, OrbSavedOutputSummary, OrbSavedOutputType } from '@/lib/orb/standalone-client'
import type { OrbDocumentLens } from '@/lib/orb/document-intelligence'
import type { OrbShiftBuilderFocus } from '@/lib/orb/shift-builder'

export const ORB_SAVED_OUTPUT_BOUNDARY_LINES = [
  'Records and drafts are standalone ORB artefacts.',
  'Adult review required before sharing or relying on them.',
  'ORB Residential does not access live care records.'
] as const

export type OrbSavedOutputSourceFeature =
  | 'chat'
  | 'dictate'
  | 'voice'
  | 'document_intelligence'
  | 'document_comparison'
  | 'policy_card'
  | 'shift_builder'
  | 'action_engine'
  | 'voice_transcript'
  | 'voice_transcript'
  | 'agent'
  | 'deep_research'
  | 'manual'

export type OrbSavedOutputSection = {
  id?: string
  title?: string
  body?: string
}

export type OrbSavedOutputSaveExtras = {
  source_feature?: OrbSavedOutputSourceFeature
  brain_metadata?: OrbBrainMetadata | Record<string, unknown> | null
  sections?: OrbSavedOutputSection[]
  source_text?: string
  lens?: string
  focus?: string
  action_id?: string
  recording_media?: Record<string, unknown>
  dictate_capture_source?: string
  template_id?: string
  working_document?: string
  people_to_confirm?: unknown[]
  dictate_source_note?: string
}

export type OrbSavedOutputRerunKind =
  | 'document_lens'
  | 'policy_card'
  | 'shift_focus'
  | 'action_engine'
  | 'voice_transcript'

export type OrbSavedOutputRerunState = {
  kind: OrbSavedOutputRerunKind
  label: string
  available: boolean
  reason?: string
  lens?: OrbDocumentLens
  focus?: OrbShiftBuilderFocus
  sourceText?: string
  actionId?: string
}

const SOURCE_FEATURE_LABELS: Record<string, string> = {
  chat: 'Chat',
  dictate: 'Dictate',
  voice: 'Voice',
  document_intelligence: 'Documents',
  document_comparison: 'Document comparison',
  policy_card: 'Policy Card',
  shift_builder: 'Shift Builder',
  action_engine: 'Action Engine',
  agent: 'Agent',
  deep_research: 'Deep research',
  manual: 'Manual save',
  document_analysis: 'Document analysis'
}

const TYPE_LABELS: Record<string, string> = {
  action_plan: 'Action plan',
  document_review: 'Document review',
  manager_briefing: 'Manager briefing',
  staff_briefing: 'Staff briefing',
  deep_research: 'Deep research',
  policy_comparison: 'Policy comparison',
  ofsted_evidence_map: 'Ofsted evidence',
  recording_rewrite: 'Recording rewrite',
  safeguarding_reflection: 'Safeguarding',
  therapeutic_practice: 'Therapeutic',
  general_research: 'Research',
  intelligence_note: 'Note',
  checklist: 'Checklist',
  supervision_guide: 'Supervision',
  voice_transcript: 'Voice transcript'
}

export function savedOutputSourceLabel(record: OrbSavedOutputRecord): string {
  const meta = record.metadata || {}
  const feature = String(meta.source_feature || record.created_from || 'manual')
  return SOURCE_FEATURE_LABELS[feature] || feature.replace(/_/g, ' ')
}

export function savedOutputPlatformLabel(
  record: OrbSavedOutputRecord | OrbSavedOutputSummary
): string | null {
  const meta = 'metadata' in record ? record.metadata : undefined
  if (!meta || typeof meta !== 'object' || !('source_platform' in meta)) return null
  const platform = String(meta.source_platform || '')
  if (!platform) return null
  if (platform === 'ios') return 'iPhone app'
  if (platform === 'web') return 'Web'
  return platform.replace(/_/g, ' ')
}

export function savedOutputTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, ' ')
}

export function extractSavedOutputBrainMetadata(
  record: OrbSavedOutputRecord
): OrbBrainMetadata | null {
  const meta = record.metadata || {}
  const fromMeta = normalizeOrbBrainMetadata(
    meta.brain_metadata && typeof meta.brain_metadata === 'object'
      ? (meta.brain_metadata as Record<string, unknown>)
      : null
  )
  if (fromMeta) return fromMeta
  return normalizeOrbBrainMetadata(record.intelligence_output as Record<string, unknown> | undefined)
}

export function buildVoiceSavedOutputBrainMetadata(): OrbBrainMetadata {
  return {
    surface: 'orb_residential',
    product: ORB_BRAIN_PRODUCT,
    powered_by: ORB_BRAIN_POWERED_BY,
    brain: ORB_BRAIN_ID,
    feature: 'voice',
    standalone: true,
    os_records_accessed: false,
    live_record_access: false
  }
}

/** User-facing review lifecycle label — canonical via orb-output-types. */
export function savedOutputReviewStatusLabel(record: {
  status?: string | null
  metadata?: Record<string, unknown> | null
}): OrbOutputReviewStatusLabel {
  return displayLabelForSavedOutput(record.status, record.metadata)
}

export function buildSavedOutputMetadata(
  extras: OrbSavedOutputSaveExtras
): Record<string, unknown> {
  const brain =
    extras.brain_metadata && typeof extras.brain_metadata === 'object'
      ? normalizeOrbBrainMetadata(extras.brain_metadata as Record<string, unknown>) ||
        extras.brain_metadata
      : null
  const metadata: Record<string, unknown> = {
    source_feature: extras.source_feature,
    source_platform: 'web',
    standalone: true,
    os_records_accessed: false,
    live_record_access: false,
    ...buildOutputReviewMetadata('needs_review')
  }
  if (brain) metadata.brain_metadata = brain
  if (extras.sections?.length) metadata.sections = extras.sections
  if (extras.source_text?.trim()) metadata.source_text = extras.source_text.trim()
  if (extras.lens) metadata.lens = extras.lens
  if (extras.focus) metadata.focus = extras.focus
  if (extras.action_id) metadata.action_id = extras.action_id
  if (extras.recording_media) metadata.recording_media = extras.recording_media
  if (extras.dictate_capture_source) metadata.dictate_capture_source = extras.dictate_capture_source
  if (extras.template_id) metadata.template_id = extras.template_id
  if (extras.working_document?.trim()) metadata.working_document = extras.working_document.trim()
  if (extras.people_to_confirm?.length) metadata.people_to_confirm = extras.people_to_confirm
  if (extras.dictate_source_note) metadata.dictate_source_note = extras.dictate_source_note
  return metadata
}

export function buildSavedOutputCreateBody(input: {
  title: string
  type: OrbSavedOutputType
  summary?: string
  content_markdown?: string
  intelligence_output?: Record<string, unknown>
  sources?: OrbSavedOutputRecord['sources']
  citations?: OrbSavedOutputRecord['citations']
  quality?: Record<string, unknown>
  project_id?: string
  project_name?: string
  tags?: string[]
  created_from?: string
  created_from_id?: string
  extras?: OrbSavedOutputSaveExtras
}) {
  const metadata = buildSavedOutputMetadata(input.extras || {})
  const brain = metadata.brain_metadata as OrbBrainMetadata | undefined
  const intelligence = {
    ...(input.intelligence_output || {}),
    standalone_only: true,
    os_linked: false,
    care_record_access: false,
    ...(brain
      ? {
          brain_metadata: brain,
          brain: ORB_BRAIN_ID,
          product: ORB_BRAIN_PRODUCT
        }
      : {})
  }
  return {
    title: input.title,
    type: input.type,
    project_id: input.project_id,
    project_name: input.project_name,
    tags: input.tags,
    summary: input.summary,
    content_markdown: input.content_markdown,
    intelligence_output: intelligence,
    sources: input.sources,
    citations: input.citations,
    quality: input.quality,
    created_from: input.created_from,
    created_from_id: input.created_from_id,
    metadata
  }
}

export function resolveSavedOutputRerun(record: OrbSavedOutputRecord): OrbSavedOutputRerunState | null {
  const meta = record.metadata || {}
  const sourceFeature = String(meta.source_feature || '')
  const sourceText = String(meta.source_text || '').trim()
  const lens = String(meta.lens || '')
  const focus = String(meta.focus || '')
  const actionId = String(meta.action_id || '')

  if (sourceFeature === 'policy_card' || lens === 'policy_card') {
    return {
      kind: 'policy_card',
      label: 'Re-run Policy Card',
      available: Boolean(sourceText),
      reason: sourceText ? undefined : 'Original policy text was not saved with this output.',
      lens: 'policy_card',
      sourceText: sourceText || undefined
    }
  }

  if (
    sourceFeature === 'document_intelligence' ||
    record.created_from === 'document_analysis' ||
    Boolean(lens && lens !== 'policy_card')
  ) {
    const docLens = (lens || 'explain') as OrbDocumentLens
    return {
      kind: 'document_lens',
      label: `Re-run ${lens ? lens.replace(/_/g, ' ') : 'document lens'}`,
      available: Boolean(sourceText),
      reason: sourceText ? undefined : 'Original document text was not saved with this output.',
      lens: docLens,
      sourceText: sourceText || undefined
    }
  }

  if (sourceFeature === 'shift_builder' || record.created_from === 'shift_builder') {
    const shiftFocus = (focus || 'full_shift_plan') as OrbShiftBuilderFocus
    return {
      kind: 'shift_focus',
      label: 'Re-run Shift Builder focus',
      available: Boolean(sourceText),
      reason: sourceText ? undefined : 'Original shift notes were not saved with this output.',
      focus: shiftFocus,
      sourceText: sourceText || undefined
    }
  }

  if (sourceFeature === 'action_engine' || actionId) {
    return {
      kind: 'action_engine',
      label: 'Re-run action',
      available: Boolean(sourceText || record.content_markdown),
      reason:
        sourceText || record.content_markdown
          ? undefined
          : 'Original source message was not saved with this output.',
      actionId: actionId || undefined,
      sourceText: sourceText || record.content_markdown || undefined
    }
  }

  if (
    sourceFeature === 'voice' ||
    record.created_from === 'voice' ||
    record.type === 'voice_transcript'
  ) {
    return {
      kind: 'voice_transcript',
      label: 'Re-run Voice',
      available: false,
      reason:
        'Voice transcripts cannot be re-run from Records & Drafts. Start a new Voice session to speak again.',
      sourceText: sourceText || undefined
    }
  }

  return null
}

export function buildAskOrbAboutSavedOutputPrompt(record: OrbSavedOutputRecord): string {
  const excerpt = (record.summary || record.content_markdown || '').slice(0, 2400)
  return (
    `Ask ORB about this saved output (${record.title}):\n\n` +
    `${excerpt}\n\n` +
    `What should I improve or do next?`
  )
}

export function buildSavedOutputExportMarkdown(record: OrbSavedOutputRecord): string {
  const meta = record.metadata || {}
  const sourceFeature = savedOutputSourceLabel(record)
  const brain = extractSavedOutputBrainMetadata(record)
  const brainLine = brain ? orbBrainIndicatorLabel(brain) : null
  const reviewLabel = savedOutputReviewStatusLabel(record)
  const lines = [
    `# ${record.title}`,
    '',
    `**Type:** ${savedOutputTypeLabel(record.type)}`,
    `**Review status:** ${reviewLabel}`,
    `**Source:** ${sourceFeature}`,
    ''
  ]
  if (record.summary) {
    lines.push(record.summary, '')
  }
  if (record.content_markdown) {
    lines.push(record.content_markdown, '')
  }
  lines.push('---', '')
  if (brainLine) {
    lines.push(`**ORB brain:** ${brainLine}`, '')
  }
  for (const line of ORB_SAVED_OUTPUT_BOUNDARY_LINES) {
    lines.push(`> ${line}`)
  }
  if (meta.artefact_notice && typeof meta.artefact_notice === 'string') {
    lines.push('', `> ${meta.artefact_notice}`)
  }
  return lines.join('\n').trim()
}

export function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.md') ? filename : `${filename}.md`
  anchor.click()
  URL.revokeObjectURL(url)
}
