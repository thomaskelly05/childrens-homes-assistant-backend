import type { FounderOperatingLoopRunRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class OperatingLoopRepository extends BaseFounderRepository<FounderOperatingLoopRunRecord> {
  entityType = 'operating_loop_run' as const
  memory = { items: [] as FounderOperatingLoopRunRecord[], warned: false }

  async persistResult(
    record: FounderOperatingLoopRunRecord,
    actor = 'founder'
  ): Promise<FounderOperatingLoopRunRecord> {
    const saved = await this.create(record, {
      actor,
      auditSummary: 'Operating loop run persisted'
    })
    await appendAuditLog({
      actor,
      eventType: record.status === 'failed' ? 'run_failed' : 'run_completed',
      entityType: 'operating_loop_run',
      entityId: record.id,
      summary:
        record.status === 'failed'
          ? record.errorSummary ?? 'Operating loop failed'
          : 'Operating loop completed',
      status: record.status
    })
    return saved
  }
}

export const operatingLoopRepository = new OperatingLoopRepository()
