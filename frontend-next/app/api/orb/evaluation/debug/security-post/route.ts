import { handleEvaluationSecurityDebugPost } from '@/lib/orb/evaluation/orb-evaluation-security-debug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleEvaluationSecurityDebugPost(request)
}
