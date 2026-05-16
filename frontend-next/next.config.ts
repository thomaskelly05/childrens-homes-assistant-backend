import type { NextConfig } from 'next'

const backendOrigin = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.indicare.co.uk' : 'http://localhost:8000')
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`
      },
      {
        source: '/auth/:path*',
        destination: `${backendOrigin}/auth/:path*`
      },
      {
        source: '/health',
        destination: `${backendOrigin}/health`
      },
      {
        source: '/assistant/:path*',
        destination: `${backendOrigin}/assistant/:path*`
      },
      {
        source: '/orb/:path*',
        destination: `${backendOrigin}/orb/:path*`
      },
      {
        source: '/os/:path*',
        destination: `${backendOrigin}/os/:path*`
      },
      {
        source: '/os-command/:path*',
        destination: `${backendOrigin}/os-command/:path*`
      },
      {
        source: '/young-people/:path*',
        destination: `${backendOrigin}/young-people/:path*`
      },
      {
        source: '/inspection/:path*',
        destination: `${backendOrigin}/inspection/:path*`
      },
      {
        source: '/inspection-os/:path*',
        destination: `${backendOrigin}/inspection-os/:path*`
      },
      {
        source: '/staff/:path*',
        destination: `${backendOrigin}/staff/:path*`
      },
      {
        source: '/staff-today/:path*',
        destination: `${backendOrigin}/staff-today/:path*`
      },
      {
        source: '/supervision/:path*',
        destination: `${backendOrigin}/supervision/:path*`
      },
      {
        source: '/tasks/:path*',
        destination: `${backendOrigin}/tasks/:path*`
      },
      {
        source: '/evidence/:path*',
        destination: `${backendOrigin}/evidence/:path*`
      },
      {
        source: '/workspace-records/:path*',
        destination: `${backendOrigin}/workspace-records/:path*`
      },
      {
        source: '/workspace/:path*',
        destination: `${backendOrigin}/workspace/:path*`
      },
      {
        source: '/account/:path*',
        destination: `${backendOrigin}/account/:path*`
      },
      {
        source: '/standalone-intelligence/:path*',
        destination: `${backendOrigin}/standalone-intelligence/:path*`
      },
      {
        source: '/standalone-search/:path*',
        destination: `${backendOrigin}/standalone-search/:path*`
      },
      {
        source: '/standalone-workflows/:path*',
        destination: `${backendOrigin}/standalone-workflows/:path*`
      },
      {
        source: '/mfa',
        destination: `${backendOrigin}/mfa`
      },
      {
        source: '/mfa.html',
        destination: `${backendOrigin}/mfa.html`
      },
      {
        source: '/mfa-setup',
        destination: `${backendOrigin}/mfa-setup`
      },
      {
        source: '/mfa-setup.html',
        destination: `${backendOrigin}/mfa-setup.html`
      },
      {
        source: '/mfa-recovery',
        destination: `${backendOrigin}/mfa-recovery`
      },
      {
        source: '/mfa-recovery.html',
        destination: `${backendOrigin}/mfa-recovery.html`
      },
      {
        source: '/js/:path*',
        destination: `${backendOrigin}/js/:path*`
      },
      {
        source: '/css/:path*',
        destination: `${backendOrigin}/css/:path*`
      },
      {
        source: '/assets/:path*',
        destination: `${backendOrigin}/assets/:path*`
      },
      {
        source: '/components/:path*',
        destination: `${backendOrigin}/components/:path*`
      }
    ]
  }
}

export default nextConfig
