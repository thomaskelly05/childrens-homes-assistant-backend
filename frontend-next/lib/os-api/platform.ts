import type { CareAction } from '@/lib/evidence/types'
import type { HomeDocument } from '@/lib/documents/types'
import type { EvidenceItem } from '@/lib/evidence/types'
import type { ChronologyEvent } from '@/lib/chronology/types'

import { getOsActions } from './actions'
import { mapOsChronology, getOsChronology } from './chronology'
import { osGet, osPost, queryString } from './client'
import { getOsDocuments } from './documents'
import { getOsEvidence } from './evidence'
import type { OsApiResult } from './types'
import { getOsYoungPeople, getOsYoungPersonWorkspace, type OsPersonSummary } from './workspaces'

type UnknownRecord = Record<string, any>

export type OperationalRecord = {
  id: string
  type: string
  title: string
  summary: string
  status?: string
  priority?: string
  date?: string
  href?: string
  youngPersonId?: string
  childName?: string
  staffName?: string
  tags: string[]
  evidenceIds: string[]
  actionIds: string[]
  regulationLinks: string[]
  raw: UnknownRecord
}

export type AttentionCard = {
  id: string
  priority: number
  theme: 'safeguarding' | 'child_wellbeing' | 'operational_risk' | 'compliance' | 'documentation' | 'administration'
  title: string
  body: string
  href: string
  count: number
  status: string
}

export type CommandCentreData = {
  children: OsPersonSummary[]
  chronology: ChronologyEvent[]
  safeguarding: OperationalRecord[]
  actions: CareAction[]
  documents: HomeDocument[]
  evidence: EvidenceItem[]
  workforce: OperationalRecord[]
  homes: OperationalRecord[]
  attention: AttentionCard[]
}

export type YoungPersonOverview = {
  profile?: OsPersonSummary
  chronology: ChronologyEvent[]
  safeguarding: ChronologyEvent[]
  actions: CareAction[]
  evidence: EvidenceItem[]
  documents: HomeDocument[]
}

export type SafeguardingDashboard = {
  records: OperationalRecord[]
  chronology: ChronologyEvent[]
  actions: CareAction[]
  missingChildVoice: ChronologyEvent[]
  missingOversight: ChronologyEvent[]
}

export type StaffDirectory = {
  staff: OperationalRecord[]
  currentUser?: OperationalRecord
}

export type InspectionReadiness = {
  raw: UnknownRecord
  evidenceGaps: OperationalRecord[]
  actions: OperationalRecord[]
  sections: OperationalRecord[]
}

export type GovernanceStatus = {
  account?: UnknownRecord
  osContext?: UnknownRecord
  aiGovernance?: UnknownRecord
  orbHealth?: UnknownRecord
  orbProvider?: UnknownRecord
}

function asObject(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
}

