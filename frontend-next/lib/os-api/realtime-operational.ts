'use client'

import { osGet } from './client'

export type OperationalStreamStatus = {
  status: 'connecting' | 'live' | 'reconnecting' | 'polling' | 'offline'
  latencyMs?: number
  lastUpdateAt?: string
  cursor?: number
}

export type OperationalStreamSnapshot = {
  ok?: boolean
  stream_signals?: Array<Record<string, unknown>>
  latency_ms?: number
  generated_at?: string
}

function wsBaseUrl() {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function buildOperationalWsUrl(params?: { homeId?: string; youngPersonId?: string; afterCursor?: number }) {
  const query = new URLSearchParams()
  if (params?.homeId) query.set('home_id', params.homeId)
  if (params?.youngPersonId) query.set('young_person_id', params.youngPersonId)
  if (params?.afterCursor != null) query.set('after_cursor', String(params.afterCursor))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return `${wsBaseUrl()}/os/realtime/ws${suffix}`
}

export async function fetchOperationalStreamSnapshot(params?: { homeId?: string; youngPersonId?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.homeId) query.set('home_id', params.homeId)
  if (params?.youngPersonId) query.set('young_person_id', params.youngPersonId)
  if (params?.limit) query.set('limit', String(params.limit))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return osGet<OperationalStreamSnapshot>(`/os/realtime/stream${suffix}`, { ok: false })
}

export async function fetchCareHubLive(params?: { homeId?: string; youngPersonId?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.homeId) query.set('home_id', params.homeId)
  if (params?.youngPersonId) query.set('young_person_id', params.youngPersonId)
  if (params?.limit) query.set('limit', String(params.limit))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return osGet<Record<string, unknown>>(`/os/care-hub/live${suffix}`, { ok: false })
}
