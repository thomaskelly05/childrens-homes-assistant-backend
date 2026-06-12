import { handleFinanceForecastPost } from '@/lib/founder/finance/finance-api'

export async function POST(request: Request) {
  return handleFinanceForecastPost(request)
}
