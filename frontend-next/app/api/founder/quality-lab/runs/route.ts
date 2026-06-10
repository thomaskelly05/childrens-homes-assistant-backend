import { handleQualityLabRunsPost } from '@/lib/founder/quality-lab/quality-lab-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleQualityLabRunsPost(request)
}
