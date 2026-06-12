import { handleFounderAgentsGet } from '@/lib/founder/agents/autonomous/founder-agent-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleFounderAgentsGet()
}
