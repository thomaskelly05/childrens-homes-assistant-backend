import type { LifecycleEntityType, LifecycleState, LifecycleStatus, OperationalLifecycleView, LifecycleHistoryItem } from './types'

const TABS: Partial<Record<LifecycleEntityType, string[]>> = {
  daily_record: ['Record', 'Review', 'Evidence', 'Audit'],
  incident: ['Incident', 'Safeguarding', 'Manager review', 'Actions', 'Audit'],
  safeguarding: ['Concern', 'External agencies', 'Actions', 'Audit'],
  risk_assessment: ['Assessment', 'Controls', 'Review', 'Evidence', 'Audit'],
  document: ['Document', 'Extraction', 'Findings', 'Versions', 'Audit'],
  reg44: ['Report', 'Findings', 'Action plan', 'Evidence', 'Audit'],
  report: ['Draft', 'Citations', 'Review', 'Export history', 'Audit'],
  reg45: ['Draft', 'Quality evidence', 'Review', 'Audit'],
  lac_review: ['Draft', 'Child view', 'Actions', 'Audit'],
  action: ['Action', 'Evidence', 'Comments', 'Audit'],
  evidence: ['Evidence', 'Quality', 'Links', 'Audit']
}

const lifecycleStatuses: LifecycleStatus[] = ['open', 'acknowledged', 'in_review', 'resolved', 'reopened', 'escalated', 'archived']

type UnknownRecord = Record<string, any>

function asObject(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
}

function asArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value as UnknownRecord[] : []
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (value === undefined || value === null || value === '') return []
  return [String(value)]
}

function firstString(row: UnknownRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return fallback
}

function nextStepsFor(status: string) {
  const lower = status.toLowerCase()
  if (lower.includes('draft')) return ['Submit for manager review when complete.']
  if (lower.includes('review')) return ['Record review comments and sign off or request amendment.']
  if (lower.includes('overdue')) return ['Escalate owner and update due date or complete action.']
  if (lower.includes('approved') || lower.includes('locked') || lower.includes('completed')) return ['Monitor linked actions and evidence for future reviews.']
  return ['Review linked chronology, actions and evidence.']
}

export function getLifecycleState(entityType: LifecycleEntityType, recordId: string, record: Record<string, unknown>): LifecycleState {
  const status = String(record.status || record.workflowStatus || 'draft')
  const lower = status.toLowerCase()
  return {
    entityType,
    recordId,
    status,
    label: `${entityType.replaceAll('_', ' ')} is ${status.replaceAll('_', ' ')}`,
    description: 'Lifecycle state is derived from the live record status and workflow transitions.',
    nextSteps: nextStepsFor(status),
    requiredActions: lower.includes('review') ? ['Add review note', 'Attach evidence', 'Complete sign-off'] : [],
    blockers: lower.includes('overdue') || lower.includes('blocked') ? ['Operational follow-up is overdue or blocked.'] : []
  }
}

export function lifecycleTabsFor(entityType: LifecycleEntityType) {
  return TABS[entityType] || ['Overview', 'Chronology', 'Evidence', 'Actions', 'Audit']
}

