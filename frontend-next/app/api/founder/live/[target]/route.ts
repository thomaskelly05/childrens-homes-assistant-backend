import { proxyFounderLiveData } from '@/lib/founder/live/founder-live-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TARGETS = new Set([
  'providers',
  'homes',
  'inspection evidence preparation',
  'orb-feedback-summary',
  'orb-billing-usage'
])

type RouteContext = { params: Promise<{ target: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { target } = await context.params
  if (!TARGETS.has(target)) {
    return Response.json({ error: `Unknown founder live data target: ${target}` }, { status: 404 })
  }

  return proxyFounderLiveData(
    request,
    target as
      | 'providers'
      | 'homes'
      | 'inspection evidence preparation'
      | 'orb-feedback-summary'
      | 'orb-billing-usage'
  )
}
