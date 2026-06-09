import type {
  FounderQualityProposalRecord,
  FounderQualityResultRecord,
  FounderQualityRunRecord
} from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class QualityRunRepository extends BaseFounderRepository<FounderQualityRunRecord> {
  entityType = 'quality_run' as const
  memory = { items: [] as FounderQualityRunRecord[], warned: false }
  protected noHardDelete = true

  async persistRun(record: FounderQualityRunRecord, actor = 'founder') {
    const saved = await this.create(record, { actor, auditSummary: `Quality run: ${record.run.title}` })
    await appendAuditLog({
      actor,
      eventType: 'run_completed',
      entityType: 'quality_run',
      entityId: record.id,
      summary: `Gold pack run — ${record.run.passCount}/${record.run.totalCount} passed`,
      status: record.status
    })
    return saved
  }
}

class QualityResultRepository extends BaseFounderRepository<FounderQualityResultRecord> {
  entityType = 'quality_result' as const
  memory = { items: [] as FounderQualityResultRecord[], warned: false }
  protected noHardDelete = true
}

class QualityProposalRepository extends BaseFounderRepository<FounderQualityProposalRecord> {
  entityType = 'quality_proposal' as const
  memory = { items: [] as FounderQualityProposalRecord[], warned: false }
  protected noHardDelete = true

  async updateProposalStatus(
    id: string,
    status: FounderQualityProposalRecord['status'],
    actor = 'founder',
    extra?: Partial<FounderQualityProposalRecord>
  ) {
    return this.updateStatus(id, status, extra, {
      actor,
      auditSummary: `Quality proposal ${status}`,
      eventType: 'status_changed'
    })
  }
}

export const qualityRunRepository = new QualityRunRepository()
export const qualityResultRepository = new QualityResultRepository()
export const qualityProposalRepository = new QualityProposalRepository()
