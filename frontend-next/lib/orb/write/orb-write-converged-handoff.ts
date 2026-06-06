/**
 * Unified ORB Write handoff — routes all surfaces through governed session-storage payloads.
 * Reuses existing handoff modules; does not create a parallel document system.
 */

import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import type { OrbSavedOutputRecord } from '@/lib/orb/standalone-client'
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

export function convergedTemplateHandoff(recordType: OrbRecordingRecordType): void {
  saveOrbWriteTemplateHandoff(recordType)
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
    dictate: 'dictate',
    document_intelligence: 'document',
    document_analysis: 'document',
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

export function handoffSavedOutputToOrbWrite(record: OrbSavedOutputRecord): void {
  convergedHandoffToOrbWrite(buildSavedOutputWriteHandoff(record))
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
