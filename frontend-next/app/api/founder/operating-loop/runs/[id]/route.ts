import { handleOperatingLoopRunGet } from '@/lib/founder/operating-loop/operating-loop-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  return handleOperatingLoopRunGet(id)
}
