import type { ExpertReview, QualityProposal, QualityRun } from './quality-lab-types'

let runs: QualityRun[] = []
let proposals: QualityProposal[] = []
let reviews: ExpertReview[] = []

export function getQualityRunsCache(): QualityRun[] {
  return [...runs]
}

export function setQualityRunsCache(next: QualityRun[]): void {
  runs = [...next]
}

export function prependQualityRun(run: QualityRun): void {
  runs = [run, ...runs.filter((r) => r.id !== run.id)]
}

export function getQualityProposalsCache(): QualityProposal[] {
  return [...proposals]
}

export function setQualityProposalsCache(next: QualityProposal[]): void {
  proposals = [...next]
}

export function prependQualityProposal(proposal: QualityProposal): void {
  proposals = [proposal, ...proposals.filter((p) => p.id !== proposal.id)]
}

export function updateQualityProposalInCache(id: string, patch: Partial<QualityProposal>): void {
  proposals = proposals.map((p) => (p.id === id ? { ...p, ...patch } : p))
}

export function getExpertReviewsCache(): ExpertReview[] {
  return [...reviews]
}

export function setExpertReviewsCache(next: ExpertReview[]): void {
  reviews = [...next]
}

export function prependExpertReview(review: ExpertReview): void {
  reviews = [review, ...reviews]
}
