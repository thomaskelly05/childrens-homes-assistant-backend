import { getInternalBackendOrigin } from '@/lib/auth/api-base'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade'
])

/** Upstream CORS headers confuse browsers on same-origin `/backend` fetches — strip them. */
const UPSTREAM_CORS_HEADERS = new Set([
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-expose-headers',
  'access-control-max-age'
])

const FORWARD_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-csrf-token',
  'x-requested-with',
  'x-orb-surface',
  'x-forwarded-for',
  'x-real-ip'
]

function buildUpstreamUrl(pathSegments: string[], request: Request): string {
  const origin = getInternalBackendOrigin()
  const path = pathSegments.map((segment) => encodeURIComponent(segment)).join('/')
  const url = new URL(`${origin}/${path}`)
  const incoming = new URL(request.url)
  incoming.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })
  return url.toString()
}

function pickForwardHeaders(request: Request): Headers {
  const headers = new Headers()
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has('accept') && request.method !== 'GET' && request.method !== 'HEAD') {
    headers.set('accept', 'application/json')
  }
  return headers
}

function sanitizeResponseHeaders(upstream: Headers): Headers {
  const headers = new Headers()
  upstream.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lower)) return
    if (UPSTREAM_CORS_HEADERS.has(lower)) return
    if (lower === 'content-length') return
    headers.append(key, value)
  })
  return headers
}

function handlePreflight(request: Request): Response | null {
  if (request.method.toUpperCase() !== 'OPTIONS') return null
  const headers = new Headers()
  headers.set('Allow', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS')
  headers.set('Cache-Control', 'no-store')
  return new Response(null, { status: 204, headers })
}

function isStreamResponse(pathSegments: string[], upstream: Response): boolean {
  const contentType = upstream.headers.get('content-type')?.toLowerCase() || ''
  const path = pathSegments.join('/').toLowerCase()
  return contentType.includes('text/event-stream') || path.includes('conversation/stream')
}

export async function proxyRequestToBackend(
  request: Request,
  pathSegments: string[]
): Promise<Response> {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  const upstreamUrl = buildUpstreamUrl(pathSegments, request)
  const headers = pickForwardHeaders(request)
  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error duplex required for streaming request bodies in Node 18+
    duplex: hasBody ? 'half' : undefined,
    redirect: 'manual',
    cache: 'no-store'
  })

  const responseHeaders = sanitizeResponseHeaders(upstream.headers)

  if (isStreamResponse(pathSegments, upstream)) {
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    })
  }

  const body = await upstream.arrayBuffer()
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  })
}
