import { founderPersistenceApi } from '@/lib/founder/persistence/founder-api-client'
import { isFounderPersistenceDevFallback } from '@/lib/founder/persistence/persistence-config'
import type { FounderApprovalRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog, appendAuditLogMemory } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class ApprovalRepository extends BaseFounderRepository<FounderApprovalRecord> {
  entityType = 'approval' as const
  memory = { items: [] as FounderApprovalRecord[], warned: false }
  protected noHardDelete = true

  async decide(
    id: string,
    status: 'approved' | 'rejected' | 'needs-changes',
    options?: { founderNote?: string; actor?: string }
  ): Promise<FounderApprovalRecord | undefined> {
    const now = new Date().toISOString()
    const actor = options?.actor ?? 'founder'

    if (isFounderPersistenceDevFallback()) {
      const patch: Partial<FounderApprovalRecord> = { status }
      if (options?.founderNote) patch.founderNote = options.founderNote
      if (status === 'approved') {
        patch.approvedAt = now
        patch.approvedBy = actor
      }
      if (status === 'rejected') {
        patch.rejectedAt = now
        patch.rejectedBy = actor
      }
      const updated = await this.update(id, patch, {
        actor,
        auditSummary: `Approval ${status}`,
        eventType: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'needs_changes'
      })
      return updated
    }

    const saved = await founderPersistenceApi.approvalDecision<FounderApprovalRecord>(
      id,
      status,
      options?.founderNote
    )
    await appendAuditLog({
      actor,
      eventType: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'needs_changes',
      entityType: 'approval',
      entityId: id,
      summary: `Approval ${status}`,
      status,
      metadata: options?.founderNote ? { founderNote: options.founderNote } : undefined
    })
    return saved
  }
}

export const approvalRepository = new ApprovalRepository()

export { appendAuditLogMemory }
