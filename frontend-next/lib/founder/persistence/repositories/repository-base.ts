import {
  ENTITY_API_SLUGS,
  FounderPersistenceApiError,
  founderPersistenceApi
} from '@/lib/founder/persistence/founder-api-client'
import {
  FOUNDER_PERSISTENCE_DEV_FALLBACK_WARNING,
  isFounderPersistenceDevFallback
} from '@/lib/founder/persistence/persistence-config'
import type {
  FounderEntityType,
  FounderPersistenceSource
} from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLogMemory } from './audit-log-repository'

export type RepositoryMemoryState<T> = {
  items: T[]
  warned: boolean
}

export function warnDevFallback(state: RepositoryMemoryState<unknown>): void {
  if (!isFounderPersistenceDevFallback() || state.warned) return
  state.warned = true
  console.warn(FOUNDER_PERSISTENCE_DEV_FALLBACK_WARNING)
}

export function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function baseTimestamps(createdBy: string, source: FounderPersistenceSource) {
  const now = new Date().toISOString()
  return { createdAt: now, updatedAt: now, createdBy, source }
}

export abstract class BaseFounderRepository<T extends { id: string }> {
  abstract entityType: FounderEntityType
  abstract memory: RepositoryMemoryState<T>
  protected noHardDelete = false

  protected slug(): string {
    return ENTITY_API_SLUGS[this.entityType as keyof typeof ENTITY_API_SLUGS]
  }

  async create(
    record: T,
    options?: { actor?: string; auditSummary?: string; skipAudit?: boolean }
  ): Promise<T> {
    if (isFounderPersistenceDevFallback()) {
      warnDevFallback(this.memory)
      this.memory.items = [record, ...this.memory.items]
      if (!options?.skipAudit) {
        appendAuditLogMemory({
          actor: options?.actor ?? (record as { createdBy?: string }).createdBy ?? 'founder',
          eventType: 'created',
          entityType: this.entityType,
          entityId: record.id,
          summary: options?.auditSummary ?? `Created ${this.entityType}`,
          status: (record as { status?: string }).status
        })
      }
      return record
    }
    const saved = await founderPersistenceApi.create<T>(this.slug(), record as unknown as Record<string, unknown>)
    return saved
  }

  async list(filters?: { status?: string }): Promise<T[]> {
    if (isFounderPersistenceDevFallback()) {
      warnDevFallback(this.memory)
      const items = [...this.memory.items]
      if (filters?.status) {
        return items.filter((item) => (item as { status?: string }).status === filters.status)
      }
      return items
    }
    try {
      const result = await founderPersistenceApi.list<T>(
        this.slug(),
        filters?.status ? { status: filters.status } : undefined
      )
      return result.items ?? []
    } catch (error) {
      if (error instanceof FounderPersistenceApiError && (error.status === 404 || error.status === 503)) {
        return []
      }
      throw error
    }
  }

  async getById(id: string): Promise<T | undefined> {
    if (isFounderPersistenceDevFallback()) {
      warnDevFallback(this.memory)
      return this.memory.items.find((item) => item.id === id)
    }
    try {
      return await founderPersistenceApi.get<T>(this.slug(), id)
    } catch {
      return undefined
    }
  }

  async update(
    id: string,
    patch: Partial<T>,
    options?: { actor?: string; auditSummary?: string; eventType?: string }
  ): Promise<T | undefined> {
    if (isFounderPersistenceDevFallback()) {
      warnDevFallback(this.memory)
      const index = this.memory.items.findIndex((item) => item.id === id)
      if (index === -1) return undefined
      const updated = {
        ...this.memory.items[index],
        ...patch,
        updatedAt: new Date().toISOString()
      } as T
      this.memory.items = [...this.memory.items.slice(0, index), updated, ...this.memory.items.slice(index + 1)]
      appendAuditLogMemory({
        actor: options?.actor ?? 'founder',
        eventType: (options?.eventType as 'updated') ?? 'updated',
        entityType: this.entityType,
        entityId: id,
        summary: options?.auditSummary ?? `Updated ${this.entityType}`,
        status: (updated as { status?: string }).status
      })
      return updated
    }
    return founderPersistenceApi.update<T>(this.slug(), id, patch as Record<string, unknown>, (patch as { status?: string }).status)
  }

  async updateStatus(
    id: string,
    status: string,
    patch: Partial<T> = {},
    options?: { actor?: string; auditSummary?: string; eventType?: string }
  ): Promise<T | undefined> {
    return this.update(id, { ...patch, status } as Partial<T>, {
      ...options,
      eventType: options?.eventType ?? 'status_changed'
    })
  }
}
