import { handleFounderAgentsActionPost } from '@/lib/founder/agents/autonomous/founder-agent-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleFounderAgentsActionPost(request)
}
