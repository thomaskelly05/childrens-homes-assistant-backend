import { proxyToBackend } from '@/lib/founder/persistence/founder-api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  return proxyToBackend(request, `approvals/${encodeURIComponent(id)}/decision`)
}
