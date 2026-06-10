import { getCsrfToken } from '@/lib/auth/api'
import {
  isKnownPersistenceEntitySlug,
  unknownPersistenceEntityMessage
} from '@/lib/founder/persistence/founder-api-entities'
import { getFounderPersistenceApiBase } from './persistence-config'
import { sanitiseFounderPayload } from './persistence-safety'

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string }

export class FounderPersistenceApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'FounderPersistenceApiError'
    this.status = status
  }
}

function persistenceEntityFromPath(path: string): string | null {
  const match = path.match(/^\/persistence\/([^/?]+)/)
  return match?.[1] ?? null
}

async function founderFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  const csrf = getCsrfToken()
  if (csrf) headers.set('x-csrf-token', csrf)

  let response: Response
  try {
    response = await fetch(`${getFounderPersistenceApiBase()}${path}`, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: 'no-store'
    })
  } catch {
    throw new FounderPersistenceApiError(503, 'Founder persistence backend unavailable')
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> & T
  if (!response.ok) {
    const entitySlug = persistenceEntityFromPath(path)
    const method = (init?.method ?? 'GET').toUpperCase()
    if (
      response.status === 404 &&
      method === 'GET' &&
      entitySlug &&
      isKnownPersistenceEntitySlug(entitySlug) &&
      path === `/persistence/${entitySlug}`
    ) {
      return sanitiseFounderPayload({ items: [], count: 0 }) as T
    }

    const record = payload as ApiEnvelope<T> & { detail?: unknown; error?: string }
    const message =
      record.error ||
      (typeof record.detail === 'string'
        ? record.detail
        : entitySlug && !isKnownPersistenceEntitySlug(entitySlug)
          ? unknownPersistenceEntityMessage(entitySlug)
          : 'Founder persistence request failed')
    throw new FounderPersistenceApiError(response.status, message)
  }

  const data = (payload as ApiEnvelope<T>).data ?? payload
  return sanitiseFounderPayload(data) as T
}

export const founderPersistenceApi = {
  list<T>(entitySlug: string, params?: Record<string, string>): Promise<{ items: T[]; count: number }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : ''
    return founderFetch(`/persistence/${entitySlug}${query}`)
  },

  get<T>(entitySlug: string, id: string): Promise<T> {
    return founderFetch(`/persistence/${entitySlug}/${encodeURIComponent(id)}`)
  },

  create<T>(entitySlug: string, record: Record<string, unknown>, source = 'founder-ui'): Promise<T> {
    return founderFetch(`/persistence/${entitySlug}`, {
      method: 'POST',
      body: JSON.stringify({ record, source })
    })
  },

  update<T>(entitySlug: string, id: string, patch: Record<string, unknown>, status?: string): Promise<T> {
    return founderFetch(`/persistence/${entitySlug}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ patch, status })
    })
  },

  approvalDecision<T>(id: string, status: string, founderNote?: string): Promise<T> {
    return founderFetch(`/persistence/approvals/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ status, founder_note: founderNote })
    })
  },

  auditList(params?: Record<string, string>): Promise<{ items: unknown[]; count: number }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : ''
    return founderFetch(`/persistence/audit-log${query}`)
  },

  auditAppend(entry: Record<string, unknown>): Promise<unknown> {
    return founderFetch('/persistence/audit-log', {
      method: 'POST',
      body: JSON.stringify(entry)
    })
  }
}

/** Maps friendly API path segments to backend entity slugs. */
export const ENTITY_API_SLUGS = {
  action: 'actions',
  approval: 'approvals',
  content: 'content',
  build_brief: 'build-briefs',
  staff_team_run: 'staff-team-runs',
  agent_run: 'agent-runs',
  operating_loop_run: 'operating-loop-runs',
  quality_run: 'quality-runs',
  quality_result: 'quality-results',
  quality_proposal: 'quality-proposals',
  expert_review: 'expert-reviews',
  safety_review: 'safety-reviews',
  founder_memory: 'memories',
  evidence_pack: 'evidence-packs'
} as const
