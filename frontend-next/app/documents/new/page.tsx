import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'
import { getDocumentTemplate, type DocumentScope } from '@/lib/document-system/templates'

export default async function NewHomeDocumentPage({ searchParams }: { searchParams: Promise<{ template?: string; scope?: DocumentScope; child_id?: string; staff_id?: string }> }) {
  const query = await searchParams
  const template = getDocumentTemplate(query.template || (query.scope === 'staff' ? 'staff_supervision_record' : 'home_statement_of_purpose'))
  const requestedScope = query.scope && ['child', 'home', 'staff'].includes(query.scope) ? query.scope : undefined
  const scope = requestedScope || template.scope

  return <DocumentEditorShell scope={scope} templateId={template.templateId} title={template.title} childId={scope === 'child' ? query.child_id || 'yp-1' : undefined} staffId={scope === 'staff' ? query.staff_id : undefined} />
}
