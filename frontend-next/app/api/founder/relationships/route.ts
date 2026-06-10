import {
  handleRelationshipsListGet,
  handleRelationshipsPost
} from '@/lib/founder/relationships/relationship-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleRelationshipsListGet(request)
}

export async function POST(request: Request) {
  return handleRelationshipsPost(request)
}
