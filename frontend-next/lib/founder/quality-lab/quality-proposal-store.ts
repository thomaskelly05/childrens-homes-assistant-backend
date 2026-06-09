import type { QualityProposal, QualityProposalStatus } from './quality-lab-types'

let proposals: QualityProposal[] = []
let proposalCounter = 0

function nextProposalId(): string {
  proposalCounter += 1
  return `ql-proposal-${Date.now()}-${proposalCounter}`
}

export function getQualityProposals(): QualityProposal[] {
  return [...proposals]
}

export function getOpenQualityProposals(): QualityProposal[] {
  return proposals.filter((p) => p.status === 'draft' || p.status === 'approved')
}

export function getQualityProposal(id: string): QualityProposal | undefined {
  return proposals.find((p) => p.id === id)
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
  proposals = [stored, ...proposals]
  return stored
}

export function updateQualityProposalStatus(
  id: string,
  status: QualityProposalStatus,
  extras?: Partial<Pick<QualityProposal, 'linkedBuildBriefId' | 'linkedApprovalId'>>
): QualityProposal | undefined {
  const index = proposals.findIndex((p) => p.id === id)
  if (index === -1) return undefined
  const updated: QualityProposal = { ...proposals[index], status, ...extras }
  proposals = [...proposals.slice(0, index), updated, ...proposals.slice(index + 1)]
  return updated
}

export function resetQualityProposalStore(): void {
  proposals = []
  proposalCounter = 0
}
