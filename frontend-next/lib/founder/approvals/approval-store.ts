import { approvalRepository } from '@/lib/founder/persistence'
import type { FounderApprovalRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { ApprovalItem, ApprovalStatus } from './approval-types'

let items: ApprovalItem[] = []

function recordFromItem(
  item: ApprovalItem,
  source: FounderApprovalRecord['source'] = 'approval-centre'
): FounderApprovalRecord {
  return {
    id: item.id,
    ...baseTimestamps('founder', source),
    status: item.status,
    item,
    approvedAt: item.approvedAt
  }
}

export async function hydrateApprovalsFromPersistence(): Promise<void> {
  try {
    const records = await approvalRepository.list()
    items = records.map((r) => r.item)
  } catch {
    /* keep local cache */
  }
}

export function getApprovalItems(): ApprovalItem[] {
  return [...items]
}

export function getPendingApprovals(): ApprovalItem[] {
  return items.filter((i) => i.status === 'pending' || i.status === 'needs-changes')
}

export function getApprovalItem(id: string): ApprovalItem | undefined {
  return items.find((i) => i.id === id)
}

export function addApprovalItem(
  item: Omit<ApprovalItem, 'id' | 'createdAt' | 'status'> & {
    id?: string
    status?: ApprovalStatus
    createdAt?: string
  }
): ApprovalItem {
  const stored: ApprovalItem = {
    ...item,
    id: item.id ?? nextId('approval'),
    status: item.status ?? 'pending',
    createdAt: item.createdAt ?? new Date().toISOString()
  }
  items = [stored, ...items]
  void approvalRepository.create(recordFromItem(stored, 'staff-team'), {
    actor: 'founder',
    auditSummary: `Approval queued: ${stored.title}`
  }).catch(() => undefined)
  return stored
}

export function updateApprovalStatus(id: string, status: ApprovalStatus): ApprovalItem | undefined {
  const index = items.findIndex((i) => i.id === id)
  if (index === -1) return undefined
  const updated: ApprovalItem = {
    ...items[index],
    status,
    approvedAt: status === 'approved' ? new Date().toISOString() : items[index].approvedAt
  }
  items = [...items.slice(0, index), updated, ...items.slice(index + 1)]
  void approvalRepository.update(id, {
    status,
    item: updated,
    approvedAt: updated.approvedAt
  }).catch(() => undefined)
  return updated
}
