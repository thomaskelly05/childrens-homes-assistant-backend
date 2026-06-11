import { handleFounderOrbPilotSummaryGet } from '@/lib/orb/pilot/orb-pilot-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleFounderOrbPilotSummaryGet(request)
}
