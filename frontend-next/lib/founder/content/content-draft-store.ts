import { contentRepository } from '@/lib/founder/persistence'
import type { FounderContentDraftRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { ContentChannel, ContentDraft, ContentDraftStatus } from './founder-content-types'

let drafts: ContentDraft[] = []

function recordFromDraft(
  draft: ContentDraft,
  source: FounderContentDraftRecord['source'] = 'brand-ambassador'
): FounderContentDraftRecord {
  return {
    id: draft.id,
    ...baseTimestamps('founder', source),
    status: draft.status,
    draft
  }
}

export async function hydrateContentFromPersistence(): Promise<void> {
  try {
    const records = await contentRepository.list()
    drafts = records.map((r) => r.draft)
  } catch {
    /* keep local cache */
  }
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
    id: draft.id ?? nextId('draft'),
    status: draft.status ?? 'needs-review',
    createdAt: draft.createdAt ?? new Date().toISOString()
  }
  drafts = [stored, ...drafts]
  void contentRepository.create(recordFromDraft(stored), {
    actor: 'founder',
    auditSummary: `Content draft created: ${stored.title}`
  }).catch(() => undefined)
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
  void contentRepository.update(id, {
    status,
    draft: updated,
    updatedAt: new Date().toISOString()
  } as Partial<FounderContentDraftRecord>, {
    actor: 'founder',
    auditSummary: `Content draft ${status}`,
    eventType: status === 'posted' ? 'posted' : 'status_changed'
  }).catch(() => undefined)
  return updated
}
