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
