import { notFound } from 'next/navigation'

import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'
import { getDocumentTemplate } from '@/lib/document-system/templates'
import { getYoungPersonSummary } from '@/lib/indicare/selectors'

export default async function NewYoungPersonDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ template?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const summary = getYoungPersonSummary(id)
  if (!summary) notFound()
  const template = getDocumentTemplate(query.template)

  return <DocumentEditorShell scope="child" childId={id} templateId={template.templateId} title={`${summary.youngPerson.preferredName} - ${template.title}`} />
}
