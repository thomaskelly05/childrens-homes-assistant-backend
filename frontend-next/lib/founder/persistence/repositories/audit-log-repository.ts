import {
  FounderPersistenceApiError,
  founderPersistenceApi
} from '@/lib/founder/persistence/founder-api-client'
import {
  FOUNDER_PERSISTENCE_DEV_FALLBACK_WARNING,
  isFounderPersistenceDevFallback
} from '@/lib/founder/persistence/persistence-config'
import type {
  FounderAuditEventType,
  FounderAuditLogRecord,
  FounderEntityType
} from '@/lib/founder/persistence/founder-persistence-types'
import { nextId } from './repository-base'

const memory: FounderAuditLogRecord[] = []
let warned = false

export type AppendAuditInput = {
  actor: string
  eventType: FounderAuditEventType
  entityType: FounderEntityType
  entityId: string
  summary: string
  status?: string
  metadata?: Record<string, unknown>
  linkedEntityId?: string
  linkedEntityType?: FounderEntityType
}

export function appendAuditLogMemory(input: AppendAuditInput): FounderAuditLogRecord {
  const entry: FounderAuditLogRecord = {
    id: nextId('audit'),
    createdAt: new Date().toISOString(),
    ...input
  }
  memory.unshift(entry)
  return entry
}

export async function appendAuditLog(input: AppendAuditInput): Promise<FounderAuditLogRecord> {
  if (isFounderPersistenceDevFallback()) {
    if (!warned) {
      warned = true
      console.warn(FOUNDER_PERSISTENCE_DEV_FALLBACK_WARNING)
    }
    return appendAuditLogMemory(input)
  }
  return founderPersistenceApi.auditAppend({
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    summary: input.summary,
    status: input.status,
    metadata: input.metadata,
    linked_entity_id: input.linkedEntityId,
    linked_entity_type: input.linkedEntityType
  }) as Promise<FounderAuditLogRecord>
}

export async function listAuditLog(filters?: {
  entityType?: FounderEntityType
  limit?: number
}): Promise<FounderAuditLogRecord[]> {
  if (isFounderPersistenceDevFallback()) {
    if (!warned) {
      warned = true
      console.warn(FOUNDER_PERSISTENCE_DEV_FALLBACK_WARNING)
    }
    const items = [...memory]
    if (filters?.entityType) {
      return items.filter((item) => item.entityType === filters.entityType).slice(0, filters?.limit ?? 200)
    }
    return items.slice(0, filters?.limit ?? 200)
  }
  const params: Record<string, string> = {}
  if (filters?.entityType) params.entity_type = filters.entityType
  if (filters?.limit) params.limit = String(filters.limit)
  try {
    const result = await founderPersistenceApi.auditList(params)
    return (result.items ?? []) as FounderAuditLogRecord[]
  } catch (error) {
    if (error instanceof FounderPersistenceApiError && (error.status === 404 || error.status === 503)) {
      return []
    }
    throw error
  }
}

export function resetAuditLogMemory(): void {
  memory.length = 0
  warned = false
}
