import { handleAutonomyEmailSendPost } from '@/lib/founder/autonomy/autonomy-api'

export async function POST(request: Request) {
  return handleAutonomyEmailSendPost(request)
}
