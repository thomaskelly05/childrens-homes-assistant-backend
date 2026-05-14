import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'
import { getDocumentTemplate } from '@/lib/document-system/templates'

export default async function NewHomeDocumentPage({ searchParams }: { searchParams: Promise<{ template?: string; scope?: 'home' | 'staff' }> }) {
  const query = await searchParams
  const template = getDocumentTemplate(query.template || (query.scope === 'staff' ? 'staff_supervision_record' : 'home_statement_of_purpose'))
  const scope = query.scope === 'staff' ? 'staff' : template.scope === 'staff' ? 'staff' : 'home'

  return <DocumentEditorShell scope={scope} templateId={template.templateId} title={template.title} />
}
