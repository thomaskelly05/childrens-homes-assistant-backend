import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import {
  buildFounderProxyHeaders,
  requireAuthenticatedSession,
  requireFounderSession
} from '@/lib/founder/auth/founder-session'

export { requireAuthenticatedSession, requireFounderSession } from '@/lib/founder/auth/founder-session'
import {
  handleFounderMemoryContextGet,
  handleFounderMemoryItemGet,
  handleFounderMemoryItemPatch,
  handleFounderMemoryListGet,
  handleFounderMemoryPost
} from '@/lib/founder/memory/founder-memory-api'
import {
  handleEvidenceGeneratePost,
  handleEvidenceListGet,
  handleEvidencePackApprovePost,
  handleEvidencePackArchivePost,
  handleEvidencePackGet,
  handleEvidencePackPatch
} from '@/lib/founder/evidence/evidence-api'
import {
  handleOperatingLoopRunGet,
  handleOperatingLoopRunPost,
  handleOperatingLoopRunsGet
} from '@/lib/founder/operating-loop/operating-loop-api'
import {
  isKnownPersistenceEntitySlug,
  unknownPersistenceEntityMessage
} from '@/lib/founder/persistence/founder-api-entities'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import { EMPTY_FOUNDER_TELEMETRY_SUMMARY } from '@/lib/founder/telemetry/founder-telemetry-types'

const ROUTE_ENTITY_MAP: Record<string, string> = {
  actions: 'actions',
  approvals: 'approvals',
  content: 'content',
  'build-briefs': 'build-briefs',
  'staff-team/runs': 'staff-team-runs',
  'agent-runs': 'agent-runs',
  'operating-loop/runs': 'operating-loop-runs',
  'quality-lab/runs': 'quality-runs',
  'quality-lab/proposals': 'quality-proposals',
  'quality-lab/expert-reviews': 'expert-reviews',
  'safety-reviews': 'safety-reviews',
  'audit-log': 'audit-log',
  memories: 'memories',
  evidence: 'evidence-packs'
}

function resolveEntitySlug(segments: string[]): { entitySlug: string; rest: string[] } | null {
  for (const [routeKey, entitySlug] of Object.entries(ROUTE_ENTITY_MAP)) {
    const parts = routeKey.split('/')
    if (segments.length >= parts.length && parts.every((part, index) => segments[index] === part)) {
      return { entitySlug, rest: segments.slice(parts.length) }
    }
  }
  return null
}

export async function proxyToBackendTelemetry(
  request: Request,
  backendPath: string,
  auth: 'founder' | 'authenticated'
): Promise<NextResponse> {
  const session = auth === 'founder' ? await requireFounderSession() : await requireAuthenticatedSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const url = new URL(request.url)
  const target = new URL(`${backendOrigin}/founder-os/telemetry/${backendPath}`)
  url.searchParams.forEach((value, key) => target.searchParams.append(key, value))

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const upstream = await fetch(target.toString(), {
    method,
    headers: buildFounderProxyHeaders(request, cookieHeader),
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store'
  }).catch(() => null)

  if (!upstream) {
    if (backendPath === 'summary' && method === 'GET') {
      return NextResponse.json({ success: true, data: EMPTY_FOUNDER_TELEMETRY_SUMMARY }, { status: 200 })
    }
    return NextResponse.json({ error: 'Founder telemetry backend unavailable' }, { status: 503 })
  }

  if (upstream.status === 404 && backendPath === 'summary' && method === 'GET') {
    return NextResponse.json({ success: true, data: EMPTY_FOUNDER_TELEMETRY_SUMMARY }, { status: 200 })
  }

  const payload = await upstream.json().catch(() => ({}))
  const sanitised = sanitiseFounderPayload(payload)
  return NextResponse.json(sanitised, { status: upstream.status })
}

