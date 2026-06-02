/** Normalise ORB Residential brain identity metadata across standalone endpoints. */

export type OrbBrainMetadata = {
  surface?: string
  product?: string
  powered_by?: string
  brain?: string
  os_records_accessed?: boolean
  live_record_access?: boolean
  standalone?: boolean
  mode?: string
  lens?: string
  feature?: string
  sources?: unknown[]
  citations?: unknown[]
  quality?: Record<string, unknown>
  safety?: Record<string, unknown>
}

export const ORB_BRAIN_PRODUCT = 'ORB Residential'
export const ORB_BRAIN_POWERED_BY = 'IndiCare Intelligence'
export const ORB_BRAIN_ID = 'orb_residential_intelligence'

const STANDALONE_SURFACES = new Set([
  'orb_standalone',
  'orb_residential',
  'standalone',
  'standalone_orb_ai',
  'standalone_orb'
])

export function normalizeOrbBrainMetadata(
  payload: Record<string, unknown> | null | undefined
): OrbBrainMetadata | null {
  if (!payload || typeof payload !== 'object') return null

  const nested = payload.brain_metadata
  if (nested && typeof nested === 'object') {
    return { ...(nested as OrbBrainMetadata), ...pickBrainFields(payload) }
  }

  const contextUsed = payload.context_used
  if (contextUsed && typeof contextUsed === 'object') {
    const fromContext = normalizeOrbBrainMetadata(contextUsed as Record<string, unknown>)
    if (fromContext) return fromContext
  }

  if (payload.brain === ORB_BRAIN_ID || payload.product === ORB_BRAIN_PRODUCT) {
    return pickBrainFields(payload) as OrbBrainMetadata
  }

  return null
}

function pickBrainFields(payload: Record<string, unknown>): Partial<OrbBrainMetadata> {
  return {
    surface: typeof payload.surface === 'string' ? payload.surface : undefined,
    product: typeof payload.product === 'string' ? payload.product : ORB_BRAIN_PRODUCT,
    powered_by: typeof payload.powered_by === 'string' ? payload.powered_by : ORB_BRAIN_POWERED_BY,
    brain: typeof payload.brain === 'string' ? payload.brain : ORB_BRAIN_ID,
    os_records_accessed: payload.os_records_accessed === true,
    live_record_access: payload.live_record_access === true,
    standalone: payload.standalone !== false,
    mode: typeof payload.mode === 'string' ? payload.mode : undefined,
    lens: typeof payload.lens === 'string' ? payload.lens : undefined,
    feature: typeof payload.feature === 'string' ? payload.feature : undefined
  }
}

export function orbBrainIndicatorLabel(meta: OrbBrainMetadata | null): string | null {
  if (!meta) return null
  if (meta.product !== ORB_BRAIN_PRODUCT) return null
  return `${ORB_BRAIN_PRODUCT} · ${meta.powered_by ?? ORB_BRAIN_POWERED_BY}`
}

export function isStandaloneOrbBrain(meta: OrbBrainMetadata | null): boolean {
  if (!meta) return false
  if (meta.brain !== ORB_BRAIN_ID) return false
  if (meta.os_records_accessed || meta.live_record_access) return false
  const surface = meta.surface ?? ''
  return STANDALONE_SURFACES.has(surface) || surface.startsWith('orb_')
}

/** Subtle label for explainability/footer — omit when boundary already shown nearby. */
export function shouldShowOrbBrainIndicator(
  meta: OrbBrainMetadata | null,
  options?: { boundaryCopyVisible?: boolean }
): boolean {
  if (!isStandaloneOrbBrain(meta)) return false
  if (options?.boundaryCopyVisible) return false
  return Boolean(orbBrainIndicatorLabel(meta))
}
