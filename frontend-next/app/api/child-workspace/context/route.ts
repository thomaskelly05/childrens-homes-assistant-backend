import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '')

function calmError(status: number) {
  if (status === 401 || status === 403) return "I couldn't verify access to this child workspace."
  if (status === 404) return 'No records found yet.'
  return 'This child workspace is not available just now.'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const childId = url.searchParams.get('childId')
  if (!childId || !Number.isFinite(Number(childId))) {
    return NextResponse.json({ ok: false, error: 'Choose a child before opening this workspace.' }, { status: 400 })
  }

  const cookieHeader = (await cookies()).toString()
  const response = await fetch(`${BACKEND_ORIGIN}/child-workspace/context/${encodeURIComponent(childId)}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  }).catch(() => undefined)

  if (!response) {
    return NextResponse.json({ ok: false, error: 'This child workspace is not available just now.' }, { status: 503 })
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    return NextResponse.json({ ok: false, error: calmError(response.status) }, { status: response.status })
  }

  return NextResponse.json(payload)
}
