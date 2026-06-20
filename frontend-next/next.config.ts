import type { NextConfig } from 'next'

const backendOrigin = (
  process.env.INTERNAL_API_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.indicare.co.uk' : 'http://localhost:8000')
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  typescript: {
    // Typecheck runs via `npm run typecheck` — skip duplicate full-project tsc during Render build.
    ignoreBuildErrors: true
  },
  experimental: {
    // Reduce peak webpack memory on constrained hosts (e.g. Render starter builds).
    memoryBasedWorkersCount: true,
    webpackMemoryOptimizations: true,
    // Single build worker — avoids multi-process webpack spikes on 8 GB Render builders.
    cpus: 1
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      skipDefaultConversion: true
    },
    recharts: {
      transform: 'recharts/es6/{{member}}',
      skipDefaultConversion: true
    }
  },
  env: {
    NEXT_PUBLIC_ORB_BUILD_TIMESTAMP:
      process.env.NEXT_PUBLIC_ORB_BUILD_TIMESTAMP || new Date().toISOString(),
    NEXT_PUBLIC_ORB_GIT_COMMIT:
      process.env.NEXT_PUBLIC_ORB_GIT_COMMIT ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT ||
      'local',
    NEXT_PUBLIC_FOUNDER_DATA_MODE:
      process.env.FOUNDER_DATA_MODE ||
      process.env.NEXT_PUBLIC_FOUNDER_DATA_MODE ||
      (process.env.NODE_ENV === 'production' ? 'live-only' : 'live-only')
  },
  eslint: {
    // Render deploys should not fail because of non-blocking lint warnings.
    // We still keep linting available locally/CI, but production builds should
    // not be blocked by historical unused-variable warnings while ORB is being rebuilt.
    ignoreDuringBuilds: true
  },
  webpack: (config, { dev, webpack }) => {
    if (!dev) {
      config.parallelism = 1
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource: string) {
            return (
              /\.(test|spec)\.(tsx?|jsx?)$/.test(resource) ||
              resource.includes('lib/orb/evals/')
            )
          }
        })
      )
    }
    return config
  },
  async rewrites() {
    return [
      // Auth-sensitive traffic should use the `/backend/*` App Router proxy (Set-Cookie + SSE).
      // Founder routes are handled by App Router proxies under /api/founder/*.
      {
        source: '/api/((?!founder(?:/|$)|orb/evaluation(?:/|$)).*)',
        destination: `${backendOrigin}/api/$1`
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
        source: '/inspection/:path*',
        destination: `${backendOrigin}/inspection/:path*`
      },
      {
        source: '/inspection-os/:path*',
        destination: `${backendOrigin}/inspection-os/:path*`
      },
      {
        source: '/intelligence/:path*',
        destination: `${backendOrigin}/intelligence/:path*`
      },
      {
        source: '/recording-drafts/:path*',
        destination: `${backendOrigin}/recording-drafts/:path*`
      },
      {
        source: '/recording-alerts/:path*',
        destination: `${backendOrigin}/recording-alerts/:path*`
      },
      {
        source: '/manager-daily-brief/:path*',
        destination: `${backendOrigin}/manager-daily-brief/:path*`
      },
      {
        source: '/staff/evidence',
        destination: `${backendOrigin}/staff/evidence`
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