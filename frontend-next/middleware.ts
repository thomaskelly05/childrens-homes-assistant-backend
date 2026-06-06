import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPrefixes = [
  '/login',
  '/unauthorized',
  '/auth',
  '/backend',
  '/api',
  '/mfa',
  '/mfa-setup',
  '/mfa-recovery',
  '/js',
  '/css',
  '/assets',
  '/components',
  '/build-live'
]

/** ORB paths that must stay reachable without a session cookie (login, signup, billing, callbacks). */
const orbPublicPrefixes = [
  '/orb/login',
  '/orb/signup',
  '/orb/billing',
  '/orb/billing/success',
  '/orb/billing/cancel',
  '/orb/access',
  '/orb/onboarding'
]

const sessionCookieNames = ['indicare_session', '__Host-indicare_session']
const e2eAuthEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'

function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isOrbPath(pathname: string) {
  return pathname === '/orb' || pathname.startsWith('/orb/')
}

function isOrbPublicPath(pathname: string) {
  return orbPublicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isOrbProductPath(pathname: string) {
  return isOrbPath(pathname) && !isOrbPublicPath(pathname)
}

function hasSessionCookie(request: NextRequest) {
  return sessionCookieNames.some((name) => Boolean(request.cookies.get(name)?.value))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!e2eAuthEnabled && isOrbProductPath(pathname) && !hasSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/orb/login'
    loginUrl.searchParams.set('returnUrl', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (!e2eAuthEnabled && !isPublicPath(pathname) && !isOrbPath(pathname) && !hasSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('returnUrl', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set('x-indicare-runtime', 'operational')
  response.headers.set('x-indicare-build-location', 'frontend-next')
  if (isOrbProductPath(pathname)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
