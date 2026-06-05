import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'
import {
  ORB_WRITE_REVIEW_STATEMENT,
  type OrbWriteDocument,
  type OrbWriteDocumentVersion
} from '@/lib/orb/write/orb-write-types'

const CONTENT_HANDOFF_KEY = 'orb-write-content-handoff-v1'

export type OrbWriteContentHandoffSource =
  | 'chat'
  | 'dictate'
  | 'template'
  | 'document'
  | 'saved_output'
  | 'unknown'

export type OrbWriteContentHandoffPayload = {
  content: string
  source_label: string
  source: OrbWriteContentHandoffSource
  record_type_id?: string
  title?: string
  timestamp: string
}

export function saveOrbWriteContentHandoff(payload: OrbWriteContentHandoffPayload): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CONTENT_HANDOFF_KEY, JSON.stringify(payload))
  } catch {
    /* session quota */
  }
}

export function loadOrbWriteContentHandoff(): OrbWriteContentHandoffPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CONTENT_HANDOFF_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OrbWriteContentHandoffPayload
  } catch {
    return null
  }
}

export function clearOrbWriteContentHandoff(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CONTENT_HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}

export function contentHandoffToOrbWriteDocument(
  payload: OrbWriteContentHandoffPayload
): OrbWriteDocument {
  const recordType = resolveOrbRecordingRecordType({
    recordTypeId: payload.record_type_id ?? 'general_dictation'
  })
  const plain = payload.content.trim()
  const body = plain.includes('<') ? plain : plain.replace(/\n/g, '<br/>')
  const now = payload.timestamp || new Date().toISOString()
  const version: OrbWriteDocumentVersion = {
    id: 'v_content_handoff',
    label: payload.source_label,
    body,
    created_at: now,
    event: 'restored'
  }
  return {
    id: `write_${Date.now()}`,
    title: payload.title?.trim() || recordType.label,
    record_type: recordType.dictate_note_type,
    record_type_id: recordType.id,
    record_type_label: recordType.label,
    document_headings: recordType.pdf_heading_order,
    body,
    transcript: plain.replace(/<[^>]+>/g, '\n'),
    template_id: recordType.studio_template_id ?? 'general',
    summary: '',
    quality_checks: {
      child_voice: 'review',
      safeguarding: 'review',
      manager_oversight: 'missing',
      impact: 'weak',
      recording_quality: 'needs_review'
    },
    accepted_suggestions: [],
    participants: [],
    segments: [],
    review_required_statement: ORB_WRITE_REVIEW_STATEMENT,
    created_at: now,
    updated_at: now,
    versions: [version],
    word_count: plain.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    is_draft: true,
    is_finalised: false
  }
}

/** Open ORB Write with governed text from chat, documents, templates or saved outputs. */
export function handoffTextToOrbWrite(opts: {
  content: string
  source: OrbWriteContentHandoffSource
  sourceLabel: string
  recordTypeId?: string
  title?: string
}): void {
  saveOrbWriteContentHandoff({
    content: opts.content,
    source: opts.source,
    source_label: opts.sourceLabel,
    record_type_id: opts.recordTypeId,
    title: opts.title,
    timestamp: new Date().toISOString()
  })
}