export async function proxyToBackend(request: Request, backendPath: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const [entitySlug] = backendPath.split('/')
  if (entitySlug && !isKnownPersistenceEntitySlug(entitySlug)) {
    return NextResponse.json({ error: unknownPersistenceEntityMessage(entitySlug) }, { status: 404 })
  }

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const url = new URL(request.url)
  const target = new URL(`${backendOrigin}/founder-os/persistence/${backendPath}`)
  url.searchParams.forEach((value, key) => target.searchParams.append(key, value))

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const upstream = await fetch(target.toString(), {
    method,
    headers: buildFounderProxyHeaders(request, cookieHeader),
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store'
  }).catch(() => null)

  if (!upstream) {
    if (method === 'GET' && entitySlug && backendPath === entitySlug) {
      return NextResponse.json({ success: true, data: { items: [], count: 0 } }, { status: 200 })
    }
    return NextResponse.json({ error: 'Founder persistence backend unavailable' }, { status: 503 })
  }

  if (
    upstream.status === 404 &&
    method === 'GET' &&
    entitySlug &&
    isKnownPersistenceEntitySlug(entitySlug) &&
    backendPath === entitySlug
  ) {
    return NextResponse.json({ success: true, data: { items: [], count: 0 } }, { status: 200 })
  }

  const payload = await upstream.json().catch(() => ({}))
  const sanitised = sanitiseFounderPayload(payload)
  return NextResponse.json(sanitised, { status: upstream.status })
}

export async function handleFounderApi(request: Request, segments: string[]): Promise<NextResponse> {
  if (segments.length === 0) {
    return NextResponse.json({ ok: true, service: 'founder-persistence' })
  }

  if (segments[0] === 'memory') {
    if (segments.length === 1 && request.method.toUpperCase() === 'GET') {
      return handleFounderMemoryListGet(request)
    }
    if (segments.length === 1 && request.method.toUpperCase() === 'POST') {
      return handleFounderMemoryPost(request)
    }
    if (segments.length === 2 && segments[1] === 'context' && request.method.toUpperCase() === 'GET') {
      return handleFounderMemoryContextGet()
    }
    if (segments.length === 2 && segments[1] !== 'context' && request.method.toUpperCase() === 'GET') {
      return handleFounderMemoryItemGet(segments[1])
    }
    if (segments.length === 2 && segments[1] !== 'context' && request.method.toUpperCase() === 'PATCH') {
      return handleFounderMemoryItemPatch(request, segments[1])
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (segments[0] === 'evidence') {
    if (segments.length === 1 && request.method.toUpperCase() === 'GET') {
      return handleEvidenceListGet()
    }
    if (segments.length === 2 && segments[1] === 'generate' && request.method.toUpperCase() === 'POST') {
      return handleEvidenceGeneratePost(request)
    }
    if (segments.length === 2 && request.method.toUpperCase() === 'GET') {
      return handleEvidencePackGet(segments[1])
    }
    if (segments.length === 2 && request.method.toUpperCase() === 'PATCH') {
      return handleEvidencePackPatch(request, segments[1])
    }
    if (segments.length === 3 && segments[2] === 'approve' && request.method.toUpperCase() === 'POST') {
      return handleEvidencePackApprovePost(segments[1])
    }
    if (segments.length === 3 && segments[2] === 'archive' && request.method.toUpperCase() === 'POST') {
      return handleEvidencePackArchivePost(segments[1])
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (segments[0] === 'operating-loop') {
    if (segments[1] === 'run' && request.method.toUpperCase() === 'POST') {
      return handleOperatingLoopRunPost(request)
    }
    if (segments[1] === 'runs' && segments.length === 2 && request.method.toUpperCase() === 'GET') {
      return handleOperatingLoopRunsGet()
    }
    if (segments[1] === 'runs' && segments.length === 3 && request.method.toUpperCase() === 'GET') {
      return handleOperatingLoopRunGet(segments[2])
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (segments[0] === 'persistence') {
    const inner = segments.slice(1)
    if (inner.length === 0) {
      return NextResponse.json({ ok: true, service: 'founder-persistence-proxy' })
    }
    return proxyToBackend(request, inner.join('/'))
  }

  if (segments[0] === 'telemetry') {
    const inner = segments.slice(1)
    if (inner.length === 1 && inner[0] === 'event' && request.method.toUpperCase() === 'POST') {
      return proxyToBackendTelemetry(request, 'event', 'authenticated')
    }
    if (inner.length === 1 && inner[0] === 'summary' && request.method.toUpperCase() === 'GET') {
      return proxyToBackendTelemetry(request, 'summary', 'founder')
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const resolved = resolveEntitySlug(segments)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { entitySlug, rest } = resolved

  if (entitySlug === 'approvals' && rest.length === 2 && rest[1] === 'decision') {
    return proxyToBackend(request, `approvals/${rest[0]}/decision`)
  }

  if (rest.length === 0) {
    return proxyToBackend(request, entitySlug)
  }

  if (rest.length === 1) {
    return proxyToBackend(request, `${entitySlug}/${rest[0]}`)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
