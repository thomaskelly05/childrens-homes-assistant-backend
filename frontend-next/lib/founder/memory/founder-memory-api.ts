/**
 * Founder Memory API handlers — founder/admin only.
 */

import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/persistence/founder-api-handler'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import {
  archiveFounderMemoryItem,
  createFounderMemoryItem,
  getFounderMemoryItem,
  getFounderMemoryItems,
  getFounderStrategicContext,
  hydrateFounderMemoryFromPersistence,
  searchFounderMemory,
  updateFounderMemoryItem
} from './founder-memory-store'
import type { CreateFounderMemoryItemInput, UpdateFounderMemoryItemInput } from './founder-memory-types'

async function ensureHydrated(): Promise<void> {
  await hydrateFounderMemoryFromPersistence()
}

export async function handleFounderMemoryListGet(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await ensureHydrated()

  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? ''
  const status = url.searchParams.get('status')

  let items = query ? searchFounderMemory(query) : getFounderMemoryItems()
  if (status) {
    items = items.filter((item) => item.status === status)
  }

  return NextResponse.json(sanitiseFounderPayload({ items, count: items.length }))
}

export async function handleFounderMemoryPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await ensureHydrated()

  const body = (await request.json().catch(() => ({}))) as CreateFounderMemoryItemInput
  const actor = session.user.email ?? 'founder'
  const result = await createFounderMemoryItem(body, actor)

  if (result.errors?.length) {
    return NextResponse.json({ errors: result.errors }, { status: 400 })
  }

  return NextResponse.json(sanitiseFounderPayload({ item: result.item }), { status: 201 })
}

export async function handleFounderMemoryContextGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await ensureHydrated()

  return NextResponse.json(sanitiseFounderPayload({ context: getFounderStrategicContext() }))
}

export async function handleFounderMemoryItemGet(id: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await ensureHydrated()

  const item = getFounderMemoryItem(id)
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ item }))
}

export async function handleFounderMemoryItemPatch(request: Request, id: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  await ensureHydrated()

  const body = (await request.json().catch(() => ({}))) as UpdateFounderMemoryItemInput & { archive?: boolean }
  const actor = session.user.email ?? 'founder'

  const result = body.archive
    ? await archiveFounderMemoryItem(id, actor)
    : await updateFounderMemoryItem(id, body, actor)

  if (result.errors?.length) {
    const status = result.errors[0] === 'Memory item not found.' ? 404 : 400
    return NextResponse.json({ errors: result.errors }, { status })
  }

  return NextResponse.json(sanitiseFounderPayload({ item: result.item }))
}
