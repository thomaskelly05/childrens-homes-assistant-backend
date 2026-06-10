import { getCsrfToken } from '@/lib/auth/api'

import type {
  FounderOperatingLoopPlan,
  FounderOperatingLoopRun,
  OperatingLoopRunResponse
} from './operating-loop-types'

function operatingLoopHeaders(): HeadersInit {
  const headers = new Headers({
    'content-type': 'application/json',
    accept: 'application/json'
  })
  const csrf = getCsrfToken()
  if (csrf) headers.set('x-csrf-token', csrf)
  return headers
}

export async function postOperatingLoopRun(
  plan: FounderOperatingLoopPlan,
  signal?: AbortSignal
): Promise<OperatingLoopRunResponse> {
  const response = await fetch('/api/founder/operating-loop/run', {
    method: 'POST',
    headers: operatingLoopHeaders(),
    credentials: 'include',
    body: JSON.stringify({ plan }),
    signal
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Operating loop failed (${response.status})`)
  }

  return (await response.json()) as OperatingLoopRunResponse
}

export async function fetchOperatingLoopRuns(signal?: AbortSignal): Promise<FounderOperatingLoopRun[]> {
  const response = await fetch('/api/founder/operating-loop/runs', {
    method: 'GET',
    headers: { accept: 'application/json' },
    credentials: 'include',
    signal
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Failed to load operating loop runs (${response.status})`)
  }

  const payload = (await response.json()) as { runs?: FounderOperatingLoopRun[] }
  return payload.runs ?? []
}

export async function fetchOperatingLoopRun(
  runId: string,
  signal?: AbortSignal
): Promise<FounderOperatingLoopRun | null> {
  const response = await fetch(`/api/founder/operating-loop/runs/${encodeURIComponent(runId)}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    credentials: 'include',
    signal
  })

  if (response.status === 404) return null
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Failed to load operating loop run (${response.status})`)
  }

  const payload = (await response.json()) as { run?: FounderOperatingLoopRun }
  return payload.run ?? null
}