function asArray(value: unknown, keys: string[] = ['items', 'records', 'data']): UnknownRecord[] {
  if (Array.isArray(value)) return value as UnknownRecord[]
  const object = asObject(value)
  for (const key of keys) {
    const candidate = object[key]
    if (Array.isArray(candidate)) return candidate as UnknownRecord[]
  }
  return []
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function firstString(row: UnknownRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return fallback
}

function recordHref(type: string, id: string, youngPersonId?: string) {
  if (youngPersonId && ['daily', 'daily_note', 'incident', 'safeguarding', 'missing'].includes(type)) {
    const segment = type === 'daily' || type === 'daily_note' ? 'daily-note' : type
    return `/young-people/${encodeURIComponent(youngPersonId)}/${segment}/${encodeURIComponent(id)}`
  }
  if (type.includes('safeguard')) return '/safeguarding'
  if (type.includes('missing')) return '/safeguarding'
  if (type.includes('incident')) return id ? `/incidents/${encodeURIComponent(id)}` : '/incidents'
  if (type.includes('document')) return id ? `/documents/${encodeURIComponent(id)}` : '/documents'
  if (type.includes('evidence')) return id ? `/evidence/${encodeURIComponent(id)}` : '/evidence'
  return '/chronology'
}

export function mapOperationalRecord(row: UnknownRecord, fallbackType = 'record'): OperationalRecord {
  const id = firstString(row, ['id', 'record_id', 'source_id', 'original_id'], fallbackType)
  const type = firstString(row, ['record_type', 'type', 'source_type', 'alert_type', 'category'], fallbackType)
  const youngPersonId = firstString(row, ['young_person_id', 'youngPersonId', 'child_id'], '')
  return {
    id,
    type,
    title: firstString(row, ['title', 'name', 'concern_type', 'alert_type', 'type', 'record_type'], type.replaceAll('_', ' ')),
    summary: firstString(row, ['summary', 'description', 'content', 'body', 'details', 'outcome', 'note'], 'No summary is available from the backend yet.'),
    status: firstString(row, ['status', 'workflow_status', 'review_status'], ''),
    priority: firstString(row, ['priority', 'severity', 'risk', 'risk_level'], ''),
    date: firstString(row, ['date', 'occurred_at', 'date_time', 'created_at', 'updated_at'], ''),
    href: recordHref(type, id, youngPersonId || undefined),
    youngPersonId: youngPersonId || undefined,
    childName: firstString(row, ['child_name', 'young_person_name', 'name'], ''),
    staffName: firstString(row, ['staff_name', 'created_by_name', 'author_name'], ''),
    tags: strings(row.tags || row.metadata_tags),
    evidenceIds: strings(row.evidence_ids || row.evidenceIds),
    actionIds: strings(row.action_ids || row.actionIds),
    regulationLinks: strings(row.regulation_links || row.regulationLinks || row.regulations),
    raw: row
  }
}

function sourceFor(results: Array<OsApiResult<unknown>>): OsApiResult<unknown>['source'] {
  return results.some((result) => result.source === 'live') ? 'live' : 'unavailable'
}

function warningFor(results: Array<OsApiResult<unknown>>) {
  return results.find((result) => result.warning)?.warning
}

function errorFor(results: Array<OsApiResult<unknown>>) {
  return results.find((result) => result.error)?.error
}

function mergeResult<T>(results: Array<OsApiResult<unknown>>, data: T): OsApiResult<T> {
  return {
    data,
    source: sourceFor(results),
    warning: warningFor(results),
    error: errorFor(results)
  }
}

function isOpenStatus(value: string | undefined) {
  return !value || /open|active|review|overdue|pending|in_progress|monitor/i.test(value)
}

function buildAttentionCards(data: Omit<CommandCentreData, 'attention'>): AttentionCard[] {
  const safeguardingOpen = data.safeguarding.filter((item) => isOpenStatus(item.status))
  const highChronology = data.chronology.filter((event) => ['high', 'critical'].includes(event.severity) || event.safeguardingFlags.length)
  const openActions = data.actions.filter((action) => action.status !== 'completed')
  const evidenceGaps = data.evidence.filter((item) => ['draft', 'partial', 'review_required'].includes(item.quality))
  const documentsForReview = data.documents.filter((document) => ['review_required', 'action_plan_open', 'processing'].includes(document.status))
  const childVoiceMissing = data.chronology.filter((event) => {
    const text = `${event.title} ${event.summary} ${event.fullText} ${event.tags.join(' ')}`.toLowerCase()
    return (event.safeguardingFlags.length || event.actionIds.length) && !/child voice|said|told|wishes|wanted/.test(text)
  })

  const cards: AttentionCard[] = [
    {
      id: 'safeguarding-open',
      priority: 1,
      theme: 'safeguarding',
      title: 'Safeguarding review queue',
      body: safeguardingOpen.length ? 'Open safeguarding-linked records need calm manager review and follow-up.' : 'No open safeguarding records were returned by the backend.',
      href: '/safeguarding',
      count: safeguardingOpen.length,
      status: safeguardingOpen.length ? 'needs review' : 'clear'
    },
    {
      id: 'child-wellbeing',
      priority: 2,
      theme: 'child_wellbeing',
      title: 'Child wellbeing and significant events',
      body: highChronology.length ? 'Recent high-significance chronology events may need review.' : 'No high-significance chronology events were returned.',
      href: '/chronology',
      count: highChronology.length,
      status: highChronology.length ? 'review suggested' : 'stable'
    },
    {
      id: 'operational-actions',
      priority: 3,
      theme: 'operational_risk',
      title: 'Open operational actions',
      body: openActions.length ? 'Actions remain open across records, evidence and oversight workflows.' : 'No open actions were returned by the backend.',
      href: '/actions',
      count: openActions.length,
      status: openActions.length ? 'follow-up needed' : 'clear'
    },
    {
      id: 'inspection-evidence',
      priority: 4,
      theme: 'compliance',
      title: 'Inspection evidence gaps',
      body: evidenceGaps.length ? 'Evidence items need review before they are relied on for inspection readiness.' : 'No review-required evidence items were returned.',
      href: '/ofsted-readiness',
      count: evidenceGaps.length,
      status: evidenceGaps.length ? 'possible gap' : 'not calculated'
    },
    {
      id: 'documents-review',
      priority: 5,
      theme: 'documentation',
      title: 'Documents awaiting review',
      body: documentsForReview.length ? 'Documents are processing, awaiting review or linked to open action plans.' : 'No document review queue was returned.',
      href: '/documents',
      count: documentsForReview.length,
      status: documentsForReview.length ? 'review needed' : 'clear'
    },
    {
      id: 'child-voice',
      priority: 6,
      theme: 'documentation',
      title: 'Possible child voice gaps',
      body: childVoiceMissing.length ? 'Some linked events do not show visible child voice markers in the available metadata.' : 'No possible child voice gaps were derived from visible chronology.',
      href: '/chronology',
      count: childVoiceMissing.length,
      status: childVoiceMissing.length ? 'pattern to consider' : 'not enough evidence'
    }
  ]
  return cards.sort((a, b) => a.priority - b.priority)
}

export async function getCommandCentre(): Promise<OsApiResult<CommandCentreData>> {
  const [context, people, chronology, safeguarding, actions, documents, evidence] = await Promise.all([
    osGet<UnknownRecord>('/api/os/context', {}),
    getOsYoungPeople(),
    getOsChronology(),
    osGet<unknown>('/api/safeguarding', {}),
    getOsActions(),
    getOsDocuments(),
    getOsEvidence()
  ])
  const contextObject = asObject(context.data)
  const base = {
    children: people.data,
    chronology: chronology.data,
    safeguarding: asArray(safeguarding.data, ['items', 'safeguarding']).map((row) => mapOperationalRecord(row, 'safeguarding')),
    actions: actions.data,
    documents: documents.data,
    evidence: evidence.data,
    workforce: asArray(contextObject.workforce).map((row) => mapOperationalRecord(row, 'staff')),
    homes: asArray(contextObject.homes).map((row) => mapOperationalRecord(row, 'home'))
  }
  return mergeResult([context, people, chronology, safeguarding, actions, documents, evidence], {
    ...base,
    attention: buildAttentionCards(base)
  })
}

export async function getYoungPeople() {
  return getOsYoungPeople()
}

export async function getYoungPersonOverview(id: string): Promise<OsApiResult<YoungPersonOverview>> {
  const [profile, workspace, documents, evidence] = await Promise.all([
    osGet<UnknownRecord>(`/os/young-people/${encodeURIComponent(id)}`, {}),
    getOsYoungPersonWorkspace(id),
    getOsDocuments(),
    getOsEvidence()
  ])
  const profileObject = asObject(profile.data)
  const workspaceProfile = workspace.data.youngPerson
  const mappedProfile: OsPersonSummary | undefined = profile.source === 'live' && Object.keys(profileObject).length
    ? {
        ...profileObject,
        id: String(profileObject.id || id),
        displayName: firstString(profileObject, ['display_name', 'displayName', 'name'], `Young person ${id}`),
        preferredName: firstString(profileObject, ['preferred_name', 'preferredName', 'first_name'], ''),
        age: profileObject.age,
        riskLevel: firstString(profileObject, ['risk_level', 'riskLevel', 'risk'], ''),
        keyWorkerId: firstString(profileObject, ['key_worker_id', 'primary_keyworker_id', 'allocated_key_worker_id'], ''),
        placementStatus: firstString(profileObject, ['placement_status', 'status'], ''),
        legalStatus: firstString(profileObject, ['legal_status', 'legalStatus'], '')
      }
    : workspaceProfile
  const chronology = workspace.data.chronology
  const childDocuments = documents.data.filter((document) => String((document as any).youngPersonId || (document as any).young_person_id || '') === id || !((document as any).youngPersonId || (document as any).young_person_id))
  const childEvidence = evidence.data.filter((item) => !item.youngPersonId || item.youngPersonId === id)
  return mergeResult([profile, workspace, documents, evidence], {
    profile: mappedProfile,
    chronology,
    safeguarding: chronology.filter((event) => event.safeguardingFlags.length || `${event.title} ${event.category}`.toLowerCase().includes('safeguard')),
    actions: workspace.data.actions,
    evidence: childEvidence,
    documents: childDocuments
  })
}

export async function getYoungPersonRecords(id: string) {
  return osGet<unknown>(`/workspace-records/daily${queryString({ young_person_id: id })}`, {})
}

export async function getYoungPersonChronology(id: string) {
  return getOsChronology({ youngPersonId: id })
}

export async function getYoungPersonMetadata(id: string) {
  return osGet<unknown>(`/os-modules/intelligence/child/${encodeURIComponent(id)}`, {})
}

export async function getYoungPersonSafeguardingSignals(id: string) {
  return getSafeguardingDashboard(id)
}

export async function getYoungPersonDocuments(id: string) {
  const result = await getOsDocuments()
  return { ...result, data: result.data.filter((document) => String((document as any).youngPersonId || (document as any).young_person_id || '') === id || !((document as any).youngPersonId || (document as any).young_person_id)) }
}

export async function getYoungPersonOperationalState(id: string) {
  const overview = await getYoungPersonOverview(id)
  return { ...overview, data: overview.data.actions.filter((action) => action.status !== 'completed') }
}

export async function getChronology(params: Parameters<typeof getOsChronology>[0] = {}) {
  return getOsChronology(params)
}

export async function getSafeguardingDashboard(youngPersonId?: string): Promise<OsApiResult<SafeguardingDashboard>> {
  const [records, chronology, actions] = await Promise.all([
    osGet<unknown>('/api/safeguarding', {}),
    osGet<UnknownRecord[]>(`/os/chronology${queryString({ safeguarding_only: true, young_person_id: youngPersonId })}`, []),
    getOsActions({ sourceType: 'safeguarding' })
  ])
  const events = Array.isArray(chronology.data) ? chronology.data.map(mapOsChronology) : []
  const missingChildVoice = events.filter((event) => {
    const text = `${event.title} ${event.summary} ${event.fullText} ${event.tags.join(' ')}`.toLowerCase()
    return !/child voice|said|told|wanted|wishes/.test(text)
  })
  const missingOversight = events.filter((event) => {
    const text = `${event.title} ${event.summary} ${event.tags.join(' ')}`.toLowerCase()
    return !/manager|oversight|review|rm|ri/.test(text)
  })
  return mergeResult([records, chronology, actions], {
    records: asArray(records.data, ['items', 'safeguarding']).map((row) => mapOperationalRecord(row, 'safeguarding')),
    chronology: events,
    actions: actions.data,
    missingChildVoice,
    missingOversight
  })
}

export async function getInspectionReadiness(): Promise<OsApiResult<InspectionReadiness>> {
  const result = await osGet<UnknownRecord>('/inspection/readiness', {})
  const raw = asObject(result.data)
  return {
    ...result,
    data: {
      raw,
      evidenceGaps: asArray(raw.evidence_gaps || raw.evidenceGaps || raw.missing_evidence || raw.gaps).map((row) => mapOperationalRecord(row, 'evidence_gap')),
      actions: asArray(raw.actions || raw.next_actions || raw.recommendations).map((row) => mapOperationalRecord(row, 'inspection_action')),
      sections: asArray(raw.sections || raw.frameworks || raw.readiness || raw.items).map((row) => mapOperationalRecord(row, 'inspection_section'))
    }
  }
}

export async function getAnnexAReadiness() {
  return getInspectionReadiness()
}

export async function getReg44Readiness() {
  return getInspectionReadiness()
}

export async function getReg45Readiness() {
  return getInspectionReadiness()
}

export async function getProviderSettings(): Promise<OsApiResult<GovernanceStatus>> {
  const [account, context] = await Promise.all([
    osGet<UnknownRecord>('/account/me', {}),
    osGet<UnknownRecord>('/api/os/context', {})
  ])
  return mergeResult([account, context], {
    account: asObject(account.data),
    osContext: asObject(context.data)
  })
}

export async function getAssistantGovernance(): Promise<OsApiResult<GovernanceStatus>> {
  const [aiGovernance, orbHealth, orbProvider] = await Promise.all([
    osGet<UnknownRecord>('/api/ai/governance/status', {}),
    osGet<UnknownRecord>('/orb/health', {}),
    osGet<UnknownRecord>('/orb/provider/status', {})
  ])
  return mergeResult([aiGovernance, orbHealth, orbProvider], {
    aiGovernance: asObject(aiGovernance.data).governance || asObject(aiGovernance.data),
    orbHealth: asObject(orbHealth.data),
    orbProvider: asObject(orbProvider.data)
  })
}

export async function getDocuments() {
  return getOsDocuments()
}

export async function getEvidenceLinks() {
  return getOsEvidence()
}

export async function getStaff(): Promise<OsApiResult<StaffDirectory>> {
  const context = await osGet<UnknownRecord>('/api/os/context', {})
  const contextObject = asObject(context.data)
  const staff = asArray(contextObject.workforce).map((row) => mapOperationalRecord(row, 'staff'))
  return {
    ...context,
    data: {
      staff,
      currentUser: staff[0]
    }
  }
}

export async function getStaffProfile(staffUserId: string) {
  return osGet<unknown>(`/staff/${encodeURIComponent(staffUserId)}`, {})
}

export async function getStaffTraining(staffUserId?: string) {
  return osGet<unknown>(`/tasks/${queryString({ staff_user_id: staffUserId, category: 'training' })}`, {})
}

export async function getStaffSupervision(staffUserId?: string) {
  return osGet<unknown>(`/supervision/submissions${queryString({ staff_user_id: staffUserId })}`, {})
}

export async function getOperationalStates() {
  const command = await getCommandCentre()
  return { ...command, data: command.data.attention }
}

export async function getAssistantContext(youngPersonId?: string) {
  return osGet<unknown>(youngPersonId ? `/young-people/${encodeURIComponent(youngPersonId)}/assistant/context` : '/api/os/context', {})
}

export async function sendAssistantMessage(body: unknown) {
  return osPost<unknown>('/assistant/query', body, {})
}
