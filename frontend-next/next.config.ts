import type { NextConfig } from 'next'

const backendOrigin = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://childrens-homes-assistant-backend-new.onrender.com' : 'http://localhost:8000')
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
        source: '/assistant/general/:path*',
        destination: `${backendOrigin}/assistant/general/:path*`
      },
      {
        source: '/assistant/general-safe/:path*',
        destination: `${backendOrigin}/assistant/general-safe/:path*`
      },
      {
        source: '/assistant/conversations/:path*',
        destination: `${backendOrigin}/assistant/conversations/:path*`
      },
      {
        source: '/assistant/realtime/:path*',
        destination: `${backendOrigin}/assistant/realtime/:path*`
      },
      {
        source: '/assistant/web/:path*',
        destination: `${backendOrigin}/assistant/web/:path*`
      },
      {
        source: '/assistant/os/:path*',
        destination: `${backendOrigin}/assistant/os/:path*`
      },
      {
        source: '/assistant/intelligence/:path*',
        destination: `${backendOrigin}/assistant/intelligence/:path*`
      },
      {
        source: '/assistant-api/:path*',
        destination: `${backendOrigin}/assistant-api/:path*`
      }
    ]
  }
}

export default nextConfig
