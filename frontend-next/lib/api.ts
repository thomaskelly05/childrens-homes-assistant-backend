export type ChronologyRecord = {
  id?: string | number
  title?: string
  record_type?: string
  source_type?: string
  summary?: string
  narrative?: string
  child_voice?: string
  status?: string
  priority?: string
  risk_level?: string
  occurred_at?: string
  created_at?: string
  updated_at?: string
  manager_review_required?: boolean
  safeguarding_relevant?: boolean
  inspection_relevant?: boolean
}

export type ApiResult<T> = {
  ok: boolean
  data: T
  error?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function apiGet<T>(path: string, fallback: T): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      cache: 'no-store'
    })

    if (!response.ok) {
      return { ok: false, data: fallback, error: `${response.status} ${response.statusText}` }
    }

    return { ok: true, data: await response.json() as T }
  } catch (error) {
    return { ok: false, data: fallback, error: String(error) }
  }
}

export async function apiPost<T>(path: string, body: unknown, fallback: T): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      return { ok: false, data: fallback, error: `${response.status} ${response.statusText}` }
    }

    return { ok: true, data: await response.json() as T }
  } catch (error) {
    return { ok: false, data: fallback, error: String(error) }
  }
}

export function unwrapRecords(payload: any): ChronologyRecord[] {
  if (Array.isArray(payload)) return payload
  return [
    ...(payload?.records || []),
    ...(payload?.items || []),
    ...(payload?.patterns || []),
    ...(payload?.workspaces || [])
  ]
}

export async function loadChronologyContext() {
  const [care, chronology, safeguarding, tasks] = await Promise.all([
    apiGet('/api/os-command/care-recording', {}),
    apiGet('/api/os-command/chronology-intelligence', {}),
    apiGet('/api/os-command/safeguarding-patterns', {}),
    apiGet('/api/tasks', {})
  ])

  const records = [
    ...unwrapRecords(care.data),
    ...unwrapRecords(chronology.data),
    ...unwrapRecords(safeguarding.data)
  ]

  return {
    records,
    tasks: unwrapRecords(tasks.data),
    health: {
      care: care.ok,
      chronology: chronology.ok,
      safeguarding: safeguarding.ok,
      tasks: tasks.ok
    },
    errors: [care.error, chronology.error, safeguarding.error, tasks.error].filter(Boolean)
  }
}
