import { handleFinanceGet } from '@/lib/founder/finance/finance-api'

export async function GET() {
  return handleFinanceGet()
}
