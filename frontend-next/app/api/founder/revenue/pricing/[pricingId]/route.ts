import { handleRevenuePricingPatch } from '@/lib/founder/revenue/revenue-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ pricingId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const { pricingId } = await context.params
  return handleRevenuePricingPatch(request, pricingId)
}
