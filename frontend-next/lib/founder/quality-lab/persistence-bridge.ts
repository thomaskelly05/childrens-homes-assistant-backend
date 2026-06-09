import {
  expertReviewRepository,
  qualityProposalRepository,
  qualityResultRepository,
  qualityRunRepository
} from '@/lib/founder/persistence'
import type {
  FounderExpertReviewRecord,
  FounderQualityProposalRecord,
  FounderQualityResultRecord,
  FounderQualityRunRecord
} from '@/lib/founder/persistence/founder-persistence-types'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { ExpertReview, QualityProposal, QualityRun } from './quality-lab-types'
import {
  setExpertReviewsCache,
  setQualityProposalsCache,
  setQualityRunsCache,
  getExpertReviewsCache,
  getQualityProposalsCache,
  getQualityRunsCache
} from './quality-persistence-cache'

export async function hydrateQualityRunsFromPersistence(): Promise<void> {
  try {
    const records = await qualityRunRepository.list()
    setQualityRunsCache(records.map((r) => r.run))
  } catch {
    /* keep in-memory cache */
  }
}

export async function hydrateQualityProposalsFromPersistence(): Promise<void> {
  try {
    const records = await qualityProposalRepository.list()
    setQualityProposalsCache(records.map((r) => r.proposal))
  } catch {
    /* keep in-memory cache */
  }
}

export async function hydrateExpertReviewsFromPersistence(): Promise<void> {
  try {
    const records = await expertReviewRepository.list()
    setExpertReviewsCache(records.map((r) => r.review))
  } catch {
    /* keep in-memory cache */
  }
}

export async function persistQualityRun(run: QualityRun, actor = 'founder'): Promise<void> {
  const record: FounderQualityRunRecord = {
    id: run.id,
    ...baseTimestamps(actor, 'quality-lab'),
    status: run.status,
    run
  }
  await qualityRunRepository.persistRun(record, actor)
  for (const result of run.results) {
    const resultRecord: FounderQualityResultRecord = {
      id: nextId('ql-result'),
      ...baseTimestamps(actor, 'quality-lab'),
      qualityRunId: run.id,
      result
    }
    await qualityResultRepository.create(resultRecord, { actor, skipAudit: true })
  }
}

export async function persistQualityProposal(proposal: QualityProposal, actor = 'founder'): Promise<void> {
  const record: FounderQualityProposalRecord = {
    id: proposal.id,
    ...baseTimestamps(actor, 'quality-lab'),
    status: proposal.status,
    proposal,
    linkedApprovalId: proposal.linkedApprovalId,
    linkedActionId: undefined
  }
  await qualityProposalRepository.create(record, { actor })
}

export async function persistExpertReview(review: ExpertReview, actor = 'founder', qualityRunId?: string): Promise<void> {
  const record: FounderExpertReviewRecord = {
    id: review.id,
    ...baseTimestamps(actor, 'quality-lab'),
    review,
    qualityRunId
  }
  await expertReviewRepository.persistReview(record, actor)
}

export function getPersistedQualityRuns(): QualityRun[] {
  return getQualityRunsCache()
}

export function getPersistedQualityProposals(): QualityProposal[] {
  return getQualityProposalsCache()
}

export function getPersistedExpertReviews(): ExpertReview[] {
  return getExpertReviewsCache()
}
