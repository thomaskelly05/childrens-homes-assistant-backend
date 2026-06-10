import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isFounderDashboardRoute } from './lib/founder/access'
import { buildOrbFrontDoorUrl, isOrbSurfacePath, sanitizeOrbReturnUrl } from './lib/orb/orb-front-door-routing'

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
  '/build-live',
  '/privacy',
  '/terms',
  '/cookies',
  '/support'
]

/** ORB paths reachable without a session cookie (signup, billing, callbacks). Login is on /orb via OrbAuthGate. */
const orbPublicPrefixes = [
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

function isOrbPublicPath(pathname: string) {
  return orbPublicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isOrbProductPath(pathname: string) {
  return isOrbSurfacePath(pathname) && !isOrbPublicPath(pathname)
}

function hasSessionCookie(request: NextRequest) {
  return sessionCookieNames.some((name) => Boolean(request.cookies.get(name)?.value))
}

function redirectToOrbFrontDoor(request: NextRequest, returnUrl?: string | null) {
  const target = request.nextUrl.clone()
  const safeReturn = sanitizeOrbReturnUrl(returnUrl ?? request.nextUrl.searchParams.get('returnUrl'))
  target.pathname = '/orb'
  target.search = ''
  if (safeReturn !== '/orb') {
    target.searchParams.set('returnUrl', safeReturn)
  }
  return NextResponse.redirect(target)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/orb', request.url))
  }

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return redirectToOrbFrontDoor(request, request.nextUrl.searchParams.get('returnUrl'))
  }

  if (pathname === '/orb/login' || pathname.startsWith('/orb/login/')) {
    return redirectToOrbFrontDoor(request, request.nextUrl.searchParams.get('returnUrl'))
  }

  if (!e2eAuthEnabled && !isPublicPath(pathname) && !isOrbSurfacePath(pathname) && !hasSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/orb'
    const returnTarget = `${pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set('returnUrl', sanitizeOrbReturnUrl(returnTarget))
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set('x-indicare-runtime', 'operational')
  response.headers.set('x-indicare-build-location', 'frontend-next')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()')
  if (isFounderDashboardRoute(pathname)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  }

  if (isOrbProductPath(pathname)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    const cspMode = process.env.ORB_CSP_MODE === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'
    response.headers.set(
      cspMode,
      "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; " +
        "img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss:; " +
        "frame-src 'self' https://js.stripe.com https://checkout.stripe.com;"
    )
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
