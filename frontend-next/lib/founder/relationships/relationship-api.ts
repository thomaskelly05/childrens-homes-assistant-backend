import { NextResponse } from 'next/server'

import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import { requireFounderSession } from '@/lib/founder/persistence/founder-api-handler'
import { analyseRelationship } from './relationship-intelligence-engine'
import {
  sanitiseInteractionInput,
  sanitiseOpportunityCreateInput,
  sanitiseOpportunityPatchInput,
  sanitiseRelationshipCreateInput,
  sanitiseRelationshipPatchInput
} from './relationship-safety'
import {
  addRelationshipInteraction,
  archiveRelationship,
  createRelationship,
  createRelationshipOpportunity,
  generateFollowUpDraft,
  generateEvidencePackForRelationship,
  getRelationship,
  getRelationshipBundles,
  getRelationships,
  hydrateRelationshipsFromPersistence,
  searchRelationships,
  updateRelationship,
  updateRelationshipOpportunity
} from './relationship-store'

export async function handleRelationshipsListGet(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await hydrateRelationshipsFromPersistence()

  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? ''
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const priority = url.searchParams.get('priority')
  const dueFollowUp = url.searchParams.get('dueFollowUp') === 'true'
  const tag = url.searchParams.get('tag')

  let relationships = query ? searchRelationships(query) : getRelationships().filter((r) => r.status !== 'archived')

  if (type) relationships = relationships.filter((r) => r.relationshipType === type)
  if (status) relationships = relationships.filter((r) => r.status === status)
  if (priority) relationships = relationships.filter((r) => r.priority === priority)
  if (tag) relationships = relationships.filter((r) => r.tags.includes(tag))
  if (dueFollowUp) {
    const dueIds = new Set(
      getRelationshipBundles()
        .filter((b) => analyseRelationship(b).followUpNeeded)
        .map((b) => b.relationship.id)
    )
    relationships = relationships.filter((r) => dueIds.has(r.id))
  }

  return NextResponse.json(sanitiseFounderPayload({ relationships }))
}

export async function handleRelationshipsPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = sanitiseRelationshipCreateInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const createdBy = session.user.email ?? 'founder'
  const bundle = await createRelationship(parsed.input, createdBy)
  return NextResponse.json(sanitiseFounderPayload({ relationship: bundle.relationship, bundle }), { status: 201 })
}

export async function handleRelationshipGet(relationshipId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await hydrateRelationshipsFromPersistence()
  const bundle = getRelationship(relationshipId)
  if (!bundle) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const intelligence = analyseRelationship(bundle)
  return NextResponse.json(sanitiseFounderPayload({ bundle, intelligence }))
}

export async function handleRelationshipPatch(
  request: Request,
  relationshipId: string
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = sanitiseRelationshipPatchInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const bundle = await updateRelationship(relationshipId, parsed.patch, actor)
  if (!bundle) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ bundle, intelligence: analyseRelationship(bundle) }))
}

export async function handleRelationshipInteractionsPost(
  request: Request,
  relationshipId: string
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = sanitiseInteractionInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const createdBy = session.user.email ?? 'founder'
  const interaction = await addRelationshipInteraction(relationshipId, parsed.input, createdBy)
  if (!interaction) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const bundle = getRelationship(relationshipId)
  return NextResponse.json(sanitiseFounderPayload({ interaction, bundle }), { status: 201 })
}

export async function handleRelationshipOpportunitiesPost(
  request: Request,
  relationshipId: string
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = sanitiseOpportunityCreateInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const opportunity = await createRelationshipOpportunity(relationshipId, parsed.input, actor)
  if (!opportunity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ opportunity }), { status: 201 })
}

export async function handleRelationshipOpportunityPatch(
  request: Request,
  relationshipId: string,
  opportunityId: string
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = sanitiseOpportunityPatchInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const opportunity = await updateRelationshipOpportunity(relationshipId, opportunityId, parsed.patch, actor)
  if (!opportunity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ opportunity }))
}

export async function handleRelationshipArchivePost(relationshipId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const actor = session.user.email ?? 'founder'
  const bundle = await archiveRelationship(relationshipId, actor)
  if (!bundle) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ bundle }))
}

export async function handleRelationshipFollowUpDraftPost(relationshipId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const actor = session.user.email ?? 'founder'
  try {
    const result = await generateFollowUpDraft(relationshipId, actor)
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(
      sanitiseFounderPayload({
        ...result,
        message: 'Follow-up draft saved and queued for approval. No message will be sent automatically.'
      }),
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Draft generation failed' },
      { status: 400 }
    )
  }
}

export async function handleRelationshipEvidencePackPost(relationshipId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const actor = session.user.email ?? 'founder'
  const result = await generateEvidencePackForRelationship(relationshipId, actor)
  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(
    sanitiseFounderPayload({
      ...result,
      message: 'Evidence pack generated and linked to relationship. Approval required before external use.'
    }),
    { status: 201 }
  )
}
