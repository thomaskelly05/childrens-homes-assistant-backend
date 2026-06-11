import { handleEvaluationRunGet } from '@/lib/orb/evaluation/orb-evaluation-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params
  return handleEvaluationRunGet(request, runId)
}
