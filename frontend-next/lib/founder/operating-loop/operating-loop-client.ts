import { founderGet, founderPost } from '@/lib/founder/api/founder-api-client'

import type {
  FounderOperatingLoopPlan,
  FounderOperatingLoopRun,
  OperatingLoopRunResponse
} from './operating-loop-types'

export async function postOperatingLoopRun(
  plan: FounderOperatingLoopPlan,
  signal?: AbortSignal
): Promise<OperatingLoopRunResponse> {
  const result = await founderPost<OperatingLoopRunResponse>('/operating-loop/run', { plan })
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export async function fetchOperatingLoopRuns(_signal?: AbortSignal): Promise<FounderOperatingLoopRun[]> {
  const result = await founderGet<{ runs?: FounderOperatingLoopRun[] }>('/operating-loop/runs')
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.runs ?? []
}

export async function fetchOperatingLoopRun(
  runId: string,
  signal?: AbortSignal
): Promise<FounderOperatingLoopRun | null> {
  const result = await founderGet<{ run?: FounderOperatingLoopRun }>(`/operating-loop/runs/${encodeURIComponent(runId)}`)
  if (!result.ok) {
    if (result.status === 404) return null
    throw new Error(result.error)
  }

  const payload = result.data
  if (payload && typeof payload === 'object' && 'run' in payload) {
    return (payload as { run?: FounderOperatingLoopRun }).run ?? null
  }
  return null
}
