import { handleRelationshipOpportunitiesPost } from '@/lib/founder/relationships/relationship-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ relationshipId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { relationshipId } = await context.params
  return handleRelationshipOpportunitiesPost(request, relationshipId)
}
