import { appendAuditLog, appendAuditLogMemory } from '../../founder/persistence/repositories/audit-log-repository.ts'
import { isFounderPersistenceDevFallback } from '../../founder/persistence/persistence-config.ts'

import type {
  OrbFailureClassification,
  OrbQualityAgentAction,
  OrbQualityAgentApprovalStatus,
  OrbQualityAgentAuditRecord
} from './orb-quality-agent-types.ts'

const memory: OrbQualityAgentAuditRecord[] = []

function nextAuditId(): string {
  return `orb-qa-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export type RecordOrbQualityAgentAuditInput = {
  user: string
  runId: string
  action: OrbQualityAgentAction
  failureClassification?: OrbFailureClassification
  generatedPlan?: string
  prUrl?: string
  testsRequested?: string[]
  approvalStatus?: OrbQualityAgentApprovalStatus
  metadata?: Record<string, unknown>
}

export function recordOrbQualityAgentAuditMemory(
  input: RecordOrbQualityAgentAuditInput
): OrbQualityAgentAuditRecord {
  const record: OrbQualityAgentAuditRecord = {
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
    user: input.user,
    runId: input.runId,
    action: input.action,
    failureClassification: input.failureClassification,
    generatedPlan: input.generatedPlan,
    prUrl: input.prUrl,
    testsRequested: input.testsRequested ?? [],
    approvalStatus: input.approvalStatus ?? 'pending',
    metadata: sanitiseAuditMetadata(input.metadata)
  }
  memory.unshift(record)
  return record
}

function sanitiseAuditMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!metadata) return undefined
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' && /\b(child|young person)\s+\d+/i.test(value)) continue
    safe[key] = value
  }
  return safe
}

export async function recordOrbQualityAgentAudit(
  input: RecordOrbQualityAgentAuditInput
): Promise<OrbQualityAgentAuditRecord> {
  const record = recordOrbQualityAgentAuditMemory(input)

  if (!isFounderPersistenceDevFallback()) {
    await appendAuditLog({
      actor: input.user,
      eventType: 'created',
      entityType: 'agent_run',
      entityId: record.id,
      summary: `ORB Quality Agent: ${input.action} for run ${input.runId}`,
      status: input.approvalStatus ?? 'pending',
      metadata: {
        runId: input.runId,
        action: input.action,
        failureClassification: input.failureClassification,
        prUrl: input.prUrl,
        testsRequested: input.testsRequested,
        approvalStatus: input.approvalStatus ?? 'pending',
        ...sanitiseAuditMetadata(input.metadata)
      }
    })
  } else {
    appendAuditLogMemory({
      actor: input.user,
      eventType: 'created',
      entityType: 'agent_run',
      entityId: record.id,
      summary: `ORB Quality Agent: ${input.action} for run ${input.runId}`,
      status: input.approvalStatus ?? 'pending',
      metadata: {
        runId: input.runId,
        action: input.action,
        failureClassification: input.failureClassification
      }
    })
  }

  return record
}

export function listOrbQualityAgentAuditRecords(limit = 50): OrbQualityAgentAuditRecord[] {
  return memory.slice(0, limit)
}

export function resetOrbQualityAgentAuditMemory(): void {
  memory.length = 0
}
