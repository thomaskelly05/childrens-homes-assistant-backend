import type { FounderSafetyReviewRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class SafetyReviewRepository extends BaseFounderRepository<FounderSafetyReviewRecord> {
  entityType = 'safety_review' as const
  memory = { items: [] as FounderSafetyReviewRecord[], warned: false }
  protected noHardDelete = true

  async persistReview(record: FounderSafetyReviewRecord, actor = 'founder') {
    const saved = await this.create(record, {
      actor,
      auditSummary: `Safety review ${record.status} for ${record.targetEntityType}`
    })
    await appendAuditLog({
      actor,
      eventType: 'safety_review',
      entityType: 'safety_review',
      entityId: record.id,
      summary: `Safety review ${record.status}`,
      status: record.status,
      linkedEntityId: record.targetEntityId,
      linkedEntityType: record.targetEntityType
    })
    return saved
  }
}

export const safetyReviewRepository = new SafetyReviewRepository()
