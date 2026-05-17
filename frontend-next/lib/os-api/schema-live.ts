import { osGet, queryString } from './client'
import type { OsApiResult } from './types'

export type SchemaRegulatoryContext = {
  domain: string
  sccif_area: string
  quality_standard: string
  regulations: string[]
  active_child_only?: boolean
}

export type SchemaLiveResource = {
  name: string
  relation_type: string
  endpoint: string
  restricted: boolean
  regulatory_context: SchemaRegulatoryContext
}

export type SchemaLiveRecordSet = {
  ok: boolean
  resource: string
  relation_type?: string
  items: Record<string, unknown>[]
  count: number
  limit?: number
  offset?: number
  regulatory_context: SchemaRegulatoryContext
}

export async function getSchemaLiveResources(params: { type?: string; search?: string } = {}): Promise<OsApiResult<SchemaLiveResource[]>> {
  const result = await osGet<{ resources?: SchemaLiveResource[] }>(
    `/api/schema-live/resources${queryString({ type: params.type, search: params.search })}`,
    { resources: [] }
  )
  return { ...result, data: result.data.resources || [] }
}

export async function getSchemaLiveResource(resource: string, params: { limit?: number; offset?: number; search?: string; homeId?: string; providerId?: string; youngPersonId?: string; staffId?: string; status?: string } = {}): Promise<OsApiResult<SchemaLiveRecordSet>> {
  return osGet<SchemaLiveRecordSet>(
    `/api/schema-live/${encodeURIComponent(resource)}${queryString({
      limit: params.limit,
      offset: params.offset,
      search: params.search,
      home_id: params.homeId,
      provider_id: params.providerId,
      young_person_id: params.youngPersonId,
      staff_id: params.staffId,
      status: params.status
    })}`,
    { ok: false, resource, items: [], count: 0, regulatory_context: { domain: 'operations', sccif_area: 'leadership and management', quality_standard: 'The leadership and management standard', regulations: ['Regulation 13'] } }
  )
}

export async function getYoungPersonSchemaRecord(youngPersonId: string, limitPerResource = 25) {
  return osGet<Record<string, unknown>>(
    `/api/schema-live/young-people/${encodeURIComponent(youngPersonId)}/record${queryString({ limit_per_resource: limitPerResource })}`,
    { ok: false, young_person_id: youngPersonId, resources: {}, resource_count: 0 }
  )
}
