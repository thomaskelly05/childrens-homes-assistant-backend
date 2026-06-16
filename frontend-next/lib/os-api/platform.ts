import type { CareAction } from '@/lib/evidence/types'
import type { HomeDocument } from '@/lib/documents/types'
import type { EvidenceItem } from '@/lib/evidence/types'
import type { ChronologyEvent } from '@/lib/chronology/types'
import { deriveLifecycleState } from '@/lib/lifecycle/selectors'
import type { OperationalLifecycleView } from '@/lib/lifecycle/types'

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
  lifecycle: OperationalLifecycleView
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
  lifecycle: OperationalLifecycleView[]
  attention: AttentionCard[]
}

export type YoungPersonOverview = {
  profile?: OsPersonSummary
  chronology: ChronologyEvent[]
  safeguarding: ChronologyEvent[]
  actions: CareAction[]
  evidence: EvidenceItem[]
  documents: HomeDocument[]
  lifecycle: OperationalLifecycleView[]
}

export type SafeguardingDashboard = {
  records: OperationalRecord[]
  chronology: ChronologyEvent[]
  actions: CareAction[]
  missingChildVoice: ChronologyEvent[]
  missingOversight: ChronologyEvent[]
  lifecycle: OperationalLifecycleView[]
}

export type StaffDirectory = {
  staff: OperationalRecord[]
  currentUser?: OperationalRecord
  lifecycle: OperationalLifecycleView[]
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
    lifecycle: deriveLifecycleState(row, fallbackType),
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
  const documentsForReview = data.documents.filter((document) => ['draft', 'review', 'review_required', 'returned_for_update', 'action_plan_open', 'processing'].includes(document.status))
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
      body: evidenceGaps.length ? 'Evidence items need review before they are relied on for Inspection evidence preparation.' : 'No review-required evidence items were returned.',
      href: '/inspection-readiness',
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
  return cards
    .filter((card) => card.count > 0)
    .sort((a, b) => a.priority - b.priority)
}

export async function getCommandCentre(): Promise<OsApiResult<CommandCentreData>> {
  const { getCareHub, mapCareHubToCommandCentre } = await import('./care-hub')
  const [careHub, people] = await Promise.all([getCareHub({ limit: 50 }), getOsYoungPeople()])
  return mapCareHubToCommandCentre(careHub, people)
}

export async function getYoungPeople() {
  return getOsYoungPeople()
}

