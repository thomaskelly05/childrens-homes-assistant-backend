import { proxyRequestToBackend } from '@/lib/auth/backend-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ path: string[] }>
}

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params
  return proxyRequestToBackend(request, path)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
