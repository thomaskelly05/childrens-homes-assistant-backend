/**
 * Persists autonomous loop state (brain audit, micro-check history) via founder memory.
 * Seeds a safe default on first run when persistence has no record yet.
 */

import type { FounderMemoryItem } from '../memory/founder-memory-types.ts'
import type { FounderMemoryRecord } from '../persistence/founder-persistence-types.ts'
import { getBootstrapRecordsForSlug } from '../bootstrap/founder-bootstrap-cache.ts'
import { memoryRepository } from '../persistence/index.ts'
import { appendAuditLog } from '../persistence/repositories/audit-log-repository.ts'
import { FounderPersistenceApiError } from '../persistence/founder-api-client.ts'
import type { BrainAuditSummary, MicroCheckRotationState, MicroCheckRunRecord } from '../brain-audit/brain-audit-types.ts'
import {
  addMicroCheckRecord,
  getLatestBrainAudit,
  getMicroCheckHistory,
  getMicroCheckRotationState,
  setLatestBrainAudit,
  updateMicroCheckRotationState
} from '../brain-audit/brain-audit-store.ts'
import { getPendingProposals } from '../learning-loop/learning-loop-store.ts'
import { buildAutonomousLoopHealth } from './autonomous-loop-service.ts'
import type { AutonomousLoopHealthStatus } from './scheduler-types.ts'

const PERSISTENCE_MEMORY_ID = 'founder-autonomy-loop-state'

export type AutonomyLoopCheckSnapshot = {
  status: string
  completedAt: string | null
  summary: string
}

export type AutonomyLoopBrainAuditSnapshot = {
  updatedAt: string | null
  lastUpdatedFrom: string | null
  coveragePercent: number | null
}

/** Persisted autonomy loop document stored in founder memory. */
export type FounderAutonomyLoopState = {
  version: 2
  overallStatus: AutonomousLoopHealthStatus
  latestMicroCheck: AutonomyLoopCheckSnapshot | null
  latestFocusedCheck: AutonomyLoopCheckSnapshot | null
  latestFullBenchmark: AutonomyLoopCheckSnapshot | null
  latestBrainAudit: AutonomyLoopBrainAuditSnapshot | null
  openLearningProposals: string[]
  approvalQueueCount: number
  businessReportStatus: string
  lastUpdatedAt: string | null
  createdFrom: 'default_seed' | 'persistence_load' | 'task_run' | 'scheduler'
  syntheticEvidenceOnly: true
  liveLlmApprovalGated: true
  founderApprovalRequired: true
  snapshot: {
    latestAudit: BrainAuditSummary | null
    microCheckHistory: MicroCheckRunRecord[]
    rotationState: MicroCheckRotationState
  }
}

/** @deprecated v1 shape — still accepted when loading older records */
export type AutonomyLoopPersistedStateV1 = {
  version: 1
  latestAudit: BrainAuditSummary | null
  microCheckHistory: MicroCheckRunRecord[]
  rotationState: MicroCheckRotationState
  savedAt: string
}

export type AutonomyLoopLoadResult = {
  state: FounderAutonomyLoopState
  seeded: boolean
  loadedFromPersistence: boolean
  persistenceWarning?: string
}

export type AutonomyLoopLoadStatus = {
  seeded: boolean
  loadWarning?: string
  statusMessage?: string
}

let hydrated = false
let persistTimer: ReturnType<typeof setTimeout> | null = null
let currentLoopState: FounderAutonomyLoopState | null = null
let lastLoadStatus: AutonomyLoopLoadStatus = { seeded: false }

const AUTONOMY_AUDIT_ACTIONS = {
  missing: 'autonomy_loop_state_missing',
  seeded: 'autonomy_loop_state_seeded',
  loaded: 'autonomy_loop_state_loaded',
  persisted: 'autonomy_loop_state_persisted',
  persistenceFailed: 'autonomy_loop_state_persistence_failed'
} as const

