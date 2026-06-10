import { proxyToBackendTelemetry } from '@/lib/founder/persistence/founder-api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return proxyToBackendTelemetry(request, 'summary', 'founder')
}
