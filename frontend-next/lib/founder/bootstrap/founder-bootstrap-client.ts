/**
 * Founder bootstrap — single batched load for founder page initialisation.
 */

import { founderGet } from '@/lib/founder/api/founder-api-client'
import { EMPTY_FOUNDER_TELEMETRY_SUMMARY, type FounderTelemetrySummary } from '@/lib/founder/telemetry/founder-telemetry-types'

export type FounderBootstrapPersistence = {
  actions: unknown[]
  approvals: unknown[]
  content: unknown[]
  buildBriefs: unknown[]
  qualityRuns: unknown[]
  qualityProposals: unknown[]
  expertReviews: unknown[]
  memories: unknown[]
  evidencePacks: unknown[]
  operatingLoopRuns: unknown[]
}

export type FounderBootstrapLiveSummary = {
  providers: unknown
  homes: unknown
  inspectionReadiness: unknown
  billingUsage: unknown
  feedbackSummary: unknown
  sectionErrors: Record<string, string>
}

export type FounderBootstrapPayload = {
  persistence: FounderBootstrapPersistence
  telemetrySummary: FounderTelemetrySummary
  liveSummary: FounderBootstrapLiveSummary
  operatingLoopRuns: unknown[]
  dataSourceStatus: Record<string, unknown>
  sectionErrors: Record<string, string>
}

const EMPTY_PERSISTENCE: FounderBootstrapPersistence = {
  actions: [],
  approvals: [],
  content: [],
  buildBriefs: [],
  qualityRuns: [],
  qualityProposals: [],
  expertReviews: [],
  memories: [],
  evidencePacks: [],
  operatingLoopRuns: []
}

const EMPTY_LIVE_SUMMARY: FounderBootstrapLiveSummary = {
  providers: { providers: [], items: [], count: 0 },
  homes: { homes: [], items: [], count: 0 },
  inspectionReadiness: { key_gaps: [], generated_at: null },
  billingUsage: {},
  feedbackSummary: {},
  sectionErrors: {}
}

const SESSION_CACHE_TTL_MS = 20_000

let sessionCache: { expiresAt: number; payload: FounderBootstrapPayload } | null = null
let loadPromise: Promise<FounderBootstrapPayload> | null = null

export function clearFounderBootstrapCache(): void {
  sessionCache = null
  loadPromise = null
}

function emptyBootstrap(sectionErrors: Record<string, string> = {}): FounderBootstrapPayload {
  return {
    persistence: { ...EMPTY_PERSISTENCE },
    telemetrySummary: { ...EMPTY_FOUNDER_TELEMETRY_SUMMARY },
    liveSummary: { ...EMPTY_LIVE_SUMMARY, sectionErrors },
    operatingLoopRuns: [],
    dataSourceStatus: {},
    sectionErrors
  }
}

export async function loadFounderBootstrap(options?: {
  days?: number
  force?: boolean
}): Promise<FounderBootstrapPayload> {
  const days = options?.days ?? 30
  if (!options?.force && sessionCache && Date.now() < sessionCache.expiresAt) {
    return sessionCache.payload
  }
  if (loadPromise && !options?.force) return loadPromise

  loadPromise = (async () => {
    const result = await founderGet<FounderBootstrapPayload>(`/bootstrap?days=${days}`)
    if (!result.ok) {
      const sectionErrors =
        result.status >= 500 || result.status === 503
          ? { bootstrap: 'busy' }
          : { bootstrap: result.error }
      return emptyBootstrap(sectionErrors)
    }

    const payload = result.data
    const merged: FounderBootstrapPayload = {
      persistence: { ...EMPTY_PERSISTENCE, ...(payload.persistence ?? {}) },
      telemetrySummary: payload.telemetrySummary ?? { ...EMPTY_FOUNDER_TELEMETRY_SUMMARY },
      liveSummary: { ...EMPTY_LIVE_SUMMARY, ...(payload.liveSummary ?? {}) },
      operatingLoopRuns: payload.operatingLoopRuns ?? payload.persistence?.operatingLoopRuns ?? [],
      dataSourceStatus: payload.dataSourceStatus ?? {},
      sectionErrors: {
        ...(payload.sectionErrors ?? {}),
        ...(payload.liveSummary?.sectionErrors ?? {})
      }
    }

    sessionCache = { expiresAt: Date.now() + SESSION_CACHE_TTL_MS, payload: merged }
    return merged
  })().finally(() => {
    loadPromise = null
  })

  return loadPromise
}

export function hasFounderBootstrapSectionError(
  payload: FounderBootstrapPayload | null,
  section: string
): boolean {
  return Boolean(payload?.sectionErrors?.[section])
}

export const FOUNDER_CRITICAL_SECTIONS = new Set(['persistence', 'telemetrySummary', 'bootstrap'])

export function hasFounderCriticalSectionError(payload: FounderBootstrapPayload | null): boolean {
  if (!payload?.sectionErrors) return false
  return Object.entries(payload.sectionErrors).some(
    ([section, error]) => Boolean(error) && FOUNDER_CRITICAL_SECTIONS.has(section)
  )
}

export const FOUNDER_BUSY_MESSAGE = 'Temporarily unavailable. Founder data source is busy.'