export async function getYoungPersonOverview(id: string): Promise<OsApiResult<YoungPersonOverview>> {
  const [profile, profileBundle, workspace, documents, evidence] = await Promise.all([
    osGet<UnknownRecord>(`/os/young-people/${encodeURIComponent(id)}`, {}),
    osGet<UnknownRecord>(`/api/young-people/${encodeURIComponent(id)}/profile-bundle`, {}),
    getOsYoungPersonWorkspace(id),
    getOsDocuments({ youngPersonId: id }),
    getOsEvidence({ youngPersonId: id })
  ])
  const profileObject = asObject(profile.data)
  const bundleObject = asObject(profileBundle.data)
  const bundle = asObject(bundleObject.bundle)
  const bundlePerson = asObject(bundle.young_person || bundleObject.young_person)
  const identityProfile = asObject(bundle.identity_profile)
  const communicationProfile = asObject(bundle.communication_profile)
  const formulation = asObject(bundle.formulation)
  const contacts = asArray(bundle.contacts)
  const rawProfile = Object.keys(bundlePerson).length ? { ...profileObject, ...bundlePerson } : profileObject
  const enrichedProfile: UnknownRecord = {
    ...rawProfile,
    identity_profile: identityProfile,
    communication_profile: communicationProfile,
    formulation,
    contacts,
    what_matters_to_me: firstString(identityProfile, ['what_matters_to_me'], ''),
    interests: firstString(identityProfile, ['interests'], ''),
    strengths: firstString(identityProfile, ['strengths_summary', 'strengths'], ''),
    strengths_summary: firstString(identityProfile, ['strengths_summary', 'strengths'], ''),
    communication_style: firstString(communicationProfile, ['communication_style'], ''),
    sensory_needs: firstString(communicationProfile, ['sensory_needs', 'sensory_profile'], ''),
    what_helps: firstString(communicationProfile, ['what_helps']) || firstString(formulation, ['what_helps'], ''),
    what_does_not_help: firstString(communicationProfile, ['what_to_avoid', 'what_does_not_help']) || firstString(formulation, ['what_adults_should_avoid'], ''),
    routines: firstString(communicationProfile, ['routines_and_predictability', 'routines'], ''),
    child_voice_summary: firstString(formulation, ['child_voice_summary'], ''),
    important_contacts: contacts,
    profile_image_url: firstString(rawProfile, ['profile_image_url', 'profile_photo_url', 'photo_url'], '')
  }
  const workspaceProfile = workspace.data.youngPerson
  const mappedProfile: OsPersonSummary | undefined = (profile.source === 'live' || profileBundle.source === 'live') && Object.keys(enrichedProfile).length
    ? {
        ...enrichedProfile,
        id: String(enrichedProfile.id || id),
        displayName: firstString(enrichedProfile, ['display_name', 'displayName', 'name'], `Young person ${id}`),
        preferredName: firstString(enrichedProfile, ['preferred_name', 'preferredName', 'first_name'], ''),
        age: enrichedProfile.age,
        riskLevel: firstString(enrichedProfile, ['risk_level', 'summary_risk_level', 'riskLevel', 'risk'], ''),
        keyWorkerId: firstString(enrichedProfile, ['key_worker_id', 'primary_keyworker_id', 'allocated_key_worker_id'], ''),
        placementStatus: firstString(enrichedProfile, ['placement_status', 'status'], ''),
        legalStatus: firstString(enrichedProfile, ['legal_status', 'legalStatus'], '')
      }
    : workspaceProfile
  const chronology = workspace.data.chronology
  const childDocuments = documents.data.filter((document) => String((document as any).youngPersonId || (document as any).young_person_id || '') === id || !((document as any).youngPersonId || (document as any).young_person_id))
  const childEvidence = evidence.data.filter((item) => !item.youngPersonId || item.youngPersonId === id)
  return mergeResult([profile, profileBundle, workspace, documents, evidence], {
    profile: mappedProfile,
    chronology,
    safeguarding: chronology.filter((event) => event.safeguardingFlags.length || `${event.title} ${event.category}`.toLowerCase().includes('safeguard')),
    actions: workspace.data.actions,
    evidence: childEvidence,
    documents: childDocuments,
    lifecycle: [
      ...workspace.data.actions.map((action) => deriveLifecycleState(action as UnknownRecord, 'action')),
      ...childDocuments.map((document) => deriveLifecycleState(document as UnknownRecord, 'document')),
      ...childEvidence.map((item) => deriveLifecycleState(item as UnknownRecord, 'evidence')),
      ...chronology.map((event) => deriveLifecycleState(event as UnknownRecord, 'chronology'))
    ]
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
  return getOsDocuments({ youngPersonId: id })
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
    getOsActions({ sourceType: 'safeguarding', youngPersonId })
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
  const safeguardingRecords = asArray(records.data, ['items', 'safeguarding']).map((row) => mapOperationalRecord(row, 'safeguarding'))
  return mergeResult([records, chronology, actions], {
    records: safeguardingRecords,
    chronology: events,
    actions: actions.data,
    missingChildVoice,
    missingOversight,
    lifecycle: [
      ...safeguardingRecords.map((record) => record.lifecycle),
      ...actions.data.map((action) => deriveLifecycleState(action as UnknownRecord, 'action')),
      ...events.map((event) => deriveLifecycleState(event as UnknownRecord, 'chronology'))
    ]
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
  const [context, account] = await Promise.all([
    osGet<UnknownRecord>('/api/os/context', {}),
    osGet<UnknownRecord>('/account/me', {})
  ])
  const contextObject = asObject(context.data)
  const accountObject = asObject(account.data)
  const accountUser = asObject(accountObject.user)
  const accountProfile = asObject(accountObject.profile)
  const staff = asArray(contextObject.workforce).map((row) => mapOperationalRecord(row, 'staff'))
  const userId = firstString(accountUser, ['id', 'user_id'], '')
  const email = firstString(accountUser, ['email'], '').toLowerCase()
  const currentUser = staff.find((member) => member.id === userId || String(member.raw.email || '').toLowerCase() === email) || (userId || email ? mapOperationalRecord({
    id: userId || email || 'current-user',
    title: firstString(accountProfile, ['display_name'], '') || firstString(accountUser, ['email'], 'Current user'),
    summary: firstString(accountProfile, ['operational_focus', 'role_title'], 'Your live account is available, but no staff workspace records were returned.'),
    role: firstString(accountProfile, ['role_title'], '') || firstString(accountUser, ['role'], ''),
    status: 'active',
    home_id: accountUser.home_id,
    provider_id: accountUser.provider_id,
    email
  }, 'staff') : undefined)
  return {
    ...context,
    data: {
      staff,
      currentUser,
      lifecycle: [...staff, ...(currentUser && !staff.some((member) => member.id === currentUser.id) ? [currentUser] : [])].map((member) => member.lifecycle)
    }
  }
}

export async function getStaffProfile(staffUserId: string) {
  return osGet<unknown>(`/api/workforce-os/staff/${encodeURIComponent(staffUserId)}/profile`, {})
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
