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
    headers.append(key, value)
  })
  return headers
}

export async function proxyRequestToBackend(
  request: Request,
  pathSegments: string[]
): Promise<Response> {
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

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: sanitizeResponseHeaders(upstream.headers)
  })
}
