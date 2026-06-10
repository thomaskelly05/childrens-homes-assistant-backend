import { handleOperatingLoopRunPost } from '@/lib/founder/operating-loop/operating-loop-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleOperatingLoopRunPost(request)
}
