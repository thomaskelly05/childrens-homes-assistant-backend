import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { userHasFounderAccess } from '@/lib/founder/access'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

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
  'audit-log': 'audit-log'
}

type FounderSession =
  | { ok: true; user: { id?: number; email?: string; role?: string } }
  | { ok: false; response: NextResponse }

type AuthenticatedSession =
  | { ok: true; user: { id?: number; email?: string; role?: string } }
  | { ok: false; response: NextResponse }

export async function requireAuthenticatedSession(): Promise<AuthenticatedSession> {
  const cookieHeader = (await cookies()).toString()
  if (!cookieHeader) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const backendOrigin = getInternalBackendOrigin()
  const meResponse = await fetch(`${backendOrigin}/auth/me`, {
    headers: { cookie: cookieHeader, accept: 'application/json' },
    cache: 'no-store'
  }).catch(() => null)

  if (!meResponse?.ok) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const user = (await meResponse.json().catch(() => ({}))) as {
    id?: number
    email?: string
    role?: string
  }

  return { ok: true, user }
}

export async function requireFounderSession(): Promise<FounderSession> {
  const cookieHeader = (await cookies()).toString()
  if (!cookieHeader) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const backendOrigin = getInternalBackendOrigin()
  const meResponse = await fetch(`${backendOrigin}/auth/me`, {
    headers: { cookie: cookieHeader, accept: 'application/json' },
    cache: 'no-store'
  }).catch(() => null)

  if (!meResponse?.ok) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const user = (await meResponse.json().catch(() => ({}))) as {
    id?: number
    email?: string
    role?: string
  }

  if (!userHasFounderAccess(user.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, user }
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

async function proxyToBackendTelemetry(
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

  const headers = new Headers()
  headers.set('cookie', cookieHeader)
  headers.set('accept', 'application/json')
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const csrf = request.headers.get('x-csrf-token')
  if (csrf) headers.set('x-csrf-token', csrf)

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const upstream = await fetch(target.toString(), {
    method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store'
  })

  const payload = await upstream.json().catch(() => ({}))
  const sanitised = sanitiseFounderPayload(payload)
  return NextResponse.json(sanitised, { status: upstream.status })
}

async function proxyToBackend(request: Request, backendPath: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const url = new URL(request.url)
  const target = new URL(`${backendOrigin}/founder-os/persistence/${backendPath}`)
  url.searchParams.forEach((value, key) => target.searchParams.append(key, value))

  const headers = new Headers()
  headers.set('cookie', cookieHeader)
  headers.set('accept', 'application/json')
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const csrf = request.headers.get('x-csrf-token')
  if (csrf) headers.set('x-csrf-token', csrf)

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const upstream = await fetch(target.toString(), {
    method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store'
  })

  const payload = await upstream.json().catch(() => ({}))
  const sanitised = sanitiseFounderPayload(payload)
  return NextResponse.json(sanitised, { status: upstream.status })
}

export async function handleFounderApi(request: Request, segments: string[]): Promise<NextResponse> {
  if (segments.length === 0) {
    return NextResponse.json({ ok: true, service: 'founder-persistence' })
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
