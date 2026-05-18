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
  if (status === 404) return 'Live child workspace returned 0 rows for this child.'
  return 'This child workspace is not available just now.'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const childId = url.searchParams.get('childId')
  if (!childId || !Number.isFinite(Number(childId))) {
    return NextResponse.json({ ok: false, error: 'Choose a child before opening this workspace.' }, { status: 400 })
  }

  const cookieHeader = (await cookies()).toString()
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined
  const response = await fetch(`${BACKEND_ORIGIN}/child-workspace/context/${encodeURIComponent(childId)}`, {
    cache: 'no-store',
    headers
  }).catch(() => undefined)
  const fallbackResponse = response?.ok ? response : await fetch(`${BACKEND_ORIGIN}/os/young-people/${encodeURIComponent(childId)}/workspace`, {
    cache: 'no-store',
    headers
  }).catch(() => undefined)

  if (!fallbackResponse) {
    return NextResponse.json({ ok: false, error: 'This child workspace is not available just now.' }, { status: 503 })
  }

  const payload = (await fallbackResponse.json().catch(() => ({}))) as Record<string, unknown>
  if (!fallbackResponse.ok) {
    return NextResponse.json({ ok: false, error: calmError(fallbackResponse.status) }, { status: fallbackResponse.status })
  }

  return NextResponse.json({ ok: true, childId, source: response?.ok ? 'child-workspace' : 'os-young-person-workspace', data: payload })
}
