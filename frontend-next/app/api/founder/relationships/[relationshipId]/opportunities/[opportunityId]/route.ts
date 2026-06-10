import { handleRelationshipOpportunityPatch } from '@/lib/founder/relationships/relationship-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ relationshipId: string; opportunityId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { relationshipId, opportunityId } = await context.params
  return handleRelationshipOpportunityPatch(request, relationshipId, opportunityId)
}
