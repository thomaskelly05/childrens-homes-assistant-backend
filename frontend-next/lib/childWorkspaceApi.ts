import { osGet, queryString } from '@/lib/os-api/client'
import type { OsApiResult } from '@/lib/os-api/types'

export type WorkspaceItemCard = {
  id: string
  type: string
  title: string
  summary: string
  status: string
  date: string
  priority: string
  sourceTable?: string
  sourceId?: string
  href?: string
  raw?: Record<string, unknown>
}

export type ChildWorkspaceSourcesMap = {
  ok?: boolean
  young_person_id?: number
  sources?: Record<string, Record<string, string>>
  recommended_os_tabs?: string[]
}

export type SchemaReadinessSummary = {
  status: 'ready' | 'needs_checking' | 'missing' | 'unknown'
  label: string
  detail: string
  href: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function safeString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback
  const raw = String(value).trim()
  return raw && raw !== 'null' && raw !== 'undefined' ? raw : fallback
}

export function mapRowToWorkspaceItem(row: Record<string, unknown>, defaults: Partial<WorkspaceItemCard> = {}): WorkspaceItemCard {
  const id = safeString(row.id || row.document_id || row.event_id || row.notification_key, defaults.id || 'item')
  return {
    id,
    type: safeString(row.type || row.record_type || row.document_type || row.category, defaults.type || 'Record'),
    title: safeString(row.title || row.name || row.event_title || row.document_type, defaults.title || 'Item'),
    summary: safeString(row.summary || row.description || row.safe_summary || row.body, defaults.summary || ''),
    status: safeString(row.status || row.review_status || row.placement_status, defaults.status || ''),
    date: safeString(row.occurred_at || row.due_date || row.created_at || row.event_date || row.date, defaults.date || ''),
    priority: safeString(row.priority || row.severity || row.risk_level, defaults.priority || ''),
    sourceTable: safeString(row.source_table || row.sourceTable || row.table_name, defaults.sourceTable),
    sourceId: safeString(row.source_id || row.sourceId, defaults.sourceId),
    href: safeString(row.href || row.route || row.link, defaults.href),
    raw: row
  }
}

export function mapRows(rows: unknown, defaults?: Partial<WorkspaceItemCard>): WorkspaceItemCard[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => mapRowToWorkspaceItem(asRecord(row), defaults))
}

export async function getOsCommandYoungPersonWorkspace(childId: string, homeId?: number): Promise<OsApiResult<Record<string, unknown>>> {
  return osGet<Record<string, unknown>>(
    `/api/os-command/young-person/${encodeURIComponent(childId)}/workspace${queryString({ home_id: homeId, limit: 100 })}`,
    {}
  )
}

export async function getOsCommandWorkspaceSources(childId: string): Promise<OsApiResult<ChildWorkspaceSourcesMap>> {
  return osGet<ChildWorkspaceSourcesMap>(
    `/api/os-command/young-person/${encodeURIComponent(childId)}/workspace/sources`,
    { sources: {} }
  )
}

export async function getOsCommandSchemaStatus(): Promise<OsApiResult<Record<string, unknown>>> {
  return osGet<Record<string, unknown>>('/api/os-command/schema-status', { status: 'unknown' })
}

export async function getChildDocuments(childId: string, limit = 100): Promise<OsApiResult<unknown[]>> {
  const result = await osGet<{ items?: unknown[]; documents?: unknown[] } | unknown[]>(
    `/child-documents${queryString({ young_person_id: childId, limit })}`,
    []
  )
  const data = Array.isArray(result.data) ? result.data : result.data?.items || result.data?.documents || []
  return { ...result, data }
}

export async function getChildPlans(childId: string): Promise<OsApiResult<unknown[]>> {
  const result = await osGet<{ items?: unknown[]; plans?: unknown[] } | unknown[]>(
    `/young-people/${encodeURIComponent(childId)}/plans`,
    []
  )
  const data = Array.isArray(result.data) ? result.data : result.data?.items || result.data?.plans || []
  return { ...result, data }
}

export async function getChildCompliance(childId: string): Promise<OsApiResult<Record<string, unknown>>> {
  return osGet<Record<string, unknown>>(`/young-people/${encodeURIComponent(childId)}/compliance`, {})
}