function auditAutonomyLoopEvent(
  action: (typeof AUTONOMY_AUDIT_ACTIONS)[keyof typeof AUTONOMY_AUDIT_ACTIONS],
  summary: string,
  metadata?: Record<string, unknown>
): void {
  void appendAuditLog({
    actor: 'autonomous-scheduler',
    eventType: action === AUTONOMY_AUDIT_ACTIONS.persistenceFailed ? 'run_failed' : 'created',
    entityType: 'founder_memory',
    entityId: PERSISTENCE_MEMORY_ID,
    summary,
    status: action,
    metadata: {
      autonomyLoopAction: action,
      syntheticEvidenceOnly: true,
      noRealChildData: true,
      ...metadata
    }
  }).catch(() => undefined)
}

export function createDefaultAutonomyLoopState(): FounderAutonomyLoopState {
  return {
    version: 2,
    overallStatus: 'untested',
    latestMicroCheck: null,
    latestFocusedCheck: null,
    latestFullBenchmark: null,
    latestBrainAudit: null,
    openLearningProposals: [],
    approvalQueueCount: 0,
    businessReportStatus: 'scheduled',
    lastUpdatedAt: null,
    createdFrom: 'default_seed',
    syntheticEvidenceOnly: true,
    liveLlmApprovalGated: true,
    founderApprovalRequired: true,
    snapshot: {
      latestAudit: null,
      microCheckHistory: [],
      rotationState: { lastAreaIds: [], lastRunAt: null }
    }
  }
}

function buildSnapshotFromStores(): FounderAutonomyLoopState['snapshot'] {
  return {
    latestAudit: getLatestBrainAudit(),
    microCheckHistory: getMicroCheckHistory(200),
    rotationState: getMicroCheckRotationState()
  }
}

function buildStateFromRuntime(createdFrom: FounderAutonomyLoopState['createdFrom']): FounderAutonomyLoopState {
  const health = buildAutonomousLoopHealth()
  const pendingProposalIds = getPendingProposals().map((proposal) => proposal.id)

  return {
    version: 2,
    overallStatus: health.status,
    latestMicroCheck: health.latestMicroCheck,
    latestFocusedCheck: health.latestFocusedCheck,
    latestFullBenchmark: health.latestFullBenchmark,
    latestBrainAudit: health.latestBrainAudit,
    openLearningProposals: pendingProposalIds,
    approvalQueueCount: health.approvalQueueCount,
    businessReportStatus: health.businessReportStatus,
    lastUpdatedAt: new Date().toISOString(),
    createdFrom,
    syntheticEvidenceOnly: true,
    liveLlmApprovalGated: true,
    founderApprovalRequired: true,
    snapshot: buildSnapshotFromStores()
  }
}

function memoryItemFromState(state: FounderAutonomyLoopState): FounderMemoryItem {
  const savedAt = state.lastUpdatedAt ?? new Date().toISOString()
  return {
    id: PERSISTENCE_MEMORY_ID,
    type: 'milestone',
    title: 'Autonomous Intelligence Loop State',
    content: JSON.stringify(state),
    status: 'active',
    importance: 'high',
    tags: ['brain-audit', 'micro-check', 'autonomy-loop'],
    source: 'autonomous-scheduler',
    createdAt: savedAt,
    updatedAt: savedAt,
    createdBy: 'autonomous-scheduler'
  }
}

function recordFromState(state: FounderAutonomyLoopState): FounderMemoryRecord {
  const item = memoryItemFromState(state)
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

function hydrateStoresFromSnapshot(snapshot: FounderAutonomyLoopState['snapshot']): void {
  if (snapshot.latestAudit) setLatestBrainAudit(snapshot.latestAudit)
  if (snapshot.rotationState) updateMicroCheckRotationState(snapshot.rotationState)
  for (const entry of [...snapshot.microCheckHistory].reverse()) {
    addMicroCheckRecord(entry)
  }
}

function parsePersistedState(raw: string): FounderAutonomyLoopState | null {
  try {
    const parsed = JSON.parse(raw) as FounderAutonomyLoopState | AutonomyLoopPersistedStateV1
    if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 2) {
      return parsed as FounderAutonomyLoopState
    }
    if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 1) {
      const v1 = parsed as AutonomyLoopPersistedStateV1
      const migrated = createDefaultAutonomyLoopState()
      migrated.createdFrom = 'persistence_load'
      migrated.snapshot = {
        latestAudit: v1.latestAudit,
        microCheckHistory: v1.microCheckHistory ?? [],
        rotationState: v1.rotationState ?? { lastAreaIds: [], lastRunAt: null }
      }
      migrated.lastUpdatedAt = v1.savedAt ?? null
      return migrated
    }
  } catch {
    return null
  }
  return null
}

