import { handleLearningLoopAuditGet } from '@/lib/founder/learning-loop/learning-loop-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleLearningLoopAuditGet(request)
}
