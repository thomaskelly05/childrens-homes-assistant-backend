import { cache } from 'react'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { userHasFounderAccessFromProfile } from '@/lib/founder/access'
import {
  CSRF_COOKIE_NAMES,
  CSRF_HEADER_NAMES,
  getCsrfTokenFromCookieStore,
  getCsrfTokenFromCookieString,
  getIncomingCsrfHeader,
  hasSessionCookie,
  resolveProxyCsrfToken
} from '@/lib/security/csrf-server'

export type FounderAuthUser = {
  id?: number
  email?: string
  role?: string
  roles?: string[]
  permissions?: string[]
  is_admin?: boolean
  isFounder?: boolean
}

type AuthMePayload = {
  ok?: boolean
  user?: FounderAuthUser
  id?: number
  email?: string
  role?: string
}

export type FounderSessionResult =
  | { ok: true; user: FounderAuthUser }
  | { ok: false; response: NextResponse }

export type AuthenticatedSessionResult =
  | { ok: true; user: FounderAuthUser }
  | { ok: false; response: NextResponse }

function parseAuthMeUser(payload: unknown): FounderAuthUser | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as AuthMePayload
  const user = body.user ?? body
  if (!user || typeof user !== 'object') return null
  if (!('id' in user) && !('email' in user) && !('role' in user)) return null
  return user as FounderAuthUser
}

async function fetchAuthMeProfile(cookieHeader: string): Promise<FounderAuthUser | null> {
  if (!cookieHeader) return null

  const backendOrigin = getInternalBackendOrigin()
  const meResponse = await fetch(`${backendOrigin}/auth/me`, {
    headers: { cookie: cookieHeader, accept: 'application/json' },
    cache: 'no-store'
  }).catch(() => null)

  if (!meResponse?.ok) return null
  return parseAuthMeUser(await meResponse.json().catch(() => null))
}

/** Deduplicated /auth/me lookup within a single server request. */
export const getRequestAuthProfile = cache(async (): Promise<FounderAuthUser | null> => {
  const cookieHeader = (await cookies()).toString()
  return fetchAuthMeProfile(cookieHeader)
})

export async function requireAuthenticatedSession(): Promise<AuthenticatedSessionResult> {
  const user = await getRequestAuthProfile()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }
  return { ok: true, user }
}

export async function requireFounderSession(): Promise<FounderSessionResult> {
  const user = await getRequestAuthProfile()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  if (!userHasFounderAccessFromProfile(user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Founder access required' }, { status: 403 })
    }
  }

  return { ok: true, user }
}

export function buildFounderProxyHeaders(
  request: Request,
  cookieHeader: string,
  cookieStore?: Parameters<typeof resolveProxyCsrfToken>[2]
): Headers {
  const headers = new Headers()
  headers.set('cookie', cookieHeader)
  headers.set('accept', 'application/json')
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const csrf = resolveProxyCsrfToken(request, cookieHeader, cookieStore)
  if (csrf) headers.set('x-csrf-token', csrf)
  const authorization = request.headers.get('authorization')
  if (authorization) headers.set('authorization', authorization)
  return headers
}

/** Merge proxy headers without spreading a Headers instance (spread drops cookie forwarding). */
export function mergeFounderProxyHeaders(
  request: Request,
  cookieHeader: string,
  extra?: HeadersInit,
  cookieStore?: Parameters<typeof resolveProxyCsrfToken>[2]
): Headers {
  const merged = buildFounderProxyHeaders(request, cookieHeader, cookieStore)
  if (!extra) return merged
  const extraHeaders = extra instanceof Headers ? extra : new Headers(extra)
  extraHeaders.forEach((value, key) => merged.set(key, value))
  return merged
}

export {
  CSRF_COOKIE_NAMES,
  CSRF_HEADER_NAMES,
  getCsrfTokenFromCookieStore,
  getCsrfTokenFromCookieString,
  getIncomingCsrfHeader,
  hasSessionCookie
}
