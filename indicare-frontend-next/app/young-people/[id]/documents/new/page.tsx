import { notFound } from 'next/navigation'

import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'
import { getDocumentTemplate } from '@/lib/document-system/templates'
import { getYoungPersonOverview } from '@/lib/os-api/platform'

export default async function NewYoungPersonDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ template?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const overview = await getYoungPersonOverview(id)
  const person = overview.data.profile
  if (!person && overview.source === 'live') notFound()
  const template = getDocumentTemplate(query.template)
  const childName = person?.preferredName || person?.displayName || `Young person ${id}`

  return <DocumentEditorShell scope="child" childId={id} templateId={template.templateId} title={`${childName} - ${template.title}`} />
}
