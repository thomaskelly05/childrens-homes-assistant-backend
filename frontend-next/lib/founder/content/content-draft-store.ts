import type { ContentChannel, ContentDraft, ContentDraftStatus } from './founder-content-types'

let drafts: ContentDraft[] = []
let draftCounter = 0

function nextDraftId(): string {
  draftCounter += 1
  return `draft-${Date.now()}-${draftCounter}`
}

export function getContentDrafts(): ContentDraft[] {
  return [...drafts]
}

export function getContentDraftsByChannel(channel: ContentChannel): ContentDraft[] {
  return drafts.filter((d) => d.channel === channel)
}

export function getContentDraftsByStatus(status: ContentDraftStatus): ContentDraft[] {
  return drafts.filter((d) => d.status === status)
}

export function getContentDraft(id: string): ContentDraft | undefined {
  return drafts.find((d) => d.id === id)
}

export function addContentDraft(
  draft: Omit<ContentDraft, 'id' | 'createdAt' | 'status'> & {
    id?: string
    status?: ContentDraftStatus
    createdAt?: string
  }
): ContentDraft {
  const stored: ContentDraft = {
    ...draft,
    id: draft.id ?? nextDraftId(),
    status: draft.status ?? 'needs-review',
    createdAt: draft.createdAt ?? new Date().toISOString()
  }
  drafts = [stored, ...drafts]
  return stored
}

export function updateContentDraftStatus(
  id: string,
  status: ContentDraftStatus
): ContentDraft | undefined {
  const index = drafts.findIndex((d) => d.id === id)
  if (index === -1) return undefined
  const updated: ContentDraft = {
    ...drafts[index],
    status,
    approvedAt: status === 'approved' ? new Date().toISOString() : drafts[index].approvedAt,
    postedAt: status === 'posted' ? new Date().toISOString() : drafts[index].postedAt
  }
  drafts = [...drafts.slice(0, index), updated, ...drafts.slice(index + 1)]
  return updated
}
