import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPrefixes = [
  '/login',
  '/unauthorized',
  '/auth',
  '/api',
  '/mfa',
  '/mfa-setup',
  '/mfa-recovery',
  '/js',
  '/css',
  '/assets',
  '/components'
]
const sessionCookieNames = ['indicare_session', '__Host-indicare_session']
const e2eAuthEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'

function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function hasSessionCookie(request: NextRequest) {
  return sessionCookieNames.some((name) => Boolean(request.cookies.get(name)?.value))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!e2eAuthEnabled && !isPublicPath(pathname) && !hasSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('returnUrl', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()

  response.headers.set('x-indicare-runtime', 'operational')

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