function findMemoryInBootstrap(): FounderMemoryRecord | undefined {
  const items = getBootstrapRecordsForSlug('memories')
  if (!items) return undefined
  return (items as FounderMemoryRecord[]).find((record) => record.id === PERSISTENCE_MEMORY_ID)
}

async function fetchMemoryRecord(): Promise<{ record: FounderMemoryRecord | null; notFound: boolean; error?: Error }> {
  const fromBootstrap = findMemoryInBootstrap()
  if (fromBootstrap?.item?.content) {
    return { record: fromBootstrap, notFound: false }
  }

  try {
    const record = await memoryRepository.getById(PERSISTENCE_MEMORY_ID)
    if (record?.item?.content) {
      return { record, notFound: false }
    }
    return { record: null, notFound: true }
  } catch (error) {
    if (error instanceof FounderPersistenceApiError && error.status === 404) {
      return { record: null, notFound: true }
    }
    return {
      record: null,
      notFound: false,
      error: error instanceof Error ? error : new Error('Persistence read failed')
    }
  }
}

function applyLoadedState(state: FounderAutonomyLoopState): void {
  currentLoopState = state
  hydrateStoresFromSnapshot(state.snapshot)
}

async function persistLoopState(
  state: FounderAutonomyLoopState,
  options?: { skipAudit?: boolean }
): Promise<boolean> {
  const record = recordFromState(state)

  try {
    const existing = await fetchMemoryRecord()
    if (existing.record) {
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

    if (!options?.skipAudit) {
      auditAutonomyLoopEvent(
        AUTONOMY_AUDIT_ACTIONS.persisted,
        'Autonomous loop state persisted.',
        { createdFrom: state.createdFrom }
      )
    }
    return true
  } catch {
    auditAutonomyLoopEvent(
      AUTONOMY_AUDIT_ACTIONS.persistenceFailed,
      'Autonomous loop state could not be persisted. Using in-memory safe defaults.',
      { createdFrom: state.createdFrom }
    )
    return false
  }
}

export async function loadOrCreateAutonomyLoopState(): Promise<AutonomyLoopLoadResult> {
  const fetchResult = await fetchMemoryRecord()

  if (fetchResult.error) {
    const fallback = createDefaultAutonomyLoopState()
    applyLoadedState(fallback)
    hydrated = true
    lastLoadStatus = {
      seeded: false,
      loadWarning:
        'Loop state could not be fully loaded. The scheduler is using safe defaults. See audit trail.',
      statusMessage: undefined
    }
    auditAutonomyLoopEvent(
      AUTONOMY_AUDIT_ACTIONS.persistenceFailed,
      'Autonomous loop state persistence read failed. Safe defaults in use.',
      { status: fetchResult.error.message }
    )
    return {
      state: fallback,
      seeded: false,
      loadedFromPersistence: false,
      persistenceWarning: lastLoadStatus.loadWarning
    }
  }

  if (!fetchResult.record?.item?.content) {
    auditAutonomyLoopEvent(
      AUTONOMY_AUDIT_ACTIONS.missing,
      'Autonomous loop state did not exist. Safe default state was created.',
      { memoryId: PERSISTENCE_MEMORY_ID }
    )

    const seeded = createDefaultAutonomyLoopState()
    applyLoadedState(seeded)
    hydrated = true

    const persisted = await persistLoopState(seeded, { skipAudit: true })
    if (persisted) {
      auditAutonomyLoopEvent(
        AUTONOMY_AUDIT_ACTIONS.seeded,
        'Autonomous loop state did not exist. Safe default state was created.',
        { memoryId: PERSISTENCE_MEMORY_ID, createdFrom: 'default_seed' }
      )
    }

    lastLoadStatus = {
      seeded: true,
      statusMessage: 'No loop runs recorded yet. Safe default state created.'
    }

    return {
      state: seeded,
      seeded: true,
      loadedFromPersistence: false
    }
  }

  const parsed = parsePersistedState(fetchResult.record.item.content)
  if (!parsed) {
    const fallback = createDefaultAutonomyLoopState()
    applyLoadedState(fallback)
    hydrated = true
    lastLoadStatus = {
      seeded: false,
      loadWarning:
        'Loop state could not be fully loaded. The scheduler is using safe defaults. See audit trail.',
      statusMessage: undefined
    }
    auditAutonomyLoopEvent(
      AUTONOMY_AUDIT_ACTIONS.persistenceFailed,
      'Autonomous loop state was malformed. Safe defaults in use.',
      { memoryId: PERSISTENCE_MEMORY_ID }
    )
    return {
      state: fallback,
      seeded: false,
      loadedFromPersistence: false,
      persistenceWarning: lastLoadStatus.loadWarning
    }
  }

  applyLoadedState(parsed)
  hydrated = true
  auditAutonomyLoopEvent(
    AUTONOMY_AUDIT_ACTIONS.loaded,
    'Autonomous loop state loaded from persistence.',
    { memoryId: PERSISTENCE_MEMORY_ID, createdFrom: parsed.createdFrom }
  )
  lastLoadStatus = { seeded: false }

  return {
    state: parsed,
    seeded: false,
    loadedFromPersistence: true
  }
}

export function getAutonomyLoopLoadStatus(): AutonomyLoopLoadStatus {
  return { ...lastLoadStatus }
}

export function getCurrentAutonomyLoopState(): FounderAutonomyLoopState | null {
  return currentLoopState
}

export function scheduleAutonomyLoopPersistence(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void syncAndPersistAutonomyLoopState('scheduler').catch(() => undefined)
  }, 250)
}

