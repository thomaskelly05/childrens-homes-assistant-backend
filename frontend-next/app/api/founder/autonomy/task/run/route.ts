import { handleAutonomyTaskRunPost } from '@/lib/founder/autonomy/autonomy-api'

export async function POST(request: Request) {
  return handleAutonomyTaskRunPost(request)
}
