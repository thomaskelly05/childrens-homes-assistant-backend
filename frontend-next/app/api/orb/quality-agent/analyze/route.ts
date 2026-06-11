import { handleQualityAgentAnalyzeGet } from '@/lib/orb/quality-agent/orb-quality-agent-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleQualityAgentAnalyzeGet(request)
}
