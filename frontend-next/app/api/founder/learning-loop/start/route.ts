import { handleLearningLoopStartPost } from '@/lib/founder/learning-loop/learning-loop-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleLearningLoopStartPost(request)
}
