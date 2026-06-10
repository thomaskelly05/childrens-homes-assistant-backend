import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { evidencePackRepository } from '@/lib/founder/persistence'
import type { FounderEvidencePackRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { baseTimestamps } from '@/lib/founder/persistence/repositories/repository-base'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import {
  formatEvidencePackText,
  generateEvidencePack as buildEvidencePackDraft,
  overallPackConfidence
} from './evidence-pack-generator'
import type { EvidenceAudience, EvidencePack } from './evidence-types'

let packs: EvidencePack[] = []

function recordFromPack(
  pack: EvidencePack,
  source: FounderEvidencePackRecord['source'] = 'founder-ui'
): FounderEvidencePackRecord {
  return {
    id: pack.id,
    ...baseTimestamps(pack.createdBy, source),
    status: pack.status,
    pack,
    linkedApprovalId: pack.approvalId
  }
}

export async function hydrateEvidencePacksFromPersistence(): Promise<void> {
  try {
    const records = await evidencePackRepository.list()
    packs = records.map((r) => r.pack)
  } catch {
    /* keep local cache */
  }
}

export function getEvidencePacks(): EvidencePack[] {
  return [...packs].filter((p) => p.status !== 'archived')
}

export function getAllEvidencePacksIncludingArchived(): EvidencePack[] {
  return [...packs]
}

export function getEvidencePack(id: string): EvidencePack | undefined {
  return packs.find((p) => p.id === id)
}

export function getPacksNeedingApproval(): EvidencePack[] {
  return packs.filter((p) => p.status === 'needs-review' || p.status === 'draft')
}

function queueApprovalForPack(pack: EvidencePack): string {
  const content = formatEvidencePackText(pack)
  const approval = createApprovalItem({
    type: 'evidence-pack',
    title: pack.title,
    content,
    requestedByAgent: 'Evidence Pack Agent',
    riskLevel: pack.safetyReview.safe ? 'medium' : 'high',
    safetyCheck: pack.safetyReview.issues.map((i) => i.message).join('; ') || 'Evidence pack safety review complete'
  })
  return approval.id
}

export async function createEvidencePack(
  pack: EvidencePack,
  options?: { skipApproval?: boolean; actor?: string }
): Promise<EvidencePack> {
  const safety = checkFounderOutputSafety(formatEvidencePackText(pack))
  const stored: EvidencePack = {
    ...pack,
    safetyReview: {
      safe: safety.safe,
      issues: safety.issues,
      requiresReview: safety.requiresReview,
      reviewedAt: new Date().toISOString()
    },
    status: safety.safe ? pack.status : 'needs-review'
  }

  if (!options?.skipApproval && !stored.approvalId) {
    stored.approvalId = queueApprovalForPack(stored)
  }

  packs = [stored, ...packs]
  await evidencePackRepository.create(recordFromPack(stored), {
    actor: options?.actor ?? stored.createdBy,
    auditSummary: `Evidence pack created: ${stored.title}`
  })
  await appendAuditLog({
    actor: options?.actor ?? stored.createdBy,
    eventType: 'created',
    entityType: 'evidence_pack',
    entityId: stored.id,
    summary: `Evidence pack created: ${stored.title}`,
    status: stored.status,
    linkedEntityId: stored.approvalId,
    linkedEntityType: stored.approvalId ? 'approval' : undefined
  })
  return stored
}

export async function updateEvidencePack(
  id: string,
  patch: Partial<EvidencePack>,
  actor = 'founder'
): Promise<EvidencePack | undefined> {
  const index = packs.findIndex((p) => p.id === id)
  if (index === -1) return undefined

  const updated: EvidencePack = {
    ...packs[index],
    ...patch,
    updatedAt: new Date().toISOString()
  }

  if (patch.sections || patch.limitations) {
    const safety = checkFounderOutputSafety(formatEvidencePackText(updated))
    updated.safetyReview = {
      safe: safety.safe,
      issues: safety.issues,
      requiresReview: safety.requiresReview,
      reviewedAt: new Date().toISOString()
    }
  }

  packs = [...packs.slice(0, index), updated, ...packs.slice(index + 1)]
  await evidencePackRepository.update(id, {
    status: updated.status,
    pack: updated,
    linkedApprovalId: updated.approvalId
  } as Partial<FounderEvidencePackRecord>, {
    actor,
    auditSummary: `Evidence pack updated: ${updated.title}`
  })
  await appendAuditLog({
    actor,
    eventType: 'updated',
    entityType: 'evidence_pack',
    entityId: id,
    summary: `Evidence pack updated: ${updated.title}`,
    status: updated.status
  })
  return updated
}

export async function archiveEvidencePack(id: string, actor = 'founder'): Promise<EvidencePack | undefined> {
  const pack = getEvidencePack(id)
  if (!pack) return undefined

  const archived: EvidencePack = {
    ...pack,
    status: 'archived',
    updatedAt: new Date().toISOString()
  }
  const index = packs.findIndex((p) => p.id === id)
  packs = [...packs.slice(0, index), archived, ...packs.slice(index + 1)]

  await evidencePackRepository.update(id, {
    status: 'archived',
    pack: archived,
    linkedApprovalId: archived.approvalId
  } as Partial<FounderEvidencePackRecord>)
  await appendAuditLog({
    actor,
    eventType: 'status_changed',
    entityType: 'evidence_pack',
    entityId: id,
    summary: `Evidence pack archived: ${archived.title}`,
    status: 'archived'
  })
  return archived
}

export async function generateEvidencePack(
  audience: EvidenceAudience,
  createdBy = 'founder'
): Promise<EvidencePack> {
  const pack = buildEvidencePackDraft(audience, createdBy)
  return createEvidencePack(pack, { actor: createdBy })
}

/** @deprecated Use generateEvidencePack */
export const generateEvidencePackForAudience = generateEvidencePack

export async function submitPackForApproval(id: string, actor = 'founder'): Promise<EvidencePack | undefined> {
  const pack = getEvidencePack(id)
  if (!pack) return undefined

  const approvalId = pack.approvalId ?? queueApprovalForPack(pack)
  return updateEvidencePack(id, { approvalId, status: 'needs-review' }, actor)
}

export async function syncPackOnApprovalDecision(
  approvalId: string,
  status: 'approved' | 'rejected' | 'needs-changes'
): Promise<void> {
  const pack = packs.find((p) => p.approvalId === approvalId)
  if (!pack) return

  const newStatus =
    status === 'approved' ? 'approved' : status === 'rejected' ? 'needs-review' : 'needs-review'

  const index = packs.findIndex((p) => p.id === pack.id)
  const updated = { ...pack, status: newStatus as EvidencePack['status'], updatedAt: new Date().toISOString() }
  packs = [...packs.slice(0, index), updated, ...packs.slice(index + 1)]

  await evidencePackRepository.update(pack.id, {
    status: newStatus,
    pack: updated
  } as Partial<FounderEvidencePackRecord>)
  await appendAuditLog({
    actor: 'founder',
    eventType: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'needs_changes',
    entityType: 'evidence_pack',
    entityId: pack.id,
    summary: `Evidence pack ${status} via approval ${approvalId}`,
    status: newStatus,
    linkedEntityId: approvalId,
    linkedEntityType: 'approval'
  })
}

export function canCopyEvidencePack(pack: EvidencePack): boolean {
  return pack.status === 'approved' && pack.safetyReview.safe
}

export function getPackConfidence(pack: EvidencePack) {
  return overallPackConfidence(pack)
}
