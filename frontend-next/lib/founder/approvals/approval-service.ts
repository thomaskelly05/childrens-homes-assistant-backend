import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import type { ApprovalItem, ApprovalType } from './approval-types'
import { addApprovalItem, getApprovalItem, updateApprovalStatus } from './approval-store'

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

export function approveItem(id: string): ApprovalItem | undefined {
  return updateApprovalStatus(id, 'approved')
}

export function rejectApprovalItem(id: string): ApprovalItem | undefined {
  return updateApprovalStatus(id, 'rejected')
}

export function requestChanges(id: string): ApprovalItem | undefined {
  return updateApprovalStatus(id, 'needs-changes')
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
    'product-action': 'Product Action'
  }
  return labels[type]
}

export { getApprovalItems, getPendingApprovals, getApprovalItem } from './approval-store'
