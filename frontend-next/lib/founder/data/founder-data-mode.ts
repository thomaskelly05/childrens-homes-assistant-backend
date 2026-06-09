/**
 * Founder data mode — controls whether founder routes use live data only
 * or may fall back to mock inputs (development / testing only).
 *
 * FOUNDER_DATA_MODE=live-only  — strict production mode (default in production)
 * FOUNDER_DATA_MODE=hybrid     — live where available, mock fallback elsewhere
 * FOUNDER_DATA_MODE=mock       — mock inputs for stories and local development
 */

export type FounderDataMode = 'live-only' | 'hybrid' | 'mock'

export type FounderSourceMode = 'live-only' | 'live' | 'hybrid' | 'mock'

export type FounderSourceConnectionStatus = 'connected' | 'not-connected' | 'no-records'

function readEnvMode(): string | undefined {
  return (
    process.env.FOUNDER_DATA_MODE ??
    process.env.NEXT_PUBLIC_FOUNDER_DATA_MODE ??
    undefined
  )
}

function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
  )
}

/** Resolved founder data mode for the current build/runtime. */
export function getFounderDataMode(): FounderDataMode {
  const env = readEnvMode()?.trim().toLowerCase()

  if (env === 'mock' || env === 'hybrid') return env
  if (env === 'live-only' || env === 'live_only' || env === 'liveonly') return 'live-only'

  if (isProductionEnvironment()) return 'live-only'

  return 'live-only'
}

export function isFounderLiveOnlyMode(): boolean {
  return getFounderDataMode() === 'live-only'
}

export function isFounderMockFallbackAllowed(): boolean {
  return getFounderDataMode() !== 'live-only'
}

/** Platform source mode label shown in founder UI. */
export function resolveFounderSourceMode(liveAdapterCount: number, totalAdapters: number): FounderSourceMode {
  if (isFounderLiveOnlyMode()) return 'live-only'
  if (liveAdapterCount === 0) return 'mock'
  if (liveAdapterCount === totalAdapters) return 'live'
  return 'hybrid'
}

export function formatFounderSourceModeLabel(mode: FounderSourceMode): string {
  if (mode === 'live-only') return 'Live only'
  if (mode === 'live') return 'Live'
  if (mode === 'hybrid') return 'Hybrid'
  return 'Mock'
}

export function formatSourceConnectionStatus(status: FounderSourceConnectionStatus): string {
  if (status === 'connected') return 'Connected'
  if (status === 'no-records') return 'No records yet'
  return 'Not connected'
}