export async function getChildStandards(childId: string): Promise<OsApiResult<Record<string, unknown>>> {
  return osGet<Record<string, unknown>>(`/young-people/${encodeURIComponent(childId)}/standards`, {})
}

export async function getChildStandardsEvidence(childId: string): Promise<OsApiResult<unknown[]>> {
  const result = await osGet<{ items?: unknown[]; evidence?: unknown[] } | unknown[]>(
    `/young-people/${encodeURIComponent(childId)}/standards/evidence`,
    []
  )
  const data = Array.isArray(result.data) ? result.data : result.data?.items || result.data?.evidence || []
  return { ...result, data }
}

export async function getChildReports(childId: string): Promise<OsApiResult<unknown[]>> {
  const result = await osGet<{ items?: unknown[]; reports?: unknown[] } | unknown[]>(
    `/young-people/${encodeURIComponent(childId)}/reports`,
    []
  )
  const data = Array.isArray(result.data) ? result.data : result.data?.items || result.data?.reports || []
  return { ...result, data }
}

export async function getChildCalendarSummary(childId: string, year: number, month: number): Promise<OsApiResult<Record<string, unknown>>> {
  return osGet<Record<string, unknown>>(
    `/young-people/${encodeURIComponent(childId)}/calendar-summary${queryString({ year, month })}`,
    {}
  )
}

export function summariseSchemaReadiness(payload: Record<string, unknown>): SchemaReadinessSummary {
  const rawStatus = safeString(payload.status || payload.overall_status || payload.readiness, 'unknown').toLowerCase()
  if (rawStatus.includes('ready') && !rawStatus.includes('not')) {
    return { status: 'ready', label: 'Ready', detail: 'Core data sources are connected.', href: '/schema-live' }
  }
  if (rawStatus.includes('missing') || rawStatus.includes('fail')) {
    return { status: 'missing', label: 'Missing', detail: 'Some expected sources need attention.', href: '/schema-live' }
  }
  if (rawStatus.includes('check') || rawStatus.includes('warn') || rawStatus.includes('partial')) {
    return { status: 'needs_checking', label: 'Needs checking', detail: 'A few areas may need a quick review.', href: '/schema-live' }
  }
  return { status: 'unknown', label: 'System readiness', detail: 'Open schema status when you need technical detail.', href: '/schema-live' }
}

export async function loadChildWorkspaceConvergence(childId: string, homeId?: number) {
  const now = new Date()
  const [workspace, sources, documents, plans, compliance, standards, standardsEvidence, reports, calendar, schema] =
    await Promise.all([
      getOsCommandYoungPersonWorkspace(childId, homeId),
      getOsCommandWorkspaceSources(childId),
      getChildDocuments(childId),
      getChildPlans(childId),
      getChildCompliance(childId),
      getChildStandards(childId),
      getChildStandardsEvidence(childId),
      getChildReports(childId),
      getChildCalendarSummary(childId, now.getFullYear(), now.getMonth() + 1),
      getOsCommandSchemaStatus()
    ])

  const workspaceData = workspace.data || {}
  const records = mapRows(workspaceData.care_records || workspaceData.records || workspaceData.timeline)
  const reviews = mapRows(workspaceData.care_plan_reviews || workspaceData.reviews)
  const alerts = mapRows(workspaceData.alerts || workspaceData.command_items)
  const appointments = mapRows(workspaceData.appointments)

  return {
    workspace,
    sources,
    bundles: {
      records,
      reviews,
      plans: mapRows(plans.data),
      alerts,
      appointments,
      documents: mapRows(documents.data),
      compliance: mapRows((compliance.data as { items?: unknown[] })?.items || compliance.data),
      standards: mapRows((standards.data as { items?: unknown[] })?.items || [standards.data]),
      reports: mapRows(reports.data),
      calendar: mapRows((calendar.data as { items?: unknown[] })?.items || [calendar.data]),
      standardsEvidence: mapRows(standardsEvidence.data),
      lifeEcho: [] as WorkspaceItemCard[],
      handover: [] as WorkspaceItemCard[],
      childVoice: [] as WorkspaceItemCard[],
      schemaStatus: summariseSchemaReadiness(schema.data)
    }
  }
}
