import type { NextConfig } from 'next'

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'https://api.indicare.co.uk'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE.replace(/\/$/, '')}/api/:path*`
      },
      {
        source: '/assistant/:path*',
        destination: `${API_BASE.replace(/\/$/, '')}/assistant/:path*`
      }
    ]
  }
}

export default nextConfig
