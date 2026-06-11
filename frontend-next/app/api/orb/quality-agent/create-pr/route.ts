import { handleQualityAgentCreatePrPost } from '@/lib/orb/quality-agent/orb-quality-agent-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleQualityAgentCreatePrPost(request)
}
