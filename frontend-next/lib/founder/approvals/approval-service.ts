import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import { approvalRepository } from '@/lib/founder/persistence'
import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { getBuildBriefs, updateBuildBriefStatus } from '@/lib/founder/build-briefs/build-brief-store'
import { getContentDrafts, updateContentDraftStatus } from '@/lib/founder/content/content-draft-store'
import { getQualityProposals, updateQualityProposalStatus } from '@/lib/founder/quality-lab/quality-proposal-store'
import type { ApprovalItem, ApprovalType } from './approval-types'
import { syncPackOnApprovalDecision } from '@/lib/founder/evidence/evidence-store'
import {
  addApprovalItem,
  getApprovalItem,
  getApprovalItems,
  getPendingApprovals,
  hydrateApprovalsFromPersistence,
  updateApprovalStatus
} from './approval-store'

export function createApprovalItem(
  partial: Omit<ApprovalItem, 'id' | 'createdAt' | 'status' | 'safetyCheck'> & {
    safetyCheck?: string
  }
): ApprovalItem {
  const safety = checkFounderOutputSafety(partial.content)
  return addApprovalItem({
    ...partial,
    riskLevel: safety.safe ? partial.riskLevel : 'high',
    safetyCheck: partial.safetyCheck ?? (safety.issues.map((i) => i.message).join('; ') || 'Passed safety check')
  })
}

function syncLinkedEntitiesOnDecision(
  item: ApprovalItem,
  status: 'approved' | 'rejected' | 'needs-changes',
  founderNote?: string
): void {
  if (
    item.type === 'linkedin-post' ||
    item.type === 'email-draft' ||
    item.type === 'investor-update' ||
    item.type === 'relationship-message' ||
    item.type === 'provider-message'
  ) {
    const linkedDraft = getContentDrafts().find((d) => d.title === item.title)
    if (linkedDraft) {
      if (status === 'approved') updateContentDraftStatus(linkedDraft.id, 'approved')
      else if (status === 'rejected') updateContentDraftStatus(linkedDraft.id, 'rejected')
      else updateContentDraftStatus(linkedDraft.id, 'needs-review')
    }
  }

  if (item.type === 'technical-build-brief') {
    const brief = getBuildBriefs().find((b) => b.title === item.title)
    if (brief) {
      if (status === 'approved') updateBuildBriefStatus(brief.id, 'approved')
      else if (status === 'rejected') updateBuildBriefStatus(brief.id, 'dismissed')
    }
  }

  const proposal = getQualityProposals().find((p) => p.title === item.title)
  if (proposal) {
    if (status === 'approved') updateQualityProposalStatus(proposal.id, 'approved')
    else if (status === 'rejected') updateQualityProposalStatus(proposal.id, 'rejected')
  }

  if (item.type === 'evidence-pack') {
    void syncPackOnApprovalDecision(item.id, status).catch(() => undefined)
  }

  void appendAuditLog({
    actor: 'founder',
    eventType: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'needs_changes',
    entityType: 'approval',
    entityId: item.id,
    summary: `Approval ${status}${founderNote ? `: ${founderNote.slice(0, 120)}` : ''}`,
    status,
    metadata: founderNote ? { founderNote } : undefined
  }).catch(() => undefined)
}

export function approveItem(id: string, founderNote?: string): ApprovalItem | undefined {
  const item = getApprovalItem(id)
  if (!item) return undefined
  void approvalRepository.decide(id, 'approved', { founderNote, actor: 'founder' }).catch(() => {
    updateApprovalStatus(id, 'approved')
  })
  const updated = updateApprovalStatus(id, 'approved')
  if (updated) syncLinkedEntitiesOnDecision(updated, 'approved', founderNote)
  return updated
}

export function rejectApprovalItem(id: string, founderNote?: string): ApprovalItem | undefined {
  const item = getApprovalItem(id)
  if (!item) return undefined
  void approvalRepository.decide(id, 'rejected', { founderNote, actor: 'founder' }).catch(() => {
    updateApprovalStatus(id, 'rejected')
  })
  const updated = updateApprovalStatus(id, 'rejected')
  if (updated) syncLinkedEntitiesOnDecision(updated, 'rejected', founderNote)
  return updated
}

export function requestChanges(id: string, founderNote?: string): ApprovalItem | undefined {
  const item = getApprovalItem(id)
  if (!item) return undefined
  void approvalRepository.decide(id, 'needs-changes', { founderNote, actor: 'founder' }).catch(() => {
    updateApprovalStatus(id, 'needs-changes')
  })
  const updated = updateApprovalStatus(id, 'needs-changes')
  if (updated) syncLinkedEntitiesOnDecision(updated, 'needs-changes', founderNote)
  return updated
}

export function getApprovalTypeLabel(type: ApprovalType): string {
  const labels: Record<ApprovalType, string> = {
    'linkedin-post': 'LinkedIn Post',
    'email-draft': 'Email Draft',
    'investor-update': 'Investor Update',
    'provider-message': 'Provider Message',
    'technical-build-brief': 'Technical Build Brief',
    'evidence-pack': 'Evidence Pack',
    'public-claim': 'Public Claim',
    'product-action': 'Product Action',
    'relationship-message': 'Relationship Message'
  }
  return labels[type]
}

export { getApprovalItems, getPendingApprovals, getApprovalItem, hydrateApprovalsFromPersistence }
