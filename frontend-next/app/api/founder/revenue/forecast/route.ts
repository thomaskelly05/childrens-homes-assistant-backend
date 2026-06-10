import { handleRevenueForecastPost } from '@/lib/founder/revenue/revenue-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleRevenueForecastPost(request)
}
