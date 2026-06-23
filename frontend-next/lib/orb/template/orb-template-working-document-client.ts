import { authFetch } from '@/lib/auth/api'

import {
  ORB_WORKING_DOCUMENT_API,
  type OrbTemplateWorkingDocument
} from '@/lib/orb/template/orb-template-working-document-types'

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export async function searchWorkingDocumentTemplates(
  query: string,
  opts?: { station?: string }
): Promise<{ query: string; station: string; templates: Array<Record<string, unknown>> }> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  const station = opts?.station ?? 'write'
  if (station) params.set('station', station)
  const payload = await authFetch(`${ORB_WORKING_DOCUMENT_API.search}?${params}`)
  return unwrap(payload)
}

export async function openWorkingDocument(
  templateId: string,
  opts?: {
    title?: string
    source_station?: string
    context_text?: string
    linked_home_document_ids?: string[]
  }
): Promise<OrbTemplateWorkingDocument> {
  const payload = await authFetch(ORB_WORKING_DOCUMENT_API.open(templateId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: opts?.title,
      source_station: opts?.source_station ?? 'write',
      context_text: opts?.context_text,
      linked_home_document_ids: opts?.linked_home_document_ids ?? []
    })
  })
  return unwrap(payload)
}

export async function convertAnswerToWorkingDocument(
  templateId: string,
  content: string,
  sourceStation = 'chat'
): Promise<OrbTemplateWorkingDocument> {
  const payload = await authFetch(ORB_WORKING_DOCUMENT_API.fromAnswer(templateId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, source_station: sourceStation })
  })
  return unwrap(payload)
}

export async function convertDictationToWorkingDocument(
  templateId: string,
  transcript: string
): Promise<OrbTemplateWorkingDocument> {
  const payload = await authFetch(ORB_WORKING_DOCUMENT_API.fromDictation(templateId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: transcript, source_station: 'dictate' })
  })
  return unwrap(payload)
}

export async function requestSectionOrbHelp(opts: {
  document_id: string
  section_id: string
  instruction: string
  current_body?: string
}): Promise<{
  suggested_body: string
  requires_adult_review: boolean
  review_reminder: string
}> {
  const payload = await authFetch(ORB_WORKING_DOCUMENT_API.sectionOrbHelp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts)
  })
  return unwrap(payload)
}

export async function saveWorkingDocumentToRecords(
  document: OrbTemplateWorkingDocument,
  workspaceSection = 'my_drafts'
): Promise<{ workspace_item_id: string; status: string }> {
  const payload = await authFetch(ORB_WORKING_DOCUMENT_API.save, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document, workspace_section: workspaceSection })
  })
  return unwrap(payload)
}

export async function listTemplateHomeDocuments(templateId: string): Promise<{
  documents: Array<{
    document_id: string
    title: string
    document_type: string
    citation_label: string
  }>
  notice?: string | null
  home_document_context_allowed: boolean
}> {
  const payload = await authFetch(ORB_WORKING_DOCUMENT_API.homeDocuments(templateId))
  return unwrap(payload)
}
