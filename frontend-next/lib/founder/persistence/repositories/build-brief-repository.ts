import type { FounderBuildBriefRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class BuildBriefRepository extends BaseFounderRepository<FounderBuildBriefRecord> {
  entityType = 'build_brief' as const
  memory = { items: [] as FounderBuildBriefRecord[], warned: false }

  async changeStatus(
    id: string,
    status: FounderBuildBriefRecord['status'],
    actor = 'founder',
    extra?: Partial<FounderBuildBriefRecord>
  ): Promise<FounderBuildBriefRecord | undefined> {
    const updated = await this.updateStatus(id, status, extra, {
      actor,
      auditSummary: `Build brief status → ${status}`,
      eventType: 'status_changed'
    })
    if (updated) {
      await appendAuditLog({
        actor,
        eventType: 'status_changed',
        entityType: 'build_brief',
        entityId: id,
        summary: `Build brief marked ${status}`,
        status
      })
    }
    return updated
  }
}

export const buildBriefRepository = new BuildBriefRepository()
