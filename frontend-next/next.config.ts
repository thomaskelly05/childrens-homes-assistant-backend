import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*'
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:8000/auth/:path*'
      },
      {
        source: '/assistant/:path*',
        destination: 'http://localhost:8000/assistant/:path*'
      }
    ]
  }
}

export default nextConfig
