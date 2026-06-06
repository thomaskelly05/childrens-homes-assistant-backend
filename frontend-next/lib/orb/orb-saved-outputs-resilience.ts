'use client'

import { AuthApiError } from '@/lib/auth/api'

import {
  countOrbLocalSavedOutputs,
  listOrbLocalSavedOutputs,
  orbLocalSavedOutputAsRecord
} from '@/lib/orb/orb-saved-outputs-local'
import {
  recordOrbOutputsSummaryBootstrapRequest,
  shouldAllowOrbProductFetch
} from '@/lib/orb/orb-product-bootstrap-guard'
import { handleOrbProductBootstrapBlockedResponse } from '@/lib/orb/orb-product-bootstrap-response'
import { recordOrbFetchOutcome, shouldSkipAuthenticatedOrbFetch } from '@/lib/orb/orb-session-gate'
import {
  fetchOrbSavedOutputsSummary,
  listOrbSavedOutputs,
  type OrbSavedOutputSummary
} from '@/lib/orb/standalone-client'

export type OrbSavedOutputsListResult = {
  items: OrbSavedOutputSummary[]
  storageMode: 'server' | 'local' | 'mixed'
  reconnectSuggested: boolean
}

function localSummaries(): OrbSavedOutputSummary[] {
  const now = new Date().toISOString()
  return listOrbLocalSavedOutputs().map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type as OrbSavedOutputSummary['type'],
    summary: item.summary,
    project_id: item.project_id,
    project_name: item.project_name,
    status: 'saved' as const,
    created_at: item.created_at || now,
    updated_at: item.updated_at || item.created_at || now
  }))
}

function mergeSummaries(server: OrbSavedOutputSummary[], local: OrbSavedOutputSummary[]): OrbSavedOutputSummary[] {
  const byId = new Map<string, OrbSavedOutputSummary>()
  for (const item of local) byId.set(item.id, item)
  for (const item of server) byId.set(item.id, item)
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = Date.parse(a.updated_at || a.created_at || '') || 0
    const bTime = Date.parse(b.updated_at || b.created_at || '') || 0
    return bTime - aTime
  })
}

export async function listOrbSavedOutputsResilient(params?: {
  project_id?: string
  output_type?: string
  status?: string
  tag?: string
  search?: string
  include_archived?: boolean
  limit?: number
  offset?: number
}): Promise<OrbSavedOutputsListResult> {
  const local = localSummaries()
  if (shouldSkipAuthenticatedOrbFetch()) {
    return { items: local, storageMode: local.length ? 'local' : 'server', reconnectSuggested: true }
  }
  try {
    const payload = await listOrbSavedOutputs(params)
    recordOrbFetchOutcome(null)
    const serverItems = payload.items ?? []
    if (!local.length) {
      return { items: serverItems, storageMode: 'server', reconnectSuggested: false }
    }
    return {
      items: mergeSummaries(serverItems, local),
      storageMode: 'mixed',
      reconnectSuggested: false
    }
  } catch (error) {
    recordOrbFetchOutcome(error)
    if (error instanceof AuthApiError && process.env.NODE_ENV === 'development') {
      console.debug('[orb-saved-outputs] list failed', error.status, error.message)
    }
    return {
      items: local,
      storageMode: local.length ? 'local' : 'server',
      reconnectSuggested: true
    }
  }
}

export async function fetchOrbSavedOutputsSummaryResilient(signal?: AbortSignal): Promise<{
  total: number
  by_type: Record<string, number>
  storage_mode?: string
}> {
  if (!shouldAllowOrbProductFetch('outputs_summary_resilient')) {
    const localCount = countOrbLocalSavedOutputs()
    return { total: localCount, by_type: {}, storage_mode: 'local' }
  }
  if (shouldSkipAuthenticatedOrbFetch()) {
    const localCount = countOrbLocalSavedOutputs()
    return { total: localCount, by_type: {}, storage_mode: 'local' }
  }
  recordOrbOutputsSummaryBootstrapRequest()
  try {
    const summary = await fetchOrbSavedOutputsSummary(signal)
    recordOrbFetchOutcome(null)
    const localCount = countOrbLocalSavedOutputs()
    if (!localCount) return summary
    return {
      ...summary,
      total: Math.max(summary.total || 0, localCount),
      storage_mode: summary.storage_mode === 'local' ? 'local' : 'mixed'
    }
  } catch (error) {
    recordOrbFetchOutcome(error)
    handleOrbProductBootstrapBlockedResponse('outputs_summary', error)
    if (error instanceof AuthApiError && process.env.NODE_ENV === 'development') {
      console.debug('[orb-saved-outputs] summary failed', error.status, error.message)
    }
    const localCount = countOrbLocalSavedOutputs()
    return { total: localCount, by_type: {}, storage_mode: 'local' }
  }
}

export { orbLocalSavedOutputAsRecord }
