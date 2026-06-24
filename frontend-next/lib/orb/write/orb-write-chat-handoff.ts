import {
  convertAnswerToWorkingDocument,
  openWorkingDocument
} from '@/lib/orb/template/orb-template-working-document-client'
import {
  openChatAnswerInOrbWrite,
  resolveChatRecordTemplate
} from '@/lib/orb/orb-chat-template-suggestions'
import { saveOrbWriteWorkingDocumentHandoff } from '@/lib/orb/write/orb-write-working-document-handoff'

export const ORB_WRITE_CHAT_OPENED_NOTICE =
  "I've opened this as a draft record in ORB Write."

export const ORB_WRITE_TEMPLATE_OPENED_NOTICE =
  "I've opened this template in ORB Write — review and edit before saving."

/** Chat → Use template → ORB Write with answer context. */
export async function openChatTemplateInWrite(
  content: string,
  opts?: { template_id?: string; onNavigate?: () => void }
): Promise<{ opened: boolean; template_id: string; notice: string }> {
  const result = await openChatAnswerInOrbWrite(content, opts)
  return {
    opened: result.opened,
    template_id: result.template_id,
    notice: result.opened ? ORB_WRITE_TEMPLATE_OPENED_NOTICE : 'Could not open template — try again.'
  }
}

/** Chat → Turn into record → best template draft in ORB Write. */
export async function turnChatAnswerIntoWorkingDocument(
  content: string,
  opts?: { onNavigate?: () => void }
): Promise<{ opened: boolean; template_id: string; notice: string }> {
  const resolved = await resolveChatRecordTemplate(content)
  const templateId = resolved.template_id
  if (!templateId) {
    return { opened: false, template_id: '', notice: 'No matching template found — try Template library in Write.' }
  }
  try {
    const doc = await convertAnswerToWorkingDocument(templateId, content, 'chat')
    saveOrbWriteWorkingDocumentHandoff(doc, {
      source_station: 'chat',
      source_label: `Draft record — ${doc.title}`
    })
    opts?.onNavigate?.()
    return { opened: true, template_id: templateId, notice: ORB_WRITE_CHAT_OPENED_NOTICE }
  } catch {
    return { opened: false, template_id: templateId, notice: 'Could not create draft — try again when connected.' }
  }
}

/** Open blank working document from template id (no answer context). */
export async function openTemplateWorkingDocumentInWrite(
  templateId: string,
  opts?: { context_text?: string; onNavigate?: () => void }
): Promise<boolean> {
  try {
    const doc = await openWorkingDocument(templateId, {
      source_station: 'write',
      context_text: opts?.context_text
    })
    saveOrbWriteWorkingDocumentHandoff(doc, {
      source_station: 'write',
      source_label: doc.title
    })
    opts?.onNavigate?.()
    return true
  } catch {
    return false
  }
}
