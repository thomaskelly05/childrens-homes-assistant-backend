import { handleFounderAgentsAuditGet } from '@/lib/founder/agents/autonomous/founder-agent-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleFounderAgentsAuditGet(request)
}
