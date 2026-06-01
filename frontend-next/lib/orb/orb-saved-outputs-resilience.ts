import { AuthApiError } from '@/lib/auth/api'

import {
  fetchOrbSavedOutputsSummary,
  listOrbSavedOutputs,
  type OrbSavedOutputSummary
} from '@/lib/orb/standalone-client'
import {
  listOrbLocalSavedOutputs,
  localSavedOutputsSummary,
  type OrbLocalSavedOutput
} from '@/lib/orb/orb-saved-outputs-local'
import { recordOrbFetchOutcome, shouldSkipAuthenticatedOrbFetch } from '@/lib/orb/orb-session-gate'

export type OrbSavedOutputsListResult = {
  items: OrbSavedOutputSummary[]
  total: number
  storageMode: 'server' | 'local' | 'mixed'
  reconnectSuggested: boolean
}

export async function fetchOrbSavedOutputsSummaryResilient(): Promise<{
  total: number
  storage_mode?: string
  localFallback?: boolean
}> {
  if (shouldSkipAuthenticatedOrbFetch()) {
    const local = localSavedOutputsSummary()
    return { total: local.total, storage_mode: 'local', localFallback: true }
  }
  try {
    const summary = await fetchOrbSavedOutputsSummary()
    recordOrbFetchOutcome(null)
    return summary
  } catch (caught) {
    recordOrbFetchOutcome(caught)
    const local = localSavedOutputsSummary()
    return { total: Math.max(summaryCountFromError(caught), local.total), storage_mode: 'local', localFallback: true }
  }
}

function summaryCountFromError(_error: unknown): number {
  return 0
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
  const local = listOrbLocalSavedOutputs({
    search: params?.search,
    output_type: params?.output_type,
    project_id: params?.project_id
  })

  if (shouldSkipAuthenticatedOrbFetch()) {
    return {
      items: local.items,
      total: local.total,
      storageMode: 'local',
      reconnectSuggested: true
    }
  }

  try {
    const remote = await listOrbSavedOutputs(params)
    recordOrbFetchOutcome(null)
    if (!remote.items.length && local.items.length) {
      return {
        items: local.items,
        total: local.total,
        storageMode: 'local',
        reconnectSuggested: false
      }
    }
    const merged = mergeSavedOutputs(remote.items, local.items)
    return {
      items: merged,
      total: merged.length,
      storageMode: local.items.length ? 'mixed' : 'server',
      reconnectSuggested: false
    }
  } catch (caught) {
    recordOrbFetchOutcome(caught)
    const auth = caught instanceof AuthApiError && (caught.status === 401 || caught.status === 403)
    return {
      items: local.items,
      total: local.total,
      storageMode: 'local',
      reconnectSuggested: Boolean(auth || local.items.length)
    }
  }
}

function mergeSavedOutputs(
  remote: OrbSavedOutputSummary[],
  local: OrbLocalSavedOutput[]
): OrbSavedOutputSummary[] {
  const byId = new Map<string, OrbSavedOutputSummary>()
  for (const row of remote) byId.set(row.id, row)
  for (const row of local) {
    if (!byId.has(row.id)) byId.set(row.id, row)
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}
