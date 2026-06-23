/** Dictate station helpers for template working documents. */

import { convertDictationToWorkingDocument } from '@/lib/orb/template/orb-template-working-document-client'
import { searchOrbTemplateTaxonomy } from '@/lib/orb/orb-records-workspace-client'
import { saveOrbWriteWorkingDocumentHandoff } from '@/lib/orb/write/orb-write-working-document-handoff'

/** Suggest best template for a dictate transcript. */
export async function suggestDictateTemplate(transcript: string): Promise<{
  template_id?: string
  title?: string
}> {
  const hints = ['daily', 'incident', 'safeguarding', 'manager']
  for (const hint of hints) {
    if (!transcript.toLowerCase().includes(hint.replace('_', ' ')) && hint !== 'daily') continue
    try {
      const result = await searchOrbTemplateTaxonomy(hint, { station: 'dictate' })
      const first = result.templates?.[0]
      if (first) return { template_id: first.template_id, title: first.title }
    } catch {
      continue
    }
  }
  try {
    const result = await searchOrbTemplateTaxonomy('daily', { station: 'dictate' })
    const first = result.templates?.[0]
    if (first) return { template_id: first.template_id, title: first.title }
  } catch {
    /* best effort */
  }
  return {}
}

/** Structure dictate transcript into a working document and hand off to ORB Write. */
export async function structureDictateTranscriptToWorkingDocument(
  transcript: string,
  templateId: string
): Promise<boolean> {
  try {
    const doc = await convertDictationToWorkingDocument(templateId, transcript)
    saveOrbWriteWorkingDocumentHandoff(doc, {
      source_station: 'dictate',
      source_label: `From dictate — ${doc.title}`
    })
    return true
  } catch {
    return false
  }
}
