/**
 * Founder Memory store — in-memory cache with persistence and safe local fallback.
 */

import { memoryRepository } from '@/lib/founder/persistence'
import type { FounderMemoryRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { buildFounderStrategicContext } from './founder-memory-context'
import { DEFAULT_FOUNDER_MEMORY_ITEMS } from './default-founder-memory'
import {
  validateCreateFounderMemoryInput,
  validateUpdateFounderMemoryInput
} from './founder-memory-safety'
import type {
  CreateFounderMemoryItemInput,
  FounderMemoryItem,
  FounderStrategicContext,
  UpdateFounderMemoryItemInput
} from './founder-memory-types'

let items: FounderMemoryItem[] = []
let seeded = false

function recordFromItem(
  item: FounderMemoryItem,
  source: FounderMemoryRecord['source'] = 'founder-ui'
): FounderMemoryRecord {
  return {
    id: item.id,
    ...baseTimestamps(item.createdBy, source),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy,
    source,
    status: item.status,
    item
  }
}

function itemFromRecord(record: FounderMemoryRecord): FounderMemoryItem {
  return record.item
}

async function ensureDefaultSeed(): Promise<void> {
  if (seeded) return
  seeded = true
  if (items.length > 0) return

  for (const seed of DEFAULT_FOUNDER_MEMORY_ITEMS) {
    items.push(seed)
    void memoryRepository
      .create(recordFromItem(seed, 'system'), {
        actor: 'system',
        auditSummary: `Seeded founder memory: ${seed.title}`,
        skipAudit: true
      })
      .catch(() => undefined)
  }
}

export async function hydrateFounderMemoryFromPersistence(): Promise<void> {
  try {
    const records = await memoryRepository.list()
    if (records.length > 0) {
      items = records.map(itemFromRecord)
      seeded = true
      return
    }
  } catch {
    /* keep local cache */
  }
  await ensureDefaultSeed()
}

export function getFounderMemoryItems(): FounderMemoryItem[] {
  return [...items]
}

export function getActiveFounderMemoryItems(): FounderMemoryItem[] {
  return items.filter((item) => item.status === 'active')
}

export function getFounderMemoryItem(id: string): FounderMemoryItem | undefined {
  return items.find((item) => item.id === id)
}

export function getFounderStrategicContext(): FounderStrategicContext {
  return buildFounderStrategicContext(items)
}

export function searchFounderMemory(query: string): FounderMemoryItem[] {
  const normalised = query.trim().toLowerCase()
  if (!normalised) return getFounderMemoryItems()

  return items.filter((item) => {
    const haystack = [item.title, item.content, item.type, ...item.tags].join(' ').toLowerCase()
    return haystack.includes(normalised)
  })
}

export async function createFounderMemoryItem(
  input: CreateFounderMemoryItemInput,
  actor = 'founder'
): Promise<{ item?: FounderMemoryItem; errors?: string[] }> {
  const validation = validateCreateFounderMemoryInput(input)
  if (!validation.valid) {
    return { errors: validation.errors }
  }

  const now = new Date().toISOString()
  const item: FounderMemoryItem = {
    id: nextId('memory'),
    type: input.type,
    title: validation.sanitisedTitle!,
    content: validation.sanitisedContent!,
    status: input.status ?? 'active',
    importance: input.importance ?? 'medium',
    tags: (input.tags ?? []).map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 12),
    source: input.source ?? 'founder-ui',
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    linkedEntityId: input.linkedEntityId,
    linkedEntityType: input.linkedEntityType
  }

  items = [item, ...items]

  await memoryRepository.create(recordFromItem(item, 'founder-ui'), {
    actor,
    auditSummary: `Created founder memory: ${item.title}`
  })

  await appendAuditLog({
    actor,
    eventType: 'created',
    entityType: 'founder_memory',
    entityId: item.id,
    summary: `Founder memory created: ${item.title}`,
    status: item.status,
    metadata: { type: item.type, importance: item.importance }
  }).catch(() => undefined)

  return { item }
}

export async function updateFounderMemoryItem(
  id: string,
  input: UpdateFounderMemoryItemInput,
  actor = 'founder'
): Promise<{ item?: FounderMemoryItem; errors?: string[] }> {
  const existing = items.find((item) => item.id === id)
  if (!existing) {
    return { errors: ['Memory item not found.'] }
  }

  const validation = validateUpdateFounderMemoryInput(input)
  if (!validation.valid) {
    return { errors: validation.errors }
  }

  const updated: FounderMemoryItem = {
    ...existing,
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(validation.sanitisedTitle !== undefined ? { title: validation.sanitisedTitle } : {}),
    ...(validation.sanitisedContent !== undefined ? { content: validation.sanitisedContent } : {}),
    ...(input.importance !== undefined ? { importance: input.importance } : {}),
    ...(input.tags !== undefined
      ? { tags: input.tags.map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 12) }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.linkedEntityId !== undefined ? { linkedEntityId: input.linkedEntityId } : {}),
    ...(input.linkedEntityType !== undefined ? { linkedEntityType: input.linkedEntityType } : {}),
    updatedAt: new Date().toISOString()
  }

  items = items.map((item) => (item.id === id ? updated : item))

  await memoryRepository.update(
    id,
    {
      status: updated.status,
      item: updated,
      updatedAt: updated.updatedAt
    },
    {
      actor,
      auditSummary: `Updated founder memory: ${updated.title}`
    }
  )

  await appendAuditLog({
    actor,
    eventType: 'updated',
    entityType: 'founder_memory',
    entityId: id,
    summary: `Founder memory updated: ${updated.title}`,
    status: updated.status,
    metadata: { type: updated.type, importance: updated.importance }
  }).catch(() => undefined)

  return { item: updated }
}

export async function archiveFounderMemoryItem(
  id: string,
  actor = 'founder'
): Promise<{ item?: FounderMemoryItem; errors?: string[] }> {
  return updateFounderMemoryItem(id, { status: 'archived' }, actor)
}

/** Quick save helper for approvals, build briefs and ORB answers */
export async function saveTextToFounderMemory(
  params: {
    type: CreateFounderMemoryItemInput['type']
    title: string
    content: string
    importance?: CreateFounderMemoryItemInput['importance']
    tags?: string[]
    linkedEntityId?: string
    linkedEntityType?: string
    source?: string
  },
  actor = 'founder'
): Promise<{ item?: FounderMemoryItem; errors?: string[] }> {
  return createFounderMemoryItem(
    {
      type: params.type,
      title: params.title,
      content: params.content,
      importance: params.importance ?? 'high',
      tags: params.tags,
      linkedEntityId: params.linkedEntityId,
      linkedEntityType: params.linkedEntityType,
      source: params.source ?? 'founder-ui'
    },
    actor
  )
}
