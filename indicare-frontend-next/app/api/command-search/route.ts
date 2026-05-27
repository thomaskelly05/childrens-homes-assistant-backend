import { NextResponse } from 'next/server'

import { getCommandSearchResults } from '@/lib/os-api/command-search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const result = await getCommandSearchResults(query)

  return NextResponse.json({
    results: result.data,
    source: result.source,
    warning: result.warning,
    error: result.error
  })
}
