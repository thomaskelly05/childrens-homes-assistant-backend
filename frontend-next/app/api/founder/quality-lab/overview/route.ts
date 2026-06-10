import { handleQualityLabOverviewGet } from '@/lib/founder/quality-lab/quality-lab-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleQualityLabOverviewGet(request)
}
