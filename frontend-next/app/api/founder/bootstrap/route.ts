import { buildFounderBootstrapResponse } from '@/lib/founder/live/founder-live-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return buildFounderBootstrapResponse(request)
}
