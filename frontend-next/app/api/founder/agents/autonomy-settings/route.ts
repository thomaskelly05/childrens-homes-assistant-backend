import {
  handleFounderAgentsAutonomySettingsGet,
  handleFounderAgentsAutonomySettingsPost
} from '@/lib/founder/agents/autonomous/founder-agent-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleFounderAgentsAutonomySettingsGet()
}

export async function POST(request: Request) {
  return handleFounderAgentsAutonomySettingsPost(request)
}
