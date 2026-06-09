import { handleFounderApi } from '@/lib/founder/persistence/founder-api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ path?: string[] }>
}

async function handle(request: Request, context: RouteContext) {
  const { path = [] } = await context.params
  return handleFounderApi(request, path)
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
