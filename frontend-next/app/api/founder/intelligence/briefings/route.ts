import {
  handleIntelligenceBriefingGeneratePost,
  handleIntelligenceBriefingsGet
} from '@/lib/founder/intelligence-centre/intelligence-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleIntelligenceBriefingsGet()
}

export async function POST(request: Request) {
  return handleIntelligenceBriefingGeneratePost(request)
}
