import {
  handleRelationshipGet,
  handleRelationshipPatch
} from '@/lib/founder/relationships/relationship-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ relationshipId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { relationshipId } = await context.params
  return handleRelationshipGet(relationshipId)
}

export async function PATCH(request: Request, context: RouteContext) {
  const { relationshipId } = await context.params
  return handleRelationshipPatch(request, relationshipId)
}
