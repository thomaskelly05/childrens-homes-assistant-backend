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
    const runStatus = record.run?.status
    await appendAuditLog({
      actor,
      eventType: record.status === 'failed' || runStatus === 'failed' ? 'run_failed' : 'run_completed',
      entityType: 'operating_loop_run',
      entityId: record.id,
      summary:
        record.status === 'failed' || runStatus === 'failed'
          ? record.errorSummary ?? record.run?.errors?.[0] ?? 'Operating loop failed'
          : runStatus === 'completed_with_warnings'
            ? 'Operating loop completed with warnings'
            : 'Operating loop completed',
      status: runStatus ?? record.status
    })
    return saved
  }
}

export const operatingLoopRepository = new OperatingLoopRepository()
