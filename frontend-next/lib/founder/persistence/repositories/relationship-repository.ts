import type { FounderRelationshipRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from './audit-log-repository'
import { BaseFounderRepository } from './repository-base'

class RelationshipRepository extends BaseFounderRepository<FounderRelationshipRecord> {
  entityType = 'relationship' as const
  memory = { items: [] as FounderRelationshipRecord[], warned: false }

  async archive(id: string, actor = 'founder'): Promise<FounderRelationshipRecord | undefined> {
    const existing = await this.getById(id)
    if (!existing) return undefined

    const updated = await this.update(
      id,
      {
        status: 'archived',
        bundle: {
          ...existing.bundle,
          relationship: {
            ...existing.bundle.relationship,
            status: 'archived',
            updatedAt: new Date().toISOString()
          }
        }
      } as Partial<FounderRelationshipRecord>,
      {
        actor,
        auditSummary: 'Relationship archived',
        eventType: 'status_changed'
      }
    )

    if (updated) {
      await appendAuditLog({
        actor,
        eventType: 'status_changed',
        entityType: 'relationship',
        entityId: id,
        summary: 'Relationship archived',
        status: 'archived'
      })
    }
    return updated
  }
}

export const relationshipRepository = new RelationshipRepository()
