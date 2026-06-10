import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { addContentDraft } from '@/lib/founder/content/content-draft-store'
import { generateEvidencePackForAudience } from '@/lib/founder/evidence/evidence-store'
import { relationshipRepository } from '@/lib/founder/persistence'
import type { FounderRelationshipRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import { recommendEvidenceAudienceForRelationship } from './relationship-evidence'
import type { RelationshipCreateInput } from './relationship-safety'
import type {
  FounderRelationship,
  RelationshipBundle,
  RelationshipInteraction,
  RelationshipOpportunity
} from './relationship-types'

let bundles: RelationshipBundle[] = []

function recordFromBundle(
  bundle: RelationshipBundle,
  source: FounderRelationshipRecord['source'] = 'founder-ui'
): FounderRelationshipRecord {
  return {
    id: bundle.relationship.id,
    ...baseTimestamps(bundle.relationship.createdBy, source),
    status: bundle.relationship.status,
    bundle
  }
}

export async function hydrateRelationshipsFromPersistence(): Promise<void> {
  try {
    const records = await relationshipRepository.list()
    bundles = records.map((r) => r.bundle)
  } catch {
    /* keep local cache */
  }
}

export function getRelationshipBundles(): RelationshipBundle[] {
  return [...bundles]
}

export function getRelationships(): FounderRelationship[] {
  return bundles.map((b) => b.relationship)
}

export function getActiveRelationships(): FounderRelationship[] {
  return bundles.map((b) => b.relationship).filter((r) => r.status !== 'archived')
}

export function getRelationship(id: string): RelationshipBundle | undefined {
  return bundles.find((b) => b.relationship.id === id)
}

export function searchRelationships(query: string): FounderRelationship[] {
  const q = query.trim().toLowerCase()
  if (!q) return getActiveRelationships()

  return getActiveRelationships().filter((r) => {
    const haystack = [
      r.name,
      r.organisation,
      r.notes,
      r.nextAction,
      r.source,
      ...r.tags,
      ...r.interests
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export async function createRelationship(
  input: RelationshipCreateInput,
  createdBy: string
): Promise<RelationshipBundle> {
  const now = new Date().toISOString()
  const relationship: FounderRelationship = {
    id: nextId('rel'),
    name: input.name,
    organisation: input.organisation,
    relationshipType: input.relationshipType,
    status: input.status,
    priority: input.priority,
    email: input.email,
    linkedin: input.linkedin,
    website: input.website,
    notes: input.notes,
    interests: input.interests ?? [],
    nextAction: input.nextAction,
    nextActionDue: input.nextActionDue,
    source: input.source ?? 'founder-ui',
    createdAt: now,
    updatedAt: now,
    createdBy,
    tags: input.tags ?? [],
    linkedEvidencePackIds: []
  }

  const bundle: RelationshipBundle = {
    relationship,
    interactions: [],
    opportunities: []
  }

  bundles = [bundle, ...bundles]
  await relationshipRepository.create(recordFromBundle(bundle), {
    actor: createdBy,
    auditSummary: `Relationship created: ${relationship.name} (${relationship.organisation})`
  })
  await appendAuditLog({
    actor: createdBy,
    eventType: 'created',
    entityType: 'relationship',
    entityId: relationship.id,
    summary: `Relationship created: ${relationship.name} at ${relationship.organisation}`,
    status: relationship.status
  })

  return bundle
}

async function persistBundle(bundle: RelationshipBundle, actor: string, auditSummary: string): Promise<void> {
  const updated: RelationshipBundle = {
    ...bundle,
    relationship: { ...bundle.relationship, updatedAt: new Date().toISOString() }
  }
  const index = bundles.findIndex((b) => b.relationship.id === bundle.relationship.id)
  if (index === -1) return
  bundles = [...bundles.slice(0, index), updated, ...bundles.slice(index + 1)]

  await relationshipRepository.update(
    updated.relationship.id,
    { bundle: updated, status: updated.relationship.status } as Partial<FounderRelationshipRecord>,
    { actor, auditSummary }
  )
  await appendAuditLog({
    actor,
    eventType: 'updated',
    entityType: 'relationship',
    entityId: updated.relationship.id,
    summary: auditSummary,
    status: updated.relationship.status
  })
}

export async function updateRelationship(
  id: string,
  patch: Partial<FounderRelationship>,
  actor: string
): Promise<RelationshipBundle | undefined> {
  const existing = getRelationship(id)
  if (!existing) return undefined

  const bundle: RelationshipBundle = {
    ...existing,
    relationship: { ...existing.relationship, ...patch, updatedAt: new Date().toISOString() }
  }

  await persistBundle(bundle, actor, `Relationship updated: ${bundle.relationship.name}`)
  return bundle
}

export async function archiveRelationship(id: string, actor: string): Promise<RelationshipBundle | undefined> {
  return updateRelationship(id, { status: 'archived' }, actor)
}

export function getRelationshipInteractions(relationshipId: string): RelationshipInteraction[] {
  return getRelationship(relationshipId)?.interactions ?? []
}

export async function addRelationshipInteraction(
  relationshipId: string,
  input: Omit<RelationshipInteraction, 'id' | 'relationshipId' | 'createdAt' | 'createdBy'>,
  createdBy: string
): Promise<RelationshipInteraction | undefined> {
  const existing = getRelationship(relationshipId)
  if (!existing) return undefined

  const interaction: RelationshipInteraction = {
    id: nextId('rint'),
    relationshipId,
    ...input,
    createdAt: new Date().toISOString(),
    createdBy
  }

  const bundle: RelationshipBundle = {
    ...existing,
    interactions: [interaction, ...existing.interactions],
    relationship: {
      ...existing.relationship,
      lastContactAt: interaction.createdAt,
      updatedAt: new Date().toISOString()
    }
  }

  await persistBundle(bundle, createdBy, `Interaction logged for ${bundle.relationship.name}: ${interaction.type}`)
  return interaction
}

export function getRelationshipOpportunities(relationshipId: string): RelationshipOpportunity[] {
  return getRelationship(relationshipId)?.opportunities ?? []
}

export async function createRelationshipOpportunity(
  relationshipId: string,
  input: Omit<RelationshipOpportunity, 'id' | 'relationshipId' | 'createdAt' | 'updatedAt'>,
  actor: string
): Promise<RelationshipOpportunity | undefined> {
  const existing = getRelationship(relationshipId)
  if (!existing) return undefined

  const now = new Date().toISOString()
  const opportunity: RelationshipOpportunity = {
    id: nextId('ropp'),
    relationshipId,
    ...input,
    createdAt: now,
    updatedAt: now
  }

  const bundle: RelationshipBundle = {
    ...existing,
    opportunities: [opportunity, ...existing.opportunities]
  }

  await persistBundle(bundle, actor, `Opportunity created for ${bundle.relationship.name}: ${opportunity.title}`)
  return opportunity
}

export async function updateRelationshipOpportunity(
  relationshipId: string,
  opportunityId: string,
  patch: Partial<RelationshipOpportunity>,
  actor: string
): Promise<RelationshipOpportunity | undefined> {
  const existing = getRelationship(relationshipId)
  if (!existing) return undefined

  const index = existing.opportunities.findIndex((o) => o.id === opportunityId)
  if (index === -1) return undefined

  const updated: RelationshipOpportunity = {
    ...existing.opportunities[index],
    ...patch,
    updatedAt: new Date().toISOString()
  }

  const opportunities = [...existing.opportunities]
  opportunities[index] = updated

  const bundle: RelationshipBundle = {
    ...existing,
    opportunities
  }

  await persistBundle(bundle, actor, `Opportunity updated for ${bundle.relationship.name}: ${updated.title}`)
  return updated
}

export async function linkEvidencePackToRelationship(
  relationshipId: string,
  packId: string,
  actor: string
): Promise<RelationshipBundle | undefined> {
  const existing = getRelationship(relationshipId)
  if (!existing) return undefined

  const linked = new Set(existing.relationship.linkedEvidencePackIds ?? [])
  linked.add(packId)

  return updateRelationship(
    relationshipId,
    { linkedEvidencePackIds: [...linked] },
    actor
  )
}

export async function generateEvidencePackForRelationship(
  relationshipId: string,
  actor: string
): Promise<{ packId: string; audience: string } | undefined> {
  const bundle = getRelationship(relationshipId)
  if (!bundle) return undefined

  const audience = recommendEvidenceAudienceForRelationship(bundle.relationship)
  const pack = await generateEvidencePackForAudience(audience, actor)
  await linkEvidencePackToRelationship(relationshipId, pack.id, actor)
  return { packId: pack.id, audience }
}

function buildFollowUpDraftBody(relationship: FounderRelationship): string {
  const greeting = `Dear ${relationship.name},`
  const context = relationship.notes
    ? `Following our previous conversation about ${relationship.organisation}, I wanted to share a brief update on IndiCare Intelligence for children's homes.`
    : `I am reaching out regarding IndiCare Intelligence and ethical intelligence for children's homes.`
  const action = relationship.nextAction
    ? `As discussed, my next step is: ${relationship.nextAction}.`
    : 'I would welcome a short conversation to explore whether a pilot or introduction would be helpful.'
  const close =
    'This draft is for founder review only. No message will be sent without your explicit approval.'

  return [greeting, '', context, '', action, '', 'Kind regards,', 'Thomas Kelly', 'Founder, IndiCare Intelligence', '', close].join('\n')
}

export async function generateFollowUpDraft(
  relationshipId: string,
  actor: string
): Promise<{ draftId: string; approvalId: string } | undefined> {
  const bundle = getRelationship(relationshipId)
  if (!bundle) return undefined

  const body = buildFollowUpDraftBody(bundle.relationship)
  const safety = checkFounderOutputSafety(body)
  if (!safety.safe) {
    throw new Error('Follow-up draft failed safety review — remove identifiable operational content')
  }

  const draft = addContentDraft({
    title: `Follow-up: ${bundle.relationship.name} (${bundle.relationship.organisation})`,
    channel: 'provider-update',
    body,
    createdByAgent: 'relationship-intelligence',
    safetyNotes: safety.issues.map((i) => i.message),
    dataBasis: `Recorded relationship data for ${bundle.relationship.organisation}. No fabricated interest or traction claimed.`
  })

  const approval = createApprovalItem({
    type: 'relationship-message',
    title: draft.title,
    content: body,
    requestedByAgent: 'Relationship Intelligence',
    riskLevel: safety.requiresReview ? 'high' : 'medium',
    safetyCheck: safety.issues.map((i) => i.message).join('; ') || 'Relationship follow-up draft — approval required before external use'
  })

  await appendAuditLog({
    actor,
    eventType: 'created',
    entityType: 'content',
    entityId: draft.id,
    summary: `Follow-up draft created for ${bundle.relationship.name} — queued for approval`,
    linkedEntityId: approval.id,
    linkedEntityType: 'approval'
  })

  return { draftId: draft.id, approvalId: approval.id }
}

export function getRelationshipFollowUpsForBriefing(): string[] {
  const due = bundles
    .filter((b) => b.relationship.status !== 'archived')
    .filter((b) => {
      if (!b.relationship.nextActionDue) return b.relationship.status === 'follow-up-needed'
      return Date.parse(b.relationship.nextActionDue) <= Date.now()
    })
    .slice(0, 5)

  return due.map(
    (b) => `Follow up with ${b.relationship.name} (${b.relationship.organisation}): ${b.relationship.nextAction}`
  )
}
