import { proxyToBackend } from '@/lib/founder/persistence/founder-api-handler'
import {
  isKnownPersistenceEntitySlug,
  unknownPersistenceEntityMessage
} from '@/lib/founder/persistence/founder-api-entities'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ entity: string; id: string }>
}

async function handle(request: Request, context: RouteContext) {
  const { entity, id } = await context.params
  if (!isKnownPersistenceEntitySlug(entity)) {
    return NextResponse.json({ error: unknownPersistenceEntityMessage(entity) }, { status: 404 })
  }
  return proxyToBackend(request, `${entity}/${encodeURIComponent(id)}`)
}

export const GET = handle
export const PATCH = handle
export const DELETE = handle
