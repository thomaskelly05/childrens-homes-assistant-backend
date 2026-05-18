import type { AssistantContext, AssistantMode } from './types'

export type BuildAssistantContextInput = {
  mode: AssistantMode
  route?: string | null
  pageTitle?: string | null
  workspaceType?: string | null
  selectedYoungPersonId?: string | number | null
  selectedStaffId?: string | number | null
  selectedRecordId?: string | number | null
  selectedRecordType?: string | null
  selectedReportId?: string | number | null
  selectedDocumentId?: string | number | null
  visibleChronologyIds?: Array<string | number>
  visibleActionIds?: Array<string | number>
  visibleEvidenceIds?: Array<string | number>
  activeFilters?: Record<string, unknown>
  conversationId?: string | null
  projectId?: string | null
  selectedRecordSummary?: string | null
  homeId?: string | number | null
}

function numberOrNull(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function stringOrNull(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function stringList(values: Array<string | number> | undefined) {
  return (values ?? []).map((value) => String(value)).filter(Boolean)
}

export function inferWorkspaceType(route?: string | null) {
  const value = (route ?? '').toLowerCase()
  if (value.includes('assistant')) return 'standalone_assistant'
  if (value.includes('shift') || value.includes('handover')) return 'shift_operations'
  if (value.includes('chronology')) return 'chronology'
  if (value.includes('incident')) return 'incident'
  if (value.includes('safeguarding')) return 'safeguarding'
  if (value.includes('report')) return 'reports'
  if (value.includes('regulatory') || value.includes('ofsted')) return 'regulatory'
  if (value.includes('document')) return 'documents'
  if (value.includes('young-people')) return 'young_person'
  if (value.includes('/staff')) return 'adult'
  return 'dashboard'
}

export function buildAssistantContext(input: BuildAssistantContextInput): AssistantContext {
  return {
    assistant_mode: input.mode,
    current_route: input.route ?? null,
    current_workspace_type: input.workspaceType ?? inferWorkspaceType(input.route),
    page_title: input.pageTitle ?? null,
    home_id: numberOrNull(input.homeId),
    selected_young_person_id: numberOrNull(input.selectedYoungPersonId),
    selected_staff_id: numberOrNull(input.selectedStaffId),
    staff_id: numberOrNull(input.selectedStaffId),
    selected_record_id: stringOrNull(input.selectedRecordId),
    selected_record_type: stringOrNull(input.selectedRecordType),
    selected_report_id: stringOrNull(input.selectedReportId),
    selected_document_id: stringOrNull(input.selectedDocumentId),
    active_filters: input.activeFilters ?? {},
    visible_chronology_ids: stringList(input.visibleChronologyIds),
    visible_action_ids: stringList(input.visibleActionIds),
    visible_evidence_ids: stringList(input.visibleEvidenceIds),
    conversation_id: input.conversationId ?? null,
    project_id: input.projectId ?? null,
    selected_record_summary: input.selectedRecordSummary ?? null
  }
}

export function contextSummary(context: AssistantContext) {
  const parts = [
    context.page_title,
    context.current_workspace_type?.replaceAll('_', ' '),
    context.selected_young_person_id ? `Young person #${context.selected_young_person_id}` : null,
    context.selected_record_type && context.selected_record_id
      ? `${context.selected_record_type} #${context.selected_record_id}`
      : null
  ].filter(Boolean)

  return parts.length ? parts.join(' · ') : 'Whole OS scope permitted for your role'
}
