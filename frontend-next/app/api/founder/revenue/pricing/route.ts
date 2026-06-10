import { handleRevenuePricingGet, handleRevenuePricingPost } from '@/lib/founder/revenue/revenue-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRevenuePricingGet()
}

export async function POST(request: Request) {
  return handleRevenuePricingPost(request)
}
