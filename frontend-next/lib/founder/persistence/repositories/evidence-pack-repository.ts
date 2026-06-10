import type { FounderEvidencePackRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class EvidencePackRepository extends BaseFounderRepository<FounderEvidencePackRecord> {
  entityType = 'evidence_pack' as const
  memory = { items: [] as FounderEvidencePackRecord[], warned: false }

  async archive(id: string, actor = 'founder'): Promise<FounderEvidencePackRecord | undefined> {
    const existing = await this.getById(id)
    if (!existing) return undefined

    const updated = await this.update(
      id,
      {
        status: 'archived',
        pack: { ...existing.pack, status: 'archived', updatedAt: new Date().toISOString() }
      } as Partial<FounderEvidencePackRecord>,
      {
        actor,
        auditSummary: 'Evidence pack archived',
        eventType: 'status_changed'
      }
    )

    if (updated) {
      await appendAuditLog({
        actor,
        eventType: 'status_changed',
        entityType: 'evidence_pack',
        entityId: id,
        summary: 'Evidence pack archived',
        status: 'archived'
      })
    }
    return updated
  }
}

export const evidencePackRepository = new EvidencePackRepository()
