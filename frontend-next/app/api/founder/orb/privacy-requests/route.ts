import { proxyRequestToBackend } from '@/lib/auth/backend-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return proxyRequestToBackend(request, ['orb', 'privacy', 'requests', 'admin'])
}
