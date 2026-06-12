import { handleFinanceReportGet } from '@/lib/founder/finance/finance-api'

export async function GET() {
  return handleFinanceReportGet()
}
