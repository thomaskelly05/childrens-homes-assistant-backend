import type { FounderExpertReviewRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class ExpertReviewRepository extends BaseFounderRepository<FounderExpertReviewRecord> {
  entityType = 'expert_review' as const
  memory = { items: [] as FounderExpertReviewRecord[], warned: false }
  protected noHardDelete = true

  async persistReview(record: FounderExpertReviewRecord, actor = 'founder') {
    const saved = await this.create(record, {
      actor,
      auditSummary: `Expert review for ${record.review.scenarioId}`
    })
    await appendAuditLog({
      actor,
      eventType: 'created',
      entityType: 'expert_review',
      entityId: record.id,
      summary: `Expert review submitted — ${record.review.scenarioId}`,
      linkedEntityId: record.qualityRunId,
      linkedEntityType: record.qualityRunId ? 'quality_run' : undefined
    })
    return saved
  }
}

export const expertReviewRepository = new ExpertReviewRepository()
