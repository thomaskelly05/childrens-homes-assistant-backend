import type { QualityProposal, QualityProposalStatus } from './quality-lab-types'
import { persistQualityProposal } from './persistence-bridge'
import {
  getQualityProposalsCache,
  prependQualityProposal,
  updateQualityProposalInCache
} from './quality-persistence-cache'
import { qualityProposalRepository } from '@/lib/founder/persistence'

let proposalCounter = 0

function nextProposalId(): string {
  proposalCounter += 1
  return `ql-proposal-${Date.now()}-${proposalCounter}`
}

export function getQualityProposals(): QualityProposal[] {
  return getQualityProposalsCache()
}

export function getOpenQualityProposals(): QualityProposal[] {
  return getQualityProposalsCache().filter((p) => p.status === 'draft' || p.status === 'approved')
}

export function getQualityProposal(id: string): QualityProposal | undefined {
  return getQualityProposalsCache().find((p) => p.id === id)
}

export function addQualityProposal(
  partial: Omit<QualityProposal, 'id' | 'createdAt' | 'status'> & {
    id?: string
    status?: QualityProposalStatus
    createdAt?: string
  }
): QualityProposal {
  const stored: QualityProposal = {
    ...partial,
    id: partial.id ?? nextProposalId(),
    status: partial.status ?? 'draft',
    createdAt: partial.createdAt ?? new Date().toISOString()
  }
  prependQualityProposal(stored)
  void persistQualityProposal(stored).catch(() => undefined)
  return stored
}

export function updateQualityProposalStatus(
  id: string,
  status: QualityProposalStatus,
  extras?: Partial<Pick<QualityProposal, 'linkedBuildBriefId' | 'linkedApprovalId'>>
): QualityProposal | undefined {
  const existing = getQualityProposal(id)
  if (!existing) return undefined
  const updated: QualityProposal = { ...existing, status, ...extras }
  updateQualityProposalInCache(id, updated)
  void qualityProposalRepository
    .updateProposalStatus(id, status, 'founder', {
      proposal: updated,
      linkedApprovalId: extras?.linkedApprovalId
    })
    .catch(() => undefined)
  return updated
}

export function resetQualityProposalStore(): void {
  proposalCounter = 0
}
