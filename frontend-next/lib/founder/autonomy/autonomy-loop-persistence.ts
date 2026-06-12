/**
 * Persists autonomous loop state (brain audit, micro-check history) via founder memory.
 * Falls back to in-memory only when persistence is unavailable (tests, dev).
 */

import type { FounderMemoryItem } from '../memory/founder-memory-types.ts'
import type { FounderMemoryRecord } from '../persistence/founder-persistence-types.ts'
import { memoryRepository } from '../persistence/index.ts'
import type { BrainAuditSummary, MicroCheckRotationState, MicroCheckRunRecord } from '../brain-audit/brain-audit-types.ts'
import {
  addMicroCheckRecord,
  getLatestBrainAudit,
  getMicroCheckHistory,
  getMicroCheckRotationState,
  setLatestBrainAudit,
  updateMicroCheckRotationState
} from '../brain-audit/brain-audit-store.ts'

const PERSISTENCE_MEMORY_ID = 'founder-autonomy-loop-state'

export type AutonomyLoopPersistedState = {
  version: 1
  latestAudit: BrainAuditSummary | null
  microCheckHistory: MicroCheckRunRecord[]
  rotationState: MicroCheckRotationState
  savedAt: string
}

let hydrated = false
let persistTimer: ReturnType<typeof setTimeout> | null = null

function buildSnapshot(): AutonomyLoopPersistedState {
  return {
    version: 1,
    latestAudit: getLatestBrainAudit(),
    microCheckHistory: getMicroCheckHistory(200),
    rotationState: getMicroCheckRotationState(),
    savedAt: new Date().toISOString()
  }
}

function memoryItemFromSnapshot(snapshot: AutonomyLoopPersistedState): FounderMemoryItem {
  return {
    id: PERSISTENCE_MEMORY_ID,
    type: 'milestone',
    title: 'Autonomous Intelligence Loop State',
    content: JSON.stringify(snapshot),
    status: 'active',
    importance: 'high',
    tags: ['brain-audit', 'micro-check', 'autonomy-loop'],
    source: 'autonomous-scheduler',
    createdAt: snapshot.savedAt,
    updatedAt: snapshot.savedAt,
    createdBy: 'autonomous-scheduler'
  }
}

function recordFromSnapshot(snapshot: AutonomyLoopPersistedState): FounderMemoryRecord {
  const item = memoryItemFromSnapshot(snapshot)
  return {
    id: PERSISTENCE_MEMORY_ID,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy,
    source: 'system',
    status: item.status,
    item
  }
}

export function scheduleAutonomyLoopPersistence(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void persistAutonomyLoopState().catch(() => undefined)
  }, 250)
}

export async function persistAutonomyLoopState(): Promise<void> {
  const snapshot = buildSnapshot()
  const record = recordFromSnapshot(snapshot)

  try {
    const existing = await memoryRepository.getById(PERSISTENCE_MEMORY_ID)
    if (existing) {
      await memoryRepository.update(PERSISTENCE_MEMORY_ID, record, {
        actor: 'autonomous-scheduler',
        auditSummary: 'Updated autonomy loop state'
      })
    } else {
      await memoryRepository.create(record, {
        actor: 'autonomous-scheduler',
        auditSummary: 'Persisted autonomy loop state',
        skipAudit: true
      })
    }
  } catch {
    /* in-memory fallback — tests and offline dev */
  }
}

export async function hydrateAutonomyLoopState(): Promise<void> {
  if (hydrated) return
  hydrated = true

  try {
    const record = await memoryRepository.getById(PERSISTENCE_MEMORY_ID)
    const raw = record?.item?.content
    if (!raw) return

    const parsed = JSON.parse(raw) as AutonomyLoopPersistedState
    if (parsed.latestAudit) setLatestBrainAudit(parsed.latestAudit)
    if (parsed.rotationState) updateMicroCheckRotationState(parsed.rotationState)
    for (const entry of [...parsed.microCheckHistory].reverse()) {
      addMicroCheckRecord(entry)
    }
  } catch {
    /* keep in-memory defaults */
  }
}

export function markAutonomyLoopHydratedForTests(): void {
  hydrated = true
}

export function resetAutonomyLoopPersistenceForTests(): void {
  hydrated = false
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = null
}
