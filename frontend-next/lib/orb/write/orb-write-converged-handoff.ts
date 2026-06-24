/**
 * Unified ORB Write handoff — routes all surfaces through governed session-storage payloads.
 * Reuses existing handoff modules; does not create a parallel document system.
 */

import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import type { OrbSavedOutputRecord } from '@/lib/orb/standalone-client'
import { resolveChatRecordTemplate } from '@/lib/orb/orb-chat-template-suggestions'
import { convertAnswerToWorkingDocument } from '@/lib/orb/template/orb-template-working-document-client'
import { handoffSavedOutputRecordToOrbWrite } from '@/lib/orb/write/orb-write-working-document-reopen'
import { buildSavedOutputExportMarkdown } from '@/lib/orb/orb-saved-output-adapters'
import {
  handoffTextToOrbWrite,
  saveOrbWriteContentHandoff,
  type OrbWriteContentHandoffPayload,
  type OrbWriteContentHandoffSource
} from '@/lib/orb/write/orb-write-content-handoff'
import { saveOrbWriteHandoff, type OrbWriteHandoffPayload } from '@/lib/orb/write/orb-write-handoff'
import {
  saveOrbWriteTemplateHandoff,
  type OrbWriteTemplateHandoffPayload
} from '@/lib/orb/write/orb-write-template-handoff'
import { saveOrbWriteWorkingDocumentHandoff } from '@/lib/orb/write/orb-write-working-document-handoff'

export type OrbWriteConvergedHandoffInput = {
  source: OrbWriteContentHandoffSource
  sourceLabel: string
  title?: string
  content?: string
  recordTypeId?: string
  suggestedOutputType?: string
  documentId?: string
  guidanceId?: string
  timestamp?: string
}

export type OrbWriteConvergedHandoffKind = 'content' | 'dictate_session' | 'template'

export function convergedHandoffToOrbWrite(input: OrbWriteConvergedHandoffInput): void {
  const text = input.content?.trim()
  if (!text) return
  handoffTextToOrbWrite({
    content: text,
    source: input.source,
    sourceLabel: input.sourceLabel,
    recordTypeId: input.recordTypeId ?? input.suggestedOutputType,
    title: input.title
  })
}

export function convergedDictateSessionHandoff(payload: OrbWriteHandoffPayload): void {
  saveOrbWriteHandoff(payload)
}

export function convergedTemplateHandoff(
  recordType: OrbRecordingRecordType,
  opts?: { transcript?: string; professionalNote?: string; structuredBody?: string }
): void {
  saveOrbWriteTemplateHandoff(recordType, opts)
}

export function buildSavedOutputWriteHandoff(
  record: OrbSavedOutputRecord
): OrbWriteConvergedHandoffInput {
  const meta = record.metadata || {}
  const content =
    record.content_markdown?.trim() ||
    record.summary?.trim() ||
    buildSavedOutputExportMarkdown(record)
  const sourceFeature = String(meta.source_feature || record.created_from || 'saved_output')
  const sourceMap: Record<string, OrbWriteContentHandoffSource> = {
    chat: 'chat',
    voice: 'voice',
    dictate: 'dictate',
    document_intelligence: 'document',
    document_analysis: 'document',
    document_comparison: 'document',
    policy_change_summary: 'document',
    template: 'template',
    saved_output: 'saved_output'
  }
  const source = sourceMap[sourceFeature] ?? 'saved_output'
  return {
    source,
    sourceLabel: `Saved output — ${record.title}`,
    title: record.title,
    content,
    recordTypeId: typeof meta.record_type_id === 'string' ? meta.record_type_id : undefined,
    suggestedOutputType: typeof meta.suggested_output_type === 'string' ? meta.suggested_output_type : undefined,
    documentId: typeof meta.document_id === 'string' ? meta.document_id : undefined,
    guidanceId: typeof meta.guidance_id === 'string' ? meta.guidance_id : undefined,
    timestamp: record.created_at
  }
}

async function handoffSavedOutputAsWorkingDocument(record: OrbSavedOutputRecord): Promise<boolean> {
  const content =
    record.content_markdown?.trim() ||
    record.summary?.trim() ||
    buildSavedOutputExportMarkdown(record)
  if (!content) return false

  const meta = record.metadata || {}
  const templateId =
    (typeof meta.template_id === 'string' && meta.template_id) ||
    (await resolveChatRecordTemplate(content)).template_id ||
    'daily_record'

  try {
    const doc = await convertAnswerToWorkingDocument(templateId, content, 'records')
    saveOrbWriteWorkingDocumentHandoff(doc, {
      source_station: 'records',
      source_label: `Reopened from Records & Drafts — ${record.title}`
    })
    return true
  } catch {
    return false
  }
}

export async function handoffSavedOutputToOrbWrite(record: OrbSavedOutputRecord): Promise<boolean> {
  if (handoffSavedOutputRecordToOrbWrite(record)) return true
  if (await handoffSavedOutputAsWorkingDocument(record)) return true
  convergedHandoffToOrbWrite(buildSavedOutputWriteHandoff(record))
  return true
}

export function peekOrbWriteContentHandoff(): OrbWriteContentHandoffPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('orb-write-content-handoff-v1')
    if (!raw) return null
    return JSON.parse(raw) as OrbWriteContentHandoffPayload
  } catch {
    return null
  }
}

export {
  saveOrbWriteContentHandoff,
  handoffTextToOrbWrite,
  type OrbWriteContentHandoffPayload,
  type OrbWriteContentHandoffSource,
  type OrbWriteHandoffPayload,
  type OrbWriteTemplateHandoffPayload
}
