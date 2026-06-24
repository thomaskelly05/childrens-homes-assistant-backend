import type { OrbRecordWorkspaceItem, OrbRecordSourceStation, OrbRecordWorkspaceStatus } from '@/lib/orb/orb-records-workspace-client'
import type { OrbSavedOutputRecord } from '@/lib/orb/standalone-client'
import type {
  OrbTemplateSourceChip,
  OrbTemplateWorkingDocument,
  OrbTemplateWorkingDocumentChart,
  OrbTemplateWorkingDocumentSection,
  OrbTemplateWorkingDocumentTable
} from '@/lib/orb/template/orb-template-working-document-types'
import { saveOrbWriteWorkingDocumentHandoff } from '@/lib/orb/write/orb-write-working-document-handoff'

function asSections(raw: unknown): OrbTemplateWorkingDocumentSection[] {
  if (!Array.isArray(raw)) return []
  return raw as OrbTemplateWorkingDocumentSection[]
}

function asTables(raw: unknown): OrbTemplateWorkingDocumentTable[] {
  if (!Array.isArray(raw)) return []
  return raw as OrbTemplateWorkingDocumentTable[]
}

function asCharts(raw: unknown): OrbTemplateWorkingDocumentChart[] {
  if (!Array.isArray(raw)) return []
  return raw as OrbTemplateWorkingDocumentChart[]
}

function asChips(raw: unknown): OrbTemplateSourceChip[] {
  if (!Array.isArray(raw)) return []
  return raw as OrbTemplateSourceChip[]
}

/** Rebuild a working document from Records Workspace metadata — preserves structure. */
export function workspaceItemToWorkingDocument(
  item: OrbRecordWorkspaceItem
): OrbTemplateWorkingDocument | null {
  const meta = item.metadata ?? {}
  const sections = asSections(meta.sections)
  if (!sections.length && !meta.working_document_id) return null

  const documentId = String(meta.working_document_id ?? `reopen_${item.id}`)
  const now = item.updated_at || new Date().toISOString()

  return {
    document_id: documentId,
    template_id: item.template_id ?? 'general',
    title: item.title,
    description: null,
    document_type: (meta.document_type as OrbTemplateWorkingDocument['document_type']) ?? 'short_record',
    lifecycle_group: item.category ?? null,
    category: item.category ?? null,
    station_availability: ['write', 'records'],
    safeguarding_level: String(meta.safeguarding_level ?? 'standard'),
    regulation_anchors: Array.isArray(meta.regulation_anchors) ? (meta.regulation_anchors as string[]) : [],
    home_document_context_allowed: Boolean(meta.home_document_context_allowed),
    allowed_home_document_types: [],
    sections,
    fields: [],
    tables: asTables(meta.tables),
    charts: asCharts(meta.charts),
    action_plans: asTables(meta.action_plans),
    review_prompts: Array.isArray(meta.review_prompts) ? (meta.review_prompts as string[]) : [],
    child_voice_prompts: Array.isArray(meta.child_voice_prompts)
      ? (meta.child_voice_prompts as string[])
      : [],
    therapeutic_guidance: [],
    what_to_avoid: [],
    source_chips: asChips(meta.source_chips ?? meta.source_chips_metadata),
    linked_home_document_ids: Array.isArray(meta.linked_home_document_ids)
      ? (meta.linked_home_document_ids as string[])
      : [],
    home_document_chips: asChips(meta.home_document_chips),
    save_destination: 'my_drafts',
    export_options: Array.isArray(meta.export_options) ? (meta.export_options as string[]) : ['copy', 'print'],
    review_before_use_reminder: String(
      meta.review_before_use_reminder ?? 'Review before saving or sharing.'
    ),
    compliance_disclaimer: String(
      meta.compliance_disclaimer ??
        'ORB supports professional judgement and does not replace local policy, safeguarding procedures or manager oversight.'
    ),
    home_document_disclaimer: String(meta.home_document_disclaimer ?? ''),
    safety_standards: String(meta.safety_standards ?? ''),
    rendered_body: String(meta.rendered_body ?? item.body ?? ''),
    source_station: item.source_station,
    status: item.status,
    owner_user_id: null,
    home_id: item.home_id ?? null,
    child_id: item.child_id ?? null,
    audit_trail: [],
    created_at: item.created_at,
    updated_at: now,
    metadata: {
      ...meta,
      workspace_item_id: item.id
    }
  }
}

export function handoffWorkspaceItemToOrbWrite(item: OrbRecordWorkspaceItem): boolean {
  const doc = workspaceItemToWorkingDocument(item)
  if (!doc) return false
  saveOrbWriteWorkingDocumentHandoff(doc, {
    source_station: item.source_station,
    source_label: `Reopened from My Drafts — ${item.title}`
  })
  return true
}

export function savedOutputRecordToWorkspaceItem(record: OrbSavedOutputRecord): OrbRecordWorkspaceItem {
  const meta = record.metadata ?? {}
  return {
    id: record.id,
    owner_user_id: String(meta.owner_user_id ?? ''),
    workspace_section: String(meta.workspace_section ?? 'my_drafts'),
    category: typeof meta.category === 'string' ? meta.category : null,
    template_id: typeof meta.template_id === 'string' ? meta.template_id : null,
    source_station: (meta.source_station as OrbRecordSourceStation) ?? 'records',
    title: record.title,
    body: record.content_markdown ?? record.summary ?? '',
    status: (record.status as OrbRecordWorkspaceStatus) ?? 'draft',
    privacy_classification: 'standard',
    retention_policy: 'default',
    created_at: record.created_at,
    updated_at: record.updated_at,
    metadata: meta
  }
}

export function handoffSavedOutputRecordToOrbWrite(record: OrbSavedOutputRecord): boolean {
  const meta = record.metadata ?? {}
  if (!meta.sections && !meta.working_document_id) return false
  return handoffWorkspaceItemToOrbWrite(savedOutputRecordToWorkspaceItem(record))
}
