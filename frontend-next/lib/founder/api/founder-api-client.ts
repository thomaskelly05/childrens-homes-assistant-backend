import { getCsrfToken } from '@/lib/auth/api'
import {
  isKnownPersistenceEntitySlug,
  unknownPersistenceEntityMessage
} from '@/lib/founder/persistence/founder-api-entities'
import { getFounderPersistenceApiBase } from '@/lib/founder/persistence/persistence-config'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

const FOUNDER_API_BASE = getFounderPersistenceApiBase()

const BLOCKED_BROWSER_PATH_PREFIXES = [
  'https://api.indicare.co.uk',
  'http://api.indicare.co.uk',
  '/orb/admin/',
  '/api/providers',
  '/api/homes',
  '/api/inspection-readiness/'
] as const

const GET_CACHE_TTL_MS = 10_000
const REQUEST_TIMEOUT_MS = 8_000

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string; detail?: string }

export type FounderApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number }

export class FounderPersistenceApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'FounderPersistenceApiError'
    this.status = status
  }
}

type CacheEntry = { expiresAt: number; result: FounderApiResult<unknown> }

const inFlightGetRequests = new Map<string, Promise<FounderApiResult<unknown>>>()
const getResponseCache = new Map<string, CacheEntry>()

function normaliseFounderPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return '/'

  for (const blocked of BLOCKED_BROWSER_PATH_PREFIXES) {
    if (trimmed.startsWith(blocked)) {
      throw new FounderPersistenceApiError(
        400,
        `Direct browser calls to ${blocked} are blocked — use /api/founder proxies instead.`
      )
    }
  }

  if (trimmed.startsWith(FOUNDER_API_BASE)) return trimmed
  if (trimmed.startsWith('/')) return `${FOUNDER_API_BASE}${trimmed}`
  return `${FOUNDER_API_BASE}/${trimmed}`
}

function persistenceEntityFromPath(path: string): string | null {
  const match = path.match(/\/persistence\/([^/?]+)/)
  return match?.[1] ?? null
}

function parseErrorMessage(
  status: number,
  payload: ApiEnvelope<unknown> & { detail?: unknown },
  path: string
): string {
  if (status === 403) return 'Founder access required'
  if (status === 401) return 'Unauthorised'
  if (status >= 500) return 'Founder data source is busy'

  const entitySlug = persistenceEntityFromPath(path)
  return (
    payload.error ||
    (typeof payload.detail === 'string'
      ? payload.detail
      : entitySlug && !isKnownPersistenceEntitySlug(entitySlug)
        ? unknownPersistenceEntityMessage(entitySlug)
        : 'Founder API request failed')
  )
}

function emptyPersistenceList<T>(): T {
  return sanitiseFounderPayload({ items: [], count: 0 }) as T
}

function cacheKey(method: string, url: string): string {
  return `${method}:${url}`
}

function readCachedGet<T>(key: string): FounderApiResult<T> | null {
  const entry = getResponseCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    getResponseCache.delete(key)
    return null
  }
  return entry.result as FounderApiResult<T>
}

function writeCachedGet(key: string, result: FounderApiResult<unknown>): void {
  if (!result.ok || result.status >= 500) return
  getResponseCache.set(key, { expiresAt: Date.now() + GET_CACHE_TTL_MS, result })
}

async function founderRequest<T>(
  path: string,
  init?: RequestInit
): Promise<FounderApiResult<T>> {
  const url = normaliseFounderPath(path)
  const method = (init?.method ?? 'GET').toUpperCase()
  const key = cacheKey(method, url)

  if (method === 'GET') {
    const cached = readCachedGet<T>(key)
    if (cached) return cached

    const inFlight = inFlightGetRequests.get(key)
    if (inFlight) return inFlight as Promise<FounderApiResult<T>>
  }

  const run = async (): Promise<FounderApiResult<T>> => {
    const headers = new Headers(init?.headers)
    if (!headers.has('Content-Type') && init?.body) {
      headers.set('Content-Type', 'application/json')
    }
    if (method !== 'GET' && method !== 'HEAD') {
      const csrf = getCsrfToken()
      if (csrf) headers.set('x-csrf-token', csrf)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        method,
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal
      })
    } catch {
      return { ok: false, status: 503, error: 'Founder API unavailable' }
    } finally {
      clearTimeout(timer)
    }

    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> & T

    if (!response.ok) {
      const entitySlug = persistenceEntityFromPath(url)
      if (
        response.status === 404 &&
        method === 'GET' &&
        entitySlug &&
        isKnownPersistenceEntitySlug(entitySlug) &&
        url.endsWith(`/persistence/${entitySlug}`)
      ) {
        const empty = { ok: true as const, status: 200, data: emptyPersistenceList<T>() }
        writeCachedGet(key, empty)
        return empty
      }

      return {
        ok: false,
        status: response.status,
        error: parseErrorMessage(response.status, payload, url)
      }
    }

    const data = sanitiseFounderPayload(((payload as ApiEnvelope<T>).data ?? payload) as T)
    const success = { ok: true as const, status: response.status, data }
    if (method === 'GET') writeCachedGet(key, success)
    return success
  }

  if (method === 'GET') {
    const promise = run().finally(() => {
      inFlightGetRequests.delete(key)
    })
    inFlightGetRequests.set(key, promise as Promise<FounderApiResult<unknown>>)
    return promise
  }

  return run()
}

export async function founderGet<T>(path: string): Promise<FounderApiResult<T>> {
  return founderRequest<T>(path, { method: 'GET' })
}

export async function founderPost<T>(path: string, body?: unknown): Promise<FounderApiResult<T>> {
  return founderRequest<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

export async function founderPatch<T>(path: string, body?: unknown): Promise<FounderApiResult<T>> {
  return founderRequest<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

async function founderFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await founderRequest<T>(path, init)
  if (!result.ok) {
    throw new FounderPersistenceApiError(result.status, result.error)
  }
  return result.data
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

  update<T>(
    entitySlug: string,
    id: string,
    patch: Record<string, unknown>,
    status?: string
  ): Promise<T> {
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

export function clearFounderApiClientCache(): void {
  getResponseCache.clear()
  inFlightGetRequests.clear()
}

/** @internal test helper */
export function __founderApiClientTestState() {
  return {
    inFlightCount: inFlightGetRequests.size,
    cacheSize: getResponseCache.size
  }
}
