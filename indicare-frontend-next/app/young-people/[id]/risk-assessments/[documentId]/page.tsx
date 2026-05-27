import { notFound } from 'next/navigation'

import { DocumentEditorShell } from '@/components/document-editor/document-editor-shell'
import { getYoungPersonOverview } from '@/lib/os-api/platform'

export default async function YoungPersonRiskDocumentPage({ params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params
  const overview = await getYoungPersonOverview(id)
  const person = overview.data.profile
  if (!person && overview.source === 'live') notFound()
  const childName = person?.preferredName || person?.displayName || `Young person ${id}`
  return <DocumentEditorShell scope="child" childId={id} documentId={documentId} title={`${childName} risk assessment`} />
}
