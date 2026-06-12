import { handleRevenueAgentGet } from '@/lib/founder/revenue/revenue-agent-api'

export async function GET() {
  return handleRevenueAgentGet()
}
