import { handleRevenueManualEntryPost } from '@/lib/founder/revenue/revenue-agent-api'

export async function POST(request: Request) {
  return handleRevenueManualEntryPost(request)
}
