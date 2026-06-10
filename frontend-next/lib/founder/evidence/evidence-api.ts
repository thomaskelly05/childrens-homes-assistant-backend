import { NextResponse } from 'next/server'

import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import { requireFounderSession } from '@/lib/founder/persistence/founder-api-handler'
import {
  archiveEvidencePack,
  generateEvidencePackForAudience,
  getEvidencePack,
  getEvidencePacks,
  hydrateEvidencePacksFromPersistence,
  submitPackForApproval,
  updateEvidencePack
} from './evidence-store'
import type { EvidenceAudience } from './evidence-types'

const VALID_AUDIENCES = new Set<EvidenceAudience>([
  'investor',
  'provider',
  'openai',
  'microsoft',
  'innovate-uk',
  'dfe',
  'local-authority',
  'pilot-partner',
  'general'
])

function parseAudience(value: unknown): EvidenceAudience | null {
  if (typeof value !== 'string') return null
  const normalised = value.trim().toLowerCase() as EvidenceAudience
  return VALID_AUDIENCES.has(normalised) ? normalised : null
}

export async function handleEvidenceListGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await hydrateEvidencePacksFromPersistence()
  return NextResponse.json(sanitiseFounderPayload({ packs: getEvidencePacks() }))
}

export async function handleEvidenceGeneratePost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { audience?: string }
  const audience = parseAudience(body.audience)
  if (!audience) {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 })
  }

  const createdBy = session.user.email ?? 'founder'
  const pack = await generateEvidencePackForAudience(audience, createdBy)
  return NextResponse.json(sanitiseFounderPayload({ pack }), { status: 201 })
}

export async function handleEvidencePackGet(packId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await hydrateEvidencePacksFromPersistence()
  const local = getEvidencePack(packId)
  if (local) {
    return NextResponse.json(sanitiseFounderPayload({ pack: local }))
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function handleEvidencePackPatch(request: Request, packId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    status?: string
    title?: string
    purpose?: string
  }

  const actor = session.user.email ?? 'founder'
  const patch: Parameters<typeof updateEvidencePack>[1] = {}

  if (body.title) patch.title = body.title.slice(0, 200)
  if (body.purpose) patch.purpose = body.purpose.slice(0, 500)
  if (body.status === 'draft' || body.status === 'needs-review' || body.status === 'approved' || body.status === 'archived') {
    patch.status = body.status
  }

  const updated = await updateEvidencePack(packId, patch, actor)
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ pack: updated }))
}

export async function handleEvidencePackApprovePost(packId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const actor = session.user.email ?? 'founder'
  const pack = await submitPackForApproval(packId, actor)
  if (!pack) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ pack }))
}

export async function handleEvidencePackArchivePost(packId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const actor = session.user.email ?? 'founder'
  const pack = await archiveEvidencePack(packId, actor)
  if (!pack) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ pack }))
}
