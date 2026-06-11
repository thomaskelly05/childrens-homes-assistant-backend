import { handleEvaluationScenariosGet } from '@/lib/orb/evaluation/orb-evaluation-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleEvaluationScenariosGet(request)
}
