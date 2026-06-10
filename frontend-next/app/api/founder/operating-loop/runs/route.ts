import { handleOperatingLoopRunsGet } from '@/lib/founder/operating-loop/operating-loop-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleOperatingLoopRunsGet()
}
