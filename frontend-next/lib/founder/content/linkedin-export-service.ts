import { getContentDraft } from './content-draft-store'

/**
 * Copy-for-LinkedIn helper. No auto-posting.
 * TODO: LinkedIn API posting can be added only after OAuth and explicit final approval.
 */
export function copyDraftForLinkedIn(draftId: string): string {
  const draft = getContentDraft(draftId)
  if (!draft) throw new Error('Draft not found')
  if (draft.channel !== 'linkedin' && draft.channel !== 'founder-update') {
    throw new Error('Draft is not suitable for LinkedIn export')
  }
  return draft.body
}

export function formatLinkedInExport(draftId: string): { text: string; copiedAt: string } {
  return {
    text: copyDraftForLinkedIn(draftId),
    copiedAt: new Date().toISOString()
  }
}

/** Future connector — disabled until OAuth exists */
export const LINKEDIN_CONNECTOR_ENABLED = false

export function postToLinkedInDisabledNotice(): string {
  return 'Post to LinkedIn requires explicit approval and OAuth setup. Copy the draft manually for now.'
}
