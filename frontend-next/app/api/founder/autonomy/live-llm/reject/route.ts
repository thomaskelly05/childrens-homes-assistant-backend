import { handleAutonomyLiveLlmRejectPost } from '@/lib/founder/autonomy/autonomy-api'

export async function POST(request: Request) {
  return handleAutonomyLiveLlmRejectPost(request)
}
