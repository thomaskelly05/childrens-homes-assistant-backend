import type { BrainAuditSummary, MicroCheckRotationState, MicroCheckRunRecord } from './brain-audit-types.ts'

let latestAudit: BrainAuditSummary | null = null
let auditHistory: BrainAuditSummary[] = []
let microCheckHistory: MicroCheckRunRecord[] = []
let rotationState: MicroCheckRotationState = { lastAreaIds: [], lastRunAt: null }

export function getLatestBrainAudit(): BrainAuditSummary | null {
  return latestAudit
}

export function getBrainAuditHistory(limit = 20): BrainAuditSummary[] {
  return auditHistory.slice(0, limit)
}

export function setLatestBrainAudit(audit: BrainAuditSummary): void {
  latestAudit = audit
  auditHistory.unshift(audit)
  if (auditHistory.length > 50) auditHistory = auditHistory.slice(0, 50)
}

export function getMicroCheckHistory(limit = 50): MicroCheckRunRecord[] {
  return microCheckHistory.slice(0, limit)
}

export function getLatestMicroCheck(): MicroCheckRunRecord | null {
  return microCheckHistory[0] ?? null
}

export function addMicroCheckRecord(record: MicroCheckRunRecord): void {
  microCheckHistory.unshift(record)
  if (microCheckHistory.length > 200) microCheckHistory = microCheckHistory.slice(0, 200)
}

export function getMicroCheckRotationState(): MicroCheckRotationState {
  return { ...rotationState }
}

export function updateMicroCheckRotationState(patch: Partial<MicroCheckRotationState>): MicroCheckRotationState {
  rotationState = { ...rotationState, ...patch }
  return getMicroCheckRotationState()
}

export function resetBrainAuditStore(): void {
  latestAudit = null
  auditHistory = []
  microCheckHistory = []
  rotationState = { lastAreaIds: [], lastRunAt: null }
}
