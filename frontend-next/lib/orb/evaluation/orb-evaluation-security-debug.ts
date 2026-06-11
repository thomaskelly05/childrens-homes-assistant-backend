import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import {
  CSRF_COOKIE_NAMES,
  CSRF_HEADER_NAMES,
  getRequestAuthProfile,
  mergeFounderProxyHeaders,
  requireFounderSession
} from '@/lib/founder/auth/founder-session'
import { userHasFounderAccessFromProfile } from '@/lib/founder/access'
import {
  csrfTokenPrefix,
  getCsrfTokenFromCookieStore,
  getIncomingCsrfHeader,
  hasSessionCookie,
  visibleCookieNames
} from '@/lib/security/csrf-server'

const BACKEND_CSRF_PROBE_PATH = '/orb/admin/evaluation/scenarios/generate'

export async function handleEvaluationSecurityDebugGet(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const csrfCookie = getCsrfTokenFromCookieStore(cookieStore)
  const incomingCsrf = getIncomingCsrfHeader(request)

  return NextResponse.json({
    success: true,
    request: {
      hasCookieHeader: Boolean(cookieHeader),
      visibleCookieNames: visibleCookieNames(cookieHeader),
      hasAuthorization: Boolean(request.headers.get('authorization')),
      hasXCsrfToken: Boolean(incomingCsrf),
      csrfHeaderPrefix: csrfTokenPrefix(incomingCsrf)
    },
    serverCookies: {
      hasIndicareCsrf: Boolean(cookieStore.get('indicare_csrf')?.value),
      hasHostIndicareCsrf: Boolean(cookieStore.get('__Host-indicare_csrf')?.value),
      hasSessionCookie: hasSessionCookie(cookieStore),
      csrfCookiePrefix: csrfTokenPrefix(csrfCookie)
    },
    auth: {
      founderSessionResolved: true,
      role: session.user.role ?? session.user.roles?.[0] ?? null
    },
    expected: {
      csrfHeaderNamesAccepted: [...CSRF_HEADER_NAMES],
      csrfCookieNamesAccepted: [...CSRF_COOKIE_NAMES]
    }
  })
}

export async function handleEvaluationSecurityDebugPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const backendOrigin = getInternalBackendOrigin()

  const upstream = await fetch(`${backendOrigin}${BACKEND_CSRF_PROBE_PATH}`, {
    method: 'POST',
    headers: mergeFounderProxyHeaders(
      request,
      cookieHeader,
      { 'Content-Type': 'application/json' },
      cookieStore
    ),
    body: JSON.stringify({ count: 1, pack_type: 'standard' }),
    cache: 'no-store'
  })

  if (!upstream.ok) {
    const bodyText = await upstream.text().catch(() => '')
    try {
      const parsed = JSON.parse(bodyText) as Record<string, unknown>
      if (parsed.detail === 'csrf_failed') {
        return NextResponse.json(
          {
            success: false,
            csrfPassed: false,
            detail: parsed.detail,
            message:
              typeof parsed.message === 'string'
                ? parsed.message
                : 'Session security check failed. Please refresh and try again.'
          },
          { status: upstream.status }
        )
      }
      return NextResponse.json(parsed, { status: upstream.status })
    } catch {
      return NextResponse.json(
        { success: false, csrfPassed: false, error: bodyText.slice(0, 240) || 'CSRF probe failed' },
        { status: upstream.status }
      )
    }
  }

  return NextResponse.json({ success: true, csrfPassed: true })
}

/** @internal test helper — auth profile resolution without founder gate */
export async function resolveEvaluationDebugAuthProfile() {
  const user = await getRequestAuthProfile()
  return {
    authenticated: Boolean(user),
    founder: user ? userHasFounderAccessFromProfile(user) : false,
    role: user?.role ?? user?.roles?.[0] ?? null
  }
}
