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
  const workspaceResponse = await fetch(
    `${BACKEND_ORIGIN}/os/young-people/${encodeURIComponent(childId)}/workspace`,
    {
      cache: 'no-store',
      headers
    }
  ).catch(() => undefined)

  if (!workspaceResponse) {
    return NextResponse.json({ ok: false, error: 'This child workspace is not available just now.' }, { status: 503 })
  }

  const payload = (await workspaceResponse.json().catch(() => ({}))) as Record<string, unknown>
  if (!workspaceResponse.ok) {
    return NextResponse.json({ ok: false, error: calmError(workspaceResponse.status) }, { status: workspaceResponse.status })
  }

  const workspace = (payload.data ?? payload) as Record<string, unknown>
  const youngPerson = (workspace.young_person ?? workspace.youngPerson ?? {}) as Record<string, unknown>
  const displayName =
    youngPerson.display_name ||
    youngPerson.displayName ||
    [youngPerson.first_name || youngPerson.firstName, youngPerson.last_name || youngPerson.lastName].filter(Boolean).join(' ') ||
    `Young person ${childId}`

  return NextResponse.json({
    ok: true,
    childId,
    source: 'os-young-person-workspace',
    canonicalRoute: `/os/young-people/${childId}/workspace`,
    data: {
      ok: true,
      context_ready: true,
      scope: {
        type: 'child',
        young_person_id: Number(childId),
        home_id: youngPerson.home_id ?? youngPerson.homeId,
        retrieval_scope: 'selected_child_only',
        allow_global_search: false
      },
      child: {
        id: Number(childId),
        display_name: displayName,
        preferred_name: youngPerson.preferred_name || youngPerson.preferredName || youngPerson.first_name || youngPerson.firstName,
        status: youngPerson.placement_status || youngPerson.placementStatus || youngPerson.status,
        risk_level: youngPerson.risk_level || youngPerson.summary_risk_level || youngPerson.riskLevel
      },
      summary: {
        counts: {
          chronology: Array.isArray(workspace.chronology) ? workspace.chronology.length : 0,
          actions: Array.isArray(workspace.actions) ? workspace.actions.length : 0,
          evidence: Array.isArray(workspace.evidence) ? workspace.evidence.length : 0,
          documents: Array.isArray(workspace.documents) ? workspace.documents.length : 0,
          reports: Array.isArray(workspace.reports) ? workspace.reports.length : 0
        },
        recent_activity: Array.isArray(workspace.chronology) ? workspace.chronology.slice(0, 10) : [],
        alerts: []
      },
      workspace
    }
  })
}
