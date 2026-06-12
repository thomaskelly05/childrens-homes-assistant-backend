import type {
  FounderAgentActionType,
  FounderAgentAuditEntry,
  FounderAgentId
} from './founder-agent-types'

let auditCounter = 0
let auditEntries: FounderAgentAuditEntry[] = []

function nextAuditId(): string {
  auditCounter += 1
  return `agent-audit-${Date.now()}-${auditCounter}`
}

export function recordAgentAuditEntry(input: {
  agentId: FounderAgentId
  actionType: FounderAgentActionType | 'orchestrate' | 'approval_decision' | 'event_received' | 'recommendation_created'
  summary: string
  decision?: FounderAgentAuditEntry['decision']
  approvalStatus?: FounderAgentAuditEntry['approvalStatus']
  relatedRunId?: string
  relatedPrId?: string
  relatedDocumentId?: string
  relatedEventId?: string
  actor?: string
}): FounderAgentAuditEntry {
  const entry: FounderAgentAuditEntry = {
    id: nextAuditId(),
    agentId: input.agentId,
    actionType: input.actionType,
    timestamp: new Date().toISOString(),
    summary: input.summary,
    decision: input.decision,
    approvalStatus: input.approvalStatus ?? 'not_required',
    relatedRunId: input.relatedRunId,
    relatedPrId: input.relatedPrId,
    relatedDocumentId: input.relatedDocumentId,
    relatedEventId: input.relatedEventId,
    actor: input.actor
  }
  auditEntries = [entry, ...auditEntries].slice(0, 500)
  return entry
}

export function getAgentAuditTrail(agentId?: FounderAgentId): FounderAgentAuditEntry[] {
  if (agentId) return auditEntries.filter((e) => e.agentId === agentId)
  return [...auditEntries]
}

export function clearAgentAuditTrail(): void {
  auditEntries = []
}
