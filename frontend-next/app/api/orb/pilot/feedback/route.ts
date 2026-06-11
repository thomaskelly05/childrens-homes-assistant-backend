import { handleOrbPilotFeedbackPost } from '@/lib/orb/pilot/orb-pilot-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleOrbPilotFeedbackPost(request)
}
