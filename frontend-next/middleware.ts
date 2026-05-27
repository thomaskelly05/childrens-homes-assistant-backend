import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const allowedLegacyPrefixes = [
  '/build-live',
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.json',
  '/js',
  '/css',
  '/assets',
  '/images',
  '/components'
]

function isAllowedLegacyPath(pathname: string) {
  return allowedLegacyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isAllowedLegacyPath(pathname)) {
    const response = NextResponse.next()
    response.headers.set('x-indicare-runtime', 'legacy-front-door-marker')
    return response
  }

  const url = request.nextUrl.clone()
  url.pathname = '/build-live'
  url.searchParams.set('from', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
