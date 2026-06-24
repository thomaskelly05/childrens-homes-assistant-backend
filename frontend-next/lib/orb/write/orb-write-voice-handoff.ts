import { convertDictationToWorkingDocument } from '@/lib/orb/template/orb-template-working-document-client'
import { saveWorkingDocumentToRecords } from '@/lib/orb/template/orb-template-working-document-client'
import { saveOrbWriteWorkingDocumentHandoff } from '@/lib/orb/write/orb-write-working-document-handoff'

export const ORB_VOICE_DRAFT_SAVED_NOTICE =
  'Draft saved to My Drafts — adult review required before finalising.'

/** Voice conversation → create draft working document → save to Records → optional Write handoff. */
export async function createVoiceDraftWorkingDocument(
  transcript: string,
  templateId: string,
  opts?: { openInWrite?: boolean; onNavigate?: () => void }
): Promise<{ saved: boolean; workspace_item_id?: string; notice: string }> {
  try {
    const doc = await convertDictationToWorkingDocument(templateId, transcript)
    const withVoice = { ...doc, source_station: 'voice' as const, status: 'draft' as const }
    const result = await saveWorkingDocumentToRecords(withVoice)
    if (opts?.openInWrite) {
      saveOrbWriteWorkingDocumentHandoff(
        { ...withVoice, metadata: { ...withVoice.metadata, workspace_item_id: result.workspace_item_id } },
        { source_station: 'voice', source_label: `Voice draft — ${withVoice.title}` }
      )
      opts.onNavigate?.()
    }
    return {
      saved: true,
      workspace_item_id: result.workspace_item_id,
      notice: ORB_VOICE_DRAFT_SAVED_NOTICE
    }
  } catch {
    return { saved: false, notice: 'Could not save draft — try again when connected.' }
  }
}
