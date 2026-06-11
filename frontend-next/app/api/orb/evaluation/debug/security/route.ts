import { handleEvaluationSecurityDebugGet } from '@/lib/orb/evaluation/orb-evaluation-security-debug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleEvaluationSecurityDebugGet(request)
}
