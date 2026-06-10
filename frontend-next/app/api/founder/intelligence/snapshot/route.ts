import {
  handleIntelligenceGeneratePost,
  handleIntelligenceSnapshotGet
} from '@/lib/founder/intelligence-centre/intelligence-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleIntelligenceSnapshotGet()
}

export async function POST() {
  return handleIntelligenceGeneratePost()
}
