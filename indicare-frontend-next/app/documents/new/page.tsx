import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'
import { getDocumentTemplate, type DocumentScope } from '@/lib/document-system/templates'

export default async function NewHomeDocumentPage({ searchParams }: { searchParams: Promise<{ template?: string; scope?: DocumentScope; child_id?: string; staff_id?: string }> }) {
  const query = await searchParams
  const template = getDocumentTemplate(query.template || (query.scope === 'staff' ? 'staff_supervision_record' : 'home_statement_of_purpose'))
  const requestedScope = query.scope && ['child', 'home', 'staff'].includes(query.scope) ? query.scope : undefined
  const scope = requestedScope || template.scope
  if (scope === 'child' && !query.child_id) {
    return (
      <div className="rounded-[32px] bg-white p-8 text-center shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950">Choose a real child first</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">Child documents must be created from a live child profile or an explicit child id. No placeholder child id is used.</p>
      </div>
    )
  }

  return <DocumentEditorShell scope={scope} templateId={template.templateId} title={template.title} childId={scope === 'child' ? query.child_id : undefined} staffId={scope === 'staff' ? query.staff_id : undefined} />
}
