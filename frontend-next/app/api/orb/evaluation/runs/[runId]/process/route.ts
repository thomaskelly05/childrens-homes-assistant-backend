import { handleEvaluationRunProcessPost } from '@/lib/orb/evaluation/orb-evaluation-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params
  return handleEvaluationRunProcessPost(request, runId)
}
