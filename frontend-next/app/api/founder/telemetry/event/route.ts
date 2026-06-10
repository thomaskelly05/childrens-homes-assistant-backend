import { proxyToBackendTelemetry } from '@/lib/founder/persistence/founder-api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return proxyToBackendTelemetry(request, 'event', 'authenticated')
}
