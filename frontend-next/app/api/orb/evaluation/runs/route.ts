import { handleEvaluationRunsGet, handleEvaluationRunsPost } from '@/lib/orb/evaluation/orb-evaluation-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleEvaluationRunsGet(request)
}

export async function POST(request: Request) {
  return handleEvaluationRunsPost(request)
}
