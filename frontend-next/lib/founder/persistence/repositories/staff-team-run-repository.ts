import type { FounderStaffTeamRunRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class StaffTeamRunRepository extends BaseFounderRepository<FounderStaffTeamRunRecord> {
  entityType = 'staff_team_run' as const
  memory = { items: [] as FounderStaffTeamRunRecord[], warned: false }

  async markFailed(id: string, errorSummary: string, actor = 'founder') {
    const updated = await this.updateStatus(id, 'failed', { errorSummary }, {
      actor,
      auditSummary: 'Staff team run failed',
      eventType: 'run_failed'
    })
    await appendAuditLog({
      actor,
      eventType: 'run_failed',
      entityType: 'staff_team_run',
      entityId: id,
      summary: errorSummary.slice(0, 240),
      status: 'failed'
    })
    return updated
  }

  async markComplete(id: string, patch: Partial<FounderStaffTeamRunRecord>, actor = 'founder') {
    const updated = await this.updateStatus(id, 'complete', { ...patch, completedAt: new Date().toISOString() }, {
      actor,
      auditSummary: 'Staff team run completed',
      eventType: 'run_completed'
    })
    await appendAuditLog({
      actor,
      eventType: 'run_completed',
      entityType: 'staff_team_run',
      entityId: id,
      summary: 'Founder staff team run completed',
      status: 'complete'
    })
    return updated
  }
}

export const staffTeamRunRepository = new StaffTeamRunRepository()