export async function syncAndPersistAutonomyLoopState(
  createdFrom: FounderAutonomyLoopState['createdFrom'] = 'scheduler'
): Promise<void> {
  const state = buildStateFromRuntime(createdFrom)
  currentLoopState = state
  await persistLoopState(state)
}

export async function persistAutonomyLoopState(): Promise<void> {
  await syncAndPersistAutonomyLoopState('scheduler')
}

export async function hydrateAutonomyLoopState(): Promise<void> {
  if (hydrated) return
  await loadOrCreateAutonomyLoopState()
}

export async function ensureAutonomyLoopStateForTask(
  taskType: string
): Promise<AutonomyLoopLoadResult> {
  const seedable = new Set([
    'internal_brain_rotating_micro_check',
    'internal_brain_focused_check',
    'internal_brain_full',
    'daily_business_report'
  ])

  if (!seedable.has(taskType)) {
    if (!hydrated) await loadOrCreateAutonomyLoopState()
    return {
      state: currentLoopState ?? createDefaultAutonomyLoopState(),
      seeded: false,
      loadedFromPersistence: Boolean(currentLoopState)
    }
  }

  const result = await loadOrCreateAutonomyLoopState()
  return result
}

export function markAutonomyLoopHydratedForTests(): void {
  hydrated = true
}

export function resetAutonomyLoopPersistenceForTests(): void {
  hydrated = false
  currentLoopState = null
  lastLoadStatus = { seeded: false }
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = null
}

/** @internal test helper — direct memory fetch without seeding */
export async function __testFetchAutonomyLoopMemory(): Promise<FounderMemoryRecord | null> {
  const result = await fetchMemoryRecord()
  return result.record
}

/** @internal test helper */
export { PERSISTENCE_MEMORY_ID, AUTONOMY_AUDIT_ACTIONS }
