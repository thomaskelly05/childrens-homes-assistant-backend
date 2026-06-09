import type { ApprovalItem, ApprovalStatus } from './approval-types'

let items: ApprovalItem[] = []
let itemCounter = 0

function nextItemId(): string {
  itemCounter += 1
  return `approval-${Date.now()}-${itemCounter}`
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
    id: item.id ?? nextItemId(),
    status: item.status ?? 'pending',
    createdAt: item.createdAt ?? new Date().toISOString()
  }
  items = [stored, ...items]
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
  return updated
}
