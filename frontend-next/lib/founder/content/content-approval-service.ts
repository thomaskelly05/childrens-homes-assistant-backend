import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { approveItem, rejectApprovalItem } from '@/lib/founder/approvals/approval-service'
import { getApprovalItems } from '@/lib/founder/approvals/approval-store'
import { updateContentDraftStatus, getContentDraft } from './content-draft-store'
import type { ContentDraftStatus } from './founder-content-types'

function findPendingApprovalByTitle(title: string) {
  return getApprovalItems().find((i) => i.title === title && (i.status === 'pending' || i.status === 'needs-changes'))
}

export function approveContentDraft(draftId: string): void {
  updateContentDraftStatus(draftId, 'approved')
  const draft = getContentDraft(draftId)
  if (draft) {
    const item = findPendingApprovalByTitle(draft.title)
    if (item) approveItem(item.id)
    void appendAuditLog({
      actor: 'founder',
      eventType: 'approved',
      entityType: 'content',
      entityId: draftId,
      summary: `Content draft approved: ${draft.title}`,
      status: 'approved'
    }).catch(() => undefined)
  }
}

export function rejectContentDraft(draftId: string): void {
  updateContentDraftStatus(draftId, 'rejected')
  const draft = getContentDraft(draftId)
  if (draft) {
    const item = findPendingApprovalByTitle(draft.title)
    if (item) rejectApprovalItem(item.id)
    void appendAuditLog({
      actor: 'founder',
      eventType: 'rejected',
      entityType: 'content',
      entityId: draftId,
      summary: `Content draft rejected: ${draft.title}`,
      status: 'rejected'
    }).catch(() => undefined)
  }
}

export function markContentDraftPosted(draftId: string): void {
  const draft = getContentDraft(draftId)
  if (draft?.status !== 'approved') {
    throw new Error('Only approved content can be marked as posted.')
  }
  updateContentDraftStatus(draftId, 'posted')
  void appendAuditLog({
    actor: 'founder',
    eventType: 'posted',
    entityType: 'content',
    entityId: draftId,
    summary: `Content marked posted (manual copy — no LinkedIn API): ${draft.title}`,
    status: 'posted'
  }).catch(() => undefined)
}

export function transitionContentStatus(draftId: string, status: ContentDraftStatus): void {
  if (status === 'approved') approveContentDraft(draftId)
  else if (status === 'rejected') rejectContentDraft(draftId)
  else if (status === 'posted') markContentDraftPosted(draftId)
  else updateContentDraftStatus(draftId, status)
}
