import type { LifecycleEntityType, LifecycleState } from './types'

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
