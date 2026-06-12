import { handleRevenueAgentReportGet } from '@/lib/founder/revenue/revenue-agent-api'

export async function GET() {
  return handleRevenueAgentReportGet()
}