export function normaliseLifecycleState(value: unknown): LifecycleStatus {
  const key = String(value || '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  if (lifecycleStatuses.includes(key as LifecycleStatus)) return key as LifecycleStatus
  if (['submitted', 'manager_review', 'manager_reviewed', 'review_required', 'processing'].includes(key)) return 'in_review'
  if (['approved', 'locked', 'completed', 'closed', 'strong'].includes(key)) return 'resolved'
  if (['returned', 'amendment_requested'].includes(key)) return 'reopened'
  if (['overdue', 'critical', 'urgent'].includes(key)) return 'escalated'
  if (key === 'archived') return 'archived'
  return 'open'
}

function lifecycleSource(row: UnknownRecord) {
  const metadata = asObject(row.metadata)
  const lifecycle = asObject(metadata.lifecycle || row.lifecycle || row.operational_lifecycle)
  return Object.keys(lifecycle).length ? lifecycle : {}
}

function historyItems(raw: unknown): LifecycleHistoryItem[] {
  return asArray(raw).map((item, index) => ({
    id: firstString(item, ['event_id', 'id'], `history-${index}`),
    transition: firstString(item, ['transition', 'event_type', 'action'], 'recorded'),
    status: normaliseLifecycleState(firstString(item, ['status', 'current_state', 'workflow_status'], 'open')),
    actor: firstString(item, ['actor_name', 'actor_id', 'created_by'], ''),
    occurredAt: firstString(item, ['occurred_at', 'created_at', 'event_at', 'timestamp'], ''),
    notes: firstString(item, ['notes', 'summary', 'change_summary'], ''),
    evidenceIds: strings(item.evidence_ids || item.linked_evidence),
    chronologyIds: strings(item.chronology_ids || item.linked_chronology),
    governanceIds: strings(item.governance_ids || item.linked_governance)
  }))
}

export function deriveLifecycleState(row: UnknownRecord, fallbackType = 'record'): OperationalLifecycleView {
  const lifecycle = lifecycleSource(row)
  const resolution = asObject(lifecycle.resolution)
  const escalation = asObject(lifecycle.escalation)
  const signoff = asObject(lifecycle.signoff)
  const history = historyItems(lifecycle.history)
  const entityType = firstString(row, ['entity_type', 'record_type', 'type', 'source_type'], fallbackType)
  const id = firstString(row, ['id', 'record_id', 'entity_id', 'source_id'], entityType)
  const status = firstString(lifecycle, ['current_state'], firstString(row, ['status', 'workflow_status', 'review_status', 'quality'], 'open'))
  const evidenceIds = strings(row.evidence_ids || row.evidenceIds || lifecycle.evidence_ids)
  const chronologyIds = strings(row.chronology_ids || row.chronologyIds || lifecycle.chronology_ids)
  const governanceIds = strings(row.governance_ids || row.governanceIds || lifecycle.governance_ids)
  const currentState = normaliseLifecycleState(status)
  return {
    id,
    entityType,
    title: firstString(row, ['title', 'name', 'summary', 'description'], entityType.replaceAll('_', ' ')),
    currentState,
    transition: firstString(lifecycle, ['transition'], ''),
    assignedTo: firstString(lifecycle, ['assigned_to'], firstString(row, ['assigned_to', 'assigned_to_user_id', 'owner_user_id'], '')),
    assignedRole: firstString(lifecycle, ['assigned_role'], firstString(row, ['assigned_role'], '')),
    resolvedBy: firstString(resolution, ['resolved_by'], firstString(row, ['resolved_by', 'completed_by'], '')),
    resolvedAt: firstString(resolution, ['resolved_at'], firstString(row, ['resolved_at', 'completed_at', 'closed_at'], '')),
    resolutionReason: firstString(resolution, ['resolution_reason'], firstString(row, ['resolution_reason'], '')),
    reviewNotes: firstString(resolution, ['review_notes'], firstString(row, ['review_notes', 'manager_review_notes'], '')),
    escalatedBy: firstString(escalation, ['escalated_by'], firstString(row, ['escalated_by'], '')),
    escalatedAt: firstString(escalation, ['escalated_at'], firstString(row, ['escalated_at'], '')),
    escalationReason: firstString(escalation, ['escalation_reason'], firstString(row, ['escalation_reason'], '')),
    signoffState: firstString(signoff, ['state'], firstString(row, ['signoff_state', 'review_state'], '')),
    signedOffBy: firstString(signoff, ['signed_off_by'], firstString(row, ['signed_off_by', 'approved_by'], '')),
    signedOffAt: firstString(signoff, ['signed_off_at'], firstString(row, ['signed_off_at', 'approved_at'], '')),
    evidenceIds,
    chronologyIds,
    governanceIds,
    history,
    summary: firstString(lifecycle, ['calm_summary'], `${entityType.replaceAll('_', ' ')} is ${currentState.replaceAll('_', ' ')}.`)
  }
}

export function lifecycleCounts(items: OperationalLifecycleView[]) {
  return items.reduce<Record<LifecycleStatus, number>>((acc, item) => {
    acc[item.currentState] += 1
    return acc
  }, { open: 0, acknowledged: 0, in_review: 0, resolved: 0, reopened: 0, escalated: 0, archived: 0 })
}

export function lifecycleNeedsReview(item: OperationalLifecycleView) {
  return ['open', 'acknowledged', 'in_review', 'reopened', 'escalated'].includes(item.currentState)
}
