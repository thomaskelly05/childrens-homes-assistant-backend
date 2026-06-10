import { handleRevenueSnapshotGet } from '@/lib/founder/revenue/revenue-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleRevenueSnapshotGet(request)
}
