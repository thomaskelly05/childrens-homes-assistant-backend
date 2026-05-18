import 'server-only'

import { mapOsAction } from './actions'
import { mapOsChronology } from './chronology'
import { mapOsDocument } from './documents'
import { mapOsEvidence } from './evidence'
import { osServerGet } from './server-client'
import type { OsApiResult } from './types'

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export async function getServerOsChronology(params: { youngPersonId?: string; sourceType?: string; search?: string } = {}) {
  const result = await osServerGet<Record<string, any>[]>(
    `/os/chronology${queryString({ young_person_id: params.youngPersonId, source_type: params.sourceType, search: params.search })}`,
    []
  )
  return { ...result, data: result.data.map(mapOsChronology) }
}

export async function getServerOsDocuments(params: { youngPersonId?: string; documentType?: string } = {}) {
  const result = await osServerGet<Record<string, any>[]>(
    `/os/documents${queryString({ young_person_id: params.youngPersonId, document_type: params.documentType })}`,
    []
  )
  return { ...result, data: result.data.map(mapOsDocument) }
}

export async function getServerOsEvidence(params: { youngPersonId?: string; sourceType?: string } = {}) {
  const result = await osServerGet<Record<string, any>[]>(
    `/os/evidence${queryString({ young_person_id: params.youngPersonId, source_type: params.sourceType })}`,
    []
  )
  return { ...result, data: result.data.map(mapOsEvidence) }
}

export async function getServerOsActions(params: { youngPersonId?: string; status?: string; sourceType?: string; sourceId?: string } = {}) {
  const result = await osServerGet<Record<string, any>[]>(
    `/os/actions${queryString({ young_person_id: params.youngPersonId, status: params.status, source_type: params.sourceType, source_id: params.sourceId })}`,
    []
  )
  return { ...result, data: result.data.map(mapOsAction) }
}

export function combineOsResults<T>(primary: OsApiResult<T>, ...others: OsApiResult<unknown>[]): OsApiResult<T> {
  const unavailable = [primary, ...others].filter((result) => result.source === 'unavailable')
  if (!unavailable.length) return primary
  return {
    ...primary,
    source: primary.source === 'live' ? 'live' : 'unavailable',
    warning: primary.warning || unavailable[0]?.warning,
    error: primary.error || unavailable.map((result) => result.error).filter(Boolean).join('; ') || undefined
  }
}
