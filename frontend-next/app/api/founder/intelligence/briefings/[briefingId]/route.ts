import {
  handleIntelligenceBriefingGet,
  handleIntelligenceBriefingPatch
} from '@/lib/founder/intelligence-centre/intelligence-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ briefingId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { briefingId } = await context.params
  return handleIntelligenceBriefingGet(briefingId)
}

export async function PATCH(request: Request, context: RouteContext) {
  const { briefingId } = await context.params
  return handleIntelligenceBriefingPatch(briefingId, request)
}
